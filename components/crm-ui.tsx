"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrm } from "@/lib/crm-context";
import { formatRub } from "@/lib/format";

export function CrmGate({ children }: { children: React.ReactNode }) {
  const { status, error, reset } = useCrm();
  if (status === "loading") return <PageSkeleton />;
  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Теплогранд</p>
        <h1 className="mt-2 text-xl font-semibold">Данные отдела не открылись</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "Локальная копия повреждена."}</p>
        <Button className="mt-4" onClick={reset}>
          Восстановить рабочий стол
        </Button>
      </div>
    );
  }
  return children;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="sr-only">Загружаем рабочий стол продаж</p>
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-10 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.48_0.06_55)] uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {text ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Money({ value, className }: { value: number | null | undefined; className?: string }) {
  return <span className={className ?? "tabular-nums"}>{formatRub(value)}</span>;
}

export function ChoiceSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select
      value={value}
      items={options}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger className="w-full min-w-0 max-w-full overflow-hidden" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[80]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function useDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
