import { policyPrice } from "@/lib/policy";
import type { DiscountId, OfferLine, PriceMode, Product } from "@/lib/types";
import { uid } from "@/lib/format";

const COLUMN_LABEL: Record<Exclude<PriceMode, "policy">, string> = {
  wholesale: "Колонка прайса «Опт»",
  rrp: "Колонка прайса «РРЦ»",
  moc: "Колонка прайса «МОЦ»",
  prepay: "Колонка прайса «Дистриб. предоплата»",
  deferral: "Колонка прайса «Дистриб. отсрочка»",
};

export function columnPrice(product: Product, mode: Exclude<PriceMode, "policy">) {
  if (mode === "wholesale") return product.wholesale;
  if (mode === "rrp") return product.rrp;
  if (mode === "moc") return product.moc;
  if (mode === "prepay") return product.distributorPrepay;
  return product.distributorDeferral;
}

export function quoteProduct(product: Product, discountId: DiscountId, priceMode: PriceMode) {
  if (priceMode === "policy") {
    const priced = policyPrice(product, discountId);
    return {
      unitPrice: priced.price,
      priceLabel: priced.label,
    };
  }
  return {
    unitPrice: columnPrice(product, priceMode),
    priceLabel: COLUMN_LABEL[priceMode],
  };
}

export function buildLine(
  product: Product,
  quantity: number,
  discountId: DiscountId,
  priceMode: PriceMode,
  id = uid("line"),
): OfferLine {
  const priced = quoteProduct(product, discountId, priceMode);
  return {
    id,
    productId: product.id,
    quantity,
    priceMode,
    article: product.article,
    name: product.name,
    unit: product.unit,
    unitPrice: priced.unitPrice,
    priceLabel: priced.priceLabel,
    priceOrigin: product.priceOrigin,
  };
}

export function lineTotal(line: OfferLine) {
  if (line.unitPrice == null) return null;
  return Math.round(line.unitPrice * line.quantity * 100) / 100;
}

export function offerTotal(lines: OfferLine[]) {
  if (lines.some((line) => line.unitPrice == null)) return null;
  return lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0);
}
