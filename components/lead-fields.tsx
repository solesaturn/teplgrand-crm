"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uid } from "@/lib/format";
import type { LeadPhone } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function PhoneList({
  phones,
  onChange,
  readOnly = false,
}: {
  phones: LeadPhone[];
  onChange: (phones: LeadPhone[]) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      {phones.map((phone, index) => (
        <div key={phone.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label={index === 0 ? "Телефон" : "Ещё телефон"}>
            <Input
              value={phone.number}
              inputMode="tel"
              aria-label={index === 0 ? "Телефон" : `Телефон ${index + 1}`}
              placeholder="+7 900 000-00-00"
              readOnly={readOnly}
              onChange={(event) => onChange(phones.map((item) => (item.id === phone.id ? { ...item, number: event.target.value } : item)))}
            />
          </Field>
          <Field label="Чей номер">
            <Input
              value={phone.owner}
              aria-label={`Чей номер ${index + 1}`}
              placeholder="Чей номер"
              readOnly={readOnly}
              onChange={(event) => onChange(phones.map((item) => (item.id === phone.id ? { ...item, owner: event.target.value } : item)))}
            />
          </Field>
          {!readOnly && phones.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-0.5"
              onClick={() => onChange(phones.filter((item) => item.id !== phone.id))}
            >
              Убрать
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
      ))}
      {readOnly ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...phones, { id: uid("ph"), number: "", owner: "" }])}
        >
          Ещё номер
        </Button>
      )}
    </div>
  );
}

export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function BuyerLinks({
  open,
  onOpen,
  website,
  mapUrl,
  onWebsite,
  onMap,
  readOnly = false,
}: {
  open: boolean;
  onOpen: () => void;
  website: string;
  mapUrl: string;
  onWebsite: (value: string) => void;
  onMap: (value: string) => void;
  readOnly?: boolean;
}) {
  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" aria-label="Добавить сайт и Яндекс Карты" onClick={onOpen}>
        <Plus />
        Сайт и Яндекс Карты
      </Button>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl bg-background p-3 ring-1 ring-foreground/10">
      <Field label="Сайт покупателя">
        <Input
          value={website}
          inputMode="url"
          aria-label="Сайт покупателя"
          placeholder="https://example.ru"
          readOnly={readOnly}
          onChange={(event) => onWebsite(event.target.value)}
        />
      </Field>
      <Field label="Яндекс Карты">
        <Input
          value={mapUrl}
          inputMode="url"
          aria-label="Яндекс Карты"
          placeholder="https://yandex.ru/maps/?text=город улица"
          readOnly={readOnly}
          onChange={(event) => onMap(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-3 text-sm">
        {isHttpUrl(website) ? (
          <a className="underline-offset-4 hover:underline" href={website.trim()} target="_blank" rel="noreferrer">
            Открыть сайт
          </a>
        ) : null}
        {isHttpUrl(mapUrl) ? (
          <a className="underline-offset-4 hover:underline" href={mapUrl.trim()} target="_blank" rel="noreferrer">
            Открыть в Яндекс Картах
          </a>
        ) : null}
      </div>
    </div>
  );
}
