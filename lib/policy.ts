import type { DiscountId, Product } from "@/lib/types";

export const PRICE_POLICY = {
  title: "Ценовая политика Теплогранд от 20.01.2026",
  sourceFile: "Ценовая_политика_Теплогранд_20_01_2026.xlsx",
  sheet: "Лист1",
  notes: {
    d1: "Цена МОЦ = Цена Д1 — Цена Партнер. Для клиентов с закупкой от 2,0 млн руб в год",
    d2: "Цена Д2=Цена Крупный опт Для клиентов с закупкой от 0,5 до 2,0 млн руб в год",
    d3: "Цена Д3 = Опт Для клиентов с закупкой от 0,1 до 0,5 млн руб в год",
    installers:
      "Для Монтажников цена : Д3 , при разовых закупках, либо Д2 при закупке более 100 000 руб",
    traders:
      "Для торговых компаний: Базовая цена Д1, если торговая компания маленькая , закупки разовые на сумму менее 50 тыс руб - то Д2",
    privateCustomers:
      "по РРЦ продаем частникам, либо делаем скидку от РРЦ 5-10% , в зависимости от суммы заказа.",
  },
  tiers: [
    { id: "d1" as const, code: "Д1", name: "Партнер", column: "E" },
    { id: "d2" as const, code: "Д2", name: "Крупный опт", column: "F" },
    { id: "d3" as const, code: "Д3", name: "Опт", column: "G" },
    { id: "rrp" as const, code: "РРЦ", name: "РРЦ", column: "H" },
  ],
  d1AlsoCalled: "МОЦ",
  privateDiscountRates: [0.05, 0.1],
  groups: [
    { row: 22, name: "Латунные краны LD и фитинг", purchase: 0.485, rates: { d1: 0.35, d2: 0.32, d3: 0.25, rrp: 0 } },
    { row: 23, name: "УТДК", purchase: 0.5833, rates: { d1: 0.5, d2: 0.45, d3: 0.4, rrp: 0 } },
    { row: 31, name: "Стальные краны LD", purchase: 0.22, rates: { d1: 0.1, d2: 0.08, d3: 0.07, rrp: 0 } },
    { row: 32, name: "GAPPO", purchase: 0.24, rates: { d1: 0.12, d2: 0.05, d3: 0, rrp: 0 } },
    { row: 33, name: "MVI", purchase: 0.5, rates: { d1: 0.4, d2: 0.38, d3: 0.3, rrp: 0 } },
    { row: 34, name: "Крепеж", purchase: 0.5, rates: { d1: 0.42, d2: 0.4, d3: 0.35, rrp: 0 } },
    { row: 35, name: "Мизудо", purchase: 0.2, rates: { d1: 0.15, d2: 0.1, d3: 0.05, rrp: 0 } },
    { row: 36, name: "Зонт автоматика", purchase: 0.4, rates: { d1: 0.25, d2: 0.22, d3: 0.18, rrp: 0 } },
    { row: 37, name: "Ардерия", purchase: null, rates: { d1: null, d2: null, d3: null, rrp: null } },
    { row: 38, name: "CNP", purchase: 0.47, rates: { d1: 0.3, d2: 0.25, d3: 0.2, rrp: 0 } },
    { row: 39, name: "WILO", purchase: 0.45, rates: { d1: 0.34, d2: 0.3, d3: 0.28, rrp: null } },
    { row: 40, name: "Royal Thermo радиатор СПР", purchase: 0.37, rates: { d1: 0.27, d2: 0.25, d3: 0.2, rrp: 0 } },
    { row: 41, name: "Royal Thermo радиатор Бойлер", purchase: null, rates: { d1: null, d2: null, d3: null, rrp: 0 } },
    { row: 42, name: "Vieir", purchase: 0.2, rates: { d1: 0.08, d2: 0.05, d3: 0, rrp: null } },
    { row: 43, name: "Сантехмастер", purchase: null, rates: { d1: null, d2: null, d3: null, rrp: null } },
    { row: 44, name: "ШРП НОРД", purchase: null, rates: { d1: 10900, d2: 12480, d3: 12480, rrp: 15800 } },
  ],
} as const;

export const COMPANY = {
  name: "ООО «ТеплоГранд»",
  inn: "9729315887",
  phone: "8 800 250 57 10",
  email: "info@teplogrand.pro",
  site: "teplogrand.pro",
  line: "ОТОПЛЕНИЕ. ВОДОСНАБЖЕНИЕ. ГАЗИФИКАЦИЯ",
  role: "Менеджер по дистрибьюции",
} as const;

export const CATEGORIES = [
  "Котлы газовые",
  "Котлы электрические",
  "Краны",
  "Фитинги",
  "ТГУ-НОРД-С",
  "Коллекторы и узлы",
  "Дымоходы",
  "Насосы",
  "Автоматика и аксессуары",
  "Водонагреватели и бойлеры",
] as const;

const BRASS = "Латунные краны LD и фитинг";
const STEEL = "Стальные краны LD";
const ARDERIA = "Ардерия";
const MIZUDO = "Мизудо";

export type DiscountOption = {
  id: DiscountId;
  label: string;
  shortLabel: string;
  hint: string;
};

function norm(value: string) {
  return value.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();
}

function groupByName(name: string) {
  const found = PRICE_POLICY.groups.find((group) => norm(group.name) === norm(name));
  if (!found) throw new Error(`В ценовой политике нет строки «${name}»`);
  return found;
}

function policyGroup(product: Pick<Product, "brand" | "name" | "specs" | "description" | "category">) {
  if (product.brand === "LD Pride") {
    const text = norm(
      [product.name, product.specs, product.description, product.category, product.brand].join(" "),
    );
    const steel =
      !text.includes("латун") &&
      (text.includes("стальные краны") || text.includes("стальной кран") || text.includes("корпус сталь"));
    return groupByName(steel ? STEEL : BRASS);
  }
  if (product.brand === "Arderia" || product.brand === "ТГУ-НОРД / Arderia") {
    const mizudo = groupByName(MIZUDO);
    const arderia = groupByName(ARDERIA);
    return {
      row: arderia.row,
      name: "Ардерия (ставки «Мизудо»)",
      purchase: arderia.purchase,
      rates: {
        d1: mizudo.rates.d1,
        d2: mizudo.rates.d2,
        d3: mizudo.rates.d3,
        rrp: arderia.rates.rrp,
      },
    };
  }
  return null;
}

export function roundMoney(value: number) {
  return Math.round(100 * value) / 100;
}

export const DISCOUNTS: DiscountOption[] = [
  {
    id: "d1",
    label: "Д1 — Партнер (МОЦ)",
    shortLabel: "Д1 Партнер",
    hint: `${PRICE_POLICY.notes.d1} ${PRICE_POLICY.notes.traders}`,
  },
  {
    id: "d2",
    label: "Д2 — Крупный опт",
    shortLabel: "Д2 Крупный опт",
    hint: `${PRICE_POLICY.notes.d2} ${PRICE_POLICY.notes.installers} ${PRICE_POLICY.notes.traders}`,
  },
  {
    id: "d3",
    label: "Д3 — Опт",
    shortLabel: "Д3 Опт",
    hint: `${PRICE_POLICY.notes.d3} ${PRICE_POLICY.notes.installers}`,
  },
  {
    id: "rrp",
    label: "РРЦ, без скидки",
    shortLabel: "РРЦ",
    hint: PRICE_POLICY.notes.privateCustomers,
  },
  {
    id: "private-5",
    label: "Частникам 5% от РРЦ",
    shortLabel: "Частникам 5%",
    hint: PRICE_POLICY.notes.privateCustomers,
  },
  {
    id: "private-10",
    label: "Частникам 10% от РРЦ",
    shortLabel: "Частникам 10%",
    hint: PRICE_POLICY.notes.privateCustomers,
  },
];

export function discountById(id: DiscountId) {
  const found = DISCOUNTS.find((item) => item.id === id);
  if (!found) throw new Error(`Неизвестная скидка: ${id}`);
  return found;
}

function percentLabel(rate: number) {
  const value = Math.round(10000 * rate) / 100;
  const text = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  return `${text}%`;
}

export function policyPrice(
  product: Pick<Product, "brand" | "name" | "specs" | "description" | "category" | "rrp">,
  discountId: DiscountId,
): { price: number | null; label: string } {
  const option = discountById(discountId);
  if (discountId === "private-5" || discountId === "private-10") {
    const rate = discountId === "private-5" ? 0.05 : 0.1;
    return {
      label: option.label,
      price: product.rrp == null ? null : roundMoney(product.rrp * (1 - rate)),
    };
  }
  if (discountId === "rrp") {
    const group = policyGroup(product);
    const fixed = group?.rates.rrp;
    if (typeof fixed === "number" && fixed >= 1) {
      return { label: `${option.label} · ${group?.name}`, price: fixed };
    }
    const suffix = group && fixed === 0 ? ` · ${group.name}` : "";
    return { label: `${option.label}${suffix}`, price: product.rrp };
  }
  const group = policyGroup(product);
  if (!group) {
    return { label: `${option.shortLabel}: нет номенклатуры в политике`, price: null };
  }
  const rate = group.rates[discountId];
  if (rate == null) {
    return { label: `${option.shortLabel}: нет ставки в политике «${group.name}»`, price: null };
  }
  const rateText = rate >= 1 ? "фикс" : percentLabel(rate);
  const price = rate >= 1 ? rate : product.rrp == null ? null : roundMoney(product.rrp * (1 - rate));
  return { label: `${option.shortLabel} · ${group.name} · ${rateText}`, price };
}
