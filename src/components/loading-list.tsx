import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de una lista de tarjetas con filas de vídeo (clases o curso).
export function LoadingList({ title = true, cards = 2 }: { title?: boolean; cards?: number }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6" aria-busy="true">
      {title && <Skeleton className="h-8 w-40" />}
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-6 w-72" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[0, 1].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-14 w-[86px] rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
