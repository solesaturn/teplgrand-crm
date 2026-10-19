"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Library,
  Menu,
  CalendarClock,
  PhoneCall,
  Rows3,
  Shield,
  Users,
} from "lucide-react";
import { LoginScreen } from "@/components/login-screen";
import { PageSkeleton } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { AccountPanel } from "@/components/seller-switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCrm } from "@/lib/crm-context";
import { COMPANY } from "@/lib/policy";
import { cn } from "cn";

const PRIMARY = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/leads", label: "Лиды", icon: PhoneCall },
  { href: "/today", label: "Сегодня", icon: CalendarClock },
  { href: "/clients", label: "Клиенты", icon: Building2 },
  { href: "/pipeline", label: "Сделки", icon: Rows3 },
  { href: "/offers", label: "КП", icon: FileSpreadsheet },
  { href: "/tasks", label: "Задачи", icon: CheckCheck },
];

const MORE = [
  { href: "/contacts", label: "Контакты", icon: Users },
  { href: "/catalog", label: "Каталог", icon: Library },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, session, error, reset } = useCrm();
  if (status === "loading") {
    return (
      <div className="min-h-dvh px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Теплогранд</p>
          <h1 className="mt-2 text-xl font-semibold">Данные отдела не открылись</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Попробуйте открыть стол ещё раз."}</p>
          <Button className="mt-4" onClick={reset}>
            Восстановить рабочий стол
          </Button>
        </div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  return <SellerShell>{children}</SellerShell>;
}

function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useCrm();
  const sellers = session?.kind === "admin" ? [{ href: "/sellers", label: "Продавцы", icon: Shield }] : [];
  const links = [...PRIMARY, ...sellers, ...MORE];

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="no-print hidden md:flex md:min-h-dvh md:flex-col md:overflow-hidden md:bg-sidebar md:text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-4 py-4">
          <p className="text-[11px] font-medium tracking-[0.18em] text-[oklch(0.78_0.05_75)] uppercase">Теплогранд</p>
          <p className="mt-1 text-lg font-semibold leading-tight">Продажи</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">{COMPANY.line}</p>
        </div>
        <div className="px-3 pt-3">
          <AccountPanel tone="sidebar" />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Разделы">
          {links.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  on ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70",
                )}
                aria-current={on ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/70">
          <p>{COMPANY.name}</p>
          <p className="mt-1">ИНН {COMPANY.inn}</p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.48_0.06_55)] uppercase">Теплогранд</p>
            <p className="text-sm font-semibold">Продажи</p>
          </div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Меню" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
              <SheetHeader>
                <SheetTitle className="text-sidebar-foreground">Разделы</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-3">
                <AccountPanel tone="sidebar" />
              </div>
              <nav className="flex flex-col gap-1 px-4" aria-label="Разделы">
                {links.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          </div>
          <div className="mt-3">
            <AccountPanel />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 pb-24 md:px-8 md:pb-10">{children}</main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t bg-background/95 backdrop-blur md:hidden" aria-label="Основные разделы">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px]",
                  on ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={on ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
