"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactDialog } from "@/components/record-dialogs";
import { CrmGate, DemoBadge, EmptyState, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { norm } from "@/lib/format";

export default function ContactsPage() {
  return (
    <CrmGate>
      <Contacts />
    </CrmGate>
  );
}

function Contacts() {
  const { data } = useCrm();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = norm(query);
  const shown = useMemo(() => {
    return data.contacts.filter((contact) => {
      const company = data.companies.find((item) => item.id === contact.companyId);
      return norm([contact.name, contact.role, contact.phone, contact.email, company?.name ?? ""].join(" ")).includes(needle);
    });
  }, [data.contacts, data.companies, needle]);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Люди"
        title="Контакты"
        text="Кому звонить и на чьё имя ставить коммерческое предложение."
        action={<Button onClick={() => setOpen(true)}>Новый контакт</Button>}
      />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, должность, телефон или компания" aria-label="Поиск контактов" />
      {shown.length === 0 ? (
        <EmptyState
          title="Контакт не найден"
          text="Проверьте написание или добавьте человека в карточку компании."
          action={<Button variant="outline" onClick={() => setQuery("")}>Очистить поиск</Button>}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {shown.map((contact) => {
            const company = data.companies.find((item) => item.id === contact.companyId);
            return (
              <li key={contact.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{contact.name} {contact.demo ? <DemoBadge /> : null}</p>
                  <p className="text-sm text-muted-foreground">{contact.role || "без должности"} · {contact.phone || "без телефона"} · {contact.email || "без почты"}</p>
                </div>
                {company ? (
                  <Link href={`/clients/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Компания не указана</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ContactDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
