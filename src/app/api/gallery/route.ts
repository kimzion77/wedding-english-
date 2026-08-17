import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Section = "gallery" | "timeline" | "ending";
const SECTIONS: Section[] = ["gallery", "timeline", "ending"];
const isSection = (s: unknown): s is Section =>
  typeof s === "string" && (SECTIONS as string[]).includes(s);

/**
 * 청첩장 동적 사진 목록 (변형별, 섹션별 자유 추가/삭제).
 * - gallery: 캐러셀용 (사진만)
 * - timeline: 사진 + step(라틴) / year_title(연도/제목) / caption(설명)
 * - ending: 사진 + caption(아래 마크)
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const v = u.searchParams.get("v") || "main";
  const section = u.searchParams.get("section");

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ items: [] });
  try {
    let q = supabase
      .from("gallery_photos")
      .select("id, section, step, year_title, caption, file_key")
      .eq("variant", v)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (section && isSection(section)) q = q.eq("section", section);
    const { data } = await q;
    const items = (data ?? []).map((r) => {
      // 사진 교체 시 file_key 가 새 경로로 바뀌므로, 그 조각을 URL 버전(fv)으로
      // 쓰면 파일 응답을 1년 immutable 캐시해도 교체가 즉시 반영된다.
      const fv = (r.file_key ?? "").split("/").pop()?.slice(0, 8) || "0";
      return {
        id: r.id,
        section: r.section,
        step: r.step ?? "",
        year_title: r.year_title ?? "",
        caption: r.caption ?? "",
        url: `/api/gallery/file?id=${r.id}&fv=${fv}`,
      };
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

/** 사진 추가 (관리자) — ?v= & { section, fileKey, step?, year_title?, caption? } */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  let body: {
    section?: string;
    fileKey?: string;
    step?: string;
    year_title?: string;
    caption?: string;
  } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const fileKey = (body?.fileKey || "").trim();
  const section = isSection(body?.section) ? body!.section : "gallery";
  if (!fileKey)
    return NextResponse.json({ error: "fileKey 필요" }, { status: 400 });

  const { data, error } = await supabase
    .from("gallery_photos")
    .insert({
      variant: v,
      file_key: fileKey,
      section,
      step: body?.step?.slice(0, 80) || null,
      year_title: body?.year_title?.slice(0, 80) || null,
      caption: body?.caption?.slice(0, 500) || null,
    })
    .select("id")
    .single();
  if (error || !data)
    return NextResponse.json({ error: "추가 실패" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

/** 메타·사진 교체 (관리자) — ?key=&id= & { step?, year_title?, caption?, fileKey? } */
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  let body: { step?: string; year_title?: string; caption?: string; fileKey?: string; sort?: number } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const patch: Record<string, string | number | null> = {};
  if (body && "step" in body) patch.step = body.step?.slice(0, 80) || null;
  if (body && "year_title" in body) patch.year_title = body.year_title?.slice(0, 80) || null;
  if (body && "caption" in body) patch.caption = body.caption?.slice(0, 500) || null;
  if (body && "fileKey" in body) {
    const fk = (body.fileKey || "").trim();
    if (!fk) return NextResponse.json({ error: "fileKey 비어있음" }, { status: 400 });
    patch.file_key = fk;
  }
  if (body && typeof body.sort === "number") patch.sort = body.sort;

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { error } = await supabase.from("gallery_photos").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** 사진 삭제 (관리자) — ?key=&id= */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });
  await supabase.from("gallery_photos").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
