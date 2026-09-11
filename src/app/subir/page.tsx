import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

// Solo los emails de ALLOWED_EMAILS pueden entrar aquí.
// El uploader real llega en el paso 3.
export default async function SubirPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.profe) redirect("/?error=no-profe");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Subir vídeo</h1>
      <p className="text-zinc-600">Hola, {user.email}. Aquí irá el uploader (paso 3).</p>
      <Link href="/" className="underline">Volver</Link>
    </main>
  );
}
