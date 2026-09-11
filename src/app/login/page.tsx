import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginButton } from "./login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">Clase de bachata</h1>
      <p className="text-zinc-600">Los vídeos de los jueves, sin buscarlos en WhatsApp.</p>
      <LoginButton />
      {error && (
        <p className="text-sm text-red-600">
          No se pudo iniciar sesión. Vuelve a intentarlo.
        </p>
      )}
    </main>
  );
}
