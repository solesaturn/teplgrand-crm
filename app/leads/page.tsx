"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LeadDialog } from "@/components/record-dialogs";
import { CrmGate, DemoBadge, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatStamp, norm } from "@/lib/format";
import { LEAD_GROUPS, SEGMENTS } from "@/lib/labels";
import type { Lead, LeadGroup } from "@/lib/types";
import { cn } from "cn";

export default function LeadsPage() {
  return (
    <CrmGate>
      <Leads />
    </CrmGate>
  );
}

function matches(lead: Lead, needle: string) {
  if (!needle) return true;
  const haystack = norm([lead.name, lead.phone, lead.companyName].join(" "));
  if (haystack.includes(needle)) return true;
  const digits = needle.replace(/\D/g, "");
  return digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits);
}

function Leads() {
  const { data, sellerId, setLeadGroup } = useCrm();
  const seller = data.sellers.find((item) => item.id === sellerId) ?? data.sellers[0];
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const needle = norm(query);

  const mine = useMemo(() => data.leads.filter((lead) => lead.sellerId === seller?.id), [data.leads, seller?.id]);
  const shown = useMemo(() => mine.filter((lead) => matches(lead, needle)), [mine, needle]);
  const selected = shown.find((lead) => lead.id === picked) ?? null;

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Обзвон"
        title={seller ? `Лиды · ${seller.name}` : "Лиды"}
        text="Все группы на одном экране. Поиск смотрит имя, телефон и компанию сразу во всех. Заметка остаётся только у вас."
        action={<Button onClick={() => setOpen(true)}>Новый лид</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Имя, телефон или компания"
          aria-label="Поиск по всем группам"
        />
        {query ? (
          <Button type="button" variant="outline" onClick={() => setQuery("")}>
            Сбросить поиск
          </Button>
        ) : null}
      </div>

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-5">
        {LEAD_GROUPS.map((group) => {
          const leads = shown.filter((lead) => lead.group === group.id);
          return (
            <section
              key={group.id}
              aria-label={group.title}
              className="rounded-2xl bg-muted/60 p-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging) setLeadGroup(dragging, group.id);
                setDragging(null);
              }}
            >
              <header className="px-2 py-2">
                <h2 className="text-sm font-semibold">{group.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {group.hint} · {leads.length}
                </p>
              </header>
              {leads.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {needle ? "Нет совпадений" : "Пока пусто"}
                </p>
              ) : (
                <ul className="space-y-2">
                  {leads.map((lead) => (
                    <li key={lead.id}>
                      <article
                        draggable
                        onDragStart={() => setDragging(lead.id)}
                        className={cn(
                          "cursor-grab rounded-xl bg-card p-3 ring-1 ring-foreground/10 active:cursor-grabbing",
                          selected?.id === lead.id && "ring-2 ring-primary",
                        )}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            setPicked(lead.id);
                            if (window.matchMedia("(max-width: 1279px)").matches) {
                              document.getElementById("lead-desk")?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                        >
                          <p className="text-sm font-semibold">{lead.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{lead.phone}</p>
                          <p className="mt-1 text-xs">{lead.companyName || "Без компании"}</p>
                        </button>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {lead.demo ? <DemoBadge /> : <span />}
                          <label className="min-w-0 flex-1">
                            <span className="sr-only">Группа для {lead.name}</span>
                            <select
                              className="h-7 w-full rounded-md border bg-background px-1 text-xs"
                              value={lead.group}
                              aria-label={`Перенести ${lead.name}`}
                              onChange={(event) => setLeadGroup(lead.id, event.target.value as LeadGroup)}
                            >
                              {LEAD_GROUPS.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {selected && seller ? <LeadDesk lead={selected} sellerId={seller.id} sellerName={seller.name} /> : (
        <p className="text-sm text-muted-foreground">Выберите лид, чтобы дописать заметку для себя или перенести его в другую группу.</p>
      )}

      <LeadDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => {
          setQuery("");
          setPicked(id);
        }}
      />
    </div>
  );
}

function LeadDesk({ lead, sellerId, sellerName }: { lead: Lead; sellerId: string; sellerName: string }) {
  const { data, setLeadGroup } = useCrm();
  const notes = data.sellerNotes.filter((note) => note.leadId === lead.id && note.sellerId === sellerId);

  return (
    <aside id="lead-desk" className="scroll-mt-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{lead.name}</h2>
            {lead.demo ? <DemoBadge /> : null}
          </div>
          <a className="mt-1 inline-block text-sm font-medium underline-offset-4 hover:underline" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>
            {lead.phone}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            {[lead.companyName || "Без компании", lead.city, SEGMENTS[lead.segment]].filter(Boolean).join(" · ")}
          </p>
          {lead.interest ? <p className="mt-3 text-sm">{lead.interest}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Перенести в группу">
            {LEAD_GROUPS.map((item) => {
              const on = lead.group === item.id;
              return (
                <Button key={item.id} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => setLeadGroup(lead.id, item.id)}>
                  {item.title}
                </Button>
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
      <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Перенесли на четверг, ждёт расчёт по Д2" aria-label="Заметка для себя" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="outline">
        Сохранить заметку
      </Button>
    </form>
  );
}
