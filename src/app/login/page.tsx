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
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="card flex w-full max-w-sm flex-col gap-5 p-6 text-center">
        <h1 className="text-display">Entrar</h1>
        <p className="text-small text-paper-dim">
          Para ver los vídeos no hace falta entrar. Esto es para los profes, que suben los vídeos.
        </p>
        <LoginButton />
        {error && <p className="notice notice-rosa">No se pudo iniciar sesión. Vuelve a intentarlo.</p>}
      </div>
    </main>
  );
}
