"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrm } from "@/lib/crm-context";
import { COMPANY } from "@/lib/policy";

export function LoginScreen() {
  const { login } = useCrm();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await login(loginName, password);
    setPending(false);
    if (result === "invalid") setError("Неверный логин или пароль.");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[320px_1fr]">
      <aside className="hidden flex-col justify-between bg-sidebar px-6 py-8 text-sidebar-foreground lg:flex">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-[oklch(0.78_0.05_75)] uppercase">Теплогранд</p>
          <p className="mt-2 text-2xl font-semibold">Продажи</p>
          <p className="mt-3 text-sm text-sidebar-foreground/70">{COMPANY.line}</p>
        </div>
        <div className="text-xs text-sidebar-foreground/70">
          <p>{COMPANY.name}</p>
          <p className="mt-1">ИНН {COMPANY.inn}</p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-foreground/10" aria-label="Вход">
          <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.48_0.06_55)] uppercase lg:hidden">Теплогранд</p>
          <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
          <p className="mt-1 text-sm text-muted-foreground">Логин и пароль выдаёт администратор отдела.</p>
          <div className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                name="login"
                autoComplete="username"
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="mt-5 h-10 w-full" type="submit" disabled={pending}>
            Войти
          </Button>
        </form>
      </main>
    </div>
  );
}
