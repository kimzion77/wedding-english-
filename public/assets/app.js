/* ===== 종이편지 청첩장 — app logic ===== */
(function(){
  'use strict';
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>[...r.querySelectorAll(s)];

  const WEDDING = new Date(2026, 11, 20, 11, 0, 0); // Dec 20 2026 11:00
  const FIRST_MET = new Date(2014, 8, 1, 0, 0, 0);   // 2014.09.01 처음 만난 날 (함께한 시간 기준)

  /* ---------- 변형(variant): 메인 / 혼주 ---------- */
  const VARIANT = (location.pathname.replace(/\/+$/,'') === '/honju')
    ? 'honju'
    : ((new URLSearchParams(location.search).get('v')) || 'main');
  const VQ = '?v=' + encodeURIComponent(VARIANT);

  /* ---------- 방문 ping (당일 방문뷰어용) ---------- */
  try {
    var SID_KEY = 'wd_sid_v1';
    var sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ('s_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(SID_KEY, sid);
    }
    // 관리자 미리보기에서 카운트 부풀리지 않도록 ?admin=1 일 땐 skip
    if (!new URLSearchParams(location.search).has('admin')) {
      fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: VARIANT, session_id: sid }),
        keepalive: true,
      }).catch(function(){});
    }
  } catch(_){}

  /* ---------- KO→EN translation for DB-sourced text ----------
   * 사진·문구 DB 를 한국어판과 공유하므로, admin 에서 저장한 한국어 문구가
   * 그대로 내려온다. 아래 사전으로 렌더 직전에 영어로 치환한다.
   * 사전에 없는 새 문구는 한국어 그대로 노출됨 → 원본 수정을 미러링할 때
   * 이 사전에도 번역을 추가할 것. ([[...]] 하이라이트 문법 포함, 완전 일치)
   */
  const KO_EN = {
    // timeline titles
    '우리의 시작': 'How It Began',
    '함께한 12년': 'Twelve Years Together',
    '우리의 약속': 'Our Promise',
    // timeline captions
    '고등학교 시절, 친구의 친구로\n인사만 나누던 우리.\n함께 떠난 여행에서\n[[우리의 이야기]]가 시작됐어요.':
      'In high school, we only knew each other\nthrough mutual friends.\nOn a trip together,\n[[our story]] began.',
    '긴 시간 동안\n우리는 [[서로의 일상]]이 되었어요.':
      'Through the years,\nbeing together became [[our everyday]].',
    '나란히 걸어온 시간처럼\n앞으로도 [[같은 길]]을 걷기로 했어요.':
      'After all these years side by side,\nwe choose to keep walking [[the same path]].',
    '함께하기로 [[약속한 날,]]\n저희 시작의 [[증인]]이 되어주세요.':
      'On the day we [[promise]] to share our lives,\nplease [[witness]] our new beginning.',
    // site-text overrides
    '필름 한 컷에\n우리의 계절을 담았습니다.':
      'A single frame of film,\nholding our seasons.',
  };
  const T = s => {
    if(!s) return s;
    const key = String(s).replace(/\r\n/g,'\n').trim();
    return KO_EN[key] !== undefined ? KO_EN[key] : s;
  };

  /* ---------- 관리자에서 수정한 문구·디자인 적용 ---------- */
  const THEME_VARMAP = {
    'theme.paper':'--paper-base','theme.ink':'--ink','theme.body':'--body',
    'theme.accent_groom':'--accent-groom','theme.accent_bride':'--accent-bride',
    'theme.wax':'--wax','theme.font':'--serif-ko'
  };
  fetch('/api/site-texts' + VQ, { cache: 'no-store' }).then(r=>r.json()).then(j=>{
    const ov = (j && j.overrides) || {};
    const esc1 = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    Object.keys(ov).forEach(k=>{
      if(k.indexOf('theme.') === 0){ const vn = THEME_VARMAP[k]; if(vn) document.documentElement.style.setProperty(vn, ov[k]); return; }
      if(k.indexOf('section.') === 0){
        const sid = k.slice('section.'.length);
        const sel = document.querySelector('[data-screen-label="'+sid+'"]');
        if(sel) sel.style.display = (ov[k] === 'off') ? 'none' : '';
        return;
      }
      const el = document.querySelector('[data-text="'+k+'"]');
      if(!el) return;
      el.innerHTML = esc1(T(ov[k])).replace(/\n/g, '<br>');
    });
  }).catch(()=>{});

  /* ---------- 관리자에서 교체한 청첩장 사진 적용 ([data-slot]) ---------- */
  fetch('/api/site-images' + VQ, { cache: 'no-store' }).then(r=>r.json()).then(j=>{
    const ov = (j && j.overrides) || {};
    Object.keys(ov).forEach(slot=>{
      if(slot === 'film_video'){
        const v = document.getElementById('filmVideo');
        if(v){ v.src = ov[slot]; v.load(); }
        return;
      }
      const el = document.querySelector('[data-slot="'+slot+'"]');
      if(!el) return;
      if(el.tagName === 'VIDEO') el.setAttribute('poster', ov[slot]);
      else el.setAttribute('src', ov[slot]);
    });
  }).catch(()=>{});

  /* ---------- COVER SEAL INTRO ---------- */
  const coverSeal = $('#coverSeal');
  let sealOpened = false;
  function openSeal(){
    if(sealOpened) return; sealOpened = true;
    if(coverSeal){
      coverSeal.classList.add('opening');
      coverSeal.style.opacity='0';
      coverSeal.style.transform='scale(1.18)';
      coverSeal.style.pointerEvents='none';
    }
    document.body.classList.remove('sealed');
    startMusic(); // 첫 사용자 동작(도장 탭)에서 배경음악 시작
    // greet guests with the RSVP popup once they step inside
    setTimeout(()=>{ if(window.__rsvpIntro) window.__rsvpIntro(); }, 1400);
  }
  window.__openCover = openSeal;
  if(coverSeal){
    document.body.classList.add('sealed');
    coverSeal.addEventListener('click', openSeal);
    // iOS Safari / Kakao in-app: prevent scroll even where overflow:hidden is ignored
    document.addEventListener('touchmove', e=>{
      if(document.body.classList.contains('sealed')) e.preventDefault();
    }, {passive:false});
  }

  /* ---------- BACKGROUND MUSIC ---------- */
  const bgm = $('#bgm'), musicFab = $('#musicFab');
  let musicOn = false;
  function setMusicIcon(){ if(musicFab) musicFab.style.opacity = musicOn ? '1' : '.4'; }
  function startMusic(){
    if(!bgm) return;
    bgm.volume = 0.55;
    bgm.play().then(()=>{ musicOn = true; setMusicIcon(); }).catch(()=>{ musicOn = false; setMusicIcon(); });
  }
  function pauseBgm(){ if(bgm && !bgm.paused){ bgm.pause(); musicOn = false; setMusicIcon(); } }
  let bgmPausedForVideo = false;
  function pauseBgmForVideo(){ if(bgm && !bgm.paused){ bgmPausedForVideo = true; bgm.pause(); musicOn = false; setMusicIcon(); } }
  function resumeBgmAfterVideo(){ if(bgmPausedForVideo && bgm){ bgmPausedForVideo = false; bgm.play().then(()=>{ musicOn = true; setMusicIcon(); }).catch(()=>{}); } }
  function toggleMusic(){
    if(!bgm) return;
    if(bgm.paused){ bgm.play().then(()=>{ musicOn = true; setMusicIcon(); }).catch(()=>{}); }
    else { pauseBgm(); }
  }
  if(musicFab) musicFab.addEventListener('click', toggleMusic);
  setMusicIcon();

  /* ---------- SCROLL REVEAL ---------- */
  const revealEls = $$('.reveal');
  function sweepReveals(){
    const vh = window.innerHeight || document.documentElement.clientHeight;
    let pending = false;
    revealEls.forEach(el=>{
      if(el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if(r.top < vh*0.92 && r.bottom > 0) el.classList.add('in');
      else pending = true;
    });
    return pending;
  }
  // IntersectionObserver as the primary mechanism (smooth, performant)…
  try{
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
    revealEls.forEach(el=>io.observe(el));
  }catch(e){}
  // …with a manual sweep fallback (some embedded iframes never fire IO's initial callback)
  let rafQ=false;
  function onScrollReveal(){ if(rafQ) return; rafQ=true; requestAnimationFrame(()=>{ rafQ=false; sweepReveals(); }); }
  window.addEventListener('scroll', onScrollReveal, {passive:true});
  window.addEventListener('resize', onScrollReveal);
  requestAnimationFrame(sweepReveals);
  setTimeout(sweepReveals, 300);

  // stagger reveals within each section for a cascading feel
  try{
    const groups=new Map();
    revealEls.forEach(el=>{ const s=el.closest('section,.modal-card,.ending')||document.body;
      const a=groups.get(s)||[]; a.push(el); groups.set(s,a); });
    groups.forEach(list=>list.forEach((el,i)=>el.style.setProperty('--rd', Math.min(i*70,420)+'ms')));
  }catch(e){}

  /* ---------- SCROLL PARALLAX (photos drift in-frame) ---------- */
  const reduceMo = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(!reduceMo){
    const paraxEls = $$('.frame img, .frame video');
    paraxEls.forEach(el=>el.classList.add('parax'));
    let pQ=false;
    function runParax(){
      pQ=false; const vh=window.innerHeight||1;
      paraxEls.forEach(el=>{
        const r=el.getBoundingClientRect();
        if(r.bottom<-80||r.top>vh+80) return;
        const center=r.top+r.height/2;
        const d=(center-vh/2)/vh;            // -0.5 .. 0.5
        el.style.setProperty('--py', (d*-22).toFixed(1)+'px');
      });
    }
    function onParax(){ if(pQ) return; pQ=true; requestAnimationFrame(runParax); }
    window.addEventListener('scroll', onParax, {passive:true});
    window.addEventListener('resize', onParax);
    requestAnimationFrame(runParax);
  }

  /* ---------- CALENDAR ---------- */
  (function buildCal(){
    const grid = $('#calGrid'); if(!grid) return;
    const dows = ['S','M','T','W','T','F','S'];
    dows.forEach((d,i)=>{ const c=document.createElement('div'); c.className='dow'; c.textContent=d; grid.appendChild(c); });
    const y=2026, m=11; // December (0-idx)
    const first = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();
    for(let i=0;i<first;i++){ const c=document.createElement('div'); c.className='d'; grid.appendChild(c); }
    for(let d=1; d<=days; d++){
      const c=document.createElement('div'); c.className='d';
      const dow = new Date(y,m,d).getDay();
      if(dow===0) c.classList.add('sun');
      if(d===20){
        c.classList.add('mark');
        c.innerHTML = '<span class="dot"></span>20<span class="tm">AM 11:00</span>';
      } else {
        c.textContent = d;
      }
      grid.appendChild(c);
    }
  })();

  /* ---------- COUNTDOWN ---------- */
  const cdEls = {D:$('#cdD'),H:$('#cdH'),M:$('#cdM'),S:$('#cdS')};
  const cdFoot = $('#cdFoot');
  function tickCountdown(){
    if(!cdEls.D) return;
    let diff = Math.floor((WEDDING - new Date())/1000);
    if(diff<0){ diff=0; }
    const d=Math.floor(diff/86400), h=Math.floor(diff%86400/3600), m=Math.floor(diff%3600/60), s=diff%60;
    cdEls.D.textContent=d; cdEls.H.textContent=h; cdEls.M.textContent=String(m).padStart(2,'0'); cdEls.S.textContent=String(s).padStart(2,'0');
    if(cdFoot){
      cdFoot.innerHTML = diff>0
        ? `<b style="color:var(--ink-strong)">${d}</b> day${d===1?'':'s'} until the wedding.`
        : 'Today, two become one.';
    }
  }
  tickCountdown(); setInterval(tickCountdown,1000);

  /* ---------- 함께한 시간 ---------- */
  const together = $('#together');
  function tickTogether(){
    if(!together) return;
    const diffMs = new Date() - FIRST_MET;
    let s = Math.floor(diffMs/1000);
    const days = Math.floor(diffMs/86400000);
    // y / m / d breakdown
    const now = new Date();
    let y = now.getFullYear()-FIRST_MET.getFullYear();
    let mo = now.getMonth()-FIRST_MET.getMonth();
    let dd = now.getDate()-FIRST_MET.getDate();
    if(dd<0){ mo--; dd += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if(mo<0){ y--; mo+=12; }
    const hh=now.getHours(), mm=now.getMinutes(), ss=now.getSeconds();
    together.textContent = `"${y} years ${mo} months ${dd} days ${hh}h ${mm}m ${ss}s"`;
  }
  tickTogether(); setInterval(tickTogether,1000);

  /* ---------- FEATURED VIDEO (tap for sound) ---------- */
  const video = $('#filmVideo'), playBtn = $('#playBtn'), soundHint = $('#soundHint');
  if(video && playBtn){
    video.muted = true;
    video.loop = false;          // 자동 반복 없이 한 번 재생
    video.removeAttribute('autoplay');
    // 자동재생 안 함 — 포스터만 보여주고, 화면 밖으로 나가면 재생 중일 때만 정지
    const vio = new IntersectionObserver((es)=>{
      es.forEach(e=>{ if(!e.isIntersecting && !video.paused) video.pause(); });
    }, {threshold:.2});
    vio.observe(video);
    function playWithSound(fromStart){
      pauseBgmForVideo();        // 영상 볼 땐 배경음악 잠시 멈춤
      if(fromStart || video.ended){ try{ video.currentTime = 0; }catch(e){} } // 항상 처음부터
      video.muted=false; video.volume=1;
      video.play().catch(()=>{});
      playBtn.classList.add('hide');
      if(soundHint) soundHint.classList.add('hide');
    }
    playBtn.addEventListener('click', e=>{ e.stopPropagation(); playWithSound(true); });
    video.addEventListener('click', ()=>{ if(video.paused) playWithSound(false); else video.pause(); });
    video.addEventListener('play', ()=>{ playBtn.classList.add('hide'); });
    video.addEventListener('pause', ()=>{ playBtn.classList.remove('hide'); resumeBgmAfterVideo(); });
    video.addEventListener('ended', ()=>{
      resumeBgmAfterVideo();
      try{ video.pause(); video.currentTime = 0; }catch(e){} // 끝나면 첫 프레임으로 되돌림
      video.load(); // 포스터(첫 화면) 다시 표시
      playBtn.classList.remove('hide');
    });
  }

  /* ---------- GALLERY (3열 grid, 9장씩 페이지네이션 ◀ 1/N ▶) ---------- */
  const GALLERY_PAGE_SIZE = 9;
  function initGallery(items){
    const grid = $('#ggrid'); if(!grid) return;
    const cells = $$('.gcell', grid);
    if(cells.length === 0) return;
    const useItems = Array.isArray(items) && items.length > 0;

    // 셀별 클릭(라이트박스)
    cells.forEach((cell,i)=>{
      cell.onclick = () => {
        if (typeof openGalleryLightbox !== 'function') return;
        if (useItems) {
          openGalleryLightbox(items, i);
        } else {
          const img = cell.querySelector('img');
          const src = img && img.getAttribute('src');
          if (src) openGalleryLightbox([{ url: src }], 0);
        }
      };
    });

    const nav = $('#gNav');
    const prev = $('#gpPrev');
    const next = $('#gpNext');
    const nowEl = $('#gpNow');
    const totEl = $('#gpTot');
    const totalPages = Math.ceil(cells.length / GALLERY_PAGE_SIZE);

    // 9장 이하면 페이지 nav 숨김
    if(!nav || totalPages <= 1){
      if(nav) nav.style.display = 'none';
      cells.forEach(c=>c.classList.remove('is-hidden'));
      return;
    }
    nav.style.display = '';
    if(totEl) totEl.textContent = totalPages;

    let page = 1;
    function render(){
      const start = (page-1) * GALLERY_PAGE_SIZE;
      const end = start + GALLERY_PAGE_SIZE;
      cells.forEach((c,i)=> c.classList.toggle('is-hidden', !(i>=start && i<end)));
      if(nowEl) nowEl.textContent = page;
      if(prev) prev.disabled = (page === 1);
      if(next) next.disabled = (page === totalPages);
      // 페이지 바뀔 때 갤러리 섹션 상단으로 살짝 스크롤 (모바일에서 보던 위치 유지)
      const sec = document.querySelector('[data-screen-label="gallery"]');
      if(sec){
        const top = sec.getBoundingClientRect().top + window.scrollY;
        // 너무 위로 튀지 않게 — 사용자가 현재 페이지 이상으로 올라가 있는 경우만
        if(window.scrollY > top + 120) window.scrollTo({ top: top + 40, behavior:'smooth' });
      }
    }
    if(prev) prev.onclick = ()=>{ if(page>1){ page--; render(); } };
    if(next) next.onclick = ()=>{ if(page<totalPages){ page++; render(); } };
    render();
  }
  const esc2 = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // [[강조]] → <mark>강조</mark>, 줄바꿈 → <br>
  const nl2br = s => esc2(s).replace(/\[\[([^\]]+)\]\]/g, '<mark>$1</mark>').replace(/\n/g,'<br>');
  fetch('/api/gallery' + VQ, { cache:'no-store' }).then(r=>r.json()).then(j=>{
    // API 가 응답한 경우엔 항상 DB 결과를 반영(기본 HTML 폴백 없음) — 빈 섹션은 실제로 비움
    const got = !!(j && Array.isArray(j.items));
    const items = got ? j.items : [];
    const gItems = items.filter(x=>x.section==='gallery');
    const tItems = items.filter(x=>x.section==='timeline');
    const eItems = items.filter(x=>x.section==='ending');
    const grid=$('#ggrid');
    if(grid && got){
      // lazy + async decode 로 모바일 lag 감소. 첫 9장만 eager 로 (위 9장은 보이는 영역).
      grid.innerHTML = gItems.map((p,i)=>`<div class="gcell" data-i="${i}"><img src="${p.url}" alt="" loading="${i<9?'eager':'lazy'}" decoding="async"></div>`).join('');
    }
    const tl=$('#timelineList');
    if(tl && got){
      // 동적 항목은 reveal 클래스 대신 처음부터 .in 으로 표시 (observer 등록 안 되어 있음)
      tl.innerHTML = tItems.map(p=>`<div class="tl-item reveal in"><div class="tl-print"><div class="print"><div class="frame" style="aspect-ratio:1;"><img src="${p.url}" alt=""></div></div></div><div class="tl-text">${p.step?`<div class="step">${esc2(T(p.step))}</div>`:''}${p.year_title?`<div class="yr">${esc2(T(p.year_title))}</div>`:''}${p.caption?`<p>${nl2br(T(p.caption))}</p>`:''}</div><span class="tl-dot"></span></div>`).join('');
    }
    const ed=$('#endingList');
    if(ed && got){
      ed.innerHTML = eItems.map(p=>`<div class="print tape"><div class="frame" style="aspect-ratio:1;"><img src="${p.url}" alt=""></div>${p.caption?`<div class="mark">${esc2(T(p.caption))}</div>`:''}</div>`).join('');
    }
    // 빈 섹션은 자동으로 숨김 (사용자가 의도적으로 비웠다는 신호)
    if(got){
      const galSec = document.querySelector('[data-screen-label="gallery"]');
      if(galSec) galSec.style.display = gItems.length ? '' : 'none';
      const tlSec = document.querySelector('[data-screen-label="timeline"]');
      if(tlSec) tlSec.style.display = tItems.length ? '' : 'none';
      const edSec = document.querySelector('[data-screen-label="ending"]');
      if(edSec && !eItems.length) edSec.style.display = 'none';
    }
    initGallery(gItems);
  }).catch(()=>initGallery());

  /* ---------- ACCORDION (accounts) ---------- */
  function bindAccordion(){
    $$('.acc-head').forEach(h=>{
      if(h.dataset.bound) return; h.dataset.bound='1';
      h.addEventListener('click',()=>{
        const body=h.nextElementSibling;
        const open=h.classList.contains('open');
        h.classList.toggle('open',!open);
        body.style.maxHeight = open ? '0px' : body.scrollHeight+'px';
      });
    });
  }
  function bindCopy(){
    $$('.copy-btn').forEach(b=>{ if(b.dataset.bound) return; b.dataset.bound='1';
      b.addEventListener('click',()=>copyText(b.dataset.copy));
    });
  }
  bindAccordion();

  /* ---------- 계좌(관리자가 동적 관리) ---------- */
  function renderAcctList(list, brideSide){
    const blk='display:block;margin:0 0 5px 0;';
    return list.map(a=>{
      const num = (a.number||'').trim();
      const bank = (a.bank||'').trim();
      const holder = (a.holder||'').trim();
      const tel = (a.phone||'').replace(/[^0-9]/g,'');
      const telBlock = tel ? `<span class="tel"><a href="tel:${tel}">Call</a><a href="sms:${tel}">Text</a><em>${esc2(a.phone)}</em></span>` : '';
      const pay = (a.kakaopay||'').trim();
      const payBlock = pay ? `<a class="copy-btn pay-link" href="${esc2(pay)}" target="_blank" rel="noopener" style="background:#fee500;color:#3c1e1e;text-decoration:none;display:inline-flex;align-items:center;gap:4px;justify-content:center;">💬 Pay</a>` : '';
      const copyBlock = num ? `<button class="copy-btn" data-copy="${esc2(num)}">Copy</button>` : '';
      return `<div class="acc-item${brideSide?' bride':''}">
        <div class="who">
          <span class="r">${esc2(a.role)}</span>
          ${bank?`<span class="bank" style="${blk}">${esc2(bank)}</span>`:''}
          ${num?`<span class="no" style="${blk}font-size:15px;">${esc2(num)}</span>`:''}
          ${holder?`<span class="holder" style="display:block;margin:0;font-size:13px;color:var(--ink-soft);letter-spacing:.02em;">Account holder: ${esc2(holder)}</span>`:''}
          ${telBlock}
        </div>
        <div class="acts">${copyBlock}${payBlock}</div>
      </div>`;
    }).join('');
  }
  fetch('/api/accounts' + VQ, { cache:'no-store' }).then(r=>r.json()).then(j=>{
    const g = (j && j.groom) || []; const b = (j && j.bride) || [];
    const gBody = $('#accGroom'), bBody = $('#accBride');
    if(gBody && g.length) gBody.innerHTML = renderAcctList(g, false);
    if(bBody && b.length) bBody.innerHTML = renderAcctList(b, true);
    bindCopy();
    // 아코디언이 펼쳐져 있던 경우 높이 재계산
    $$('.acc-head.open').forEach(h=>{ const body=h.nextElementSibling; if(body) body.style.maxHeight = body.scrollHeight+'px'; });
  }).catch(()=>{ bindCopy(); });

  /* ---------- COPY ---------- */
  // 계좌 복사용 — 명시적 계좌 토스트
  function copyText(t){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(()=>toast('Account number copied')).catch(()=>fallbackCopy(t,'Account number copied'));
    } else fallbackCopy(t,'Account number copied');
  }
  function fallbackCopy(t, okMsg){
    const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{document.execCommand('copy'); toast(okMsg||'Copied');}catch(e){toast('Copy failed');}
    ta.remove();
  }
  // 초기 마크업의 복사 버튼 바인딩 (계좌 fetch 전에도 동작하도록)
  bindCopy();

  /* ---------- TOAST ---------- */
  let toastT;
  const toastEl=$('#toast');
  function toast(msg){
    if(!toastEl)return;
    toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove('show'),2000);
  }
  window.__toast=toast;

  /* ---------- MODALS ---------- */
  function openModal(m){ m.classList.add('show'); m.dataset.openedAt=String(Date.now()); document.body.style.overflow='hidden'; }
  function closeModal(m){ m.classList.remove('show'); document.body.style.overflow=''; }
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{
    if(e.target!==m) return;
    // ignore a stray backdrop tap within 600ms of opening (prevents auto-popup from instantly closing)
    if(Date.now()-Number(m.dataset.openedAt||0) < 600) return;
    closeModal(m);
  }));

  const rsvpModal=$('#rsvpModal');
  $('#openRsvp').addEventListener('click',()=>openModal(rsvpModal));
  $('#rsvpX').addEventListener('click',()=>closeModal(rsvpModal));
  { const _rl=$('#rsvpLater'); if(_rl) _rl.addEventListener('click',()=>{ closeModal(rsvpModal); if(window.__toast) window.__toast('You can RSVP anytime from the R.S.V.P section below'); }); }
  // X 옆 "나중에 전달하기" — 그냥 닫기 + 안내 토스트
  {
    const _rlt = $('#rsvpLaterTop');
    if(_rlt) _rlt.addEventListener('click', ()=>{
      closeModal(rsvpModal);
      if(window.__toast) window.__toast('You can RSVP anytime from the R.S.V.P section below');
    });
  }
  // auto-popup when guests enter (after the seal opens); skip only if they've already responded
  window.__rsvpIntro = ()=>{
    if(localStorage.getItem('rsvp_done')) return;
    openModal(rsvpModal);
  };
  // segmented controls
  $$('.seg').forEach(seg=>{
    seg.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b)return;
      $$('button',seg).forEach(x=>x.classList.remove('on')); b.classList.add('on');
      seg.classList.toggle('bride', seg.id==='rSide' && b.dataset.v==='신부측');
    });
  });
  $('#rsvpSubmit').addEventListener('click',async ()=>{
    const name=$('#rName').value.trim();
    if(!name){ toast('Please enter your name'); return; }
    const get=id=>{ const o=$('#'+id+' .on'); return o?o.dataset.v:''; };
    const rec={side:get('rSide'),go:get('rGo'),name,count:$('#rCount').value||1,meal:get('rMeal')};
    try{
      const r=await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rec)});
      if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.error||'Failed to send RSVP'); }
    }catch(e){ toast(e.message||'Failed to send RSVP'); return; }
    closeModal(rsvpModal); toast('Your RSVP has been sent. Thank you!');
    localStorage.setItem('rsvp_done','1');
    $('#rName').value=''; $('#rCount').value=1;
  });

  /* ---------- GUESTBOOK (messages on a film strip) ---------- */
  let _gb=[];
  function fmtDate(ts){ const d=new Date(ts); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; }
  const _DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function fmtDateTime(ts){ const d=new Date(ts); return `${fmtDate(ts)} (${_DOW[d.getDay()]}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function frameHTML(e){
    return `<div class="gb-frame"><div class="m">${esc(e.msg)}</div><div class="n">— <b>${esc(e.name)}</b></div><div class="dt">${fmtDateTime(e.at)}</div></div>`;
  }
  function stripHTML(entries){ return '<div class="gb-filmstrip">'+entries.map(frameHTML).join('')+'</div>'; }
  function renderGB(){
    const area=$('#gbArea'); if(!area) return;
    area.innerHTML = _gb.length
      ? stripHTML(_gb.slice(-4).reverse())
      : '<div class="gb-filmstrip"><div class="gb-empty-film">No messages on the film yet.<br>Be the first to leave one.</div></div>';
  }
  async function refreshGB(){
    try{
      const r=await fetch('/api/guestbook',{cache:'no-store'}); const j=await r.json();
      _gb=(j.entries||[]).map(e=>({name:e.name,msg:e.message,at:new Date(e.created_at).getTime()})).reverse();
    }catch(e){ _gb=[]; }
    renderGB();
  }
  refreshGB();

  const gbModal=$('#gbModal'), gbAllModal=$('#gbAllModal');
  $('#gbWrite').addEventListener('click',()=>openModal(gbModal));
  $('#gbX').addEventListener('click',()=>closeModal(gbModal));
  $('#gbAllX').addEventListener('click',()=>closeModal(gbAllModal));
  $('#gbSubmit').addEventListener('click',async ()=>{
    const name=$('#gName').value.trim(), msg=$('#gMsg').value.trim();
    if(!name||!msg){ toast('Please enter your name and message'); return; }
    try{
      const r=await fetch('/api/guestbook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,message:msg})});
      if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.error||'Failed to post'); }
    }catch(e){ toast(e.message||'Failed to post'); return; }
    $('#gName').value=''; $('#gMsg').value='';
    closeModal(gbModal); await refreshGB(); toast('Your message is now on the film. Thank you!');
  });
  $('#gbAll').addEventListener('click',()=>{
    const arr=_gb.slice().reverse();
    const list=$('#gbAllList');
    list.innerHTML = arr.length ? stripHTML(arr) : '<div class="gb-filmstrip"><div class="gb-empty-film">No messages on the film yet.</div></div>';
    openModal(gbAllModal);
  });

  /* ---------- GUEST SNAP (per-guest albums) ---------- */
  const SNAPKEY='guestsnap_albums_sj';
  // deep, real bookbinding colours (oxblood, forest, navy, mustard, plum, teal, tan, slate)
  const SPINES=['#6e2f2a','#2f4233','#2b3550','#9a7322','#4a3550','#28524a','#7d4a26','#3a4350'];

  // ---- render a photoreal book spine to a dataURL (cloth + debossed gold foil) ----
  const _spineCache={};
  function hx(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function shade(rgb,f){ // f<0 darken toward black, f>0 lighten toward white
    const t=f<0?0:255, a=Math.abs(f);
    return `rgb(${Math.round(rgb[0]+(t-rgb[0])*a)},${Math.round(rgb[1]+(t-rgb[1])*a)},${Math.round(rgb[2]+(t-rgb[2])*a)})`;
  }
  function makeSpine(name, hex, wCss, hCss){
    const key=name+'|'+hex+'|'+wCss+'|'+hCss; if(_spineCache[key]) return _spineCache[key];
    const dpr=3, W=Math.round(wCss*dpr), H=Math.round(hCss*dpr);
    const seed=[...String(name)].reduce((s,c)=>s+c.charCodeAt(0),0);
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const ctx=c.getContext('2d');
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    function vstack(name,cx,cy,fs,fill,weight,track){ctx.font=`${weight} ${fs}px "Nanum Myeongjo","Noto Serif KR",serif`;ctx.textAlign='center';ctx.textBaseline='middle';const ch=[...name],gap=fs*(track||1.02),sy=cy-(ch.length-1)*gap/2;ch.forEach((c2,i)=>{ctx.fillStyle=fill;ctx.fillText(c2,cx,sy+i*gap);});}
    function latin(txt,cx,y,fs,fill){ctx.font=`500 ${fs}px "Cormorant Garamond",serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.fillText(txt,cx,y);}
    // designer coffee-table palettes [bg, ink] — mostly light with a couple of blacks/creams
    const pal=[['#f4f0e7','#1a1a1a'],['#17171a','#f2efe7'],['#e9e1d1','#2a2722'],['#2b2c2e','#ece7da'],['#aeb4a4','#22231e'],['#f7f3eb','#1a1a1a'],['#e6ddcb','#2a2722'],['#17171a','#f2efe7']];
    const P=pal[seed%pal.length], layout=Math.floor(seed/7)%4;
    const bg=hx(P[0]), ink=P[1];
    ctx.save(); roundRect(0,0,W,H,2.5*dpr); ctx.clip();
    // soft matte cylindrical shading
    const g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,shade(bg,-0.12));g.addColorStop(.1,shade(bg,-0.04));g.addColorStop(.5,shade(bg,0.015));g.addColorStop(.9,shade(bg,-0.05));g.addColorStop(1,shade(bg,-0.16));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    for(let i=0;i<W*H*0.025;i++){ const x=Math.random()*W,y=Math.random()*H; ctx.fillStyle=Math.random()<.5?'rgba(255,255,255,.03)':'rgba(0,0,0,.03)'; ctx.fillRect(x,y,dpr*0.4,dpr*0.4); }
    // cream page block on the right edge
    const pw=W*0.065; ctx.fillStyle='#efe9da'; ctx.fillRect(W-pw,2,pw,H-4);
    for(let y=4;y<H;y+=2*dpr){ ctx.fillStyle='rgba(120,105,80,.18)'; ctx.fillRect(W-pw,y,pw,dpr*0.5); }
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(W-pw-1,0,1,H);
    const cx=(W-pw)/2;
    const chars=[...String(name)];
    const darkInk=(ink==='#1a1a1a'||ink==='#2a2722'||ink==='#22231e');
    // title runs ALONG the spine (rotated 90°, reads bottom→top) like PRADA / Christian Dior
    function along(txt,fs,fill,weight,trk){ctx.save();ctx.translate(cx,H/2);ctx.rotate(-Math.PI/2);ctx.font=`${weight} ${fs}px "Nanum Myeongjo","Noto Serif KR",serif`;ctx.textBaseline='middle';ctx.textAlign='center';const ch=[...txt],gp=fs*(trk||0.12);let tot=0;ch.forEach(c2=>tot+=ctx.measureText(c2).width+gp);tot-=gp;let xx=-tot/2;ch.forEach(c2=>{const w=ctx.measureText(c2).width;ctx.fillStyle=fill;ctx.fillText(c2,xx+w/2,0);xx+=w+gp;});ctx.restore();}
    function alongLatin(txt,off,fs,fill){ctx.save();ctx.translate(cx+off,H/2);ctx.rotate(-Math.PI/2);ctx.font=`500 ${fs}px "Cormorant Garamond",serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.fillText(txt,0,0);ctx.restore();}
    const big=Math.min(W*0.56,(H*0.8)/(chars.length*1.15));
    if(layout===0){ along(name,big,ink,'500',0.16); alongLatin('MOMENTS',W*0.30,W*0.11,darkInk?'rgba(26,26,26,.5)':'rgba(240,236,226,.55)'); }
    else if(layout===1){ along(name,big,ink,'600',0.14); alongLatin('2026',W*0.31,W*0.12,darkInk?'rgba(26,26,26,.5)':'rgba(240,236,226,.55)'); }
    else if(layout===2){ along(name,big,ink,'500',0.16); ctx.fillStyle=ink; ctx.fillRect(cx-W*0.14,H*0.12,W*0.28,1.2*dpr); ctx.fillRect(cx-W*0.14,H*0.88,W*0.28,1.2*dpr); }
    else { along(name,big*1.05,ink,'600',0.12); }
    // edge bevel
    let bev=ctx.createLinearGradient(0,0,W,0);
    bev.addColorStop(0,'rgba(255,255,255,.18)');bev.addColorStop(.04,'rgba(255,255,255,0)');
    bev.addColorStop(.93,'rgba(0,0,0,0)');bev.addColorStop(1,'rgba(0,0,0,.12)');
    ctx.fillStyle=bev; ctx.fillRect(0,0,W,H);
    ctx.restore();

    const url=c.toDataURL(); _spineCache[key]=url; return url;
  }
  let _albums=[];
  async function refreshAlb(){
    try{ const r=await fetch('/api/albums',{cache:'no-store'}); const j=await r.json(); _albums=Array.isArray(j)?j:[]; }
    catch(e){ _albums=[]; }
    renderStack();
  }
  const snapShelf=$('#snapShelf');
  function spineGeo(a){
    // deterministic per-album variation from id
    const seed=String(a.id).split('').reduce((s,c)=>s+c.charCodeAt(0),0);
    const w=36+(seed%5)*4;                 // 36–52px
    const h=144+((seed*7)%34);             // 144–178px
    const lean=[0,0,0,-2,2,0][seed%6];     // subtle uneven standing
    return {w,h,lean};
  }
  function renderShelf(){
    if(!snapShelf) return;
    const arr=_albums;
    if(!arr.length){ snapShelf.innerHTML='<div class="snap-empty-shelf">No albums yet.<br>Be the first to leave one :)</div>'; return; }
    snapShelf.innerHTML = arr.slice().reverse().map((a,i)=>{
      const c=SPINES[i%SPINES.length];
      const g=spineGeo(a);
      const img=makeSpine(a.name, c, g.w, g.h);
      return `<button class="snap-book" data-id="${a.id}" style="--w:${g.w}px;--lean:${g.lean}px;" aria-label="Album by ${esc(a.name)}">
        <span class="spine" style="--h:${g.h}px; background-image:url('${img}');">
          <span class="bcnt">${a.photos.length}</span>
        </span>
      </button>`;
    }).join('');
    snapShelf.querySelectorAll('.snap-book').forEach(b=>b.addEventListener('click',()=>openAlbum(b.dataset.id)));
  }
  // ---- guest book stack (cover = guest photo, title = name) ----
  const bookStack=$('#bookStack');
  function coverSrc(a){ const p=(a.photos||[]).find(x=>!(x&&typeof x==='object'&&x.type==='video')); return p?(typeof p==='object'?p.src:p):''; }
  // 표지 마크업 — 사진 있으면 사진, 영상만 있으면 영상 첫 프레임 (preload metadata + #t=0.1)
  function coverHtml(a){
    const photos = a.photos || [];
    let firstImg = '', firstVid = '';
    for (const p of photos) {
      if (p && typeof p === 'object' && p.type === 'video') { if (!firstVid) firstVid = p.src; }
      else { if (!firstImg) firstImg = (typeof p === 'object' ? p.src : p); }
    }
    if (firstImg) return `<img src="${esc(firstImg)}" alt="">`;
    if (firstVid) return `<video src="${esc(firstVid)}#t=0.1" muted playsinline preload="metadata" loop autoplay></video>`;
    return '';
  }
  let _rackPage=0;
  function renderStack(){
    if(!bookStack) return;
    const arr=_albums.slice().reverse(); // newest first
    if(!arr.length){ bookStack.innerHTML='<div class="book-stack-empty">No books yet.<br>Be the first to make one :)</div>'; return; }
    const PER=9, pages=Math.max(1,Math.ceil(arr.length/PER));
    if(_rackPage>pages-1) _rackPage=pages-1; if(_rackPage<0) _rackPage=0;
    const pageItems=arr.slice(_rackPage*PER, _rackPage*PER+PER);
    const tiers=[[],[],[]];
    pageItems.forEach((a,i)=>tiers[Math.floor(i/3)].push(a));
    const bookHTML=a=>{
      return `<button class="rackbook" data-id="${a.id}" aria-label="Book by ${esc(a.name)}">
        <span class="gb-top">GUEST SNAP</span>
        <span class="gb-name">${esc(a.name)}</span>
        <span class="gb-photo">${coverHtml(a)}</span>
      </button>`;
    };
    const rack='<div class="rack">'+tiers.map(row=>
      row.length?`<div class="rack-tier"><div class="rack-books">${row.map(bookHTML).join('')}</div><div class="rack-ledge"></div></div>`:''
    ).join('')+'</div>';
    const nav = pages>1 ? `<div class="rack-nav"><button class="rk-arrow" id="rkPrev" ${_rackPage===0?'disabled':''} aria-label="Previous">‹</button><span class="rk-page">${_rackPage+1} / ${pages}</span><button class="rk-arrow" id="rkNext" ${_rackPage===pages-1?'disabled':''} aria-label="Next">›</button></div>` : '';
    bookStack.innerHTML=rack+nav;
    bookStack.querySelectorAll('.rackbook').forEach(b=>b.addEventListener('click',()=>openAlbum(b.dataset.id)));
    const pv=$('#rkPrev'), nx=$('#rkNext');
    if(pv) pv.addEventListener('click',()=>{ if(_rackPage>0){_rackPage--; renderStack();} });
    if(nx) nx.addEventListener('click',()=>{ if(_rackPage<pages-1){_rackPage++; renderStack();} });
  }
  refreshAlb();
  const albModal=$('#snapAlbumModal'), saTitle=$('#saTitle'), saSub=$('#saSub'), saGrid=$('#saGrid');
  let _albMedia=[], _albPage=0;
  function renderAlbumGrid(){
    const PER=9, pages=Math.max(1,Math.ceil(_albMedia.length/PER));
    if(_albPage>pages-1)_albPage=pages-1; if(_albPage<0)_albPage=0;
    const start=_albPage*PER, items=_albMedia.slice(start,start+PER);
    saGrid.innerHTML='<div class="snap-grid">'+items.map((m,k)=>{ const i=start+k; return (
      m.isV
        ? `<button class="cell vid" data-i="${i}"><video src="${esc(m.src)}" preload="metadata" muted></video><span class="vbadge">▶</span></button>`
        : `<button class="cell" data-i="${i}"><img src="${esc(m.src)}" alt="" loading="lazy"></button>`
    );}).join('')+'</div>'+(pages>1?`<div class="rack-nav"><button class="rk-arrow" id="abPrev" ${_albPage===0?'disabled':''}>‹</button><span class="rk-page">${_albPage+1} / ${pages}</span><button class="rk-arrow" id="abNext" ${_albPage===pages-1?'disabled':''}>›</button></div>`:'');
    saGrid.querySelectorAll('.cell').forEach(cl=>cl.addEventListener('click',()=>{ _lbSet=_albMedia; showLb(+cl.dataset.i); openModal(lightbox); }));
    const p=$('#abPrev'), n=$('#abNext');
    if(p) p.addEventListener('click',()=>{ if(_albPage>0){_albPage--; renderAlbumGrid();} });
    if(n) n.addEventListener('click',()=>{ if(_albPage<pages-1){_albPage++; renderAlbumGrid();} });
  }
  function openAlbum(id){
    const a=_albums.find(x=>String(x.id)===String(id)); if(!a) return;
    saTitle.textContent=`Album by ${a.name}`;
    saSub.textContent=`${a.photos.length} item${a.photos.length===1?'':'s'}`;
    _albMedia=(a.photos||[]).map(p=>{ const isV=(p&&typeof p==='object'&&p.type==='video'); return {src:(p&&typeof p==='object')?p.src:p, isV, name:a.name, at:a.at}; });
    _albPage=0; renderAlbumGrid();
    openModal(albModal);
  }
  if($('#saX')) $('#saX').addEventListener('click',()=>closeModal(albModal));

  // all-photos gallery (everyone's media in one grid; tap a photo to see who submitted it)
  const listModal=$('#snapListModal'), slList=$('#slList'), slSub=$('#slSub');
  let _allMedia=[], _lbSet=[], _galPage=0;
  function renderAllAlbums(){
    const all=[];
    _albums.forEach(a=>{ (a.photos||[]).forEach(p=>{ const isV=(p&&typeof p==='object'&&p.type==='video'); const src=(p&&typeof p==='object')?p.src:p; all.push({src,isV,name:a.name,at:a.at}); }); });
    all.reverse();
    _allMedia=all;
    if(slSub) slSub.textContent = all.length? `${all.length} moment${all.length===1?'':'s'} shared by our guests. Tap a photo to see who left it.` : 'No photos yet. Be the first to share a moment :)';
    if(!all.length){ slList.innerHTML=''; openModal(listModal); return; }
    const PER=9, pages=Math.max(1,Math.ceil(all.length/PER));
    if(_galPage>pages-1) _galPage=pages-1; if(_galPage<0) _galPage=0;
    const start=_galPage*PER, pageItems=all.slice(start,start+PER);
    slList.innerHTML = '<div class="snap-grid">'+pageItems.map((m,k)=>{ const i=start+k; return (
      m.isV
        ? `<button class="cell vid" data-i="${i}"><video src="${esc(m.src)}" preload="metadata" muted></video><span class="vbadge">▶</span></button>`
        : `<button class="cell" data-i="${i}"><img src="${esc(m.src)}" loading="lazy" alt=""></button>`
    );}).join('')+'</div>'+(pages>1?`<div class="rack-nav"><button class="rk-arrow" id="glPrev" ${_galPage===0?'disabled':''} aria-label="Previous">‹</button><span class="rk-page">${_galPage+1} / ${pages}</span><button class="rk-arrow" id="glNext" ${_galPage===pages-1?'disabled':''} aria-label="Next">›</button></div>`:'');
    slList.querySelectorAll('.cell').forEach(cl=>cl.addEventListener('click',()=>openLightbox(_allMedia[+cl.dataset.i])));
    const gp=$('#glPrev'), gn=$('#glNext');
    if(gp) gp.addEventListener('click',()=>{ if(_galPage>0){_galPage--; renderAllAlbums();} });
    if(gn) gn.addEventListener('click',()=>{ if(_galPage<pages-1){_galPage++; renderAllAlbums();} });
    openModal(listModal);
  }
  // lightbox with submitter info + swipe navigation
  const lightbox=$('#snapLightbox'), lbMedia=$('#lbMedia'), lbCap=$('#lbCap');
  let _lbIndex=0;
  function showLb(i){
    if(!_lbSet.length) return;
    _lbIndex=(i+_lbSet.length)%_lbSet.length;
    const m=_lbSet[_lbIndex];
    lbMedia.innerHTML = m.isV ? `<video src="${esc(m.src)}" controls autoplay playsinline></video>` : `<img src="${esc(m.src)}" alt="">`;
    const who = m.name ? `Shared by <b>${esc(m.name)}</b>` : '';
    const dt = m.at ? `<span class="lb-dt">${fmtDate(m.at)}</span>` : '';
    lbCap.innerHTML = who + dt + `<span class="lb-idx">${_lbIndex+1} / ${_lbSet.length}</span>`;
  }
  function openLightbox(m){
    if(!m||!lightbox) return;
    _lbSet=_allMedia;
    showLb(_allMedia.indexOf(m));
    openModal(lightbox);
  }
  // 갤러리 필름 스트립 → 라이트박스 열기 (제출자 정보 없음)
  function openGalleryLightbox(items, idx){
    if(!items||!items.length||!lightbox) return;
    _lbSet = items.map(p => ({ src: p.url, isV:false, name:'', at:0 }));
    showLb(idx);
    openModal(lightbox);
  }
  window.openGalleryLightbox = openGalleryLightbox;
  if($('#lbX')) $('#lbX').addEventListener('click',()=>{ if(lbMedia)lbMedia.innerHTML=''; closeModal(lightbox); });
  if($('#lbPrev')) $('#lbPrev').addEventListener('click',e=>{ e.stopPropagation(); showLb(_lbIndex-1); });
  if($('#lbNext')) $('#lbNext').addEventListener('click',e=>{ e.stopPropagation(); showLb(_lbIndex+1); });
  // swipe on the media area
  if(lbMedia){
    let sx=0,sy=0;
    lbMedia.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
    lbMedia.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
      if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ showLb(_lbIndex + (dx<0?1:-1)); } });
  }
  document.addEventListener('keydown',e=>{ if(!lightbox.classList.contains('show')) return; if(e.key==='ArrowRight')showLb(_lbIndex+1); else if(e.key==='ArrowLeft')showLb(_lbIndex-1); else if(e.key==='Escape'){lbMedia.innerHTML='';closeModal(lightbox);} });
  if($('#snapBooks')) $('#snapBooks').addEventListener('click', renderAllAlbums);
  if($('#snapViewAll')) $('#snapViewAll').addEventListener('click', renderAllAlbums);
  if($('#slX')) $('#slX').addEventListener('click',()=>closeModal(listModal));

  // upload form
  const upModal=$('#snapUploadModal'), suName=$('#suName'), suPhone=$('#suPhone'),
        suFiles=$('#suFiles'), suPick=$('#suPick'), suPickText=$('#suPickText'), suSubmit=$('#suSubmit');
  let suSelected=[];
  const PICK_DEFAULT='Select photos & videos';
  function resetUpload(){ suSelected=[]; if(suName)suName.value=''; if(suPhone)suPhone.value=''; if(suFiles)suFiles.value=''; if(suPickText)suPickText.textContent=PICK_DEFAULT; if(suPick)suPick.classList.remove('has'); var cc=$('#suConsent'); if(cc)cc.checked=false; var cb=$('#suConsentBox'); if(cb)cb.removeAttribute('open'); }
  if(suFiles){
    suFiles.addEventListener('change', ()=>{
      suSelected=[...suFiles.files].filter(f=>/^(image|video)\//.test(f.type));
      if(!suSelected.length){ suPickText.textContent=PICK_DEFAULT; suPick.classList.remove('has'); return; }
      const nImg=suSelected.filter(f=>/^image\//.test(f.type)).length, nVid=suSelected.length-nImg;
      suPickText.textContent = `${nImg?nImg+' photo'+(nImg===1?'':'s'):''}${nImg&&nVid?' · ':''}${nVid?nVid+' video'+(nVid===1?'':'s'):''} selected`.trim() || 'Selected';
      suPick.classList.add('has');
    });
  }
  if($('#snapUpload')) $('#snapUpload').addEventListener('click',()=>{ resetUpload(); openModal(upModal); });
  if($('#suX')) $('#suX').addEventListener('click',()=>closeModal(upModal));
  // keep the checkbox independent of the expand/collapse toggle
  var suConsent=$('#suConsent');
  if(suConsent) suConsent.addEventListener('click', e=>e.stopPropagation());

  // 파일 1개를 R2로 직접 업로드(원본 그대로) 후 앨범에 연결
  async function uploadMedia(file, albumId, uploaderName){
    const ct=file.type||'application/octet-stream';
    // R2 직접 PUT 시도 (presigned URL)
    let r2Ok = false;
    try{
      const pr=await fetch('/api/guestsnap/presign',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,contentType:ct})});
      const pj=await pr.json();
      if(pr.ok && pj.url){
        const put=await fetch(pj.url,{method:'PUT',headers:{'Content-Type':ct},body:file});
        if(put.ok){
          const cf=await fetch('/api/guestsnap/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:pj.key,media_type:pj.mediaType,size:file.size,album_id:albumId})});
          if(cf.ok){ r2Ok = true; }
        }
      }
    }catch(_e){ /* fall through to fallback */ }
    if(r2Ok) return;
    // 폴백: 서버 경유 멀티파트 업로드 (R2 CORS 실패 등). Vercel 4.5MB 제한.
    if(file.size > 4 * 1024 * 1024){
      throw new Error('File is too large (over 4MB). Please make it smaller and try again.');
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('uploader_name', uploaderName || '');
    fd.append('album_id', albumId);
    const r = await fetch('/api/guestsnap', { method:'POST', body: fd });
    if(!r.ok){
      const j = await r.json().catch(()=>({}));
      throw new Error(j.error || 'Upload failed');
    }
  }
  if(suSubmit){
    suSubmit.addEventListener('click',async ()=>{
      const name=(suName.value||'').trim();
      if(!name){ toast('Please enter your name'); return; }
      if(!suSelected.length){ toast('Please select photos or videos'); return; }
      if(suConsent && !suConsent.checked){ toast('Please consent to the collection and use of personal information'); var cb=$('#suConsentBox'); if(cb)cb.setAttribute('open',''); return; }
      suSubmit.disabled=true; const _orig=suSubmit.textContent;
      try{
        const cr=await fetch('/api/albums',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone:(suPhone.value||'').trim(),consent:true})});
        const cj=await cr.json();
        if(!cr.ok||!cj.id) throw new Error(cj.error||'Failed to create album');
        let done=0;
        for(const f of suSelected){
          suSubmit.textContent=`Uploading... ${done+1}/${suSelected.length}`;
          await uploadMedia(f, cj.id, name);
          done++;
        }
        resetUpload(); closeModal(upModal); await refreshAlb();
        toast('Your album has been created. Thank you!');
      }catch(e){
        toast(e.message||'An error occurred while uploading');
      }finally{
        suSubmit.disabled=false; suSubmit.textContent=_orig;
      }
    });
  }

  /* ---------- T맵 (모바일 앱 시도 → 폴백) ---------- */
  {
    const t=$('#navTmap');
    if(t){
      const NAME='상록아트홀';
      t.addEventListener('click', e=>{
        e.preventDefault();
        const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const fallback='https://map.kakao.com/?q='+encodeURIComponent(NAME);
        if(!isMobile){ window.open(fallback,'_blank'); return; }
        // 모바일: T맵 앱 시도 후 1.2초 내 활성화 안 되면 카카오맵으로 폴백
        let bailed=false;
        const onHide=()=>{ bailed=true; };
        document.addEventListener('visibilitychange', onHide, {once:true});
        const start=Date.now();
        try{ location.href='tmap://search?name='+encodeURIComponent(NAME); }catch(_){}
        setTimeout(()=>{
          document.removeEventListener('visibilitychange', onHide);
          if(!bailed && Date.now()-start<1500 && document.visibilityState==='visible'){
            window.location.href=fallback;
          }
        }, 1200);
      });
    }
  }

  /* ---------- SHARE ---------- */
  function doShare(){
    const url=location.href, title="You're invited to Woo Seonggyu ♥ Kim Jieun's wedding";
    if(navigator.share){ navigator.share({title,url}).catch(()=>{}); }
    else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(()=>toast('Invitation link copied')).catch(()=>fallbackCopy(url,'Invitation link copied'));
    } else { fallbackCopy(url,'Invitation link copied'); }
  }
  $('#shareFab').addEventListener('click',doShare);
  $('#shareLink').addEventListener('click',()=>{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(location.href).then(()=>toast('Invitation link copied')).catch(()=>fallbackCopy(location.href,'Invitation link copied'));
    } else { fallbackCopy(location.href,'Invitation link copied'); }
  });
  // 카카오톡 공유 — JS SDK 없이 OS 공유 시트 + OG 메타로 카드 표시
  $('#shareKakao').addEventListener('click',()=>{
    const data = { title: 'Woo Seonggyu ♥ Kim Jieun are getting married', text: 'Sunday, December 20, 2026, 11:00 AM · Sangnok Art Hall', url: location.href };
    if(navigator.share){
      navigator.share(data).catch(()=>{});
    } else {
      // 데스크탑 등 share API 미지원 — 링크 복사로 폴백
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(location.href).then(()=>toast('Link copied. Paste it into KakaoTalk.'));
      } else fallbackCopy(location.href);
    }
  });

  /* ---------- TOP FAB ---------- */
  const topFab=$('#topFab');
  window.addEventListener('scroll',()=>{ topFab.classList.toggle('show', window.scrollY>600); },{passive:true});
  topFab.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
})();
