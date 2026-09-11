import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Uploader } from "./uploader";

// Solo admin y profes (rol en la tabla profiles).
export default async function SubirPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.canUpload) redirect("/?error=no-profe");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Link href="/" className="text-small text-paper-dim hover:text-paper">
        ← Todos los vídeos
      </Link>
      <div>
        <h1 className="text-display">Subir vídeo</h1>
        <p className="mt-1 text-small text-paper-dim">
          Un MP4 del móvil. Se sube directo al almacenamiento, sin pasar por el servidor.
        </p>
      </div>
      <div className="card p-5">
        <Uploader />
      </div>
    </main>
  );
}
