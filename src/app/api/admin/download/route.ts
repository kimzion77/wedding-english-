import { getServerSupabase, GUEST_SNAP_BUCKET } from "@/lib/supabase";
import { isR2Configured, r2GetBuffer } from "@/lib/r2";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || key !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return new Response("Supabase not configured", { status: 503 });
  }

  const { data: rows, error } = await supabase
    .from("guestsnap")
    .select("file_path")
    .order("created_at", { ascending: true });

  if (error) {
    return new Response("Failed to list files", { status: 500 });
  }

  const archive = archiver("zip", { zlib: { level: 5 } });
  const pass = new PassThrough();
  archive.on("error", () => pass.destroy());
  archive.pipe(pass);

  const useR2 = isR2Configured();
  (async () => {
    for (const row of rows ?? []) {
      let buf: Buffer | null = null;
      if (useR2) {
        buf = await r2GetBuffer(row.file_path);
      } else {
        const { data: blob } = await supabase.storage
          .from(GUEST_SNAP_BUCKET)
          .download(row.file_path);
        if (blob) buf = Buffer.from(await blob.arrayBuffer());
      }
      if (buf) archive.append(buf, { name: row.file_path });
    }
    await archive.finalize();
  })();

  const filename = `guest-snap-${new Date().toISOString().slice(0, 10)}.zip`;
  return new Response(Readable.toWeb(pass) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
