import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 habla la API de S3: mismo SDK, endpoint de Cloudflare, región "auto".
let client: S3Client | null = null;

export function r2() {
  if (client) return client;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Faltan R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return client;
}

export const bucket = () => process.env.R2_BUCKET ?? "clase-bachata";

// URL para que el navegador haga PUT directo. 10 minutos por defecto.
export function presignPut(key: string, contentType: string, expiresIn = 600) {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

// URL de lectura para <video src> y miniaturas. 1 hora por defecto.
export function presignGet(key: string, expiresIn = 3600) {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn,
  });
}
