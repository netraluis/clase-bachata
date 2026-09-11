// Rellena videos.size_bytes con el tamaño real del objeto en R2 (una vez).
import fs from "node:fs";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const s3 = new S3Client({ region:"auto", endpoint:`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials:{ accessKeyId:env.R2_ACCESS_KEY_ID, secretAccessKey:env.R2_SECRET_ACCESS_KEY } });
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: videos } = await db.from("videos").select("id, r2_key, size_bytes").is("size_bytes", null);
for (const v of videos ?? []) {
  const h = await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: v.r2_key }));
  await db.from("videos").update({ size_bytes: h.ContentLength }).eq("id", v.id);
  console.log(v.r2_key, (h.ContentLength/1048576).toFixed(1), "MB");
}
console.log("hecho:", (videos ?? []).length, "vídeos");
