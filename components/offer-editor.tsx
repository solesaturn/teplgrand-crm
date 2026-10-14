"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CatalogBrowser } from "@/components/catalog-browser";
import { ChoiceSelect, EmptyState, Money } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatDate } from "@/lib/format";
import { OFFER_STATUS } from "@/lib/labels";
import { COMPANY, DISCOUNTS, discountById } from "@/lib/policy";
import { lineTotal, offerTotal } from "@/lib/pricing";
import type { DiscountId, Offer, OfferStatus, PriceMode } from "@/lib/types";

const PRICE_MODES: { value: PriceMode; label: string }[] = [
  { value: "policy", label: "Калькулятор каталога" },
  { value: "wholesale", label: "Колонка «Опт»" },
  { value: "rrp", label: "Колонка «РРЦ»" },
  { value: "moc", label: "Колонка «МОЦ»" },
  { value: "prepay", label: "Дистриб. предоплата" },
  { value: "deferral", label: "Дистриб. отсрочка" },
];

export function OfferEditor({ offer }: { offer: Offer }) {
  const { data, updateOffer, addOfferLine, updateOfferLine, removeOfferLine } = useCrm();
  const [picker, setPicker] = useState(false);
  const company = data.companies.find((item) => item.id === offer.companyId);
  const contact = data.contacts.find((item) => item.id === offer.contactId);
  const deal = data.deals.find((item) => item.id === offer.dealId);
  const total = offerTotal(offer.lines);
  const discount = discountById(offer.discountId);
  const missing = offer.lines.some((line) => line.unitPrice == null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.48_0.06_55)] uppercase">Коммерческое предложение</p>
          <h1 className="text-2xl font-semibold">{offer.number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {company ? <Link href={`/clients/${company.id}`} className="font-medium text-foreground hover:underline">{company.name}</Link> : "Покупатель удалён"}
            {" · "}
            {formatDate(offer.issuedOn)}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
          <ChoiceSelect
            label="Статус КП"
            value={offer.status}
            onChange={(value) => updateOffer(offer.id, { status: value as OfferStatus })}
            options={Object.entries(OFFER_STATUS).map(([value, label]) => ({ value, label }))}
          />
          <ChoiceSelect
            label="Скидка"
            value={offer.discountId}
            onChange={(value) => updateOffer(offer.id, { discountId: value as DiscountId })}
            options={DISCOUNTS.map((item) => ({ value: item.id, label: item.shortLabel }))}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{discount.hint}</p>

      <div className="no-print flex flex-wrap gap-2">
        <Button type="button" onClick={() => setPicker(true)}>Добавить из каталога</Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>Печать</Button>
        {deal ? (
          <Button variant="outline" nativeButton={false} render={<Link href={`/deals/${deal.id}`} />}>
            Сделка
          </Button>
        ) : null}
      </div>

      {offer.lines.length === 0 ? (
        <EmptyState
          title="В предложении пока нет позиций"
          text="Откройте каталог и добавьте термоблоки, краны, насосы или котлы. Цена посчитается по выбранной скидке."
          action={<Button type="button" onClick={() => setPicker(true)}>Выбрать позиции</Button>}
        />
      ) : (
        <div className="no-print overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Позиция</th>
                <th className="px-3 py-2 font-medium">Кол-во</th>
                <th className="px-3 py-2 font-medium">Откуда цена</th>
                <th className="px-3 py-2 text-right font-medium">Цена</th>
                <th className="px-3 py-2 text-right font-medium">Сумма</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {offer.lines.map((line) => (
                <tr key={line.id} className="border-b last:border-0 align-top">
                  <td className="px-3 py-3">
                    <p className="font-mono text-xs text-muted-foreground">{line.article}</p>
                    <p className="font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">{line.priceLabel} · {line.unit}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      className="w-20"
                      inputMode="numeric"
                      aria-label={`Количество: ${line.name}`}
                      value={String(line.quantity)}
                      onChange={(event) => {
                        const quantity = Number(event.target.value);
                        if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 100000) {
                          updateOfferLine(offer.id, line.id, { quantity });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ChoiceSelect
                      label={`Цена для ${line.name}`}
                      value={line.priceMode}
                      onChange={(value) => updateOfferLine(offer.id, line.id, { priceMode: value as PriceMode })}
                      options={PRICE_MODES}
                    />
                  </td>
                  <td className="px-3 py-3 text-right"><Money value={line.unitPrice} /></td>
                  <td className="px-3 py-3 text-right font-medium"><Money value={lineTotal(line)} /></td>
                  <td className="px-3 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeOfferLine(offer.id, line.id)}>
                      Убрать
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="no-print block space-y-1">
        <span className="text-sm font-medium">Комментарий для себя</span>
        <Textarea value={offer.note} onChange={(event) => updateOffer(offer.id, { note: event.target.value })} />
      </label>

      <article className="print-sheet rounded-2xl bg-white p-6 text-neutral-900 shadow-sm ring-1 ring-black/10">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-neutral-500 uppercase">Теплогранд</p>
            <h2 className="text-xl font-semibold">{COMPANY.name}</h2>
            <p className="mt-1 text-xs text-neutral-600">{COMPANY.line}</p>
          </div>
          <div className="text-sm sm:text-right">
            <p>ИНН {COMPANY.inn}</p>
            <p>{COMPANY.phone}</p>
            <p>{COMPANY.email}</p>
            <p>{COMPANY.site}</p>
          </div>
        </header>
        <h3 className="mt-5 text-lg font-semibold">Коммерческое предложение {offer.number}</h3>
        <p className="text-sm text-neutral-600">от {formatDate(offer.issuedOn)}, действует {offer.validDays} дней</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Покупатель</dt>
            <dd className="font-medium">{company?.name ?? "—"}{company?.city ? `, ${company.city}` : ""}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Контакт</dt>
            <dd className="font-medium">{contact ? `${contact.name}${contact.phone ? `, ${contact.phone}` : ""}` : "не указан"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Уровень цены</dt>
            <dd className="font-medium">{discount.label}</dd>
          </div>
        </dl>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="py-2 font-medium">Артикул</th>
              <th className="py-2 font-medium">Наименование</th>
              <th className="py-2 font-medium">Ед.</th>
              <th className="py-2 text-right font-medium">Кол-во</th>
              <th className="py-2 text-right font-medium">Цена</th>
              <th className="py-2 text-right font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {offer.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-neutral-500">Позиции ещё не выбраны.</td>
              </tr>
            ) : offer.lines.map((line) => (
              <tr key={line.id} className="border-b border-neutral-100 align-top">
                <td className="py-2 font-mono text-xs">{line.article}</td>
                <td className="py-2 pr-2">{line.name}</td>
                <td className="py-2">{line.unit}</td>
                <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                <td className="py-2 text-right"><Money value={line.unitPrice} /></td>
                <td className="py-2 text-right"><Money value={lineTotal(line)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-right text-base font-semibold">Итого: <Money value={total} /></p>
        {missing ? <p className="mt-2 text-sm text-neutral-600">Часть позиций без цены: в политике нет ставки, а колонка прайса не выбрана.</p> : null}
        {offer.note ? <p className="mt-3 text-sm text-neutral-700">{offer.note}</p> : null}
        <p className="mt-6 text-sm">
          С уважением,<br />
          {COMPANY.role} {COMPANY.name}
        </p>
      </article>

      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl!">
          <DialogHeader>
            <DialogTitle>Каталог для {offer.number}</DialogTitle>
            <DialogDescription>Цена в списке — как её считает калькулятор каталога для скидки «{discount.shortLabel}».</DialogDescription>
          </DialogHeader>
          <CatalogBrowser
            discountId={offer.discountId}
            onAdd={(product) => {
              addOfferLine(offer.id, product.id, 1, "policy");
              setPicker(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
