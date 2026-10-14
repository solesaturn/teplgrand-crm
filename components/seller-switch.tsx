"use client";

import { Button } from "@/components/ui/button";
import { useCrm } from "@/lib/crm-context";

export function AccountPanel({ tone = "light" }: { tone?: "light" | "sidebar" }) {
  const { data, sellerId, session, logout } = useCrm();
  const seller = data.sellers.find((item) => item.id === sellerId);
  const admin = session?.kind === "admin" ? data.admins.find((item) => item.id === session.adminId) : undefined;
  if (!seller && !admin) return null;
  const quiet = tone === "sidebar" ? "text-sidebar-foreground/65" : "text-muted-foreground";
  const name = tone === "sidebar" ? "text-sidebar-foreground" : "text-foreground";
  const detail = seller ? [seller.role, seller.city].filter(Boolean).join(" · ") : "Весь отдел";

  return (
    <div className={tone === "sidebar" ? "rounded-xl bg-sidebar-accent p-3" : "min-w-0"}>
      <p className={`text-[11px] font-medium tracking-[0.14em] uppercase ${quiet}`}>Вы за столом</p>
      <p className={`truncate text-sm font-semibold ${name}`}>{seller?.name ?? admin?.name ?? "Администратор"}</p>
      {detail ? <p className={`truncate text-xs ${quiet}`}>{detail}</p> : null}
      <Button
        type="button"
        variant={tone === "sidebar" ? "secondary" : "outline"}
        className="mt-3 h-8 w-full"
        onClick={logout}
      >
        Выйти
      </Button>
    </div>
  );
}
