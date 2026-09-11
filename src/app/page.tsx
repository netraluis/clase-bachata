import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clase de bachata</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600">
            {user.email} {user.profe && <strong>· profe</strong>}
          </span>
          {user.profe && (
            <Link href="/subir" className="rounded-lg bg-black px-3 py-2 text-white dark:bg-white dark:text-black">
              Subir vídeo
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="underline">Salir</button>
          </form>
        </div>
      </header>

      {error === "no-profe" && (
        <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          Solo los profes pueden subir vídeos.
        </p>
      )}

      <p className="text-zinc-600">Aquí irá la lista de vídeos (paso 5).</p>
    </main>
  );
}
