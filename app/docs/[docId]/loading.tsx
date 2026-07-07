import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="space-y-3 rounded-lg border p-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-4"
              style={{ width: `${70 + ((index * 7) % 30)}%` }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
