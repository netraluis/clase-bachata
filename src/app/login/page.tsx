import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginButton } from "./login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/events");
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Para ver los vídeos no hace falta entrar. Esto es para los profes, que suben los vídeos y dejan notas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <LoginButton />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>No se pudo iniciar sesión. Vuelve a intentarlo.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
