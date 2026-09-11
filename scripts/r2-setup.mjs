import fs from "node:fs";
import { S3Client, ListBucketsCommand, CreateBucketCommand, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
console.log("account id válido:", /^[0-9a-f]{32}$/.test(R2_ACCOUNT_ID), "| bucket:", R2_BUCKET);

const s3 = new S3Client({ region:"auto", endpoint:`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials:{ accessKeyId:R2_ACCESS_KEY_ID, secretAccessKey:R2_SECRET_ACCESS_KEY } });

const { Buckets } = await s3.send(new ListBucketsCommand({}));
console.log("buckets existentes:", Buckets?.map(b=>b.Name) ?? []);
if (!Buckets?.some(b=>b.Name===R2_BUCKET)) {
  await s3.send(new CreateBucketCommand({ Bucket:R2_BUCKET }));
  console.log("bucket creado:", R2_BUCKET);
}

await s3.send(new PutBucketCorsCommand({ Bucket:R2_BUCKET, CORSConfiguration:{ CORSRules:[{
  AllowedOrigins:["http://localhost:3000","http://100-64-45-119.sslip.io:3000","https://clase-bachata.vercel.app"],
  AllowedMethods:["PUT","GET","HEAD"],
  AllowedHeaders:["*"],
  ExposeHeaders:["ETag"],
  MaxAgeSeconds:3600,
}]}}));
const cors = await s3.send(new GetBucketCorsCommand({ Bucket:R2_BUCKET }));
console.log("CORS aplicado:", JSON.stringify(cors.CORSRules));
