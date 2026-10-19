"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallbackAsk, LeadOverlay } from "@/components/lead-card";
import { LeadDialog } from "@/components/record-dialogs";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CrmGate, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { callbackOverdue, defaultCallbackParts, formatCallback, norm } from "@/lib/format";
import { LEAD_GROUPS } from "@/lib/labels";
import type { Lead, LeadGroup } from "@/lib/types";
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

function matches(lead: Lead, needle: string, sellerName = "") {
  if (!needle) return true;
  const haystack = norm([lead.name, leadPhonesText(lead), lead.companyName, sellerName].join(" "));
  if (haystack.includes(needle)) return true;
  const digits = needle.replace(/\D/g, "");
  return digits.length >= 3 && lead.phones.some((phone) => phone.number.replace(/\D/g, "").includes(digits));
}

function Leads() {
  const { data, session, sellerId, setLeadGroup, updateLead, removeLead } = useCrm();
  const isAdmin = session?.kind === "admin";
  const seller = data.sellers.find((item) => item.id === sellerId) ?? null;
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ leadId: string; date: string; time: string } | null>(null);
  const [confirmLead, setConfirmLead] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const needle = norm(query);
  const sellerName = (id: string) => data.sellers.find((item) => item.id === id)?.name ?? "";

  const mine = useMemo(
    () => (isAdmin ? data.leads : data.leads.filter((lead) => lead.sellerId === sellerId)),
    [data.leads, isAdmin, sellerId],
  );
  const shown = useMemo(() => {
    const nameOf = (id: string) => data.sellers.find((item) => item.id === id)?.name ?? "";
    return mine.filter((lead) => matches(lead, needle, isAdmin ? nameOf(lead.sellerId) : ""));
  }, [data.sellers, isAdmin, mine, needle]);
  const pickedLead = mine.find((lead) => lead.id === picked) ?? null;
  const pendingLead = mine.find((lead) => lead.id === pending?.leadId) ?? null;

  function requestMove(leadId: string, group: LeadGroup) {
    const lead = mine.find((item) => item.id === leadId);
    if (!lead || lead.group === group) return;
    if (group === "reschedule") {
      const parts = defaultCallbackParts(lead.callbackAt);
      setPending({ leadId, date: parts.date, time: parts.time });
      return;
    }
    setLeadGroup(leadId, group);
  }

  function confirmPending() {
    if (!pending?.date || !pending.time) return;
    updateLead(pending.leadId, { group: "reschedule", callbackAt: `${pending.date}T${pending.time}` });
    setPending(null);
  }

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Обзвон"
        title={isAdmin ? "Лиды" : seller ? `Лиды · ${seller.name}` : "Лиды"}
        text={
          isAdmin
            ? "Пять групп всего отдела. На карточке имя продавца. Поиск смотрит имя, телефон, компанию и продавца."
            : "Пять групп. Карточка открывается поверх списка. Поиск смотрит имя, телефон и компанию."
        }
        action={isAdmin ? undefined : <Button onClick={() => setOpen(true)}>Новый лид</Button>}
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
                if (dragging) requestMove(dragging, group.id);
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
                          <p className="text-sm font-semibold">{lead.companyName || "Без компании"}</p>
                          <p className="mt-1 text-xs">{lead.name}</p>
                          {isAdmin && sellerName(lead.sellerId) ? (
                            <p className="mt-1 text-xs font-medium">{sellerName(lead.sellerId)}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">{primaryPhone(lead)}</p>
                          {lead.group === "reschedule" && lead.callbackAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatCallback(lead.callbackAt)}
                              {callbackOverdue(lead.callbackAt) ? " · просрочено" : ""}
                            </p>
                          ) : null}
                        </button>
                        <div className="mt-2">
                          <label className="block">
                            <span className="sr-only">Группа для {lead.name}</span>
                            <select
                              className="h-7 w-full rounded-md border bg-background px-1 text-xs"
                              value={lead.group}
                              aria-label={`Перенести ${lead.name}`}
                              onChange={(event) => requestMove(lead.id, event.target.value as LeadGroup)}
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

      <Dialog
        open={pickedLead !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPicked(null);
            setPending((current) => (current && current.leadId === picked ? null : current));
          }
        }}
      >
        {pickedLead && sellerName(pickedLead.sellerId) ? (
          <LeadOverlay
            key={pickedLead.id}
            lead={pickedLead}
            sellerId={pickedLead.sellerId}
            sellerName={sellerName(pickedLead.sellerId)}
            onMove={(group) => requestMove(pickedLead.id, group)}
            schedule={pending && pending.leadId === pickedLead.id ? pending : null}
            onScheduleDate={(date) => setPending((current) => (current ? { ...current, date } : current))}
            onScheduleTime={(time) => setPending((current) => (current ? { ...current, time } : current))}
            onScheduleConfirm={confirmPending}
            onScheduleCancel={() => setPending(null)}
            onAskDelete={isAdmin ? () => setConfirmLead(true) : undefined}
          />
        ) : null}
      </Dialog>

      <Dialog open={pending !== null && pending.leadId !== picked} onOpenChange={(next) => { if (!next) setPending(null); }}>
        {pending && pendingLead && pending.leadId !== picked ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Когда перезвонить?</DialogTitle>
              <DialogDescription>
                {pendingLead.name} попадёт в «Перенос сроков» после даты и времени. Без срока группа не меняется.
              </DialogDescription>
            </DialogHeader>
            <CallbackAsk
              framed={false}
              date={pending.date}
              time={pending.time}
              onDate={(date) => setPending({ ...pending, date })}
              onTime={(time) => setPending({ ...pending, time })}
              onConfirm={confirmPending}
              onCancel={() => setPending(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDelete
        open={confirmLead && pickedLead !== null}
        title={pickedLead ? `Удалить ${pickedLead.name}?` : "Удалить лид?"}
        description="Телефоны, ссылки, задачи, заметки и история звонков этого лида исчезнут."
        pending={deletingLead}
        onCancel={() => setConfirmLead(false)}
        onConfirm={() => {
          if (!pickedLead) return;
          const id = pickedLead.id;
          setDeletingLead(true);
          void removeLead(id).then((ok) => {
            setDeletingLead(false);
            if (!ok) return;
            setConfirmLead(false);
            setPicked(null);
          });
        }}
      />

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
