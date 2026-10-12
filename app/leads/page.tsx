"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LeadDialog } from "@/components/record-dialogs";
import { CrmGate, DemoBadge, EmptyState, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatStamp, norm } from "@/lib/format";
import { CALL_STATUS, SEGMENTS, callStatusTitle } from "@/lib/labels";
import type { CallStatus, Lead } from "@/lib/types";
import { cn } from "cn";

const STATUS_CLASS: Record<CallStatus, string> = {
  "not-called": "bg-muted text-foreground",
  "no-answer": "bg-[oklch(0.93_0.05_75)] text-[oklch(0.38_0.06_55)]",
  callback: "bg-primary text-primary-foreground",
  called: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.32_0.05_150)]",
};

export default function LeadsPage() {
  return (
    <CrmGate>
      <Leads />
    </CrmGate>
  );
}

function Leads() {
  const { data, sellerId } = useCrm();
  const seller = data.sellers.find((item) => item.id === sellerId) ?? data.sellers[0];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CallStatus | "all">("all");
  const [picked, setPicked] = useState<string | null>("lead-sergey");
  const [open, setOpen] = useState(false);
  const needle = norm(query);

  const mine = useMemo(() => data.leads.filter((lead) => lead.sellerId === seller?.id), [data.leads, seller?.id]);
  const shown = useMemo(() => {
    return mine
      .filter((lead) => (status === "all" ? true : lead.callStatus === status))
      .filter((lead) => {
        if (!needle) return true;
        return norm([lead.name, lead.phone, lead.city, lead.companyName, lead.interest].join(" ")).includes(needle);
      })
      .slice()
      .sort((a, b) => CALL_STATUS.findIndex((item) => item.id === a.callStatus) - CALL_STATUS.findIndex((item) => item.id === b.callStatus));
  }, [mine, needle, status]);

  const selected = shown.find((lead) => lead.id === picked) ?? shown[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Обзвон"
        title={seller ? `Лиды · ${seller.name}` : "Лиды"}
        text="Список для звонка. Заметка после разговора остаётся у вас и не попадает в карточку компании."
        action={<Button onClick={() => setOpen(true)}>Новый лид</Button>}
      />

      <div className="flex flex-col gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Имя, телефон, город или что нужно"
          aria-label="Поиск лидов"
        />
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Статус звонка">
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} label={`Все · ${mine.length}`} />
          {CALL_STATUS.map((item) => {
            const count = mine.filter((lead) => lead.callStatus === item.id).length;
            return (
              <FilterChip
                key={item.id}
                active={status === item.id}
                onClick={() => setStatus(item.id)}
                label={`${item.title} · ${count}`}
              />
            );
          })}
        </div>
      </div>

      {mine.length === 0 ? (
        <EmptyState
          title="В вашем списке пока пусто"
          text="Добавьте имя и телефон. Лид останется у этой учётки, чужие списки его не увидят."
          action={<Button onClick={() => setOpen(true)}>Новый лид</Button>}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title="Таких лидов нет"
          text="Смените статус или поиск. Остальные обращения на месте."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Сбросить фильтр
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ul className="space-y-2">
            {shown.map((lead) => {
              const on = lead.id === selected?.id;
              return (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(lead.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "w-full rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/10 hover:bg-accent/30",
                      on && "ring-2 ring-primary",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.phone}
                          {lead.city ? ` · ${lead.city}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={lead.callStatus} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm">{lead.interest || lead.companyName || SEGMENTS[lead.segment]}</p>
                    {lead.demo ? (
                      <div className="mt-2">
                        <DemoBadge />
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {selected && seller ? <LeadDesk lead={selected} sellerId={seller.id} sellerName={seller.name} /> : null}
        </div>
      )}

      <LeadDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => {
          setStatus("all");
          setQuery("");
          setPicked(id);
        }}
      />
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
    </Button>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  return <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_CLASS[status])}>{callStatusTitle(status)}</span>;
}

function LeadDesk({ lead, sellerId, sellerName }: { lead: Lead; sellerId: string; sellerName: string }) {
  const { data, setLeadCallStatus } = useCrm();
  const notes = data.sellerNotes.filter((note) => note.leadId === lead.id && note.sellerId === sellerId);

  return (
    <aside className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{lead.name}</h2>
          {lead.demo ? <DemoBadge /> : null}
        </div>
        <a className="mt-1 inline-block text-sm font-medium underline-offset-4 hover:underline" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>
          {lead.phone}
        </a>
        <p className="mt-2 text-sm text-muted-foreground">
          {[lead.companyName, lead.city, SEGMENTS[lead.segment]].filter(Boolean).join(" · ")}
        </p>
        {lead.email ? <p className="text-sm text-muted-foreground">{lead.email}</p> : null}
        {lead.interest ? <p className="mt-3 text-sm">{lead.interest}</p> : null}
      </div>

      <div>
        <p className="text-sm font-medium">Статус звонка</p>
        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Статус звонка">
          {CALL_STATUS.map((item) => {
            const on = lead.callStatus === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setLeadCallStatus(lead.id, item.id)}
                className={cn(
                  "rounded-xl px-3 py-2 text-left text-sm ring-1 ring-foreground/10",
                  on ? STATUS_CLASS[item.id] : "bg-background hover:bg-accent/40",
                )}
              >
                <span className="block font-medium">{item.title}</span>
                <span className={cn("mt-0.5 block text-[11px]", on ? "opacity-80" : "text-muted-foreground")}>{item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Заметка для себя</p>
        <p className="mt-1 text-xs text-muted-foreground">Видит только {sellerName}. В общую карточку компании это не пишется.</p>
        <NoteForm key={lead.id} leadId={lead.id} />
        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">После звонка здесь появится ваша заметка.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-foreground/10">
                <p>{note.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatStamp(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function NoteForm({ leadId }: { leadId: string }) {
  const { addSellerNote } = useCrm();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) {
          setError("Напишите, о чём договорились.");
          return;
        }
        addSellerNote(leadId, text);
        setText("");
        setError("");
      }}
    >
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Перезвонить после 16:00, просил Д2 на краны"
        aria-label="Заметка для себя"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="outline">
        Сохранить заметку
      </Button>
    </form>
  );
}
