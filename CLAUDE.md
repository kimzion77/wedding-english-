# 모바일 청첩장 — 우성규 ♥ 김지은

신랑 우성규, 신부 김지은의 모바일 청첩장 웹앱. 링크를 공유하면 하객이 휴대폰에서 열어본다.

## ⭐ 아키텍처

청첩장 본문은 **정적 디자인**(`public/invite.html` + `public/assets/{styles.css,app.js,…}`, 바닐라 HTML/CSS/JS), **Next.js 는 백엔드(API) + `/admin` 전용**이다.
- `next.config.ts` 의 rewrite: `/` → `/invite.html`, `/honju` → `/invite.html` (혼주용 변형). `/api/*`, `/admin` 은 Next 가 처리.
- 콘텐츠(글·사진·계좌·섹션 표시 여부)는 모두 **Supabase DB 에 저장 + 관리자에서 편집 → 청첩장 열람 시 fetch 로 반영**. 재배포 불필요.
- 디자인(레이아웃·CSS)을 바꿀 때만 재배포.

## 변형(Variant) 시스템 — 메인 / 혼주용
- 동일한 디자인을 두 개의 변형으로 운영. 같은 청첩장 코드, 콘텐츠만 다름.
- URL: 메인 `/`, 혼주용 `/honju`. app.js 가 pathname 으로 variant 판단.
- 모든 동적 데이터(텍스트·사진·계좌·섹션 토글)는 `variant` 컬럼 또는 키 접두사(`v__id`)로 분리 저장.
- 관리자에서 큰 컬러 스위처(메인=세이지, 혼주용=로즈)로 편집 대상 전환.
- RSVP·방명록·게스트스냅 데이터는 같은 예식이라 공유.

## 정적 청첩장 ↔ 동적 콘텐츠 연결 지점 (app.js)
- **문구 + 디자인 + 섹션 토글**: `[data-text=...]` 요소 + `[data-screen-label=...]` 섹션. `GET /api/site-texts?v=` → 응답 키별 처리:
  - `theme.*` → CSS 변수 갱신
  - `section.<id>=off` → 해당 섹션 `display:none`
  - 그 외 → `[data-text=<id>]` innerHTML 교체 (개행 → `<br>`)
- **갤러리/타임라인/엔딩(동적 사진)**: `GET /api/gallery?v=&section=` → `#gtrack`/`#timelineList`/`#endingList` 컨테이너에 동적 렌더. 빈 섹션은 자동 숨김.
- **계좌**: `GET /api/accounts?v=` → `#accGroom`/`#accBride` 채움. `kakaopay` 있으면 「💬 송금」 버튼 표시.
- **방명록**: `GET/POST /api/guestbook`. 가장 최근 4개 표시 + 전체 보기 모달.
- **게스트스냅 앨범**: `GET /api/albums` → 책장 UI. 업로드는 `POST /api/albums` (앨범 생성) → `POST /api/guestsnap/presign` (R2 PUT URL) → 브라우저 직접 PUT → `POST /api/guestsnap/confirm`.
- **RSVP**: `POST /api/rsvp`. 도장 탭 → 입장 → 1.4초 후 미응답 시 모달 자동 표시. 「나중에 작성하기」 버튼 있음.
- **음악**: `<audio id="bgm">` + 우하단 음표 FAB. 도장 탭(첫 사용자 인터랙션)에서 자동 재생. 영상 소리 켜면 잠시 정지 → 영상 종료 시 복귀.
- **T맵**: 모바일은 `tmap://` 앱 스킴 시도, 1.2초 안 열리면 카카오맵으로 폴백. PC 클릭 시 바로 카카오맵.

## 관리자 대시보드 (`/admin`, 비밀번호=`ADMIN_PASSWORD`)

5개 탭. 좌측 미리보기 + 우측 편집(편집 탭에서만 grid 2단).

### 📊 개요
참석 인원·참석/미정/불참·식사·방명록·앨범 통계 카드 + 막대 차트 4개.

### 📥 RSVP
표 + 「엑셀(CSV) 다운로드」 + 「전체 초기화」 + 행별 「삭제」 버튼.

### 💌 방명록
2열 카드 + 행별 「삭제」 + 「엑셀(CSV) 다운로드」.

### 📸 게스트스냅
앨범 카드(표지·이름·연락처) → 펼치면 사진/영상 + 앨범 삭제. 「전체 ZIP 다운로드」 + 「사진·영상별 데이터 CSV(연락처 포함)」.

### ✏ 청첩장 편집 (핵심)
**좌측 미리보기 iframe** (sticky) + **우측 섹션 아코디언**. 상단에 큰 컬러 스위처(메인 / 혼주용).

각 카드 헤더: **[토글 스위치][섹션명][펼침 ▾]** — 토글로 청첩장에서 해당 섹션 ON/OFF. 펼치면 안의 콘텐츠 편집.

수동 저장 — 텍스트·메타·계좌 모두 controlled input. 카드 하단에 「변경 사항 저장」 버튼. 변경 시 헤더에 빨간 ● 변경됨 배지.

사진·영상 액션은 즉시 (추가/삭제/교체/순서변경 = 즉시 저장).

| 카드 | 편집 가능한 것 |
|---|---|
| 표지 (필수) | — |
| 인사말 | 시 구절 · 시 출처 · 제목 · 본문 |
| 메인 영상 | 영상 파일 · 표지 사진 · 영상 설명 |
| 캘린더 + 카운트다운 | (자동) |
| 신랑·신부 소개 | (코드 고정) |
| 우리의 시간(타임라인) | 사진 + 라틴 라벨 + 제목 + 설명, 자유 추가/삭제/교체/**드래그 순서변경** |
| 갤러리 | 사진 자유 추가/삭제/교체/**드래그 순서변경** |
| 오시는 길 | (코드 고정) |
| 참석 여부 | 안내문 |
| 마음 전하실 곳 | 안내문 + 계좌(역할·은행·번호·예금주·연락처·카카오페이) 자유 관리 |
| 방명록 | (자동, 관리자에서 글 삭제) |
| 게스트스냅 | (자동) |
| 엔딩 | 사진 + 마크 문구, 자유 추가/삭제/교체/**드래그 순서변경** |

자동 시드: 관리자 로그인 시 변형별로 갤러리/타임라인/엔딩 기본 사진(10개) + 신랑·신부 본인 계좌(2개) 자동 생성(멱등).

## 사진 업로드 흐름 (관리자 + 게스트스냅 공통)
- **관리자 업로드(갤러리/타임라인/엔딩/슬롯)** — 서버 경유 `POST /api/upload` (multipart) → R2 PUT (또는 R2 미설정 시 Supabase Storage 폴백) → `{ fileKey }` 반환. 어느 망에서든 동작. Vercel API 4.5MB 제한.
- **게스트스냅 업로드(하객)** — 브라우저 → R2 직접 PUT (presigned). 용량 제한 없음(~5GB), 원본 그대로. R2 미설정 시 멀티파트 POST 폴백.
- 파일 제공: 모두 우리 도메인 경유 프록시 — `/api/guestsnap/file?id=`, `/api/gallery/file?id=`, `/api/site-images/file?slot=&v=`. `file_key` 가 `/assets/...` 면 정적 자산으로 302 redirect(시드된 기본 사진).

## DB 테이블 (Supabase)
| 테이블 | 용도 |
|---|---|
| `rsvp` | 참석 응답 |
| `guestbook` | 방명록 |
| `albums` | 게스트스냅 앨범(이름·연락처·동의) |
| `guestsnap` | 게스트스냅 미디어 메타(앨범 연결, file_path, media_type) |
| `gallery_photos` | 청첩장 동적 사진(변형별, section: gallery/timeline/ending, sort, step/year_title/caption) |
| `accounts` | 계좌(변형별, side, role, bank, number, holder, phone, kakaopay) |
| `site_texts` | 청첩장 문구·테마·섹션 토글 (변형별, 키 접두사 `v__id`) |
| `site_images` | 청첩장 슬롯 이미지(film_video/film_poster, 변형별) |
| `site_settings` | (레거시, 사실상 미사용) |

전체 스키마: `supabase/schema.sql`. 누락된 컬럼이 있으면 API 코드는 안전 폴백(예: `kakaopay`).

## API 라우트
- `rsvp` POST — 응답 저장. `admin/rsvp` GET/DELETE — 조회·삭제(개별/전체).
- `guestbook` GET/POST/DELETE — 작성·삭제(관리자).
- `albums` GET/POST — 앨범 목록·생성. `admin/albums` GET/DELETE — 관리자 조회·삭제.
- `guestsnap/presign` POST — R2 PUT URL. `guestsnap/confirm` POST — 메타 기록. `guestsnap/file?id=` GET — 프록시.
- `admin/download` GET — 게스트스냅 전체 ZIP 스트리밍.
- `gallery` GET/POST/PATCH/DELETE — 동적 사진(메타·sort·교체). `gallery/file?id=` GET — 프록시. `gallery/init` POST — 시드.
- `accounts` GET/POST/PATCH/DELETE — 계좌. `accounts/init` POST — 시드.
- `site-texts` GET/POST/DELETE — 문구·테마·섹션 토글 (`?v=`).
- `site-images` GET/POST/DELETE — 슬롯 이미지 (`?v=`). `site-images/file?slot=&v=` GET — 프록시.
- `upload` POST — 관리자 서버 경유 업로드.

관리자 라우트는 모두 `?key=ADMIN_PASSWORD` 필수.

## 실행 / 배포
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 검증
```

### Vercel 배포 (#9)
1. GitHub repo push (`git push -u origin main`)
2. [vercel.com](https://vercel.com) → New Project → 그 repo Import (Next.js 자동 감지)
3. Settings → Environment Variables: 아래 10개 (.env.local에서 복사). Production·Preview·Development 모두 체크.
4. Deploy → `xxxx.vercel.app` 도메인 발급
5. **R2 CORS 설정** — Cloudflare 대시보드 → R2 → `guest-snap` → Settings → CORS:
   ```json
   [{
     "AllowedOrigins": ["https://<배포도메인>.vercel.app"],
     "AllowedMethods": ["PUT","GET","HEAD"],
     "AllowedHeaders": ["content-type"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3600
   }]
   ```
6. 카카오 디벨로퍼스 앱 생성 → JS 키 발급 → 배포 도메인 등록 → `NEXT_PUBLIC_KAKAO_JS_KEY` 환경변수 업데이트.

### 환경변수
| 키 | 필수 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 비밀 |
| `ADMIN_PASSWORD` | ✅ | 관리자 페이지 보호 |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_ENDPOINT` | 권장 | 없으면 Supabase Storage 폴백 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 선택 | 없으면 「링크 복사」로 동작 |

`.env.local` 은 `.gitignore` 처리됨. `.env.local.example` 만 커밋.

## 회수 (게스트스냅)
`/admin` → 「게스트스냅」 탭 → **「전체 ZIP 다운로드」** → 받은 ZIP을 구글 드라이브에 수동 업로드. **「사진·영상별 데이터 CSV」** 로 누가 어떤 사진을 올렸는지(연락처 포함) 별도 받기.

## 🛠 향후 계획 / 미구현

### 우선 — 배포 직후
- **#9 Vercel 배포 + R2 CORS + 카카오 키** — 위 절차 그대로
- 배포 도메인을 `share` 메타·카톡 공유에 자동 반영(`NEXT_PUBLIC_SITE_URL` 같은 변수)

### 다음 — 운영 편의
- **구글 드라이브 자동 연동** (선택, 의도적으로 빠져있음): Google OAuth + Drive API로 신랑신부 본인 구글 계정에 게스트스냅 자동 업로드. "+5일 자동 종료" 같은 정책 동반.
- **혼주용 청첩장 톤 차별화** (현재는 같은 디자인 + 다른 콘텐츠): 색상·폰트 톤만 다르게 하고 싶다면 site_texts 의 `theme.*` 키로 변형별 override.
- **이미지 투 비디오 클립**(`public/videos/`): 갤러리 사진에 AI 모션 클립 연결, 탭하면 자동 재생. 이전에 토대만 만들어둠(GalleryItem.video). 현재 정적 갤러리에서 활용 가능.

### 정리 — 코드 위생
- **레거시 React 청첩장 제거**: `src/components/sections/*`, `src/components/ContentProvider.tsx`, `src/config/site.config.ts`, `src/config/theme.ts`, `src/_legacy_react/`, `src/lib/content.ts`, `src/lib/datetime.ts` (정적 청첩장으로 완전 전환됐으니 이제 안 씀)
- **`site_settings` 테이블 + `/api/admin/settings`** 도 레거시 — 새 구조에선 안 씀
- **build 경로에서 미사용 deps**(framer-motion 등) 점검

### 사용자 콘텐츠 정비 (배포 전/후 둘 다 가능)
- 실제 웨딩 사진들로 갤러리·타임라인·엔딩 교체 (관리자에서 가능)
- 메인 필름 영상 — 카메라 영상 또는 신랑신부 영상으로 교체 (현재 `assets/film.mp4`, 카메라 영상)
- 카카오페이 송금 링크 입력 (`accounts.kakaopay`)
- 혼주용 청첩장 내용 입력 (현재 메인과 동일하게 시드되어 있음)
