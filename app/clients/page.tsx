"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyDialog } from "@/components/record-dialogs";
import { CrmGate, EmptyState, Money, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { norm } from "@/lib/format";
import { OPEN_STAGES, SEGMENTS } from "@/lib/labels";

export default function ClientsPage() {
  return (
    <CrmGate>
      <Clients />
    </CrmGate>
  );
}

function Clients() {
  const { data } = useCrm();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = norm(query);
  const shown = useMemo(() => {
    return data.companies.filter((company) => {
      if (!needle) return true;
      return norm([company.name, company.city, company.inn, SEGMENTS[company.segment]].join(" ")).includes(needle);
    });
  }, [data.companies, needle]);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Покупатели"
        title="Компании"
        text="Монтажники, торговые и партнёры."
        action={<Button onClick={() => setOpen(true)}>Новая компания</Button>}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, город или ИНН" aria-label="Поиск компаний" />
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title="Таких компаний нет"
          text="Смените запрос или добавьте карточку, если это новый покупатель."
          action={<Button onClick={() => setQuery("")}>Сбросить фильтр</Button>}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((company) => {
            const deals = data.deals.filter((deal) => deal.companyId === company.id);
            const openSum = deals.filter((deal) => OPEN_STAGES.includes(deal.stage)).reduce((sum, deal) => sum + deal.amount, 0);
            const contacts = data.contacts.filter((contact) => contact.companyId === company.id).length;
            return (
              <li key={company.id}>
                <Link href={`/clients/${company.id}`} className="block rounded-2xl bg-card p-4 ring-1 ring-foreground/10 hover:bg-accent/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{company.name}</h2>
                      <p className="text-sm text-muted-foreground">{company.city} · {SEGMENTS[company.segment]}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">В работе <Money value={openSum} className="font-medium tabular-nums" /></p>
                  <p className="text-xs text-muted-foreground">{deals.length} сделок · {contacts} контактов</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <CompanyDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
