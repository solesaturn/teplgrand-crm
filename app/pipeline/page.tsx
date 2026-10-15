"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { DealDialog } from "@/components/record-dialogs";
import { ChoiceSelect, CrmGate, EmptyState, Money, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { STAGES } from "@/lib/labels";
import type { DealStage } from "@/lib/types";

export default function PipelinePage() {
  return (
    <CrmGate>
      <Pipeline />
    </CrmGate>
  );
}

function Pipeline() {
  const { data, moveDeal, removeDeal, session } = useCrm();
  const isAdmin = session?.kind === "admin";
  const [stage, setStage] = useState<DealStage>("new");
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const current = STAGES.find((item) => item.id === stage) ?? STAGES[0];
  const deals = data.deals.filter((deal) => deal.stage === current.id);
  const confirmingDeal = data.deals.find((deal) => deal.id === confirming) ?? null;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeading
        eyebrow="Воронка"
        title="Сделки"
        text="Этапы переносятся по ширине экрана. Под выбранным этапом — его сделки. Этап меняется прямо на карточке."
        action={<Button onClick={() => setOpen(true)}>Новая сделка</Button>}
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Этапы сделок">
        {STAGES.map((item) => {
          const count = data.deals.filter((deal) => deal.stage === item.id).length;
          const selected = item.id === current.id;
          return (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              className="rounded-full"
              role="tab"
              aria-selected={selected}
              style={
                selected
                  ? { backgroundColor: "#3f2e24", color: "#ffffff", borderColor: "#3f2e24" }
                  : { backgroundColor: "#ffffff", color: "#2c241c", borderColor: "#e4d7c8" }
              }
              onClick={() => setStage(item.id)}
            >
              {item.title} {count}
            </Button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{current.hint}</p>
      {deals.length === 0 ? (
        <EmptyState
          title={data.deals.length === 0 ? "Воронка пустая" : "На этом этапе пусто"}
          text={data.deals.length === 0 ? "Добавьте сделку, когда появится запрос на оборудование." : `${current.hint}. Выберите другой этап или переведите сюда карточку.`}
          action={<Button onClick={() => setOpen(true)}>Новая сделка</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {deals.map((deal) => {
            const company = data.companies.find((item) => item.id === deal.companyId);
            return (
              <li key={deal.id} className="min-w-0 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={`/deals/${deal.id}`} className="break-words text-sm font-medium hover:underline">{deal.title}</Link>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{company?.name ?? "Компания не указана"}</p>
                    <p className="mt-2 text-sm"><Money value={deal.amount} className="font-medium tabular-nums" /></p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{deal.nextStep}</p>
                  </div>
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:w-64 sm:shrink-0">
                    <ChoiceSelect
                      label={`Этап ${deal.title}`}
                      value={deal.stage}
                      onChange={(value) => moveDeal(deal.id, value as DealStage)}
                      options={STAGES.map((item) => ({ value: item.id, label: item.title }))}
                    />
                    {isAdmin ? (
                      <Button type="button" variant="outline" size="sm" className="self-start" aria-label={`Удалить сделку ${deal.title}`} onClick={() => setConfirming(deal.id)}>
                        Удалить
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <DealDialog open={open} onOpenChange={setOpen} />
      <ConfirmDelete
        open={confirmingDeal !== null}
        title={confirmingDeal ? `Удалить «${confirmingDeal.title}»?` : "Удалить сделку?"}
        description="Эта сделка исчезнет из воронки. Компания и коммерческие предложения останутся."
        pending={deleting}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirmingDeal) return;
          const id = confirmingDeal.id;
          setDeleting(true);
          void removeDeal(id).then((ok) => {
            setDeleting(false);
            if (!ok) return;
            setConfirming(null);
          });
        }}
      />
    </div>
  );
}
