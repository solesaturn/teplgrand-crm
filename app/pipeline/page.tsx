"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DealDialog } from "@/components/record-dialogs";
import { CrmGate, DemoBadge, EmptyState, Money, PageHeading } from "@/components/crm-ui";
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
  const { data, moveDeal } = useCrm();
  const [dragging, setDragging] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Воронка"
        title="Сделки"
        text="На широком экране карточку можно перетащить на другой этап. На телефоне этап меняется в карточке сделки."
        action={<Button onClick={() => setOpen(true)}>Новая сделка</Button>}
      />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const deals = data.deals.filter((deal) => deal.stage === stage.id);
          return (
            <section
              key={stage.id}
              className="w-[260px] shrink-0 rounded-2xl bg-muted/60 p-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging) moveDeal(dragging, stage.id);
                setDragging(null);
              }}
            >
              <header className="px-2 py-2">
                <h2 className="text-sm font-semibold">{stage.title}</h2>
                <p className="text-xs text-muted-foreground">{stage.hint} · {deals.length}</p>
              </header>
              {deals.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">На этом этапе пусто</p>
              ) : (
                <ul className="space-y-2">
                  {deals.map((deal) => {
                    const company = data.companies.find((item) => item.id === deal.companyId);
                    return (
                      <li key={deal.id}>
                        <article
                          draggable
                          onDragStart={() => setDragging(deal.id)}
                          className="cursor-grab rounded-xl bg-card p-3 ring-1 ring-foreground/10 active:cursor-grabbing"
                        >
                          <Link href={`/deals/${deal.id}`} className="text-sm font-medium hover:underline">{deal.title}</Link>
                          <p className="mt-1 text-xs text-muted-foreground">{company?.name}</p>
                          <p className="mt-2 text-sm"><Money value={deal.amount} className="font-medium tabular-nums" /></p>
                          <p className="mt-1 text-xs text-muted-foreground">{deal.nextStep}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {company?.demo ? <DemoBadge /> : <span />}
                            <StageJump id={deal.id} stage={deal.stage} />
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {data.deals.length === 0 ? (
        <EmptyState title="Воронка пустая" text="Добавьте сделку, когда появится запрос на оборудование." action={<Button onClick={() => setOpen(true)}>Новая сделка</Button>} />
      ) : null}
      <DealDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function StageJump({ id, stage }: { id: string; stage: DealStage }) {
  const { moveDeal } = useCrm();
  return (
    <label className="md:sr-only">
      <span className="sr-only">Этап</span>
      <select
        className="h-7 rounded-md border bg-background px-1 text-xs"
        value={stage}
        aria-label="Сменить этап"
        onChange={(event) => moveDeal(id, event.target.value as DealStage)}
      >
        {STAGES.map((item) => (
          <option key={item.id} value={item.id}>{item.title}</option>
        ))}
      </select>
    </label>
  );
}
