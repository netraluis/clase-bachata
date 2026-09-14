// Worker de casa (fase 1.5 del documento de arranque), versión mínima:
// genera la tira de fotogramas de cada vídeo con ffmpeg y la sube a R2.
// Un bucle: latido → buscar vídeos sin tira → procesar → dormir.
// Solo hace llamadas salientes: la base de datos es el buzón.
// Corre en un contenedor (worker/Dockerfile, compose.yml en la raíz).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const run = promisify(execFile);

const ENV_FILE = process.env.ENV_FILE ?? path.join(process.cwd(), ".env.local");
const env = fs.existsSync(ENV_FILE)
  ? Object.fromEntries(fs.readFileSync(ENV_FILE, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }))
  : process.env;

const FRAMES = 14;
const FRAME_H = 112;
const IDLE_MS = 60_000;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const Bucket = env.R2_BUCKET ?? "clase-bachata";
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function latido() {
  await db.from("worker_heartbeat").update({ last_seen: new Date().toISOString() }).eq("id", 1);
}

async function pendientes() {
  const { data, error } = await db.from("videos").select("id, r2_key, duration_s").is("filmstrip_key", null).order("created_at").limit(5);
  if (error) throw error;
  return data ?? [];
}

async function descargar(key, dest) {
  const obj = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  await fs.promises.writeFile(dest, await obj.Body.transformToByteArray());
}

async function tira(video) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tira-"));
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, "tira.jpg");
  try {
    log("descargando", video.id);
    await descargar(video.r2_key, input);
    log("generando tira", video.id);
    // FRAMES fotogramas repartidos por el vídeo, en una sola fila de FRAME_H px de alto.
    // fps=FRAMES/duración toma un fotograma cada duración/FRAMES segundos.
    const dur = Math.max(1, Number(video.duration_s) || 1);
    await run(ffmpeg, [
      "-v", "error", "-y", "-i", input,
      "-vf", `fps=${FRAMES}/${dur},scale=-2:${FRAME_H},tile=${FRAMES}x1`,
      "-frames:v", "1", "-q:v", "4", output,
    ], { timeout: 120_000 });
    const key = `filmstrips/${video.id}.jpg`;
    await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: await fs.promises.readFile(output), ContentType: "image/jpeg" }));
    const { error } = await db.from("videos").update({ filmstrip_key: key }).eq("id", video.id);
    if (error) throw error;
    log("tira lista", video.id);
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  log("worker arrancado; ffmpeg:", ffmpeg);
  for (;;) {
    try {
      await latido();
      const lista = await pendientes();
      if (lista.length) log("pendientes:", lista.length);
      for (const v of lista) {
        try {
          await tira(v);
        } catch (e) {
          log("fallo con", v.id, e.message);
        }
      }
      if (lista.length === 0) await new Promise((r) => setTimeout(r, IDLE_MS));
    } catch (e) {
      log("error del bucle", e.message);
      await new Promise((r) => setTimeout(r, IDLE_MS));
    }
  }
}
main();
