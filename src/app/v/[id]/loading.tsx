import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black text-white">
        <Spinner className="size-8" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-16" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
