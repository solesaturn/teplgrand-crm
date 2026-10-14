"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrm } from "@/lib/crm-context";

export function AdminScreen() {
  const { data, addSeller } = useCrm();
  const [name, setName] = useState("");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await addSeller({ name, login: loginName, password });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setLoginName("");
    setPassword("");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10" aria-label="Продавцы">
        <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.48_0.06_55)] uppercase">Отдел</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Продавцы</h1>
        <p className="mt-1 text-sm text-muted-foreground">Каждый входит под своим логином и видит только свои лиды, заметки и историю звонков.</p>
        {data.sellers.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Продавцов ещё нет. Добавьте первого.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {data.sellers.map((seller) => (
              <li key={seller.id} className="flex items-baseline justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{seller.name}</p>
                  <p className="text-sm text-muted-foreground">{[seller.role, seller.city].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="font-mono text-sm">{seller.login}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form onSubmit={submit} className="h-fit rounded-2xl bg-card p-5 ring-1 ring-foreground/10" aria-label="Новый продавец">
        <h2 className="text-lg font-semibold">Новый продавец</h2>
        <p className="mt-1 text-sm text-muted-foreground">После сохранения человек может войти этим логином.</p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="seller-name">Имя</Label>
            <Input id="seller-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seller-login">Логин</Label>
            <Input id="seller-login" value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="off" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seller-password">Пароль</Label>
            <Input
              id="seller-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="mt-4 h-10 w-full" type="submit" disabled={pending}>
          Добавить продавца
        </Button>
      </form>
    </div>
  );
}
