"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDelete } from "@/components/confirm-delete";
import { LeadOverlay } from "@/components/lead-card";
import { CrmGate, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { callbackOverdue, defaultCallbackParts, formatCallback } from "@/lib/format";
import { leadGroupTitle } from "@/lib/labels";
import { todayCallsOf } from "@/lib/today-calls";
import type { Lead, LeadGroup } from "@/lib/types";

export default function TodayPage() {
  return (
    <CrmGate>
      <Today />
    </CrmGate>
  );
}

function primaryPhone(lead: Lead) {
  return lead.phones.find((phone) => phone.number.trim())?.number ?? "Без телефона";
}

function Today() {
  const { data, session, sellerId, setLeadGroup, updateLead, removeLead } = useCrm();
  const isAdmin = session?.kind === "admin";
  const seller = data.sellers.find((item) => item.id === sellerId) ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, setPending] = useState<{ leadId: string; date: string; time: string } | null>(null);
  const [confirmLead, setConfirmLead] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const sellerName = (id: string) => data.sellers.find((item) => item.id === id)?.name ?? "";

  const mine = useMemo(
    () => (isAdmin ? data.leads : data.leads.filter((lead) => lead.sellerId === sellerId)),
    [data.leads, isAdmin, sellerId],
  );
  const todayCalls = useMemo(() => todayCallsOf(mine), [mine]);
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
    <div className="min-w-0 space-y-5">
      <PageHeading
        eyebrow="Обзвон"
        title="Кому звонить сегодня"
        text={
          isAdmin
            ? "Новые, недозвон и перенос сроков, если звонок сегодня или срок уже прошёл. Список всего отдела, на карточке имя продавца."
            : `Новые, недозвон и перенос сроков, если звонок сегодня или срок уже прошёл.${seller ? ` Список только ${seller.name}.` : ""}`
        }
      />
      {todayCalls.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">На сегодня звонков нет.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {todayCalls.map((lead) => (
            <li key={lead.id}>
              <button
                type="button"
                className="w-full rounded-xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10 hover:bg-muted"
                onClick={() => setPicked(lead.id)}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{lead.companyName || "Без компании"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{leadGroupTitle(lead.group)}</span>
                </span>
                <span className="mt-1 block text-xs">{lead.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{primaryPhone(lead)}</span>
                {isAdmin && sellerName(lead.sellerId) ? (
                  <span className="mt-1 block text-xs font-medium">{sellerName(lead.sellerId)}</span>
                ) : null}
                {lead.group === "reschedule" && lead.callbackAt ? (
                  <span className="mt-1 block text-xs font-medium">
                    {formatCallback(lead.callbackAt)}
                    {callbackOverdue(lead.callbackAt) ? " · просрочено" : ""}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

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
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                confirmPending();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  Дата перезвона
                  <Input aria-label="Дата перезвона" type="date" required value={pending.date} onChange={(event) => setPending({ ...pending, date: event.target.value })} />
                </label>
                <label className="block space-y-1 text-sm">
                  Время перезвона
                  <Input aria-label="Время перезвона" type="time" required value={pending.time} onChange={(event) => setPending({ ...pending, time: event.target.value })} />
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Поставить срок</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>Отмена</Button>
              </div>
            </form>
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
    </div>
  );
}
