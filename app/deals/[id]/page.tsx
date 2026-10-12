"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OfferDialog, TaskDialog } from "@/components/record-dialogs";
import { ChoiceSelect, CrmGate, EmptyState, Money, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatDate } from "@/lib/format";
import { OFFER_STATUS, STAGES } from "@/lib/labels";
import { offerTotal } from "@/lib/pricing";
import type { DealStage } from "@/lib/types";

export default function DealPage() {
  return (
    <CrmGate>
      <Deal />
    </CrmGate>
  );
}

function Deal() {
  const params = useParams<{ id: string }>();
  const { data, updateDeal } = useCrm();
  const deal = data.deals.find((item) => item.id === params.id);
  const [offerOpen, setOfferOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  if (!deal) {
    return <EmptyState title="Сделка не найдена" text="Возможно, демо-данные были сброшены." action={<Button render={<Link href="/pipeline" />}>К воронке</Button>} />;
  }

  const company = data.companies.find((item) => item.id === deal.companyId);
  const contact = data.contacts.find((item) => item.id === deal.contactId);
  const offers = data.offers.filter((offer) => offer.dealId === deal.id);
  const tasks = data.tasks.filter((task) => task.dealId === deal.id);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={company?.name}
        title={deal.title}
        text={contact ? `${contact.name}, ${contact.role}` : "Контакт не выбран"}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTaskOpen(true)}>Напоминание</Button>
            <Button onClick={() => setOfferOpen(true)}>Собрать КП</Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Ожидаемая сумма</p>
          <p className="mt-1 text-xl font-semibold"><Money value={deal.amount} /></p>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:col-span-2">
          <p className="mb-2 text-xs text-muted-foreground">Этап</p>
          <ChoiceSelect
            label="Этап сделки"
            value={deal.stage}
            onChange={(value) => updateDeal(deal.id, { stage: value as DealStage })}
            options={STAGES.map((item) => ({ value: item.id, label: item.title }))}
          />
        </div>
      </div>
      <NextStepForm
        key={deal.id}
        initial={deal.nextStep}
        onSave={(nextStep) => updateDeal(deal.id, { nextStep })}
      />
      <p className="text-xs text-muted-foreground">Обновлено {formatDate(deal.updatedAt)}</p>

      <section className="space-y-3">
        <h2 className="font-semibold">Коммерческие предложения</h2>
        {offers.length === 0 ? (
          <EmptyState title="КП по сделке ещё нет" text="Соберите состав из каталога: термоблоки, краны, насосы, котлы." action={<Button onClick={() => setOfferOpen(true)}>Собрать КП</Button>} />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {offers.map((offer) => (
              <li key={offer.id}>
                <Link href={`/offers/${offer.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/30">
                  <span>{offer.number} · {OFFER_STATUS[offer.status]}</span>
                  <Money value={offerTotal(offer.lines)} className="font-medium tabular-nums" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Задачи</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">По этой сделке напоминаний нет.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {tasks.map((task) => (
              <li key={task.id}>{task.done ? "Готово: " : ""}{task.title} · {formatDate(task.due)}</li>
            ))}
          </ul>
        )}
      </section>

      <OfferDialog open={offerOpen} onOpenChange={setOfferOpen} companyId={deal.companyId} dealId={deal.id} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} companyId={deal.companyId} dealId={deal.id} contactId={deal.contactId ?? undefined} />
    </div>
  );
}

function NextStepForm({ initial, onSave }: { initial: string; onSave: (value: string) => void }) {
  const [nextStep, setNextStep] = useState(initial);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(nextStep);
      }}
    >
      <Input value={nextStep} onChange={(event) => setNextStep(event.target.value)} aria-label="Следующий шаг" />
      <Button type="submit" variant="outline">Сохранить шаг</Button>
    </form>
  );
}
