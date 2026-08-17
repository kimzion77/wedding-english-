-- ============================================================
--  모바일 청첩장 — Supabase 초기 설정 SQL
--  Supabase 콘솔 > SQL Editor 에 붙여넣고 1회 실행하세요.
-- ============================================================

-- 1) RSVP (참석 의사)
create table if not exists public.rsvp (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  side text not null default '신랑측',
  name text not null,
  attendance text not null default '참석',
  guest_count int not null default 1,
  meal text not null default '미정',
  phone text,
  message text
);

-- 2) 방명록 (텍스트 메시지)
create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  message text not null
);

-- 3) 게스트스냅 — 앨범(한 명 = 한 권) + 미디어 메타데이터 (실제 파일은 R2)
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  consent boolean not null default false
);

create table if not exists public.guestsnap (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_path text not null,
  media_type text not null default 'image',  -- image | video
  size bigint,
  uploader_name text,
  album_id uuid references public.albums(id) on delete cascade
);
-- 기존 테이블이 있으면 컬럼만 보강
alter table public.guestsnap add column if not exists album_id uuid references public.albums(id) on delete cascade;

-- 4) 사이트 설정 (레거시 — jsonb 단일 행)
create table if not exists public.site_settings (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 5) 청첩장 사진 슬롯 오버라이드 (관리자 교체분, 변형 접두사 v__slot)
create table if not exists public.site_images (
  slot text primary key,
  file_key text not null,
  updated_at timestamptz not null default now()
);

-- 6) 청첩장 문구/디자인 오버라이드 (id, theme.* 포함, 변형 접두사 v__id)
create table if not exists public.site_texts (
  id text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- 7) 청첩장 갤러리 사진 (변형별, 자유 추가/삭제)
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  variant text not null default 'main',
  file_key text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- 8) RLS: 모든 쓰기/읽기는 서버(service role)에서만 수행하므로
--    공개 테이블에 대한 익명 접근은 차단한다.
alter table public.rsvp enable row level security;
alter table public.guestbook enable row level security;
alter table public.guestsnap enable row level security;
alter table public.albums enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_images enable row level security;
alter table public.site_texts enable row level security;
alter table public.gallery_photos enable row level security;
-- (정책을 추가하지 않으면 service_role 키로만 접근 가능 — 의도된 동작)

-- 5) Storage 버킷 (비공개). 파일 업로드/다운로드/서명URL은 서버에서 처리.
insert into storage.buckets (id, name, public)
values ('guest-snap', 'guest-snap', false)
on conflict (id) do nothing;
