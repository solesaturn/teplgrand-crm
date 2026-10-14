import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import postgres from "postgres";
import { uid } from "@/lib/format";
import { normalizeLogin } from "@/lib/auth";
import type { CrmData, Session } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";
import { ensureShape, mergeSellerDesk, seedDesk } from "@/lib/server/desk";

const DOCUMENT_ID = "desk";
const SESSION_DAYS = 30;

export type SessionRow = {
  token: string;
  kind: "admin" | "seller";
  accountId: string;
  expiresAt: string;
};

type FileBlob = {
  data: CrmData;
  sessions: SessionRow[];
};

type Sql = ReturnType<typeof postgres>;

let sqlClient: Sql | null = null;
let schemaReady: Promise<void> | null = null;
let fileChain: Promise<unknown> = Promise.resolve();

function postgresUrl() {
  const url = process.env.POSTGRES_URL?.trim();
  return url ? url : null;
}

export function usesPostgres() {
  return Boolean(postgresUrl());
}

function assertConfigured() {
  if (process.env.VERCEL && !postgresUrl()) {
    throw new Error("На Vercel задайте POSTGRES_URL.");
  }
}

function client() {
  const url = postgresUrl();
  if (!url) throw new Error("POSTGRES_URL не задан.");
  if (!sqlClient) {
    sqlClient = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 30 });
  }
  return sqlClient;
}

async function ensureSchema() {
  if (!schemaReady) {
    const sql = client();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS crm_document (
          id text PRIMARY KEY,
          body jsonb NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS crm_session (
          token text PRIMARY KEY,
          kind text NOT NULL,
          account_id text NOT NULL,
          expires_at timestamptz NOT NULL
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function filePath() {
  return path.join(process.cwd(), "data", "crm.json");
}

function lockFile<T>(job: () => Promise<T>): Promise<T> {
  const run = fileChain.then(job, job);
  fileChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readBlob(): Promise<FileBlob> {
  try {
    const text = await readFile(filePath(), "utf8");
    const parsed = JSON.parse(text) as Partial<FileBlob>;
    if (!parsed || typeof parsed !== "object" || !parsed.data) {
      throw new Error("Файл данных отдела повреждён.");
    }
    return {
      data: ensureShape(parsed.data),
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.filter(validSessionRow) : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const blob: FileBlob = { data: seedDesk(), sessions: [] };
      await writeBlob(blob);
      return blob;
    }
    throw error;
  }
}

async function writeBlob(blob: FileBlob) {
  const dir = path.dirname(filePath());
  await mkdir(dir, { recursive: true });
  const temp = path.join(dir, `crm.${process.pid}.tmp`);
  await writeFile(temp, JSON.stringify(blob), "utf8");
  await rename(temp, filePath());
}

function validSessionRow(value: unknown): value is SessionRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<SessionRow>;
  return (
    typeof row.token === "string" &&
    (row.kind === "admin" || row.kind === "seller") &&
    typeof row.accountId === "string" &&
    typeof row.expiresAt === "string"
  );
}

async function readPostgres(): Promise<CrmData> {
  await ensureSchema();
  const sql = client();
  return sql.begin(async (tx) => {
    const seeded = seedDesk();
    await tx`
      INSERT INTO crm_document (id, body)
      VALUES (${DOCUMENT_ID}, ${tx.json(seeded)})
      ON CONFLICT (id) DO NOTHING
    `;
    const rows = await tx<{ body: CrmData }[]>`
      SELECT body FROM crm_document WHERE id = ${DOCUMENT_ID} FOR UPDATE
    `;
    const body = rows[0]?.body;
    if (!body || !Array.isArray(body.admins) || body.admins.length === 0) {
      await tx`UPDATE crm_document SET body = ${tx.json(seeded)} WHERE id = ${DOCUMENT_ID}`;
      return seeded;
    }
    return ensureShape(body);
  });
}

export async function getData(): Promise<CrmData> {
  assertConfigured();
  if (usesPostgres()) return readPostgres();
  return lockFile(async () => (await readBlob()).data);
}

export async function updateData(recipe: (data: CrmData) => void): Promise<CrmData> {
  assertConfigured();
  if (usesPostgres()) {
    await ensureSchema();
    const sql = client();
    return sql.begin(async (tx) => {
      const seeded = seedDesk();
      await tx`
        INSERT INTO crm_document (id, body)
        VALUES (${DOCUMENT_ID}, ${tx.json(seeded)})
        ON CONFLICT (id) DO NOTHING
      `;
      const rows = await tx<{ body: CrmData }[]>`
        SELECT body FROM crm_document WHERE id = ${DOCUMENT_ID} FOR UPDATE
      `;
      const current = ensureShape(rows[0]?.body ?? seeded);
      if (!current.admins.length) current.admins = seeded.admins;
      recipe(current);
      await tx`UPDATE crm_document SET body = ${tx.json(current)} WHERE id = ${DOCUMENT_ID}`;
      return current;
    });
  }
  return lockFile(async () => {
    const blob = await readBlob();
    recipe(blob.data);
    await writeBlob(blob);
    return blob.data;
  });
}

function sessionFromRow(data: CrmData, row: SessionRow): Session | null {
  if (Date.parse(row.expiresAt) < Date.now()) return null;
  if (row.kind === "admin" && data.admins.some((admin) => admin.id === row.accountId)) {
    return { kind: "admin", adminId: row.accountId };
  }
  if (row.kind === "seller" && data.sellers.some((seller) => seller.id === row.accountId)) {
    return { kind: "seller", sellerId: row.accountId };
  }
  return null;
}

export async function openSession(token: string): Promise<Session | null> {
  assertConfigured();
  if (!token) return null;
  if (usesPostgres()) {
    await ensureSchema();
    const sql = client();
    const rows = await sql<{ kind: string; account_id: string; expires_at: Date }[]>`
      SELECT kind, account_id, expires_at FROM crm_session WHERE token = ${token}
    `;
    const row = rows[0];
    if (!row) return null;
    const sessionRow: SessionRow = {
      token,
      kind: row.kind === "admin" ? "admin" : "seller",
      accountId: row.account_id,
      expiresAt: new Date(row.expires_at).toISOString(),
    };
    const data = await getData();
    const session = sessionFromRow(data, sessionRow);
    if (!session) await sql`DELETE FROM crm_session WHERE token = ${token}`;
    return session;
  }
  return lockFile(async () => {
    const blob = await readBlob();
    const row = blob.sessions.find((item) => item.token === token);
    if (!row) return null;
    const session = sessionFromRow(blob.data, row);
    if (!session) {
      blob.sessions = blob.sessions.filter((item) => item.token !== token);
      await writeBlob(blob);
    }
    return session;
  });
}

export async function startSession(loginName: string, password: string): Promise<{ token: string; session: Session } | null> {
  const login = normalizeLogin(loginName);
  if (!login || !password || password.length > 200) return null;
  const data = await getData();
  const admin = data.admins.find((item) => item.login === login);
  const seller = admin ? undefined : data.sellers.find((item) => item.login === login);
  const account = admin ?? seller;
  const ok = verifyPassword(password, account?.passwordHash ?? "");
  if (!account || !ok) return null;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const row: SessionRow = {
    token,
    kind: admin ? "admin" : "seller",
    accountId: account.id,
    expiresAt: expires.toISOString(),
  };
  assertConfigured();
  if (usesPostgres()) {
    await ensureSchema();
    const sql = client();
    await sql`
      INSERT INTO crm_session (token, kind, account_id, expires_at)
      VALUES (${row.token}, ${row.kind}, ${row.accountId}, ${expires})
    `;
  } else {
    await lockFile(async () => {
      const blob = await readBlob();
      blob.sessions = blob.sessions.filter((item) => Date.parse(item.expiresAt) >= Date.now());
      blob.sessions.push(row);
      await writeBlob(blob);
    });
  }
  const session: Session = admin ? { kind: "admin", adminId: admin.id } : { kind: "seller", sellerId: seller!.id };
  return { token, session };
}

export async function endSession(token: string | null) {
  if (!token) return;
  assertConfigured();
  if (usesPostgres()) {
    await ensureSchema();
    const sql = client();
    await sql`DELETE FROM crm_session WHERE token = ${token}`;
    return;
  }
  await lockFile(async () => {
    const blob = await readBlob();
    blob.sessions = blob.sessions.filter((item) => item.token !== token);
    await writeBlob(blob);
  });
}

async function dropAccountSessions(accountId: string) {
  if (usesPostgres()) {
    await ensureSchema();
    const sql = client();
    await sql`DELETE FROM crm_session WHERE account_id = ${accountId}`;
    return;
  }
  await lockFile(async () => {
    const blob = await readBlob();
    blob.sessions = blob.sessions.filter((item) => item.accountId !== accountId);
    await writeBlob(blob);
  });
}

export async function createSeller(input: { name: string; login: string; password: string }) {
  const name = input.name.trim();
  const login = normalizeLogin(input.login);
  const password = input.password;
  if (!name || !login || !password) return { ok: false as const, error: "Укажите имя, логин и пароль." };
  if (password.length < 6) return { ok: false as const, error: "Пароль должен быть не короче 6 знаков." };
  if (password.length > 200) return { ok: false as const, error: "Пароль слишком длинный." };
  const passwordHash = hashPassword(password);
  let error = "";
  const data = await updateData((draft) => {
    const taken = draft.admins.some((item) => item.login === login) || draft.sellers.some((item) => item.login === login);
    if (taken) {
      error = "Такой логин уже есть.";
      return;
    }
    draft.sellers.push({
      id: uid("s"),
      name,
      role: "Продавец",
      city: "",
      phone: "",
      login,
      passwordHash,
      demo: false,
    });
  });
  if (error) return { ok: false as const, error };
  return { ok: true as const, data };
}

export async function deleteSeller(id: string) {
  let missing = false;
  const data = await updateData((draft) => {
    if (draft.admins.some((admin) => admin.id === id)) {
      missing = true;
      return;
    }
    if (!draft.sellers.some((seller) => seller.id === id)) {
      missing = true;
      return;
    }
    const leadIds = new Set(draft.leads.filter((lead) => lead.sellerId === id).map((lead) => lead.id));
    draft.sellers = draft.sellers.filter((seller) => seller.id !== id);
    draft.leads = draft.leads.filter((lead) => lead.sellerId !== id);
    draft.sellerNotes = draft.sellerNotes.filter((note) => note.sellerId !== id && !leadIds.has(note.leadId));
    draft.leadCalls = draft.leadCalls.filter((call) => call.sellerId !== id && !leadIds.has(call.leadId));
    draft.tasks = draft.tasks.filter((task) => !task.leadId || !leadIds.has(task.leadId));
  });
  if (!missing) await dropAccountSessions(id);
  return { ok: !missing, data };
}

export async function deleteLead(id: string) {
  let missing = false;
  const data = await updateData((draft) => {
    if (!draft.leads.some((lead) => lead.id === id)) {
      missing = true;
      return;
    }
    draft.leads = draft.leads.filter((lead) => lead.id !== id);
    draft.sellerNotes = draft.sellerNotes.filter((note) => note.leadId !== id);
    draft.leadCalls = draft.leadCalls.filter((call) => call.leadId !== id);
    draft.tasks = draft.tasks.filter((task) => task.leadId !== id);
  });
  return { ok: !missing, data };
}

export async function deleteOffer(id: string) {
  let missing = false;
  const data = await updateData((draft) => {
    if (!draft.offers.some((offer) => offer.id === id)) {
      missing = true;
      return;
    }
    draft.offers = draft.offers.filter((offer) => offer.id !== id);
  });
  return { ok: !missing, data };
}

export async function deleteTask(id: string) {
  let missing = false;
  const data = await updateData((draft) => {
    if (!draft.tasks.some((task) => task.id === id)) {
      missing = true;
      return;
    }
    draft.tasks = draft.tasks.filter((task) => task.id !== id);
  });
  return { ok: !missing, data };
}

export async function saveSellerDesk(sellerId: string, body: unknown) {
  return updateData((draft) => {
    const next = mergeSellerDesk(draft, body, sellerId);
    Object.assign(draft, next);
  });
}
