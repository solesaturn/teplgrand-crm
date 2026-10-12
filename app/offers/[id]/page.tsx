"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OfferEditor } from "@/components/offer-editor";
import { CrmGate, EmptyState } from "@/components/crm-ui";
import { useCrm } from "@/lib/crm-context";

export default function OfferPage() {
  return (
    <CrmGate>
      <OfferRoute />
    </CrmGate>
  );
}

function OfferRoute() {
  const params = useParams<{ id: string }>();
  const { data } = useCrm();
  const offer = data.offers.find((item) => item.id === params.id);
  if (!offer) {
    return (
      <EmptyState
        title="Предложение не найдено"
        text="Номер мог остаться от старых демо-данных. Откройте список и соберите новое."
        action={<Button nativeButton={false} render={<Link href="/offers" />}>К списку КП</Button>}
      />
    );
  }
  return <OfferEditor offer={offer} />;
}
