import { callbackStampOrNull } from "@/lib/format";
import { leadGroupFromUnknown } from "@/lib/labels";
import type { CrmData, Lead, LeadCall, SellerNote, Session, Task } from "@/lib/types";
import { hashPassword } from "@/lib/server/passwords";

const SEGMENTS = new Set(["partner", "installer", "trader", "private", "management"]);
const TASK_KINDS = new Set(["call", "email", "meeting", "offer", "visit"]);

export function emptyDesk(): CrmData {
  return {
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
}

let seededDesk: CrmData | null = null;

export function seedDesk(): CrmData {
  if (!seededDesk) {
    seededDesk = {
      ...emptyDesk(),
      admins: [
        {
          id: "admin",
          name: "Администратор",
          login: "admin",
          passwordHash: hashPassword("Teplo-2026"),
        },
      ],
    };
  }
  return structuredClone(seededDesk);
}

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function withId(records: Record<string, unknown>[]) {
  return records.filter((item) => typeof item.id === "string" && item.id.length > 0);
}

function normalizeLead(raw: Record<string, unknown>): Lead | null {
  if (typeof raw.id !== "string" || typeof raw.name !== "string" || typeof raw.sellerId !== "string") return null;
  const phones = Array.isArray(raw.phones)
    ? raw.phones.flatMap((item, index) => {
        if (!item || typeof item !== "object") return [];
        const phone = item as { id?: unknown; number?: unknown; owner?: unknown };
        const number = typeof phone.number === "string" ? phone.number : "";
        const owner = typeof phone.owner === "string" ? phone.owner : "";
        if (!number && !owner) return [];
        return [{ id: typeof phone.id === "string" ? phone.id : `${raw.id}-ph-${index}`, number, owner }];
      })
    : [];
  const segment = typeof raw.segment === "string" && SEGMENTS.has(raw.segment) ? raw.segment : "installer";
  return {
    id: raw.id,
    sellerId: raw.sellerId,
    name: raw.name,
    phones,
    companyName: typeof raw.companyName === "string" ? raw.companyName : "",
    city: typeof raw.city === "string" ? raw.city : "",
    email: typeof raw.email === "string" ? raw.email : "",
    segment: segment as Lead["segment"],
    interest: typeof raw.interest === "string" ? raw.interest : "",
    group: leadGroupFromUnknown(raw.group),
    callbackAt: callbackStampOrNull(raw.callbackAt),
    website: typeof raw.website === "string" ? raw.website : "",
    mapUrl: typeof raw.mapUrl === "string" ? raw.mapUrl : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    demo: Boolean(raw.demo),
  };
}

function normalizeCall(raw: Record<string, unknown>): LeadCall | null {
  const calledAt = callbackStampOrNull(raw.calledAt);
  if (typeof raw.id !== "string" || typeof raw.sellerId !== "string" || typeof raw.leadId !== "string" || !calledAt) return null;
  return {
    id: raw.id,
    sellerId: raw.sellerId,
    leadId: raw.leadId,
    calledAt,
    group: leadGroupFromUnknown(raw.group),
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

function normalizeNote(raw: Record<string, unknown>): SellerNote | null {
  if (typeof raw.id !== "string" || typeof raw.sellerId !== "string" || typeof raw.leadId !== "string") return null;
  return {
    id: raw.id,
    sellerId: raw.sellerId,
    leadId: raw.leadId,
    text: typeof raw.text === "string" ? raw.text : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  };
}

function normalizeTask(raw: Record<string, unknown>): Task | null {
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  const kind = typeof raw.kind === "string" && TASK_KINDS.has(raw.kind) ? raw.kind : "call";
  return {
    id: raw.id,
    title: raw.title,
    kind: kind as Task["kind"],
    due: typeof raw.due === "string" ? raw.due : "",
    done: Boolean(raw.done),
    companyId: typeof raw.companyId === "string" ? raw.companyId : null,
    dealId: typeof raw.dealId === "string" ? raw.dealId : null,
    contactId: typeof raw.contactId === "string" ? raw.contactId : null,
    leadId: typeof raw.leadId === "string" ? raw.leadId : null,
  };
}

export function ensureShape(value: unknown): CrmData {
  const raw = value && typeof value === "object" ? (value as Partial<CrmData>) : {};
  const base = emptyDesk();
  return {
    companies: withId(asRecords(raw.companies)) as CrmData["companies"],
    contacts: withId(asRecords(raw.contacts)) as CrmData["contacts"],
    deals: withId(asRecords(raw.deals)) as CrmData["deals"],
    offers: withId(asRecords(raw.offers)) as CrmData["offers"],
    tasks: asRecords(raw.tasks).map(normalizeTask).filter((item): item is Task => item !== null),
    sellers: Array.isArray(raw.sellers) ? raw.sellers : base.sellers,
    admins: Array.isArray(raw.admins) && raw.admins.length ? raw.admins : base.admins,
    leads: asRecords(raw.leads).map(normalizeLead).filter((item): item is Lead => item !== null),
    sellerNotes: asRecords(raw.sellerNotes).map(normalizeNote).filter((item): item is SellerNote => item !== null),
    leadCalls: asRecords(raw.leadCalls).map(normalizeCall).filter((item): item is LeadCall => item !== null),
  };
}

export function blankSecrets(data: CrmData, session: Session): CrmData {
  const sellers = data.sellers.map((seller) => ({ ...seller, passwordHash: "" }));
  const admins = data.admins.map((admin) => ({ ...admin, passwordHash: "" }));
  if (session.kind === "admin") {
    return { ...data, sellers, admins };
  }
  return {
    ...data,
    admins: [],
    sellers: sellers.filter((seller) => seller.id === session.sellerId),
    leads: data.leads.filter((lead) => lead.sellerId === session.sellerId),
    sellerNotes: data.sellerNotes.filter((note) => note.sellerId === session.sellerId),
    leadCalls: data.leadCalls.filter((call) => call.sellerId === session.sellerId),
  };
}

export function mergeSellerDesk(stored: CrmData, body: unknown, sellerId: string): CrmData {
  const incoming = body && typeof body === "object" ? (body as Partial<CrmData>) : {};
  const sellerIds = new Set(stored.sellers.map((seller) => seller.id));
  if (!sellerIds.has(sellerId)) return stored;
  const ownLeads = asRecords(incoming.leads)
    .map(normalizeLead)
    .filter((lead): lead is Lead => lead !== null && lead.sellerId === sellerId);
  const ownLeadIds = new Set(ownLeads.map((lead) => lead.id));
  const ownNotes = asRecords(incoming.sellerNotes)
    .map(normalizeNote)
    .filter((note): note is SellerNote => note !== null && note.sellerId === sellerId && ownLeadIds.has(note.leadId));
  const ownCalls = asRecords(incoming.leadCalls)
    .map(normalizeCall)
    .filter((call): call is LeadCall => call !== null && call.sellerId === sellerId && ownLeadIds.has(call.leadId));
  const leads = [...stored.leads.filter((lead) => lead.sellerId !== sellerId), ...ownLeads];
  const leadIds = new Set(leads.map((lead) => lead.id));
  const tasks = asRecords(incoming.tasks)
    .map(normalizeTask)
    .filter((task): task is Task => task !== null && (!task.leadId || leadIds.has(task.leadId)));
  return {
    ...stored,
    companies: withId(asRecords(incoming.companies)) as CrmData["companies"],
    contacts: withId(asRecords(incoming.contacts)) as CrmData["contacts"],
    deals: withId(asRecords(incoming.deals)) as CrmData["deals"],
    offers: withId(asRecords(incoming.offers)) as CrmData["offers"],
    tasks,
    sellers: stored.sellers,
    admins: stored.admins,
    leads,
    sellerNotes: [...stored.sellerNotes.filter((note) => note.sellerId !== sellerId), ...ownNotes],
    leadCalls: [...stored.leadCalls.filter((call) => call.sellerId !== sellerId), ...ownCalls],
  };
}
