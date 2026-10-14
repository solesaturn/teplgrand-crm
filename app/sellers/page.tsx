"use client";

import { AdminScreen } from "@/components/admin-screen";
import { CrmGate } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";

export default function SellersPage() {
  return (
    <CrmGate>
      <Sellers />
    </CrmGate>
  );
}

function Sellers() {
  const { session } = useCrm();
  if (session?.kind !== "admin") {
    return <p className="text-sm text-muted-foreground">Этот раздел открыт администратору.</p>;
  }
  return <AdminScreen />;
}
