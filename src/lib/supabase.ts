import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const GUEST_SNAP_BUCKET = "guest-snap";

/** Supabase 환경변수가 모두 설정되어 있는지 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let serverClient: SupabaseClient | null = null;

/**
 * 서버 전용 클라이언트 (service role 키 사용 — 절대 클라이언트로 노출 금지).
 * 환경변수가 없으면 null 을 반환하므로 호출부에서 처리해야 한다.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (serverClient) return serverClient;
  serverClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  return serverClient;
}
