"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { todayIso, uid } from "@/lib/format";
import { quoteProduct } from "@/lib/pricing";
import { productById } from "@/lib/products";
import { createSeed } from "@/lib/seed";
import type {
  Company,
  Contact,
  CrmData,
  Deal,
  DealStage,
  DiscountId,
  Offer,
  OfferLine,
  PriceMode,
  Task,
} from "@/lib/types";

const STORAGE_KEY = "telpcrm.v1";

const EMPTY: CrmData = {
  companies: [],
  contacts: [],
  deals: [],
  offers: [],
  tasks: [],
};

type Status = "loading" | "ready" | "error";

type Snapshot = {
  status: Status;
  error: string | null;
  data: CrmData;
};

const SERVER_SNAPSHOT: Snapshot = { status: "loading", error: null, data: EMPTY };

let clientSnapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function isCrmData(value: unknown): value is CrmData {
  if (!value || typeof value !== "object") return false;
  const data = value as CrmData;
  return (
    Array.isArray(data.companies) &&
    Array.isArray(data.contacts) &&
    Array.isArray(data.deals) &&
    Array.isArray(data.offers) &&
    Array.isArray(data.tasks)
  );
}

function publish(next: Snapshot) {
  clientSnapshot = next;
  if (next.status === "ready") localStorage.setItem(STORAGE_KEY, JSON.stringify(next.data));
  listeners.forEach((listener) => listener());
}

function readClient(): Snapshot {
  if (clientSnapshot) return clientSnapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = createSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      clientSnapshot = { status: "ready", error: null, data };
    } else {
      const parsed: unknown = JSON.parse(raw);
      if (!isCrmData(parsed)) throw new Error("Демо-данные в браузере повреждены.");
      clientSnapshot = { status: "ready", error: null, data: parsed };
    }
  } catch (caught) {
    clientSnapshot = {
      status: "error",
      error: caught instanceof Error ? caught.message : "Не удалось открыть демо-данные.",
      data: EMPTY,
    };
  }
  return clientSnapshot;
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
  publish({ status: "ready", error: null, data: next });
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
  data: CrmData;
  reset: () => void;
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

  const api = useMemo<CrmApi>(() => {
    return {
      status: snapshot.status,
      error: snapshot.error,
      data: snapshot.data,
      reset: () => {
        publish({ status: "ready", error: null, data: createSeed() });
        toast.success("Демо-данные восстановлены");
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
