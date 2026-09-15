import Link from "next/link";
import { SetHeaderCrumbs } from "@/components/header-title";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      <SetHeaderCrumbs crumbs={[{ label: "No encontrado" }]} />
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Esto no existe</EmptyTitle>
          <EmptyDescription>Puede que el vídeo o la clase se hayan borrado.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/events" />}>
            Ir a las clases
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
