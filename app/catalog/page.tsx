"use client";

import { useState } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { ChoiceSelect, CrmGate, PageHeading } from "@/components/crm-ui";
import { OfferDialog } from "@/components/record-dialogs";
import { useCrm } from "@/lib/crm-context";
import { toast } from "sonner";
import { CATEGORIES, DISCOUNTS, PRICE_POLICY } from "@/lib/policy";
import { PRODUCTS } from "@/lib/products";
import type { DiscountId } from "@/lib/types";

export default function CatalogPage() {
  return (
    <CrmGate>
      <Catalog />
    </CrmGate>
  );
}

function Catalog() {
  const { data, addOfferLine } = useCrm();
  const [discountId, setDiscountId] = useState<DiscountId>("d3");
  const [pickedOffer, setPickedOffer] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const drafts = data.offers.filter((offer) => offer.status === "draft");
  const offerId = drafts.some((offer) => offer.id === pickedOffer) ? pickedOffer ?? "" : drafts[0]?.id ?? "";

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Прайс продавца"
        title="Каталог для коммерческого предложения"
        text={`${PRODUCTS.length} позиций в десяти категориях каталога. Единица — штука, количество целое, как в калькуляторе. Д1–Д3 считаются для LD Pride и Arderia / ТГУ-НОРД с Arderia. Остальные группы политики от 20.01.2026 в калькуляторе каталога не подставляются.`}
      />
      <div className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Скидка для цены в списке</p>
          <ChoiceSelect
            label="Скидка"
            value={discountId}
            onChange={(value) => setDiscountId(value as DiscountId)}
            options={DISCOUNTS.map((item) => ({ value: item.id, label: item.label }))}
          />
          <p className="mt-2 text-xs text-muted-foreground">{PRICE_POLICY.title}</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Куда класть позицию</p>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Черновика нет. Создайте КП, затем возвращайтесь сюда.</p>
          ) : (
            <ChoiceSelect
              label="Черновик КП"
              value={offerId}
              onChange={setPickedOffer}
              options={drafts.map((offer) => {
                const company = data.companies.find((item) => item.id === offer.companyId);
                return { value: offer.id, label: `${offer.number} · ${company?.name ?? "без покупателя"}` };
              })}
            />
          )}
          <button type="button" className="mt-2 text-sm font-medium underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
            Новое КП
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Категории: {CATEGORIES.join(", ")}.</p>
      <CatalogBrowser
        discountId={discountId}
        onAdd={(product) => {
          if (!offerId) {
            toast.error("Сначала создайте черновик КП");
            setOpen(true);
            return;
          }
          addOfferLine(offerId, product.id, 1, "policy");
          toast.success(`${product.article} добавлен в КП`);
        }}
      />
      <OfferDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
