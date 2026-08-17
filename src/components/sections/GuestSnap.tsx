"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import Section from "@/components/ui/Section";

type SnapItem = {
  id: string;
  url: string;
  media_type: "image" | "video";
  uploader_name: string | null;
};

export default function GuestSnap() {
  const site = useSiteContent();
  const [items, setItems] = useState<SnapItem[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/guestsnap", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setItems(j.items ?? []);
      }
    } catch {
      /* 미설정/오프라인 시 무시 */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice("");
    const form = e.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setNotice("사진 또는 영상을 선택해주세요.");
      return;
    }
    const uploaderName =
      (form.elements.namedItem("uploader_name") as HTMLInputElement)?.value || "";
    const contentType = file.type || "application/octet-stream";

    setProgress(0);
    try {
      // 1) presigned URL 요청 (R2 직접 업로드 — 용량 제한 없음)
      const presRes = await fetch("/api/guestsnap/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType }),
      });
      const pres = await presRes.json();
      if (!presRes.ok) throw new Error(pres.error || "업로드 준비에 실패했습니다.");

      if (pres.url) {
        // 2) 브라우저 → R2 직접 PUT (원본 그대로)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", pres.url);
          xhr.setRequestHeader("Content-Type", contentType);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable)
              setProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`업로드 실패 (${xhr.status})`));
          xhr.onerror = () =>
            reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
          xhr.send(file);
        });
        // 3) 메타데이터 기록
        const conf = await fetch("/api/guestsnap/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: pres.key,
            media_type: pres.mediaType,
            size: file.size,
            uploader_name: uploaderName,
          }),
        });
        if (!conf.ok) {
          const j = await conf.json().catch(() => ({}));
          throw new Error(j.error || "기록에 실패했습니다.");
        }
      } else {
        // R2 미설정 → 기존 멀티파트 업로드(Supabase)로 폴백
        await new Promise<void>((resolve, reject) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("uploader_name", uploaderName);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/guestsnap");
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable)
              setProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else {
              let msg = "업로드에 실패했습니다.";
              try {
                msg = JSON.parse(xhr.responseText).error || msg;
              } catch {}
              reject(new Error(msg));
            }
          };
          xhr.onerror = () =>
            reject(new Error("업로드 중 오류가 발생했습니다."));
          xhr.send(fd);
        });
      }

      setProgress(null);
      form.reset();
      load();
    } catch (err) {
      setProgress(null);
      setNotice(
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다."
      );
    }
  }

  return (
    <Section id="guestsnap" label="GUEST SNAP" title={site.guestSnap.title}>
      <p className="mb-6 text-center text-sm text-muted">
        {site.guestSnap.description}
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="uploader_name"
          placeholder="성함(선택)"
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/*,video/*"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-card file:px-3 file:py-2 file:text-sm file:text-foreground"
        />
        {progress !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {notice && <p className="text-sm text-rose-500">{notice}</p>}
        <button
          type="submit"
          disabled={progress !== null}
          className="w-full rounded-md bg-accent py-3 font-title text-white transition disabled:opacity-60"
        >
          {progress !== null ? `업로드 중 ${progress}%` : "사진·영상 올리기"}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-3 gap-1.5">
        {items.map((it) =>
          it.media_type === "video" ? (
            <video
              key={it.id}
              src={it.url}
              controls
              playsInline
              className="aspect-square w-full rounded bg-black object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={it.id}
              src={it.url}
              alt={it.uploader_name ?? "하객 사진"}
              loading="lazy"
              className="aspect-square w-full rounded object-cover"
            />
          )
        )}
      </div>
      {items.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">
          첫 번째 순간을 남겨주세요.
        </p>
      )}
    </Section>
  );
}
