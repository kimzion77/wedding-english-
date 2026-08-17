// ============================================================
//  모바일 청첩장 — 모든 콘텐츠를 이 파일 한 곳에서 수정합니다.
//  [확정] 값은 그대로, [필요] 표시는 확정되는 대로 교체하세요.
// ============================================================

export type Account = {
  bank: string;
  number: string;
  holder: string;
  /** 카카오페이 송금 링크 (선택) */
  kakaopay?: string;
};

export type Person = {
  /** 호칭: 신랑 / 신부 */
  role: "신랑" | "신부";
  name: string;
  /** 부모님 표기 예: "아무개 · 아무개의 장남" */
  parents: string;
  phone: string;
  account: Account;
};

export type GalleryItem = {
  /** public/images 기준 경로. 예: "/images/01.jpg" — 정지 이미지(영상의 포스터로도 사용) */
  src: string;
  alt?: string;
  /**
   * 이미지 투 비디오로 만든 움직이는 클립 경로. 예: "/videos/01.mp4"
   * 있으면 하객이 사진을 탭했을 때 정지 이미지 대신 이 영상이 재생된다.
   * 없으면 기존처럼 정지 이미지가 크게 보인다.
   */
  video?: string;
};

export const site = {
  // ── 기본 정보 ───────────────────────────────────────────
  groomName: "우성규",
  brideName: "김지은",

  /** 예식 일시 (KST 기준, 24시간제) */
  weddingAt: "2026-12-20T11:00:00+09:00",

  /** 예식 장소 */
  venue: {
    name: "상록아트홀",
    hall: "그랜드볼룸홀",
    floor: "L층",
    address: "서울시 강남구 언주로 508 (서울상록회관)",
    tel: "",
    /** 지도 임베드/길찾기용 좌표 (서울상록회관) */
    lat: 37.5047,
    lng: 127.0486,
    /** 길찾기 검색에 쓸 장소명 */
    mapQuery: "서울상록회관",
    naverMapUrl: "",
    kakaoMapUrl: "",
  },

  /** 두 사람이 처음 만난 날 — "함께한 시간" 카운터 기준 */
  firstMetDate: "2014-09-01",

  // ── 인사말 ──────────────────────────────────────────────
  greeting: {
    title: "모시는 말씀",
    body: [
      "12년이 넘는 시간을 나란히 걷는 동안,\n발 맞춰 걷는 법을 배웠습니다.",
      "이제 다가오는 모든 계절을 함께하며,\n언제나 서로의 곁을 지키는 사람이 되겠습니다.",
      "12월의 어느 날, 늘 곁에서 아껴주신 소중한 분들을 모십니다.",
    ],
  },

  // ── 신랑 · 신부 / 혼주 ──────────────────────────────────
  groom: {
    role: "신랑",
    name: "우성규",
    parents: "우석희 · 최숙영의 장남",
    phone: "010-3341-1913",
    account: { bank: "국민", number: "046802-04-218584", holder: "우성규" },
  } as Person,

  bride: {
    role: "신부",
    name: "김지은",
    parents: "김명국 · 고영란의 장녀",
    phone: "010-3341-1913",
    account: { bank: "신한", number: "110-371-160753", holder: "김지은" },
  } as Person,

  /** 혼주(부모님) 계좌 — 필요 없으면 빈 배열 */
  // TODO: 필요 시 부모님 계좌 추가
  parentAccounts: {
    groomSide: [] as Account[],
    brideSide: [] as Account[],
  },

  // ── 갤러리 (모션 사진) ──────────────────────────────────
  // public/images/ 에 파일을 넣고 아래 목록에 등록하세요.
  // 파일이 없으면 자동으로 플레이스홀더가 표시됩니다.
  gallery: [
    { src: "/images/038A7199.jpg", alt: "들판에서 마주 본 두 사람" },
    { src: "/images/4V6A0306.jpg", alt: "숲길을 함께 걷는 모습" },
    { src: "/images/038A7470.jpg", alt: "Will you marry me 풍선" },
    { src: "/images/038A7489.jpg", alt: "팔짱과 부케" },
    { src: "/images/038A7342.jpg", alt: "넓은 초원 위의 신랑신부" },
    { src: "/images/038A8272.jpg", alt: "바다 노을 아래에서" },
    { src: "/images/4V6A2584.jpg", alt: "붉은 장미 부케" },
  ] as GalleryItem[],

  /** 커버(대표) 이미지 — public/images/ */
  coverImage: "/images/4V6A1097.jpg",

  // ── 배경음악 ────────────────────────────────────────────
  // public/audio/ 에 mp3 파일을 넣고 파일명을 적으세요.
  music: {
    src: "/audio/Everything.mp3",
    title: "Everything",
    /** 첫 진입 시 자동재생 시도 (모바일은 차단될 수 있어 탭하면 재생) */
    autoplay: true,
    /** 재생 음량 0~1 (0.5 = 50%) */
    volume: 0.5,
  },

  // ── 오시는 길 안내 ──────────────────────────────────────
  directions: {
    subway: "2호선·수인분당선 선릉역 5번 출구 도보 5분",
    bus:
      "KT 강남지사 하차: 141(도봉산), 242(중랑·신내역), 361(여의도) / " +
      "한국기술센터·상록회관 하차: 146(상계동), 341(하남), 360(송파), 740(덕은동)",
    parking: "무료 1시간 30분 · 내부 주차장 600대, 외부 주차장 350대",
    shuttle: "선릉역 5번 출구에서 셔틀버스 운행",
  },

  // ── 추가 기능 안내 문구 ────────────────────────────────
  guestbook: {
    title: "방명록",
    description: "축하의 한마디를 남겨주세요",
  },
  guestSnap: {
    title: "게스트스냅",
    description: "오늘의 순간을 사진·영상으로 함께 남겨주세요",
    /** 업로드 허용 최대 용량(MB) */
    maxFileSizeMB: 100,
  },

  // ── 공유 (카카오톡) ─────────────────────────────────────
  share: {
    title: "우성규 ♥ 김지은 결혼합니다",
    description: "2026년 12월 20일 일요일, 상록아트홀 그랜드볼룸홀",
    /** 카톡 공유 썸네일 — 가로 사진 권장 */
    imageUrl: "/images/038A8272.jpg",
  },

  /** 배포 후 실제 도메인 (카톡 공유·캘린더 링크에 사용). 미정이면 빈 문자열 */
  // TODO: Vercel 배포 후 도메인 입력
  siteUrl: "",
} as const;

export type Site = typeof site;
