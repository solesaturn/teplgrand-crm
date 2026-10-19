"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuyerLinks, PhoneList } from "@/components/lead-fields";
import { ChoiceSelect } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatCallback, formatStamp, splitCallback, todayIso } from "@/lib/format";
import { LEAD_GROUPS, SEGMENTS, TASK_KIND, leadGroupTitle } from "@/lib/labels";
import type { Lead, LeadGroup, LeadPhone, Segment, TaskKind } from "@/lib/types";

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
type Draft = {
  name: string;
  phones: LeadPhone[];
  companyName: string;
  city: string;
  email: string;
  segment: Segment;
  interest: string;
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
    website: lead.website,
    mapUrl: lead.mapUrl,
  };
}

export function CallbackAsk({
  date,
  time,
  onDate,
  onTime,
  onConfirm,
  onCancel,
  framed = true,
}: {
  date: string;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  framed?: boolean;
}) {
  return (
    <form
      className={framed ? "space-y-3 rounded-xl bg-muted/50 p-3" : "space-y-3"}
      onSubmit={(event) => {
        event.preventDefault();
        if (date && time) onConfirm();
      }}
    >
      {framed ? <p className="text-sm font-medium">Когда перезвонить?</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          Дата перезвона
          <Input aria-label="Дата перезвона" type="date" required value={date} onChange={(event) => onDate(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          Время перезвона
          <Input aria-label="Время перезвона" type="time" required value={time} onChange={(event) => onTime(event.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">Поставить срок</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Отмена</Button>
      </div>
    </form>
  );
}

export function LeadOverlay({
  lead,
  sellerId,
  sellerName,
  onMove,
  schedule,
  onScheduleDate,
  onScheduleTime,
  onScheduleConfirm,
  onScheduleCancel,
  onAskDelete,
}: {
  lead: Lead;
  sellerId: string;
  sellerName: string;
  onMove: (group: LeadGroup) => void;
  schedule: { date: string; time: string } | null;
  onScheduleDate: (value: string) => void;
  onScheduleTime: (value: string) => void;
  onScheduleConfirm: () => void;
  onScheduleCancel: () => void;
  onAskDelete?: () => void;
}) {
  const { data, session, updateLead, addSellerNote, addLeadCall, addTask } = useCrm();
  const adminView = session?.kind === "admin";
  const [draft, setDraft] = useState<Draft>(() => draftFrom(lead));
  const [linksOpen, setLinksOpen] = useState(Boolean(lead.website || lead.mapUrl));
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskKind, setTaskKind] = useState<TaskKind>("call");
  const [taskDue, setTaskDue] = useState(todayIso());
  const [taskError, setTaskError] = useState("");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [callDate, setCallDate] = useState(todayIso);
  const [callTime, setCallTime] = useState(currentTime);
  const [callGroup, setCallGroup] = useState<LeadGroup>(lead.group);
  const [callNote, setCallNote] = useState("");
  const [callError, setCallError] = useState("");
  const notes = data.sellerNotes.filter((item) => item.leadId === lead.id && item.sellerId === sellerId);
  const calls = data.leadCalls
    .filter((item) => item.leadId === lead.id && item.sellerId === sellerId)
    .slice()
    .sort((a, b) => b.calledAt.localeCompare(a.calledAt));
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
          {adminView
            ? `Лид ведёт ${sellerName}. Здесь поля, телефоны, ссылки, задачи, звонки и заметки этого продавца.`
            : `Поверх списка. Поля сохраняются сами. Заметку видит только ${sellerName}.`}
        </DialogDescription>
      </DialogHeader>
      {onAskDelete ? (
        <Button type="button" variant="outline" aria-label={`Удалить лид ${lead.name}`} onClick={onAskDelete}>
          Удалить лид
        </Button>
      ) : null}
      <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            Компания или объект
            <Input aria-label="Компания" readOnly={adminView} value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            Имя
            <Input aria-label="Имя" readOnly={adminView} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <PhoneList
            phones={draft.phones.length ? draft.phones : [{ id: `${lead.id}-blank`, number: "", owner: "" }]}
            onChange={(phones) => setDraft({ ...draft, phones })}
            readOnly={adminView}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              Город
              <Input aria-label="Город" readOnly={adminView} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              Почта
              <Input aria-label="Почта" type="email" readOnly={adminView} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
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
            <Textarea aria-label="Что нужно" readOnly={adminView} value={draft.interest} onChange={(event) => setDraft({ ...draft, interest: event.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            Группа
            <ChoiceSelect
              label="Группа"
              value={lead.group}
              onChange={(value) => onMove(value as LeadGroup)}
              options={LEAD_GROUPS.map((item) => ({ value: item.id, label: item.title }))}
            />
          </label>
          {schedule ? (
            <CallbackAsk
              date={schedule.date}
              time={schedule.time}
              onDate={onScheduleDate}
              onTime={onScheduleTime}
              onConfirm={onScheduleConfirm}
              onCancel={onScheduleCancel}
            />
          ) : lead.group === "reschedule" ? (
            <CallbackEditor leadId={lead.id} callbackAt={lead.callbackAt} />
          ) : null}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Ссылки</p>
            <div className="mt-2">
              <BuyerLinks
                open={linksOpen || adminView}
                onOpen={() => setLinksOpen(true)}
                website={draft.website}
                mapUrl={draft.mapUrl}
                onWebsite={(website) => setDraft({ ...draft, website })}
                onMap={(mapUrl) => setDraft({ ...draft, mapUrl })}
                readOnly={adminView}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Задачи этого лида</p>
              {adminView ? null : (
                <Button type="button" size="sm" variant="outline" onClick={() => setTaskOpen((value) => !value)}>
                  + Задача
                </Button>
              )}
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
          <div aria-label="История звонков">
            <p className="text-sm font-medium">История звонков</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adminView
                ? `Записи ${sellerName}. Группа лида от этого не меняется.`
                : `Несколько записей подряд. Видит только ${sellerName}. Группа лида от этого не меняется.`}
            </p>
            {adminView ? null : (
            <form
              className="mt-2 space-y-2 rounded-xl bg-background p-3 ring-1 ring-foreground/10"
              onSubmit={(event) => {
                event.preventDefault();
                if (!callDate || !callTime || !callNote.trim()) {
                  setCallError("Укажите дату, время и что было на звонке.");
                  return;
                }
                addLeadCall(lead.id, { calledAt: `${callDate}T${callTime}`, group: callGroup, note: callNote });
                setCallNote("");
                setCallError("");
                setCallDate(todayIso());
                setCallTime(currentTime());
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  Дата звонка
                  <Input aria-label="Дата звонка" type="date" required value={callDate} onChange={(event) => setCallDate(event.target.value)} />
                </label>
                <label className="block space-y-1 text-sm">
                  Время звонка
                  <Input aria-label="Время звонка" type="time" required value={callTime} onChange={(event) => setCallTime(event.target.value)} />
                </label>
              </div>
              <ChoiceSelect
                label="Итог звонка"
                value={callGroup}
                onChange={(value) => setCallGroup(value as LeadGroup)}
                options={LEAD_GROUPS.map((item) => ({ value: item.id, label: item.title }))}
              />
              <Textarea aria-label="Заметка к звонку" value={callNote} onChange={(event) => setCallNote(event.target.value)} placeholder="Не взяли трубку, набрать после обеда" />
              {callError ? <p className="text-sm text-destructive">{callError}</p> : null}
              <Button type="submit" size="sm">Записать звонок</Button>
            </form>
            )}
            {calls.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Звонков ещё не записывали.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {calls.map((item) => (
                  <li key={item.id} className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-foreground/10">
                    <p className="text-xs text-muted-foreground">
                      {formatCallback(item.calledAt)} · {leadGroupTitle(item.group)}
                    </p>
                    <p className="mt-1">{item.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{adminView ? `Заметка · ${sellerName}` : "Заметка для себя"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adminView ? `Заметки ${sellerName}. В карточку компании это не пишется.` : `Видит только ${sellerName}. В общую карточку компании это не пишется.`}
            </p>
            {adminView ? null : (
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
              <Textarea aria-label="Заметка для себя" value={note} onChange={(event) => setNote(event.target.value)} />
              {noteError ? <p className="text-sm text-destructive">{noteError}</p> : null}
              <Button type="submit" variant="outline" size="sm">Сохранить заметку</Button>
            </form>
            )}
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

function CallbackEditor({ leadId, callbackAt }: { leadId: string; callbackAt: string | null }) {
  const { updateLead } = useCrm();
  const initial = splitCallback(callbackAt);
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");

  function commit(nextDate: string, nextTime: string) {
    if (!nextDate || !nextTime) return;
    updateLead(leadId, { callbackAt: `${nextDate}T${nextTime}` });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1 text-sm">
        Дата перезвона
        <Input
          aria-label="Дата перезвона"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            commit(event.target.value, time);
          }}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Время перезвона
        <Input
          aria-label="Время перезвона"
          type="time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
            commit(date, event.target.value);
          }}
        />
      </label>
    </div>
  );
}
