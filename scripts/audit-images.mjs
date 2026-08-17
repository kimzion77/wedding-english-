// 저장된 사진 크기 감사 — 압축 대상 선정용 (읽기 전용)
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync("C:/Users/Jini/Desktop/결혼/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = env.R2_BUCKET || "guest-snap";

// 1) DB 에서 참조 중인 file_key 수집 (gallery + site_images)
async function pg(path) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}
const gallery = await pg("gallery_photos?select=id,section,file_key");
const siteImages = await pg("site_images?select=slot,file_key");

const refs = new Map(); // file_key -> label
for (const g of gallery) if (g.file_key && !g.file_key.startsWith("/assets/")) refs.set(g.file_key, `gallery:${g.section}`);
for (const s of siteImages) if (s.file_key && !s.file_key.startsWith("/assets/")) refs.set(s.file_key, `slot:${s.slot}`);

// 2) R2 전체 객체 크기
const sizes = new Map();
let token;
do {
  const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
  for (const o of out.Contents ?? []) sizes.set(o.Key, o.Size);
  token = out.IsTruncated ? out.NextContinuationToken : undefined;
} while (token);

// 3) 리포트
const rows = [];
let total = 0, missing = 0;
for (const [key, label] of refs) {
  const sz = sizes.get(key);
  if (sz == null) { missing++; continue; }
  total += sz;
  rows.push({ key, label, kb: Math.round(sz / 1024) });
}
rows.sort((a, b) => b.kb - a.kb);
console.log(`참조 이미지 ${rows.length}개 · 총 ${(total / 1024 / 1024).toFixed(1)} MB · R2 미존재 ${missing}개`);
console.log("--- 크기 상위 25 ---");
for (const r of rows.slice(0, 25)) console.log(`${String(r.kb).padStart(6)} KB  ${r.label.padEnd(18)} ${r.key}`);
const over = rows.filter((r) => r.kb > 400);
console.log(`--- 400KB 초과: ${over.length}개, ${(over.reduce((s, r) => s + r.kb, 0) / 1024).toFixed(1)} MB ---`);
