"use client";

import { ChoiceSelect } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";

export function SellerSwitch({ tone = "light" }: { tone?: "light" | "sidebar" }) {
  const { status, data, sellerId, switchSeller } = useCrm();
  if (status !== "ready" || data.sellers.length === 0) return null;
  const seller = data.sellers.find((item) => item.id === sellerId) ?? data.sellers[0];
  const quiet = tone === "sidebar" ? "text-sidebar-foreground/65" : "text-muted-foreground";
  const name = tone === "sidebar" ? "text-sidebar-foreground" : "text-foreground";

  return (
    <div className={tone === "sidebar" ? "rounded-xl bg-sidebar-accent p-3" : "min-w-0"}>
      <p className={`text-[11px] font-medium tracking-[0.14em] uppercase ${quiet}`}>Вы за столом</p>
      <p className={`truncate text-sm font-semibold ${name}`}>{seller.name}</p>
      <p className={`truncate text-xs ${quiet}`}>
        {seller.role} · {seller.city}
      </p>
      <div className={tone === "sidebar" ? "mt-2 rounded-lg bg-background p-1 text-foreground" : "mt-2"}>
        <ChoiceSelect
          label="Сменить продавца"
          value={seller.id}
          onChange={switchSeller}
          options={data.sellers.map((item) => ({ value: item.id, label: item.name }))}
        />
      </div>
      <p className={`mt-2 text-[11px] leading-snug ${quiet}`}>Лиды и заметки этого продавца.</p>
    </div>
  );
}
