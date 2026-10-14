"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { normalizeLogin } from "@/lib/auth";
import { callbackStampOrNull, todayIso, uid } from "@/lib/format";
import { quoteProduct } from "@/lib/pricing";
import { productById } from "@/lib/products";
import { createSeed } from "@/lib/seed";
import { leadGroupFromUnknown } from "@/lib/labels";
import type {
  AdminAccount,
  Company,
  Contact,
  CrmData,
  Deal,
  DealStage,
  DiscountId,
  Lead,
  LeadCall,
  LeadGroup,
  LeadPhone,
  Offer,
  OfferLine,
  PriceMode,
  Segment,
  Seller,
  SellerNote,
  Session,
  Task,
  TaskKind,
} from "@/lib/types";

const RETIRED_KEYS = ["telpcrm.v3", "telpcrm.v2", "telpcrm.v1"];

const EMPTY: CrmData = {
  companies: [],
  contacts: [],
  deals: [],
  offers: [],
  tasks: [],
  sellers: [],
  admins: [],
  leads: [],
  sellerNotes: [],
  leadCalls: [],
};

type Status = "loading" | "ready" | "error";

type Snapshot = {
  status: Status;
  error: string | null;
  session: Session | null;
  data: CrmData;
};

const SERVER_SNAPSHOT: Snapshot = { status: "loading", error: null, session: null, data: EMPTY };

let clientSnapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function asArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

const SEGMENTS: Segment[] = ["partner", "installer", "trader", "private", "management"];
const TASK_KINDS: TaskKind[] = ["call", "email", "meeting", "offer", "visit"];

function normalizePhones(raw: unknown, legacyPhone: unknown, leadId: string): LeadPhone[] {
  if (Array.isArray(raw)) {
    const phones = raw.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const phone = item as Partial<LeadPhone>;
      const number = typeof phone.number === "string" ? phone.number : "";
      const owner = typeof phone.owner === "string" ? phone.owner : "";
      if (!number && !owner) return [];
      return [{ id: typeof phone.id === "string" ? phone.id : `${leadId}-ph-${index}`, number, owner }];
    });
    if (phones.length) return phones;
  }
  if (typeof legacyPhone === "string" && legacyPhone.trim()) {
    return [{ id: `${leadId}-ph`, number: legacyPhone.trim(), owner: "" }];
  }
  return [];
}

function normalizeLead(raw: unknown): Lead | null {
  if (!raw || typeof raw !== "object") return null;
  const lead = raw as Partial<Lead> & { callStatus?: unknown; phone?: unknown };
  if (typeof lead.id !== "string" || typeof lead.name !== "string" || typeof lead.sellerId !== "string") return null;
  const segment = SEGMENTS.includes(lead.segment as Segment) ? (lead.segment as Segment) : "installer";
  return {
    id: lead.id,
    sellerId: lead.sellerId,
    name: lead.name,
    phones: normalizePhones(lead.phones, lead.phone, lead.id),
    companyName: typeof lead.companyName === "string" ? lead.companyName : "",
    city: typeof lead.city === "string" ? lead.city : "",
    email: typeof lead.email === "string" ? lead.email : "",
    segment,
    interest: typeof lead.interest === "string" ? lead.interest : "",
    group: leadGroupFromUnknown(lead.group, lead.callStatus),
    callbackAt: callbackStampOrNull(lead.callbackAt),
    website: typeof lead.website === "string" ? lead.website : "",
    mapUrl: typeof lead.mapUrl === "string" ? lead.mapUrl : "",
    createdAt: typeof lead.createdAt === "string" ? lead.createdAt : "",
    demo: Boolean(lead.demo),
  };
}

function normalizeLeadCall(raw: unknown): LeadCall | null {
  if (!raw || typeof raw !== "object") return null;
  const call = raw as Partial<LeadCall>;
  const calledAt = callbackStampOrNull(call.calledAt);
  if (typeof call.id !== "string" || typeof call.sellerId !== "string" || typeof call.leadId !== "string" || !calledAt) return null;
  return {
    id: call.id,
    sellerId: call.sellerId,
    leadId: call.leadId,
    calledAt,
    group: leadGroupFromUnknown(call.group),
    note: typeof call.note === "string" ? call.note : "",
  };
}

function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const task = raw as Partial<Task>;
  if (typeof task.id !== "string" || typeof task.title !== "string") return null;
  return {
    id: task.id,
    title: task.title,
    kind: TASK_KINDS.includes(task.kind as TaskKind) ? (task.kind as TaskKind) : "call",
    due: typeof task.due === "string" ? task.due : "",
    done: Boolean(task.done),
    companyId: typeof task.companyId === "string" ? task.companyId : null,
    dealId: typeof task.dealId === "string" ? task.dealId : null,
    contactId: typeof task.contactId === "string" ? task.contactId : null,
    leadId: typeof task.leadId === "string" ? task.leadId : null,
  };
}

function normalizeSeller(raw: unknown): Seller | null {
  if (!raw || typeof raw !== "object") return null;
  const seller = raw as Partial<Seller>;
  if (typeof seller.id !== "string" || typeof seller.name !== "string") return null;
  const login = typeof seller.login === "string" ? normalizeLogin(seller.login) : "";
  const passwordHash = typeof seller.passwordHash === "string" ? seller.passwordHash : "";
  if (!login) return null;
  return {
    id: seller.id,
    name: seller.name,
    role: typeof seller.role === "string" ? seller.role : "Продавец",
    city: typeof seller.city === "string" ? seller.city : "",
    phone: typeof seller.phone === "string" ? seller.phone : "",
    login,
    passwordHash,
    demo: Boolean(seller.demo),
  };
}

function normalizeAdmin(raw: unknown): AdminAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const admin = raw as Partial<AdminAccount>;
  if (typeof admin.id !== "string" || typeof admin.name !== "string") return null;
  const login = typeof admin.login === "string" ? normalizeLogin(admin.login) : "";
  const passwordHash = typeof admin.passwordHash === "string" ? admin.passwordHash : "";
  if (!login) return null;
  return { id: admin.id, name: admin.name, login, passwordHash };
}

function stripDemoArticles(offers: Offer[]) {
  return offers.map((offer) => ({
    ...offer,
    lines: offer.lines.map((line) => {
      if (!line.article.includes("DEMO")) return line;
      const product = productById(line.productId);
      const article = product?.article ?? line.article.replaceAll("DEMO-", "");
      return { ...line, article };
    }),
  }));
}

function keptOrSeed<T>(raw: unknown, normalize: (value: unknown) => T | null, seed: T[]): T[] {
  if (!Array.isArray(raw)) return seed;
  return raw.map(normalize).filter((item): item is T => item !== null);
}

const SAMPLE_IDS = new Set([
  "domkom", "povolzhye", "teploservis", "cottage", "severny",
  "c-ilya", "c-olga", "c-pavel", "c-andrey", "c-svetlana",
  "deal-domkom", "deal-povolzhye", "deal-invoice", "deal-nn", "deal-cottage", "deal-won", "deal-lost",
  "offer-domkom", "offer-povolzhye", "offer-invoice",
  "task-call", "task-overdue", "task-meet", "task-visit", "task-done",
  "s-marina", "s-artem", "s-kira",
  "lead-sergey", "lead-dmitry", "lead-alina", "lead-igor", "lead-natalia", "lead-rustam", "lead-gulnara", "lead-viktor", "lead-pavel-y", "lead-oksana", "lead-elena",
  "note-sergey", "note-dmitry", "note-alina", "note-gulnara", "note-pavel-y", "note-oksana", "note-elena",
  "call-sergey-today", "call-sergey-yesterday", "call-alina-today", "call-gulnara",
]);

const SAMPLE_SELLER_NAMES = new Set(["марина соколова", "артём белов", "артем белов", "кира лебедева", "ольга крылова"]);

function purgeSample(data: CrmData): CrmData {
  const sellers = data.sellers.filter((seller) => !SAMPLE_IDS.has(seller.id) && !SAMPLE_SELLER_NAMES.has(seller.name.trim().toLowerCase()));
  const sellerIds = new Set(sellers.map((seller) => seller.id));
  return {
    ...data,
    sellers,
    companies: data.companies.filter((company) => !SAMPLE_IDS.has(company.id)),
    contacts: data.contacts.filter((contact) => !SAMPLE_IDS.has(contact.id) && !SAMPLE_IDS.has(contact.companyId)),
    deals: data.deals.filter((deal) => !SAMPLE_IDS.has(deal.id) && !SAMPLE_IDS.has(deal.companyId)),
    offers: data.offers.filter((offer) => !SAMPLE_IDS.has(offer.id) && !(offer.companyId && SAMPLE_IDS.has(offer.companyId)) && !(offer.dealId && SAMPLE_IDS.has(offer.dealId))),
    tasks: data.tasks.filter((task) => !SAMPLE_IDS.has(task.id) && !(task.companyId && SAMPLE_IDS.has(task.companyId)) && !(task.dealId && SAMPLE_IDS.has(task.dealId)) && !(task.contactId && SAMPLE_IDS.has(task.contactId)) && !(task.leadId && SAMPLE_IDS.has(task.leadId))),
    leads: data.leads.filter((lead) => !SAMPLE_IDS.has(lead.id) && sellerIds.has(lead.sellerId)),
    sellerNotes: data.sellerNotes.filter((note) => !SAMPLE_IDS.has(note.id) && sellerIds.has(note.sellerId) && !SAMPLE_IDS.has(note.leadId)),
    leadCalls: data.leadCalls.filter((call) => !SAMPLE_IDS.has(call.id) && sellerIds.has(call.sellerId) && !SAMPLE_IDS.has(call.leadId)),
  };
}

function backfill(partial: Partial<CrmData>): CrmData {
  const seed = createSeed();
  const storedLeads = Array.isArray(partial.leads)
    ? partial.leads.map(normalizeLead).filter((lead): lead is Lead => lead !== null)
    : seed.leads;
  const seedById = new Map(seed.leads.map((lead) => [lead.id, lead]));
  const leads = storedLeads.map((lead) => {
    if (lead.callbackAt || lead.group !== "reschedule") return lead;
    const sample = seedById.get(lead.id);
    return sample?.callbackAt ? { ...lead, callbackAt: sample.callbackAt } : lead;
  });
  return purgeSample({
    companies: asArray(partial.companies, seed.companies),
    contacts: asArray(partial.contacts, seed.contacts),
    deals: asArray(partial.deals, seed.deals),
    offers: stripDemoArticles(asArray(partial.offers, seed.offers)),
    tasks: Array.isArray(partial.tasks) ? partial.tasks.map(normalizeTask).filter((task): task is Task => task !== null) : seed.tasks,
    sellers: keptOrSeed(partial.sellers, normalizeSeller, seed.sellers),
    admins: keptOrSeed(partial.admins, normalizeAdmin, seed.admins),
    leads,
    sellerNotes: asArray(partial.sellerNotes, seed.sellerNotes),
    leadCalls: Array.isArray(partial.leadCalls)
      ? partial.leadCalls.map(normalizeLeadCall).filter((call): call is LeadCall => call !== null)
      : seed.leadCalls,
  });
}

function parseSession(data: CrmData, value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { kind?: unknown; adminId?: unknown; sellerId?: unknown };
  if (record.kind === "admin" && typeof record.adminId === "string" && data.admins.some((admin) => admin.id === record.adminId)) {
    return { kind: "admin", adminId: record.adminId };
  }
  if (record.kind === "seller" && typeof record.sellerId === "string" && data.sellers.some((seller) => seller.id === record.sellerId)) {
    return { kind: "seller", sellerId: record.sellerId };
  }
  return null;
}

function parseStored(value: unknown): { data: CrmData; session: Session | null } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    const data = backfill(record.data as Partial<CrmData>);
    return { data, session: parseSession(data, record.session) };
  }
  if (Array.isArray(record.companies)) {
    const data = backfill(record as Partial<CrmData>);
    return { data, session: null };
  }
  return null;
}

function publish(next: Snapshot) {
  clientSnapshot = next;
  listeners.forEach((listener) => listener());
}

function readClient(): Snapshot {
  return clientSnapshot ?? SERVER_SNAPSHOT;
}

function retireLocalAccounts() {
  try {
    for (const key of RETIRED_KEYS) localStorage.removeItem(key);
  } catch {
    // Private mode can block storage. The desk no longer reads it.
  }
}

let bootPromise: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveFlight = false;
let saveDirty = false;

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as { error?: string; session?: Session | null; data?: CrmData } & Partial<CrmData> | null;
}

function applyPayload(session: Session | null, payload: unknown) {
  const stored = parseStored({ data: payload, session });
  if (!stored) throw new Error("Ответ сервера не похож на данные отдела.");
  publish({ status: "ready", error: null, session: stored.session, data: stored.data });
}

async function loadFromServer() {
  retireLocalAccounts();
  const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
  const sessionBody = await readJson(sessionRes);
  if (!sessionRes.ok) throw new Error(sessionBody?.error ?? "Не удалось проверить сессию.");
  const session = sessionBody?.session ?? null;
  if (!session) {
    publish({ status: "ready", error: null, session: null, data: EMPTY });
    return;
  }
  const crmRes = await fetch("/api/crm", { cache: "no-store" });
  const crmBody = await readJson(crmRes);
  if (crmRes.status === 401) {
    publish({ status: "ready", error: null, session: null, data: EMPTY });
    return;
  }
  if (!crmRes.ok) throw new Error(crmBody?.error ?? "Не удалось открыть данные отдела.");
  applyPayload(session, crmBody);
}

function failBoot(caught: unknown) {
  publish({
    status: "error",
    error: caught instanceof Error ? caught.message : "Не удалось открыть данные отдела.",
    session: null,
    data: EMPTY,
  });
}

function startBoot(force = false) {
  if (!force && bootPromise) return;
  if (!force && clientSnapshot && clientSnapshot.status !== "loading") return;
  if (force) publish({ status: "loading", error: null, session: null, data: EMPTY });
  bootPromise = loadFromServer()
    .catch(failBoot)
    .finally(() => {
      bootPromise = null;
    });
}

async function flushSave() {
  const snap = readClient();
  if (snap.status !== "ready" || snap.session?.kind !== "seller") {
    saveDirty = false;
    return;
  }
  if (saveFlight) return;
  saveFlight = true;
  saveDirty = false;
  const payload = snap.data;
  try {
    const response = await fetch("/api/crm", {
      method: "PUT",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) {
      publish({ status: "ready", error: null, session: null, data: EMPTY });
      toast.error("Сессия закончилась. Войдите снова.");
      return;
    }
    if (!response.ok) {
      const body = await readJson(response);
      toast.error(body?.error ?? "Не удалось сохранить изменения");
    }
  } catch {
    toast.error("Не удалось сохранить изменения");
  } finally {
    saveFlight = false;
    if (saveDirty) scheduleSave();
  }
}

function scheduleSave() {
  if (readClient().session?.kind !== "seller") return;
  saveDirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushSave();
  }, 200);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function mutate(recipe: (draft: CrmData) => void) {
  const current = readClient();
  if (current.status !== "ready") return;
  const next = structuredClone(current.data);
  recipe(next);
  publish({ status: "ready", error: null, session: current.session, data: next });
  scheduleSave();
}

function currentSellerId() {
  const session = readClient().session;
  return session?.kind === "seller" ? session.sellerId : "";
}

function nextOfferNumber(offers: Offer[]) {
  const max = offers.reduce((top, offer) => {
    const match = offer.number.match(/(\d+)$/);
    return Math.max(top, match ? Number(match[1]) : 0);
  }, 0);
  return `КП-2026-${String(max + 1).padStart(3, "0")}`;
}

function reprice(line: OfferLine, discountId: DiscountId): OfferLine {
  const product = productById(line.productId);
  if (!product) return line;
  const priced = quoteProduct(product, discountId, line.priceMode);
  return {
    ...line,
    article: product.article,
    name: product.name,
    unit: product.unit,
    unitPrice: priced.unitPrice,
    priceLabel: priced.priceLabel,
    priceOrigin: product.priceOrigin,
  };
}

type CrmApi = {
  status: Status;
  error: string | null;
  session: Session | null;
  sellerId: string;
  data: CrmData;
  reset: () => void;
  login: (login: string, password: string) => Promise<"ok" | "invalid">;
  logout: () => void;
  addSeller: (input: { name: string; login: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeSeller: (id: string) => void;
  addLead: (input: Omit<Lead, "id" | "sellerId" | "demo" | "createdAt"> & { note?: string }) => string;
  setLeadGroup: (id: string, group: LeadGroup) => void;
  updateLead: (
    id: string,
    patch: Partial<Pick<Lead, "name" | "phones" | "companyName" | "city" | "email" | "segment" | "interest" | "group" | "callbackAt" | "website" | "mapUrl">>,
  ) => void;
  addSellerNote: (leadId: string, text: string) => void;
  addLeadCall: (leadId: string, input: { calledAt: string; group: LeadGroup; note: string }) => void;
  addCompany: (input: Omit<Company, "id" | "demo">) => string;
  addContact: (input: Omit<Contact, "id" | "demo">) => string;
  addDeal: (input: Omit<Deal, "id" | "updatedAt">) => string;
  moveDeal: (id: string, stage: DealStage) => void;
  updateDeal: (id: string, patch: Partial<Pick<Deal, "title" | "amount" | "nextStep" | "stage" | "contactId">>) => void;
  addTask: (input: Omit<Task, "id" | "done">) => string;
  toggleTask: (id: string) => void;
  createOffer: (input: {
    companyId: string;
    contactId: string | null;
    dealId: string | null;
    discountId: DiscountId;
  }) => string;
  updateOffer: (
    id: string,
    patch: Partial<Pick<Offer, "status" | "note" | "validDays" | "contactId" | "discountId">>,
  ) => void;
  addOfferLine: (offerId: string, productId: string, quantity: number, priceMode: PriceMode) => void;
  updateOfferLine: (offerId: string, lineId: string, patch: Partial<Pick<OfferLine, "quantity" | "priceMode">>) => void;
  removeOfferLine: (offerId: string, lineId: string) => void;
};

const CrmContext = createContext<CrmApi | null>(null);

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readClient, getServerSnapshot);
  useEffect(() => {
    startBoot();
  }, []);

  const api = useMemo<CrmApi>(() => {
    return {
      status: snapshot.status,
      error: snapshot.error,
      session: snapshot.session,
      sellerId: snapshot.session?.kind === "seller" ? snapshot.session.sellerId : "",
      data: snapshot.data,
      reset: () => {
        startBoot(true);
      },
      login: async (loginName, password) => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ login: loginName, password }),
        });
        const body = await readJson(response);
        if (response.status === 401) return "invalid";
        if (!response.ok || !body?.session) {
          publish({
            status: "error",
            error: body?.error ?? "Не удалось войти.",
            session: null,
            data: EMPTY,
          });
          return "invalid";
        }
        applyPayload(body.session, body.data);
        return "ok";
      },
      logout: () => {
        const current = readClient();
        if (current.status !== "ready" || !current.session) return;
        publish({ status: "ready", error: null, session: null, data: EMPTY });
        void fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      },
      addSeller: async (input) => {
        const current = readClient();
        if (current.status !== "ready" || current.session?.kind !== "admin") {
          return { ok: false, error: "Добавлять продавцов может администратор." };
        }
        const response = await fetch("/api/sellers", {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = await readJson(response);
        if (!response.ok || !body) return { ok: false, error: body?.error ?? "Не удалось добавить продавца." };
        applyPayload(current.session, body);
        toast.success("Продавец может войти под своим логином");
        return { ok: true };
      },
      removeSeller: (id) => {
        const current = readClient();
        if (current.status !== "ready" || current.session?.kind !== "admin") return;
        void (async () => {
          const response = await fetch(`/api/sellers/${encodeURIComponent(id)}`, { method: "DELETE", cache: "no-store" });
          const body = await readJson(response);
          if (!response.ok || !body) {
            toast.error(body?.error ?? "Не удалось удалить продавца.");
            return;
          }
          const session = readClient().session;
          applyPayload(session?.kind === "admin" ? session : null, body);
          toast.success("Продавец удалён. Войти он больше не сможет.");
        })();
      },
      addLead: (input) => {
        const sellerId = currentSellerId();
        if (!sellerId) return "";
        const id = uid("lead");
        const note = input.note?.trim() ?? "";
        mutate((draft) => {
          draft.leads.unshift({
            id,
            sellerId,
            name: input.name,
            phones: input.phones,
            companyName: input.companyName,
            city: input.city,
            email: input.email,
            segment: input.segment,
            interest: input.interest,
            group: input.group,
            callbackAt: input.group === "reschedule" ? input.callbackAt : null,
            website: input.website,
            mapUrl: input.mapUrl,
            createdAt: new Date().toISOString(),
            demo: false,
          });
          if (note) {
            draft.sellerNotes.unshift({
              id: uid("note"),
              sellerId,
              leadId: id,
              text: note,
              createdAt: new Date().toISOString(),
            });
          }
        });
        toast.success("Лид добавлен в ваш список");
        return id;
      },
      setLeadGroup: (id, group) => {
        const sellerId = currentSellerId();
        mutate((draft) => {
          const lead = draft.leads.find((item) => item.id === id && item.sellerId === sellerId);
          if (!lead || lead.group === group) return;
          lead.group = group;
        });
      },
      updateLead: (id, patch) => {
        const sellerId = currentSellerId();
        const current = readClient().data.leads.find((item) => item.id === id && item.sellerId === sellerId);
        if (!current) return;
        const next = { ...current, ...patch };
        if (JSON.stringify(current) === JSON.stringify(next)) return;
        mutate((draft) => {
          const lead = draft.leads.find((item) => item.id === id && item.sellerId === sellerId);
          if (!lead) return;
          Object.assign(lead, patch);
        });
      },
      addSellerNote: (leadId, text) => {
        const sellerId = currentSellerId();
        const clean = text.trim();
        if (!clean) return;
        const current = readClient();
        const lead = current.data.leads.find((item) => item.id === leadId && item.sellerId === sellerId);
        if (!lead) return;
        const note: SellerNote = {
          id: uid("note"),
          sellerId,
          leadId,
          text: clean,
          createdAt: new Date().toISOString(),
        };
        mutate((draft) => {
          draft.sellerNotes.unshift(note);
        });
        toast.success("Заметка видна только вам");
      },
      addLeadCall: (leadId, input) => {
        const sellerId = currentSellerId();
        const calledAt = callbackStampOrNull(input.calledAt);
        const note = input.note.trim();
        if (!calledAt || !note) return;
        const lead = readClient().data.leads.find((item) => item.id === leadId && item.sellerId === sellerId);
        if (!lead) return;
        const call: LeadCall = {
          id: uid("call"),
          sellerId,
          leadId,
          calledAt,
          group: input.group,
          note,
        };
        mutate((draft) => {
          draft.leadCalls.unshift(call);
        });
        toast.success("Звонок виден только вам");
      },
      addCompany: (input) => {
        const id = uid("co");
        mutate((draft) => {
          draft.companies.unshift({ ...input, id, demo: false });
        });
        toast.success("Компания добавлена");
        return id;
      },
      addContact: (input) => {
        const id = uid("ct");
        mutate((draft) => {
          draft.contacts.unshift({ ...input, id, demo: false });
        });
        toast.success("Контакт добавлен");
        return id;
      },
      addDeal: (input) => {
        const id = uid("deal");
        mutate((draft) => {
          draft.deals.unshift({ ...input, id, updatedAt: todayIso() });
        });
        toast.success("Сделка создана");
        return id;
      },
      moveDeal: (id, stage) => {
        mutate((draft) => {
          const deal = draft.deals.find((item) => item.id === id);
          if (!deal || deal.stage === stage) return;
          deal.stage = stage;
          deal.updatedAt = todayIso();
        });
      },
      updateDeal: (id, patch) => {
        mutate((draft) => {
          const deal = draft.deals.find((item) => item.id === id);
          if (!deal) return;
          Object.assign(deal, patch, { updatedAt: todayIso() });
        });
      },
      addTask: (input) => {
        const id = uid("task");
        mutate((draft) => {
          draft.tasks.unshift({ ...input, id, done: false });
        });
        toast.success("Задача поставлена");
        return id;
      },
      toggleTask: (id) => {
        mutate((draft) => {
          const task = draft.tasks.find((item) => item.id === id);
          if (task) task.done = !task.done;
        });
      },
      createOffer: (input) => {
        const id = uid("offer");
        const number = nextOfferNumber(readClient().data.offers);
        mutate((draft) => {
          draft.offers.unshift({
            id,
            number,
            companyId: input.companyId,
            contactId: input.contactId,
            dealId: input.dealId,
            discountId: input.discountId,
            status: "draft",
            issuedOn: todayIso(),
            validDays: 10,
            note: "Цены сверьте с каталогом продавца перед отправкой покупателю.",
            lines: [],
          });
        });
        toast.success(`${number} создано`);
        return id;
      },
      updateOffer: (id, patch) => {
        mutate((draft) => {
          const offer = draft.offers.find((item) => item.id === id);
          if (!offer) return;
          if (patch.discountId && patch.discountId !== offer.discountId) {
            offer.lines = offer.lines.map((line) => reprice(line, patch.discountId as DiscountId));
          }
          Object.assign(offer, patch);
          if (patch.status === "sent" && offer.dealId) {
            const deal = draft.deals.find((item) => item.id === offer.dealId);
            if (deal && (deal.stage === "new" || deal.stage === "qualify")) {
              deal.stage = "offer";
              deal.updatedAt = todayIso();
            }
          }
        });
      },
      addOfferLine: (offerId, productId, quantity, priceMode) => {
        const found = productById(productId);
        if (!found) return;
        mutate((draft) => {
          const offer = draft.offers.find((item) => item.id === offerId);
          if (!offer) return;
          offer.lines.push(
            reprice(
              {
                id: uid("line"),
                productId,
                quantity,
                priceMode,
                article: found.article,
                name: found.name,
                unit: found.unit,
                unitPrice: null,
                priceLabel: "",
                priceOrigin: found.priceOrigin,
              },
              offer.discountId,
            ),
          );
        });
      },
      updateOfferLine: (offerId, lineId, patch) => {
        mutate((draft) => {
          const offer = draft.offers.find((item) => item.id === offerId);
          const line = offer?.lines.find((item) => item.id === lineId);
          if (!offer || !line) return;
          if (patch.quantity != null) line.quantity = patch.quantity;
          if (patch.priceMode) line.priceMode = patch.priceMode;
          Object.assign(line, reprice(line, offer.discountId));
        });
      },
      removeOfferLine: (offerId, lineId) => {
        mutate((draft) => {
          const offer = draft.offers.find((item) => item.id === offerId);
          if (!offer) return;
          offer.lines = offer.lines.filter((line) => line.id !== lineId);
        });
      },
    };
  }, [snapshot]);

  return <CrmContext.Provider value={api}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) throw new Error("useCrm используется внутри CrmProvider");
  return context;
}
