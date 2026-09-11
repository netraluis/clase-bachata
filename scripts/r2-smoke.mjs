// Prueba del paso 2: URL PUT firmada → subir → preflight CORS → GET firmado → borrar.
import fs from "node:fs";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const s3 = new S3Client({ region:"auto", endpoint:`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials:{ accessKeyId:env.R2_ACCESS_KEY_ID, secretAccessKey:env.R2_SECRET_ACCESS_KEY } });
const Bucket = env.R2_BUCKET, Key = "videos/smoke-test.mp4";
const body = Buffer.from("no soy un mp4 de verdad, solo una prueba");

const putUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket, Key, ContentType:"video/mp4" }), { expiresIn:600 });
console.log("PUT firmada:", new URL(putUrl).pathname, "| expira 600s");

const origin = "http://100-64-45-119.sslip.io:3000";
const pre = await fetch(putUrl, { method:"OPTIONS", headers:{ Origin:origin, "Access-Control-Request-Method":"PUT", "Access-Control-Request-Headers":"content-type" } });
console.log("preflight CORS:", pre.status, "| allow-origin:", pre.headers.get("access-control-allow-origin"), "| allow-methods:", pre.headers.get("access-control-allow-methods"));

const put = await fetch(putUrl, { method:"PUT", body, headers:{ "Content-Type":"video/mp4", Origin:origin } });
console.log("PUT:", put.status, "| etag:", put.headers.get("etag"), "| expose etag al navegador:", put.headers.get("access-control-expose-headers"));

const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn:3600 });
const get = await fetch(getUrl);
console.log("GET firmado:", get.status, "| content-type:", get.headers.get("content-type"), "| bytes:", (await get.arrayBuffer()).byteLength, "de", body.length);

const anon = await fetch(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${Bucket}/${Key}`);
console.log("GET sin firma (bucket privado, espero 4xx):", anon.status);

await s3.send(new DeleteObjectCommand({ Bucket, Key }));
console.log("objeto de prueba borrado");
