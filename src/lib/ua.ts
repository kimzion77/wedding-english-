/**
 * User-Agent 문자열을 디바이스/OS/브라우저로 분류.
 * 의존성 없이 정규식으로 처리 — 청첩장 통계용 가벼운 분류.
 * 한국 환경 고려: 카카오톡/네이버/인스타 인앱 브라우저 우선 식별.
 */
export type UAInfo = {
  device: "Mobile" | "Tablet" | "Desktop";
  os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other";
  browser:
    | "KakaoTalk"
    | "Naver"
    | "Instagram"
    | "Facebook"
    | "Line"
    | "Samsung"
    | "Edge"
    | "Chrome"
    | "Safari"
    | "Firefox"
    | "Other";
};

export function parseUA(uaRaw: string | null | undefined): UAInfo {
  const u = (uaRaw || "").toLowerCase();

  // OS
  let os: UAInfo["os"] = "Other";
  if (/iphone|ipad|ipod/.test(u)) os = "iOS";
  else if (/android/.test(u)) os = "Android";
  else if (/windows/.test(u)) os = "Windows";
  else if (/mac os|macintosh/.test(u)) os = "macOS";
  else if (/linux|cros/.test(u)) os = "Linux";

  // 디바이스
  const isTablet = /ipad|tablet/.test(u) || (/android/.test(u) && !/mobile/.test(u));
  const isMobile = !isTablet && /mobile|android|iphone|ipod/.test(u);
  const device: UAInfo["device"] = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  // 브라우저 — 인앱 우선 (Chrome 토큰을 포함하므로 먼저 잡아야 함)
  let browser: UAInfo["browser"] = "Other";
  if (/kakaotalk/.test(u)) browser = "KakaoTalk";
  else if (/naver\(inapp/.test(u) || /inapp;\s*naver/.test(u) || /naver/.test(u)) browser = "Naver";
  else if (/instagram/.test(u)) browser = "Instagram";
  else if (/fban|fbav/.test(u)) browser = "Facebook";
  else if (/\bline\//.test(u)) browser = "Line";
  else if (/samsungbrowser/.test(u)) browser = "Samsung";
  else if (/edg\//.test(u)) browser = "Edge";
  else if (/firefox|fxios/.test(u)) browser = "Firefox";
  else if (/chrome|crios/.test(u)) browser = "Chrome";
  else if (/safari/.test(u)) browser = "Safari";

  return { device, os, browser };
}

/** Referer URL 에서 호스트만 추출 (간단 표시용). 직접 입장은 '직접 방문'. */
export function shortReferer(ref: string | null | undefined, selfHost?: string): string {
  if (!ref) return "직접 방문";
  try {
    const u = new URL(ref);
    if (selfHost && u.host === selfHost) return "내부 이동";
    return u.host;
  } catch {
    return ref.slice(0, 40);
  }
}
