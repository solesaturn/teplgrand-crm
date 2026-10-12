export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="sr-only">Загружаем раздел</p>
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
