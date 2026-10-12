"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OfferDialog } from "@/components/record-dialogs";
import { CrmGate, DemoBadge, EmptyState, Money, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatDate } from "@/lib/format";
import { OFFER_STATUS } from "@/lib/labels";
import { discountById } from "@/lib/policy";
import { offerTotal } from "@/lib/pricing";
import type { OfferStatus } from "@/lib/types";

const FILTERS: { id: "all" | OfferStatus; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "draft", label: "Черновики" },
  { id: "sent", label: "Отправленные" },
  { id: "accepted", label: "Принятые" },
  { id: "rejected", label: "Отклонённые" },
];

export default function OffersPage() {
  return (
    <CrmGate>
      <Offers />
    </CrmGate>
  );
}

function Offers() {
  const { data } = useCrm();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const shown = data.offers.filter((offer) => filter === "all" || offer.status === filter);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Предложения"
        title="Коммерческие предложения"
        text="Состав берётся из каталога. Скидка Д1, Д2, Д3 и частникам считается так же, как в каталоге продавца."
        action={<Button onClick={() => setOpen(true)}>Новое КП</Button>}
      />
      <div className="flex gap-2 overflow-x-auto" role="toolbar" aria-label="Статус КП">
        {FILTERS.map((item) => (
          <Button key={item.id} size="sm" variant={filter === item.id ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title="В этом статусе пусто"
          text={filter === "rejected" ? "Отклонённых предложений нет. Это нормально: отказ появится, когда покупатель откажется." : "Соберите КП из каталога и отправьте покупателю."}
          action={<Button variant="outline" onClick={() => setFilter("all")}>Показать все</Button>}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {shown.map((offer) => {
            const company = data.companies.find((item) => item.id === offer.companyId);
            return (
              <li key={offer.id}>
                <Link href={`/offers/${offer.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="font-medium">{offer.number}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {company?.name} · {OFFER_STATUS[offer.status]} · {discountById(offer.discountId).shortLabel} · {formatDate(offer.issuedOn)}
                    </span>
                    {company?.demo ? <span className="mt-1 inline-block"><DemoBadge /></span> : null}
                  </span>
                  <Money value={offerTotal(offer.lines)} className="font-medium tabular-nums" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <OfferDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
