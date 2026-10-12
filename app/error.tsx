"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <h1 className="text-xl font-semibold">Раздел не открылся</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Что-то сломалось при отрисовке. Данные компаний на месте, можно попробовать ещё раз.
      </p>
      <Button className="mt-4" onClick={reset}>
        Попробовать снова
      </Button>
    </div>
  );
}
