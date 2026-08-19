
let materials = [];
let activeCategory = "전체";
let keyword = "";
let currentDetailId = null;

const grid = document.querySelector("#materialGrid");
const count = document.querySelector("#resultCount");
const chips = document.querySelector("#categoryButtons");
const searchInput = document.querySelector("#searchInput");
const template = document.querySelector("#cardTemplate");
const dialog = document.querySelector("#detailDialog");
const detailContent = document.querySelector("#detailContent");
const closeDialog = document.querySelector("#closeDialog");

const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

function iconFor(category){
  return "🧴";
}

function ppeIcon(name){
  return {
    "보호장갑":"🧤",
    "보안경":"🥽",
    "안면보호구":"🛡️",
    "보호의":"🦺",
    "보호신발":"🥾",
    "호흡기 보호구":"😷"
  }[name] || "🦺";
}


function safetyChemicalInfo(m){
  const raw = m && (m.safety_chemical ?? m.safetyChemical ?? m.living_chemical ?? m.safety);
  if(raw === true) return {enabled:true};
  if(!raw || typeof raw !== "object") return {enabled:false};
  return {
    enabled: raw.enabled === true,
    registration_no: raw.registration_no || raw.registrationNo || raw.number || "",
    updated: raw.updated || raw.confirmed_at || raw.confirmedAt || "",
    product_name: raw.product_name || raw.productName || "",
    purpose: raw.purpose || "",
    company: raw.company || ""
  };
}

function activateDocumentTab(tabName){
  const root = document.querySelector("#detailContent");
  if(!root) return;
  root.querySelectorAll(".doc-tab").forEach(btn=>{
    const active = btn.dataset.docTab === tabName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  root.querySelectorAll(".doc-panel").forEach(panel=>{
    panel.hidden = panel.dataset.docPanel !== tabName;
  });
}
window.activateDocumentTab = activateDocumentTab;

async function start(){
  // Secure bootstrap handles materials loading after successful decryption.
}

function buildCategories(){
  const cats = ["전체", ...new Set(materials.map(x=>x.category))];
  chips.innerHTML = "";
  cats.forEach(cat=>{
    const b = document.createElement("button");
    b.className = "chip" + (cat===activeCategory ? " active":"");
    b.textContent = cat;
    b.addEventListener("click", ()=>{
      activeCategory = cat;
      buildCategories();
      render();
    });
    chips.appendChild(b);
  });
}

function filtered(){
  const q = keyword.trim().toLowerCase();
  return materials.filter(m=>{
    const categoryOk = activeCategory==="전체" || m.category===activeCategory;
    const hay = [m.name,m.purpose,m.company,...m.locations].join(" ").toLowerCase();
    return categoryOk && (!q || hay.includes(q));
  });
}

function render(){
  const list = filtered();
  count.textContent = list.length;
  grid.innerHTML = "";
  if(!list.length){
    grid.innerHTML = `<div class="empty">조건에 맞는 자재가 없습니다.</div>`;
    return;
  }
  list.forEach(m=>{
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".category").textContent = m.category;
    node.querySelector(".code").textContent = m.id;
    node.querySelector(".name").textContent = m.name;
    node.querySelector(".purpose").textContent = m.purpose || "용도 정보 없음";
    node.querySelector(".location").textContent = m.locations.join(" / ") || "-";
    node.querySelector(".company").textContent = m.company || "-";
    node.querySelector(".photo-icon").textContent = iconFor(m.category);
    const safetyInfo = safetyChemicalInfo(m);
    const safetyBadge = node.querySelector(".safety-chemical-badge");
    if(safetyBadge){
      safetyBadge.hidden = !safetyInfo.enabled;
    }
    if(m.image){
      const p = node.querySelector(".photo");
      p.style.backgroundImage = `url("${m.image}")`;
      p.classList.add("has-image");
    }
    const open = ()=>showDetail(m);
    node.addEventListener("click", open);
    node.addEventListener("keydown", e=>{ if(e.key==="Enter" || e.key===" "){e.preventDefault();open();}});
    grid.appendChild(node);
  });
}

function showDetail(m, pushHistory=true){
  const ppeList = Array.isArray(m.ppe) ? m.ppe : [];
  const ppeHtml = ppeList.length
    ? `<div class="ppe-list">${ppeList.map(p=>{
        const name = typeof p === "string" ? p : p.name;
        return `<a class="ppe-item" href="ppe-guide.html?ppe=${encodeURIComponent(name)}">
          <span class="ppe-icon">${ppeIcon(name)}</span>
          <span class="ppe-name">${esc(name)}</span>
          <span class="ppe-arrow">›</span>
        </a>`;
      }).join("")}</div>`
    : "";

  const safetyInfo = safetyChemicalInfo(m);
  const photoStyle = m.image ? `style="background-image:url('${esc(m.image)}')"` : "";

  const msdsPanel = m.pdf
    ? `<button class="btn primary doc-open-btn" type="button" onclick="openSecureMsds('${esc(m.id)}','${esc(m.name)}')">MSDS 바로보기</button>`
    : `<span class="btn disabled doc-open-btn">MSDS 준비중</span>`;

  const safetyTab = safetyInfo.enabled
    ? `<button class="doc-tab" type="button" role="tab" aria-selected="false" data-doc-tab="safety" onclick="activateDocumentTab('safety')">생활화학제품 안전확인</button>`
    : "";

  const safetyPanel = safetyInfo.enabled ? `
    <section class="doc-panel" data-doc-panel="safety" hidden>
      <div class="safety-doc-summary">
        <div><span>구분</span><strong>안전확인대상 생활화학제품</strong></div>
        ${safetyInfo.registration_no ? `<div><span>신고·승인번호</span><strong>${esc(safetyInfo.registration_no)}</strong></div>` : ""}
        ${safetyInfo.product_name ? `<div><span>등록 제품명</span><strong>${esc(safetyInfo.product_name)}</strong></div>` : ""}
        ${safetyInfo.updated ? `<div><span>확인일</span><strong>${esc(safetyInfo.updated)}</strong></div>` : ""}
      </div>
      <button class="btn primary doc-open-btn" type="button" onclick="openSecureSafety('${esc(m.id)}','${esc(m.name)}')">생활화학제품 안전확인 자료보기</button>
    </section>` : "";

  detailContent.innerHTML = `
    <div class="detail-head">
      <div class="detail-badge-row">
        <span class="badge">${esc(m.category)} · ${esc(m.id)}</span>
        ${safetyInfo.enabled ? `<span class="detail-safety-badge">안전확인대상 생활화학제품</span>` : ""}
      </div>
      <h2>${esc(m.name)}</h2>
      <p class="detail-purpose">${esc(m.purpose||"")}</p>
    </div>
    <div class="detail-photo" ${photoStyle}>${m.image ? "" : iconFor(m.category)}</div>
    <div class="info-grid">
      <div class="info-box"><span>보관 위치</span><strong>${esc(m.locations.join(" / ")||"-")}</strong></div>
      <div class="info-box"><span>업체</span><strong>${esc(m.company||"-")}</strong></div>
      <div class="info-box"><span>MSDS 갱신일</span><strong>${esc(m.msds_updated||"-")}</strong></div>
      <div class="info-box"><span>MSDS 고유번호</span><strong>${esc(m.msds_id||"-")}</strong></div>
      <div class="info-box"><span>분류</span><strong>${esc(m.category)}</strong></div>
    </div>

    <h3 class="section-title">안전자료 열람</h3>
    <div class="doc-tabs" role="tablist" aria-label="안전자료 종류">
      <button class="doc-tab active" type="button" role="tab" aria-selected="true" data-doc-tab="msds" onclick="activateDocumentTab('msds')">초록누리 열람</button>
      ${safetyTab}
    </div>
    <section class="doc-panel" data-doc-panel="msds">
      <p class="section-help">물질안전보건자료(MSDS)를 열람합니다.</p>
      ${msdsPanel}
    </section>
    ${safetyPanel}

    <h3 class="section-title">필요 보호구</h3>
    <p class="section-help">보호구를 누르면 착용 가이드로 이동합니다.</p>
    ${ppeHtml}

    <div class="actions single-action">
      <button class="btn primary" onclick="closeDetailView()">목록으로</button>
    </div>
    <div class="notice">※ 보호구 지정 및 안전확인 정보는 현장 기준과 최신 공식 자료를 확인해 등록하세요.</div>
  `;
  currentDetailId = m.id;
  if(!dialog.open) dialog.showModal();

  if(pushHistory){
    if(!history.state || history.state.view !== "detail" || history.state.id !== m.id){
      history.pushState({view:"detail", id:m.id}, "", location.href);
    }
  }
}

searchInput.addEventListener("input", e=>{
  keyword = e.target.value;
  render();
});
function closeDetailView(){
  if(history.state && history.state.view === "detail"){
    history.back();
  }else{
    currentDetailId = null;
    if(dialog.open) dialog.close();
  }
}
window.closeDetailView = closeDetailView;

closeDialog.addEventListener("click", closeDetailView);
dialog.addEventListener("click", e=>{ if(e.target===dialog) closeDetailView(); });

start().catch(err=>{
  console.error(err);
  grid.innerHTML = `<div class="empty">materials.json을 불러오지 못했습니다.<br>GitHub Pages에서 열어주세요.</div>`;
});


// ===== Secure MSPK v1 support =====
const MSPK_MAGIC = new TextEncoder().encode("MSPK1");
const mspkEnc = new TextEncoder();
const mspkDec = new TextDecoder();
let securePasswordMemory = "";
let secureRole = "";
const SECURE_SESSION_KEY = "msds_secure_session_password_v1";
const SECURE_ROLE_KEY = "msds_secure_session_role_v1";
let secureObjectUrls = [];

const secureGate = document.querySelector("#secureGate");
const secureLoginForm = document.querySelector("#secureLoginForm");
const securePasswordInput = document.querySelector("#securePassword");
const secureLoginMessage = document.querySelector("#secureLoginMessage");
const noticeDialog = document.querySelector("#noticeDialog");
const noticeList = document.querySelector("#noticeList");
const noticeStatus = document.querySelector("#noticeStatus");
const noticeOpenButton = document.querySelector("#noticeOpenButton");
const noticeCloseButton = document.querySelector("#noticeCloseButton");
const secureLogoutButton = document.querySelector("#secureLogoutButton");
const secureViewer = document.querySelector("#secureMsdsViewer");
const secureViewerBack = document.querySelector("#secureViewerBack");
const secureViewerTitle = document.querySelector("#secureViewerTitle");
const secureViewerStatus = document.querySelector("#secureViewerStatus");
const secureViewerPages = document.querySelector("#secureViewerPages");

function mspkReadU32(bytes, offset){
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset,false);
}
function mspkEqual(a,b){
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false;
  return true;
}
async function mspkDeriveKey(password,salt,iterations){
  const base = await crypto.subtle.importKey("raw",mspkEnc.encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2",salt,iterations,hash:"SHA-256"},
    base,{name:"AES-GCM",length:256},false,["decrypt"]
  );
}
async function decryptMspack(url,password){
  const response = await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error("암호화 자료를 불러오지 못했습니다.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if(bytes.length < 53 || !mspkEqual(bytes.slice(0,5),MSPK_MAGIC)){
    throw new Error("지원하지 않는 암호화 파일입니다.");
  }
  const iterations = mspkReadU32(bytes,5);
  const salt = bytes.slice(9,25);
  const iv = bytes.slice(25,37);
  const cipher = bytes.slice(37);
  const key = await mspkDeriveKey(password,salt,iterations);
  let plain;
  try{
    plain = new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher));
  }catch(e){
    throw new Error("비밀번호가 틀렸거나 암호화 파일이 손상되었습니다.");
  }
  return parseMspackPayload(plain);
}
function parseMspackPayload(payload){
  if(payload.length<4) throw new Error("암호화 자료 내부가 손상되었습니다.");
  const metaLen = mspkReadU32(payload,0);
  if(metaLen<=0 || metaLen>payload.length-4) throw new Error("암호화 자료 메타데이터가 손상되었습니다.");
  const meta = JSON.parse(mspkDec.decode(payload.slice(4,4+metaLen)));
  const dataStart = 4+metaLen;
  return (meta.files||[]).map(entry=>{
    const start = dataStart + entry.offset;
    const end = start + entry.size;
    if(start<dataStart || end>payload.length) throw new Error("암호화 자료 파일 범위가 손상되었습니다.");
    return {path:String(entry.path||""),data:payload.slice(start,end)};
  });
}
function findPackedFile(files,name){
  return files.find(f=>f.path.split("/").pop()===name);
}
function clearSecureObjectUrls(){
  for(const url of secureObjectUrls) URL.revokeObjectURL(url);
  secureObjectUrls = [];
}
function updateRoleUI(){
  const badge = document.querySelector("#secureRoleBadge");
  if(!badge) return;
  badge.hidden = false;
  if(secureRole === "staff"){
    badge.textContent = "미화팀 직원";
    badge.className = "role-badge staff";
    if(noticeOpenButton) noticeOpenButton.hidden = false;
  }else{
    badge.textContent = "게스트";
    badge.className = "role-badge guest";
    if(noticeOpenButton) noticeOpenButton.hidden = true;
  }
}

function unlockSite(){
  document.body.classList.remove("secure-locked");
  secureGate.hidden = true;
  if(secureLogoutButton) secureLogoutButton.hidden = false;

  // QR로 바로 들어온 첫 화면 자체를 "목록" 히스토리로 고정.
  // 이후 상세/MSDS에서 휴대폰 뒤로가기를 누르면 앱이 종료되지 않고
  // 한 단계씩 목록으로 돌아오게 한다.
  if(!history.state || !history.state.view){
    history.replaceState({view:"list"}, "", location.href);
  }
}
function lockSite(){
  securePasswordMemory = "";
  sessionStorage.removeItem(SECURE_SESSION_KEY);
  sessionStorage.removeItem(SECURE_ROLE_KEY);
  secureRole = "";
  materials = [];
  noticeCache = null;
  clearSecureObjectUrls();
  if(dialog && dialog.open) dialog.close();
  if(noticeDialog && noticeDialog.open) noticeDialog.close();
  if(noticeOpenButton) noticeOpenButton.hidden = true;
  if(secureViewer) secureViewer.hidden = true;
  document.body.classList.add("secure-locked");
  secureGate.hidden = false;
  if(secureLogoutButton) secureLogoutButton.hidden = true;
  if(securePasswordInput){
    securePasswordInput.value = "";
    setTimeout(()=>securePasswordInput.focus(),50);
  }
  if(secureLoginMessage) secureLoginMessage.textContent = "";
  grid.innerHTML = "";
  count.textContent = "0";
  history.replaceState({view:"list"}, "", location.href);
}



let noticeCache = null;

function normalizeNoticeItems(data){
  const items = Array.isArray(data) ? data : (data && Array.isArray(data.notices) ? data.notices : []);
  return items
    .filter(n=>n && n.enabled !== false)
    .map((n,i)=>({
      id: String(n.id ?? i+1),
      title: String(n.title || "제목 없음"),
      date: String(n.date || ""),
      content: String(n.content || ""),
      important: n.important === true,
      order: Number.isFinite(Number(n.order)) ? Number(n.order) : 0
    }))
    .sort((a,b)=>Number(b.important)-Number(a.important) || b.order-a.order || b.date.localeCompare(a.date) || b.id.localeCompare(a.id,undefined,{numeric:true}));
}

function renderNotices(items){
  if(!noticeList || !noticeStatus) return;
  noticeList.innerHTML = "";
  if(!items.length){
    noticeStatus.textContent = "등록된 공지사항이 없습니다.";
    return;
  }
  noticeStatus.textContent = `총 ${items.length}건 · 제목을 누르면 내용을 확인할 수 있습니다.`;

  for(const n of items){
    const item=document.createElement("article");
    item.className="notice-item" + (n.important ? " important" : "");
    item.innerHTML=`
      <button class="notice-row" type="button" aria-expanded="false">
        <span class="notice-row-main">
          ${n.important ? '<span class="notice-pin">중요</span>' : ''}
          <strong class="notice-title">${esc(n.title)}</strong>
        </span>
        <span class="notice-row-side">
          <span class="notice-date">${esc(n.date)}</span>
          <span class="notice-chevron" aria-hidden="true">⌄</span>
        </span>
      </button>
      <div class="notice-body" hidden>${esc(n.content).replace(/\n/g,"<br>")}</div>`;
    const row=item.querySelector(".notice-row");
    const body=item.querySelector(".notice-body");
    row.addEventListener("click",()=>{
      const open=body.hidden;
      body.hidden=!open;
      row.setAttribute("aria-expanded",open ? "true" : "false");
      item.classList.toggle("open",open);
    });
    noticeList.appendChild(item);
  }
}

async function loadNotices(force=false){
  if(noticeCache && !force) return noticeCache;

  if(secureRole !== "staff"){
    throw new Error("직원 전용 공지사항입니다.");
  }
  if(!securePasswordMemory){
    throw new Error("직원 인증 정보가 없습니다. 다시 로그인해 주세요.");
  }

  // 평문 notice.json 대신 직원용 암호화 PACK을 복호화해서 읽습니다.
  const files = await decryptMspack(
    `secure/staff/notice.mspack?v=${Date.now()}`,
    securePasswordMemory
  );

  const noticeFile = findPackedFile(files,"notice.json");
  if(!noticeFile){
    throw new Error("notice.mspack 안에 notice.json 파일이 없습니다.");
  }

  let data;
  try{
    data = JSON.parse(mspkDec.decode(noticeFile.data));
  }catch(e){
    throw new Error("notice.mspack 내부 notice.json 문법이 올바르지 않습니다.");
  }

  noticeCache=normalizeNoticeItems(data);
  return noticeCache;
}

async function openStaffNotices(){
  if(secureRole!=="staff" || !noticeDialog) return;
  if(noticeStatus) noticeStatus.textContent="공지사항을 불러오는 중...";
  if(noticeList) noticeList.innerHTML="";
  if(!noticeDialog.open) noticeDialog.showModal();
  try{
    const items=await loadNotices(true);
    renderNotices(items);
  }catch(err){
    if(noticeStatus) noticeStatus.textContent="공지사항을 불러오지 못했습니다.";
    if(noticeList) noticeList.innerHTML=`<div class="notice-error">${esc(err.message||"오류")}</div>`;
  }
}

if(noticeOpenButton){
  noticeOpenButton.addEventListener("click",()=>openStaffNotices());
}
if(noticeCloseButton){
  noticeCloseButton.addEventListener("click",()=>noticeDialog && noticeDialog.close());
}
if(noticeDialog){
  noticeDialog.addEventListener("click",e=>{
    if(e.target===noticeDialog) noticeDialog.close();
  });
}

async function secureLoginGuest(){
  const guestAccessKey = "1111";
  const files = await decryptMspack("secure/guest/materials.mspack", guestAccessKey);
  const materialFile = findPackedFile(files, "materials.json");
  if(!materialFile) throw new Error("게스트용 자재목록을 불러오지 못했습니다.");

  const loaded = JSON.parse(mspkDec.decode(materialFile.data));
  if(!Array.isArray(loaded)) throw new Error("게스트용 자재목록 형식이 올바르지 않습니다.");

  securePasswordMemory = guestAccessKey;
  secureRole = "guest";
  sessionStorage.setItem(SECURE_SESSION_KEY, guestAccessKey);
  sessionStorage.setItem(SECURE_ROLE_KEY, "guest");

  materials = loaded;
  activeCategory = "전체";
  keyword = "";
  searchInput.value = "";
  buildCategories();
  render();
  unlockSite();
  updateRoleUI();
  requestAnimationFrame(()=>restoreViewFromHistory());
}

async function secureLogin(password){
  const files = await decryptMspack("secure/staff/materials.mspack", password);
  const role = "staff";
  const materialsName = "materials.json";

  const materialFile = findPackedFile(files, materialsName);
  if(!materialFile) throw new Error("materials.json이 암호화 PACK 안에 없습니다.");

  const loaded = JSON.parse(mspkDec.decode(materialFile.data));
  if(!Array.isArray(loaded)) throw new Error("materials.json 형식이 올바르지 않습니다.");

  securePasswordMemory = password;
  secureRole = role;
  sessionStorage.setItem(SECURE_SESSION_KEY, password);
  sessionStorage.setItem(SECURE_ROLE_KEY, role);

  materials = loaded;
  activeCategory = "전체";
  keyword = "";
  searchInput.value = "";
  buildCategories();
  render();
  unlockSite();
  updateRoleUI();

  requestAnimationFrame(()=>restoreViewFromHistory());
}


async function restoreSecureSession(){
  const saved = sessionStorage.getItem(SECURE_SESSION_KEY);
  const savedRole = sessionStorage.getItem(SECURE_ROLE_KEY);
  if(!saved) return false;
  try{
    if(savedRole === "guest"){
      await secureLoginGuest();
    }else{
      await secureLogin(saved);
    }
    return true;
  }catch(err){
    sessionStorage.removeItem(SECURE_SESSION_KEY);
    securePasswordMemory = "";
    return false;
  }
}


const guestLoginButton = document.querySelector("#guestLoginButton");
if(guestLoginButton){
  guestLoginButton.addEventListener("click", async ()=>{
    guestLoginButton.disabled = true;
    secureLoginMessage.textContent = "게스트로 접속 중...";
    try{
      // 게스트 자료는 원래 공개 범위(목록 + MSDS 1페이지)만 들어 있는 별도 PACK이다.
      // 내부 접근키는 보안 비밀이 아니며 직원용 PACK과 완전히 분리되어 있다.
      await secureLoginGuest();
      secureLoginMessage.textContent = "";
    }catch(err){
      secureLoginMessage.textContent = err.message || "게스트 접속에 실패했습니다.";
    }finally{
      guestLoginButton.disabled = false;
    }
  });
}

if(secureLoginForm){
  document.body.classList.add("secure-locked");
  secureLoginForm.addEventListener("submit",async e=>{
    e.preventDefault();
    const password = securePasswordInput.value;
    if(!password){
      secureLoginMessage.textContent = "비밀번호를 입력하세요.";
      return;
    }
    secureLoginMessage.textContent = "확인 중...";
    try{
      await secureLogin(password);
      secureLoginMessage.textContent = "";
      securePasswordInput.value = "";
      // 직원이 비밀번호를 직접 입력해 로그인한 경우에만 공지 팝업 자동 표시.
      // 같은 탭의 세션 복원/뒤로가기에서는 반복해서 띄우지 않는다.
      setTimeout(()=>openStaffNotices(),80);
    }catch(err){
      secureLoginMessage.textContent = err.message || "로그인에 실패했습니다.";
      securePasswordInput.select();
    }
  });
}


// 뒤로가기 / 목록 이동 / 보호구 페이지 복귀 시 같은 탭에서는 재로그인하지 않음.
restoreSecureSession().then(restored=>{
  if(!restored && securePasswordInput){
    setTimeout(()=>securePasswordInput.focus(),50);
  }
});

if(secureLogoutButton){
  secureLogoutButton.addEventListener("click",lockSite);
}

async function openSecureDocument(kind, materialId, materialName, pushHistory=true){
  if(!securePasswordMemory){
    lockSite();
    return;
  }
  if(dialog && dialog.open) dialog.close();

  const match = String(materialId).match(/(\d+)$/);
  if(!match) return alert("자재 번호 형식을 확인하세요.");
  const no = String(parseInt(match[1],10)).padStart(2,"0");

  const isSafety = kind === "safety";
  const historyView = isSafety ? "safety" : "msds";
  const titleSuffix = isSafety ? "생활화학제품 안전확인" : "MSDS";
  const packStem = isSafety ? "safety" : "msds";

  if(pushHistory && (!history.state || history.state.view !== historyView || history.state.id !== materialId)){
    history.pushState({view:historyView, id:materialId, name:materialName}, "", location.href);
  }

  secureViewer.hidden = false;
  secureViewerTitle.textContent = `${materialName || materialId} · ${titleSuffix}`;
  secureViewerStatus.textContent = "암호화 자료 복호화 중...";
  secureViewerPages.innerHTML = `<div class="secure-viewer-loading">${esc(titleSuffix)} 보안 자료를 불러오는 중입니다...</div>`;
  clearSecureObjectUrls();

  try{
    const packUrl = secureRole === "staff"
      ? `secure/staff/${packStem}-${no}.mspack`
      : `secure/guest/${packStem}-${no}-preview.mspack`;

    const files = await decryptMspack(packUrl,securePasswordMemory);
    const pages = files
      .filter(f=>/page-\d+\.(webp|png|jpe?g)$/i.test(f.path.split("/").pop()))
      .sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true}));

    if(!pages.length) throw new Error(`${titleSuffix} 페이지 이미지가 PACK 안에 없습니다.`);

    secureViewerPages.innerHTML = "";
    const visiblePages = secureRole === "staff" ? pages : pages.slice(0,1);

    for(let i=0;i<visiblePages.length;i++){
      const f = visiblePages[i];
      const ext = f.path.split(".").pop().toLowerCase();
      const type = ext==="webp" ? "image/webp" : ext==="png" ? "image/png" : "image/jpeg";
      const url = URL.createObjectURL(new Blob([f.data],{type}));
      secureObjectUrls.push(url);
      const img = document.createElement("img");
      img.className = "secure-page";
      img.src = url;
      img.alt = `${materialName||materialId} ${titleSuffix} ${i+1}페이지`;
      img.loading = i < 2 ? "eager" : "lazy";
      secureViewerPages.appendChild(img);
    }

    if(secureRole === "guest"){
      const notice = document.createElement("div");
      notice.className = "guest-msds-notice";
      notice.innerHTML = `
        <strong>게스트 열람은 ${esc(titleSuffix)} 1페이지만 제공됩니다.</strong>
        <p>전체 자료 열람은 미화팀 직원 전용입니다.<br>추가 내용이 필요한 경우 미화팀 직원에게 문의해 주세요.</p>`;
      secureViewerPages.appendChild(notice);
      secureViewerStatus.textContent = `게스트 · 1페이지 미리보기`;
    }else{
      secureViewerStatus.textContent = `${pages.length}페이지 · 직원 전체 열람`;
    }

    if(secureViewer.scrollTo) secureViewer.scrollTo({top:0,behavior:"auto"});
  }catch(err){
    secureViewerStatus.textContent = "열기 실패";
    secureViewerPages.innerHTML = `<div class="secure-viewer-loading"><strong>${esc(titleSuffix)} 자료를 열지 못했습니다.</strong><br>${esc(err.message||"오류")}</div>`;
  }
}

async function openSecureMsds(msdsId,materialName){
  return openSecureDocument("msds", msdsId, materialName, true);
}

async function openSecureSafety(materialId,materialName){
  return openSecureDocument("safety", materialId, materialName, true);
}

window.openSecureMsds = openSecureMsds;
window.openSecureSafety = openSecureSafety;

function hideSecureViewer(){
  if(secureViewer){
    secureViewer.hidden = true;
    secureViewerPages.innerHTML = "";
  }
  clearSecureObjectUrls();
}

function restoreViewFromHistory(){
  if(!materials || !materials.length) return;
  const state = history.state || {view:"list"};

  if(state.view === "detail" && state.id){
    hideSecureViewer();
    const m = materials.find(x=>x.id===state.id);
    if(m){
      showDetail(m, false);
      return;
    }
  }

  if((state.view === "msds" || state.view === "safety") && state.id && securePasswordMemory){
    if(dialog && dialog.open) dialog.close();
    if(secureViewer && secureViewer.hidden){
      openSecureDocument(state.view === "safety" ? "safety" : "msds", state.id, state.name || state.id, false);
    }
    return;
  }

  hideSecureViewer();
  currentDetailId = null;
  if(dialog && dialog.open) dialog.close();
}


if(secureViewerBack){
  secureViewerBack.addEventListener("click",()=>{
    if(history.state && (history.state.view === "msds" || history.state.view === "safety")){
      history.back();
    }else{
      hideSecureViewer();
    }
  });
}

// Android/휴대폰 시스템 뒤로가기 대응
window.addEventListener("popstate", ()=>{
  restoreViewFromHistory();
});

// bfcache 복귀 대응 (보호구 가이드 → 휴대폰 뒤로가기)
window.addEventListener("pageshow", ()=>{
  if(securePasswordMemory || sessionStorage.getItem(SECURE_SESSION_KEY)){
    requestAnimationFrame(()=>restoreViewFromHistory());
  }
});

// PWA service worker
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
