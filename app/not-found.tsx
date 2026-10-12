import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <h1 className="text-xl font-semibold">Такой страницы нет</h1>
      <p className="mt-2 text-sm text-muted-foreground">Проверьте адрес или вернитесь к обзору отдела продаж.</p>
      <Button className="mt-4" render={<Link href="/" />}>
        На обзор
      </Button>
    </div>
  );
}
