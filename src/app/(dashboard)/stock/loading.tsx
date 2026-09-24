import { Skeleton } from '@/components/ui/skeleton';

export default function StockLoading() {
  return (
    <div className="space-y-6">
      {/* Tab bar + change start date button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-8 w-40 shrink-0" />
      </div>

      {/* Toolbar: search + count line */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-4 last:border-b-0">
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-8 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-56" />
      </div>
    </div>
  );
}
