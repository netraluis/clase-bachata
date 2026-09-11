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
    <main className="flex flex-1 flex-col items-center gap-6 p-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-2xl font-semibold">Subir vídeo</h1>
        <Link href="/" className="text-sm underline">Volver</Link>
      </div>
      <Uploader />
    </main>
  );
}
