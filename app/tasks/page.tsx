"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDelete } from "@/components/confirm-delete";
import { TaskDialog } from "@/components/record-dialogs";
import { CrmGate, EmptyState, PageHeading } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";
import { formatDate, norm, todayIso } from "@/lib/format";
import { TASK_KIND } from "@/lib/labels";

type Filter = "open" | "today" | "overdue" | "later" | "done" | "loose";

export default function TasksPage() {
  return (
    <CrmGate>
      <Tasks />
    </CrmGate>
  );
}

function Tasks() {
  const { data, session, toggleTask, removeTask } = useCrm();
  const isAdmin = session?.kind === "admin";
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmingTask = data.tasks.find((task) => task.id === confirming) ?? null;
  const today = todayIso();
  const needle = norm(query);

  const shown = useMemo(() => {
    return data.tasks.filter((task) => {
      if (filter === "open" && task.done) return false;
      if (filter === "today" && (task.done || task.due !== today)) return false;
      if (filter === "overdue" && (task.done || task.due >= today)) return false;
      if (filter === "later" && (task.done || task.due <= today)) return false;
      if (filter === "done" && !task.done) return false;
      if (filter === "loose" && task.companyId) return false;
      const company = data.companies.find((item) => item.id === task.companyId);
      return norm([task.title, company?.name ?? ""].join(" ")).includes(needle);
    });
  }, [data.tasks, data.companies, filter, needle, today]);

  const filters: { id: Filter; label: string }[] = [
    { id: "open", label: "Открытые" },
    { id: "today", label: "Сегодня" },
    { id: "overdue", label: "Просроченные" },
    { id: "later", label: "Дальше" },
    { id: "done", label: "Готово" },
    { id: "loose", label: "Без компании" },
  ];

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Дисциплина"
        title="Задачи и повторные касания"
        text="Звонок после КП, выезд на объект, письмо со счётом. Просроченное не прячется."
        action={<Button onClick={() => setOpen(true)}>Новая задача</Button>}
      />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Текст задачи или компания" aria-label="Поиск задач" />
      <div className="flex gap-2 overflow-x-auto" role="toolbar" aria-label="Фильтр задач">
        {filters.map((item) => (
          <Button key={item.id} size="sm" variant={filter === item.id ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title="В этой выборке пусто"
          text={filter === "loose" ? "Все напоминания уже привязаны к компании." : "Смените фильтр или поставьте новое касание."}
          action={<Button variant="outline" onClick={() => { setFilter("open"); setQuery(""); }}>Показать открытые</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((task) => {
            const company = data.companies.find((item) => item.id === task.companyId);
            const lead = data.leads.find((item) => item.id === task.leadId);
            const overdue = !task.done && task.due < today;
            return (
              <li key={task.id} className="flex items-start gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={task.done}
                  aria-label={task.done ? "Вернуть в работу" : "Отметить выполненным"}
                  onChange={() => toggleTask(task.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className={task.done ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"}>{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TASK_KIND[task.kind]} · {formatDate(task.due)}
                    {overdue ? " · просрочено" : ""}
                    {company ? " · " : ""}
                    {company ? <Link href={`/clients/${company.id}`} className="hover:underline">{company.name}</Link> : null}
                    {lead ? ` · лид ${lead.name}` : ""}
                  </p>
                </div>
                {isAdmin ? (
                  <Button type="button" variant="outline" size="sm" aria-label={`Удалить задачу ${task.title}`} onClick={() => setConfirming(task.id)}>
                    Удалить
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <TaskDialog open={open} onOpenChange={setOpen} />
      <ConfirmDelete
        open={confirmingTask !== null}
        title={confirmingTask ? `Удалить «${confirmingTask.title}»?` : "Удалить задачу?"}
        description="Задача исчезнет из списка. Лид и компания останутся."
        pending={deleting}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirmingTask) return;
          const id = confirmingTask.id;
          setDeleting(true);
          void removeTask(id).then((ok) => {
            setDeleting(false);
            if (!ok) return;
            setConfirming(null);
          });
        }}
      />
    </div>
  );
}
