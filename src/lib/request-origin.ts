// Origen real de la petición según las cabeceras, no según request.url.
// En dev Next reconstruye request.url como localhost aunque se entre por
// otro host (Tailscale/sslip); en Vercel el host real llega en x-forwarded-host.
export function requestOrigin(headers: Headers): string {
  const host =
    headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto =
    headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || /^[\d-]+\.sslip\.io/.test(host) || /^\d+\.\d+\.\d+\.\d+/.test(host)
      ? "http"
      : "https");
  return `${proto}://${host}`;
}
