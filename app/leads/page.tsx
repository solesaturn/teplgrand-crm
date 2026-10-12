"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BuyerLinks, PhoneList } from "@/components/lead-fields";
import { LeadDialog } from "@/components/record-dialogs";
import { ChoiceSelect, CrmGate, DemoBadge, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatStamp, norm, todayIso } from "@/lib/format";
import { LEAD_GROUPS, SEGMENTS, TASK_KIND } from "@/lib/labels";
import type { Lead, LeadGroup, LeadPhone, Segment, TaskKind } from "@/lib/types";
import { cn } from "cn";

export default function LeadsPage() {
  return (
    <CrmGate>
      <Leads />
    </CrmGate>
  );
}

function leadPhonesText(lead: Lead) {
  return lead.phones.map((phone) => `${phone.number} ${phone.owner}`).join(" ");
}

function primaryPhone(lead: Lead) {
  return lead.phones.find((phone) => phone.number.trim())?.number ?? "Без телефона";
}

function matches(lead: Lead, needle: string) {
  if (!needle) return true;
  const haystack = norm([lead.name, leadPhonesText(lead), lead.companyName].join(" "));
  if (haystack.includes(needle)) return true;
  const digits = needle.replace(/\D/g, "");
  return digits.length >= 3 && lead.phones.some((phone) => phone.number.replace(/\D/g, "").includes(digits));
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
  const pickedLead = mine.find((lead) => lead.id === picked) ?? null;

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Обзвон"
        title={seller ? `Лиды · ${seller.name}` : "Лиды"}
        text="Все группы на одном экране. Карточка открывается поверх списка. Поиск смотрит имя, телефон и компанию сразу во всех."
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
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">{needle ? "Нет совпадений" : "Пока пусто"}</p>
              ) : (
                <ul className="space-y-2">
                  {leads.map((lead) => (
                    <li key={lead.id}>
                      <article
                        draggable
                        onDragStart={() => setDragging(lead.id)}
                        className={cn(
                          "cursor-grab rounded-xl bg-card p-3 ring-1 ring-foreground/10 active:cursor-grabbing",
                          picked === lead.id && "ring-2 ring-primary",
                        )}
                      >
                        <button type="button" className="w-full text-left" onClick={() => setPicked(lead.id)}>
                          <p className="text-sm font-semibold">{lead.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{primaryPhone(lead)}</p>
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

      <Dialog open={pickedLead !== null} onOpenChange={(next) => { if (!next) setPicked(null); }}>
        {pickedLead && seller ? <LeadOverlay key={pickedLead.id} lead={pickedLead} sellerId={seller.id} sellerName={seller.name} /> : null}
      </Dialog>

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

type Draft = {
  name: string;
  phones: LeadPhone[];
  companyName: string;
  city: string;
  email: string;
  segment: Segment;
  interest: string;
  group: LeadGroup;
  website: string;
  mapUrl: string;
};

function draftFrom(lead: Lead): Draft {
  return {
    name: lead.name,
    phones: lead.phones.length ? lead.phones.map((phone) => ({ ...phone })) : [],
    companyName: lead.companyName,
    city: lead.city,
    email: lead.email,
    segment: lead.segment,
    interest: lead.interest,
    group: lead.group,
    website: lead.website,
    mapUrl: lead.mapUrl,
  };
}

function LeadOverlay({ lead, sellerId, sellerName }: { lead: Lead; sellerId: string; sellerName: string }) {
  const { data, updateLead, addSellerNote, addTask } = useCrm();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(lead));
  const [linksOpen, setLinksOpen] = useState(Boolean(lead.website || lead.mapUrl));
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskKind, setTaskKind] = useState<TaskKind>("call");
  const [taskDue, setTaskDue] = useState(todayIso());
  const [taskError, setTaskError] = useState("");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const notes = data.sellerNotes.filter((item) => item.leadId === lead.id && item.sellerId === sellerId);
  const tasks = data.tasks.filter((item) => item.leadId === lead.id);

  useEffect(() => {
    const timer = window.setTimeout(() => updateLead(lead.id, draft), 250);
    return () => {
      window.clearTimeout(timer);
      updateLead(lead.id, draft);
    };
  }, [draft, lead.id, updateLead]);

  return (
    <DialogContent className="sm:max-w-3xl!">
      <DialogHeader>
        <DialogTitle>Карточка лида</DialogTitle>
        <DialogDescription>
          Поверх списка. Поля сохраняются сами. Заметку видит только {sellerName}.
          {lead.demo ? " Учебный лид." : ""}
        </DialogDescription>
      </DialogHeader>
      <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            Имя
            <Input aria-label="Имя" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <PhoneList
            phones={draft.phones.length ? draft.phones : [{ id: `${lead.id}-blank`, number: "", owner: "" }]}
            onChange={(phones) => setDraft({ ...draft, phones })}
          />
          <label className="block space-y-1 text-sm">
            Компания или объект
            <Input aria-label="Компания" value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              Город
              <Input aria-label="Город" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              Почта
              <Input aria-label="Почта" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            Тип покупателя
            <ChoiceSelect
              label="Тип покупателя"
              value={draft.segment}
              onChange={(value) => setDraft({ ...draft, segment: value as Segment })}
              options={Object.entries(SEGMENTS).map(([value, label]) => ({ value, label }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            Что нужно
            <Textarea aria-label="Что нужно" value={draft.interest} onChange={(event) => setDraft({ ...draft, interest: event.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            Группа
            <ChoiceSelect
              label="Группа"
              value={draft.group}
              onChange={(value) => setDraft({ ...draft, group: value as LeadGroup })}
              options={LEAD_GROUPS.map((item) => ({ value: item.id, label: item.title }))}
            />
          </label>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Ссылки</p>
            <div className="mt-2">
              <BuyerLinks
                open={linksOpen}
                onOpen={() => setLinksOpen(true)}
                website={draft.website}
                mapUrl={draft.mapUrl}
                onWebsite={(website) => setDraft({ ...draft, website })}
                onMap={(mapUrl) => setDraft({ ...draft, mapUrl })}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Задачи этого лида</p>
              <Button type="button" size="sm" variant="outline" onClick={() => setTaskOpen((value) => !value)}>
                + Задача
              </Button>
            </div>
            {taskOpen ? (
              <form
                className="mt-2 space-y-2 rounded-xl bg-background p-3 ring-1 ring-foreground/10"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!taskTitle.trim() || !taskDue) {
                    setTaskError("Укажите, что сделать, и дату.");
                    return;
                  }
                  addTask({
                    title: taskTitle.trim(),
                    kind: taskKind,
                    due: taskDue,
                    companyId: null,
                    dealId: null,
                    contactId: null,
                    leadId: lead.id,
                  });
                  setTaskTitle("");
                  setTaskError("");
                  setTaskOpen(false);
                }}
              >
                <p className="text-xs text-muted-foreground">Задача сразу привяжется к {draft.name || lead.name}.</p>
                <Input aria-label="Что сделать" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Перезвонить и уточнить объём" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <ChoiceSelect
                    label="Тип задачи"
                    value={taskKind}
                    onChange={(value) => setTaskKind(value as TaskKind)}
                    options={Object.entries(TASK_KIND).map(([value, label]) => ({ value, label }))}
                  />
                  <Input aria-label="Срок задачи" type="date" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} />
                </div>
                {taskError ? <p className="text-sm text-destructive">{taskError}</p> : null}
                <Button type="submit" size="sm">Поставить задачу</Button>
              </form>
            ) : null}
            {tasks.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">На этот лид задач ещё нет.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-foreground/10">
                    <p className={task.done ? "text-muted-foreground line-through" : "font-medium"}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {TASK_KIND[task.kind]} · {task.due}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Заметка для себя</p>
            <p className="mt-1 text-xs text-muted-foreground">Видит только {sellerName}. В общую карточку компании это не пишется.</p>
            <form
              className="mt-2 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!note.trim()) {
                  setNoteError("Напишите, о чём договорились.");
                  return;
                }
                addSellerNote(lead.id, note);
                setNote("");
                setNoteError("");
              }}
            >
              <Textarea aria-label="Заметка для себя" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Перенесли на четверг, ждёт расчёт по Д2" />
              {noteError ? <p className="text-sm text-destructive">{noteError}</p> : null}
              <Button type="submit" variant="outline" size="sm">Сохранить заметку</Button>
            </form>
            {notes.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {notes.map((item) => (
                  <li key={item.id} className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-foreground/10">
                    <p>{item.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatStamp(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
