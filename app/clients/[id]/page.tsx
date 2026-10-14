"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactDialog, DealDialog, OfferDialog, TaskDialog } from "@/components/record-dialogs";
import { CrmGate, EmptyState, Money, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { SEGMENTS, stageTitle } from "@/lib/labels";

export default function ClientPage() {
  return (
    <CrmGate>
      <Client />
    </CrmGate>
  );
}

function Client() {
  const params = useParams<{ id: string }>();
  const { data } = useCrm();
  const company = data.companies.find((item) => item.id === params.id);
  const [contactOpen, setContactOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  if (!company) {
    return (
      <EmptyState
        title="Компания не найдена"
        text="Карточка могла быть из другого браузера. Вернитесь к списку."
        action={<Button nativeButton={false} render={<Link href="/clients" />}>К компаниям</Button>}
      />
    );
  }

  const contacts = data.contacts.filter((contact) => contact.companyId === company.id);
  const deals = data.deals.filter((deal) => deal.companyId === company.id);
  const tasks = data.tasks.filter((task) => task.companyId === company.id && !task.done);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={company.city}
        title={company.name}
        text={`${SEGMENTS[company.segment]}${company.inn ? ` · ИНН ${company.inn}` : ""} · ${company.phone || "телефон не указан"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setContactOpen(true)}>Контакт</Button>
            <Button variant="outline" onClick={() => setDealOpen(true)}>Сделка</Button>
            <Button onClick={() => setOfferOpen(true)}>Новое КП</Button>
          </div>
        }
      />
      {company.note ? <p className="max-w-3xl text-sm text-muted-foreground">{company.note}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Контакты</h2>
          {contacts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Контактов нет. Добавьте того, кому звонить.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {contacts.map((contact) => (
                <li key={contact.id} className="text-sm">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-muted-foreground">{contact.role || "должность не указана"} · {contact.phone || "без телефона"} · {contact.email || "без почты"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Открытые напоминания</h2>
            <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>Добавить</Button>
          </div>
          {tasks.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Напоминаний нет. Поставьте звонок, если ждёте ответ.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {tasks.map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Сделки</h2>
        {deals.length === 0 ? (
          <EmptyState title="Сделок ещё нет" text="Заведите первую, когда появится объект или запрос на прайс." action={<Button onClick={() => setDealOpen(true)}>Новая сделка</Button>} />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/deals/${deal.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block font-medium">{deal.title}</span>
                    <span className="text-sm text-muted-foreground">{stageTitle(deal.stage)} · {deal.nextStep}</span>
                  </span>
                  <Money value={deal.amount} className="font-medium tabular-nums" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} companyId={company.id} />
      <DealDialog open={dealOpen} onOpenChange={setDealOpen} companyId={company.id} />
      <OfferDialog open={offerOpen} onOpenChange={setOfferOpen} companyId={company.id} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} companyId={company.id} contactId={contacts[0]?.id} />
    </div>
  );
}
