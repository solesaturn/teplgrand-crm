"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CrmGate, DemoBadge, Money, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatShortDate, todayIso } from "@/lib/format";
import { OFFER_STATUS, OPEN_STAGES, STAGES, TASK_KIND, stageTitle } from "@/lib/labels";
import { offerTotal } from "@/lib/pricing";

export default function DashboardPage() {
  return (
    <CrmGate>
      <Dashboard />
    </CrmGate>
  );
}

function Dashboard() {
  const { data } = useCrm();
  const today = todayIso();
  const openDeals = data.deals.filter((deal) => OPEN_STAGES.includes(deal.stage));
  const openSum = openDeals.reduce((sum, deal) => sum + deal.amount, 0);
  const liveOffers = data.offers.filter((offer) => offer.status === "draft" || offer.status === "sent");
  const dueToday = data.tasks.filter((task) => !task.done && task.due === today);
  const overdue = data.tasks.filter((task) => !task.done && task.due < today);
  const attention = [...overdue, ...dueToday];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Отдел дистрибьюции"
        title="Что сделать сегодня"
        text="Сделки, которым нужен следующий шаг, и коммерческие предложения по прайсу Теплогранд."
        action={
          <Button render={<Link href="/catalog" />}>
            Открыть каталог
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Открытые сделки" value={<Money value={openSum} />} hint={`${openDeals.length} в работе`} href="/pipeline" />
        <Stat label="КП не закрыты" value={String(liveOffers.length)} hint="черновики и отправленные" href="/offers" />
        <Stat label="На сегодня" value={String(dueToday.length)} hint="звонки и письма" href="/tasks" />
        <Stat label="Просрочено" value={String(overdue.length)} hint="нужно закрыть или перенести" href="/tasks" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Воронка</h2>
          <ul className="mt-3 space-y-2">
            {STAGES.map((stage) => {
              const deals = data.deals.filter((deal) => deal.stage === stage.id);
              const sum = deals.reduce((total, deal) => total + deal.amount, 0);
              const width = data.deals.length ? Math.max(8, (deals.length / data.deals.length) * 100) : 0;
              return (
                <li key={stage.id}>
                  <Link href="/pipeline" className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm">
                    <span>{stage.title}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {deals.length} · <Money value={sum} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Перезвонить и дописать</h2>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">На сегодня и в просрочке пусто. Можно разобрать новые запросы.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {attention.map((task) => {
                const company = data.companies.find((item) => item.id === task.companyId);
                return (
                  <li key={task.id} className="text-sm">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-muted-foreground">
                      {TASK_KIND[task.kind]} · {formatShortDate(task.due)}
                      {task.due < today ? " · просрочено" : ""}
                      {company ? ` · ${company.name}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Последние КП</h2>
          <ul className="mt-3 divide-y">
            {data.offers.map((offer) => {
              const company = data.companies.find((item) => item.id === offer.companyId);
              return (
                <li key={offer.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <Link href={`/offers/${offer.id}`} className="font-medium hover:underline">{offer.number}</Link>
                    <p className="text-muted-foreground">
                      {company?.name} · {OFFER_STATUS[offer.status]}
                      {company?.demo ? " · демо" : ""}
                    </p>
                  </div>
                  <Money value={offerTotal(offer.lines)} className="font-medium tabular-nums" />
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Сделки, которые ждут ответа</h2>
          <ul className="mt-3 space-y-3">
            {openDeals.slice(0, 4).map((deal) => {
              const company = data.companies.find((item) => item.id === deal.companyId);
              return (
                <li key={deal.id}>
                  <Link href={`/deals/${deal.id}`} className="text-sm font-medium hover:underline">{deal.title}</Link>
                  <p className="text-sm text-muted-foreground">
                    {company?.name} · {stageTitle(deal.stage)} · {deal.nextStep}
                  </p>
                  {company?.demo ? <DemoBadge /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 hover:bg-accent/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}
