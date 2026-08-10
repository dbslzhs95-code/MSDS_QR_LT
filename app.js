
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
  const photoStyle = m.image ? `style="background-image:url('${esc(m.image)}')"` : "";
  const pdfButton = m.pdf
    ? `<button class="btn primary" type="button" onclick="openSecureMsds('${esc(m.id)}','${esc(m.name)}')">MSDS 바로보기</button>`
    : `<span class="btn disabled">MSDS 준비중</span>`;
  detailContent.innerHTML = `
    <div class="detail-head">
      <span class="badge">${esc(m.category)} · ${esc(m.id)}</span>
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
    <h3 class="section-title">필요 보호구</h3>
    <p class="section-help">보호구를 누르면 착용 가이드로 이동합니다.</p>
    ${ppeHtml}
    <div class="actions">
      ${pdfButton}
      <button class="btn primary" onclick="closeDetailView()">목록으로</button>
    </div>
    <div class="notice">※ 보호구 지정은 현장 기준 및 최신 MSDS를 확인해 등록하세요.</div>
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
const SECURE_SESSION_KEY = "msds_secure_session_password_v1";
let secureObjectUrls = [];

const secureGate = document.querySelector("#secureGate");
const secureLoginForm = document.querySelector("#secureLoginForm");
const securePasswordInput = document.querySelector("#securePassword");
const secureLoginMessage = document.querySelector("#secureLoginMessage");
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
  materials = [];
  clearSecureObjectUrls();
  if(dialog && dialog.open) dialog.close();
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

async function secureLogin(password){
  const files = await decryptMspack("secure/materials.mspack",password);
  const materialFile = findPackedFile(files,"materials.json");
  if(!materialFile) throw new Error("materials.json이 암호화 PACK 안에 없습니다.");
  const loaded = JSON.parse(mspkDec.decode(materialFile.data));
  if(!Array.isArray(loaded)) throw new Error("materials.json 형식이 올바르지 않습니다.");
  securePasswordMemory = password;
  sessionStorage.setItem(SECURE_SESSION_KEY, password);
  materials = loaded;
  activeCategory = "전체";
  keyword = "";
  searchInput.value = "";
  buildCategories();
  render();
  unlockSite();

  // 보호구 화면에서 브라우저 뒤로가기로 돌아왔거나 페이지가 복원된 경우
  // 이전 상세 화면을 다시 연다.
  requestAnimationFrame(()=>restoreViewFromHistory());
}


async function restoreSecureSession(){
  const saved = sessionStorage.getItem(SECURE_SESSION_KEY);
  if(!saved) return false;
  try{
    await secureLogin(saved);
    return true;
  }catch(err){
    sessionStorage.removeItem(SECURE_SESSION_KEY);
    securePasswordMemory = "";
    return false;
  }
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

async function openSecureMsds(msdsId,materialName){
  if(!securePasswordMemory){
    lockSite();
    return;
  }
  if(dialog && dialog.open) dialog.close();

  // MSDS 뷰어도 별도 히스토리 단계로 취급한다.
  // 휴대폰 뒤로가기: MSDS → 자재 상세 → 목록 순서가 된다.
  if(!history.state || history.state.view !== "msds" || history.state.id !== msdsId){
    history.pushState({view:"msds", id:msdsId, name:materialName}, "", location.href);
  }

  const match = String(msdsId).match(/(\d+)$/);
  if(!match) return alert("MSDS 번호 형식을 확인하세요.");
  const no = String(parseInt(match[1],10)).padStart(2,"0");
  secureViewer.hidden = false;
  secureViewerTitle.textContent = materialName || msdsId;
  secureViewerStatus.textContent = "암호화 자료 복호화 중...";
  secureViewerPages.innerHTML = `<div class="secure-viewer-loading">MSDS 보안 자료를 불러오는 중입니다...</div>`;
  clearSecureObjectUrls();

  try{
    const files = await decryptMspack(`secure/msds-${no}.mspack`,securePasswordMemory);
    const pages = files
      .filter(f=>/page-\d+\.(webp|png|jpe?g)$/i.test(f.path.split("/").pop()))
      .sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true}));
    if(!pages.length) throw new Error("MSDS 페이지 이미지가 PACK 안에 없습니다.");

    secureViewerPages.innerHTML = "";
    for(let i=0;i<pages.length;i++){
      const f = pages[i];
      const ext = f.path.split(".").pop().toLowerCase();
      const type = ext==="webp" ? "image/webp" : ext==="png" ? "image/png" : "image/jpeg";
      const url = URL.createObjectURL(new Blob([f.data],{type}));
      secureObjectUrls.push(url);
      const img = document.createElement("img");
      img.className = "secure-page";
      img.src = url;
      img.alt = `${materialName||msdsId} MSDS ${i+1}페이지`;
      img.loading = i < 2 ? "eager" : "lazy";
      secureViewerPages.appendChild(img);
    }
    secureViewerStatus.textContent = `${pages.length}페이지 · 복호화 완료`;
    secureViewer.scrollTo({top:0,behavior:"instant"});
  }catch(err){
    secureViewerStatus.textContent = "열기 실패";
    secureViewerPages.innerHTML = `<div class="secure-viewer-loading"><strong>MSDS를 열지 못했습니다.</strong><br>${esc(err.message||"오류")}</div>`;
  }
}
window.openSecureMsds = openSecureMsds;

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

  if(state.view === "msds" && state.id && securePasswordMemory){
    if(dialog && dialog.open) dialog.close();
    if(secureViewer && secureViewer.hidden){
      // bfcache가 아닌 새 복원 상황에서도 MSDS 화면 재구성
      openSecureMsdsFromHistory(state.id, state.name || state.id);
    }
    return;
  }

  hideSecureViewer();
  currentDetailId = null;
  if(dialog && dialog.open) dialog.close();
}

async function openSecureMsdsFromHistory(msdsId,materialName){
  if(!securePasswordMemory) return;
  const match = String(msdsId).match(/(\d+)$/);
  if(!match) return;
  const no = String(parseInt(match[1],10)).padStart(2,"0");

  secureViewer.hidden = false;
  secureViewerTitle.textContent = materialName || msdsId;
  secureViewerStatus.textContent = "암호화 자료 복호화 중...";
  secureViewerPages.innerHTML = `<div class="secure-viewer-loading">MSDS 보안 자료를 불러오는 중입니다...</div>`;
  clearSecureObjectUrls();

  try{
    const files = await decryptMspack(`secure/msds-${no}.mspack`,securePasswordMemory);
    const pages = files
      .filter(f=>/page-\d+\.(webp|png|jpe?g)$/i.test(f.path.split("/").pop()))
      .sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true}));

    secureViewerPages.innerHTML = "";
    for(let i=0;i<pages.length;i++){
      const f = pages[i];
      const ext = f.path.split(".").pop().toLowerCase();
      const type = ext==="webp" ? "image/webp" : ext==="png" ? "image/png" : "image/jpeg";
      const url = URL.createObjectURL(new Blob([f.data],{type}));
      secureObjectUrls.push(url);
      const img = document.createElement("img");
      img.className = "secure-page";
      img.src = url;
      img.alt = `${materialName||msdsId} MSDS ${i+1}페이지`;
      img.loading = i < 2 ? "eager" : "lazy";
      secureViewerPages.appendChild(img);
    }
    secureViewerStatus.textContent = `${pages.length}페이지 · 복호화 완료`;
  }catch(err){
    secureViewerStatus.textContent = "열기 실패";
    secureViewerPages.innerHTML = `<div class="secure-viewer-loading"><strong>MSDS를 열지 못했습니다.</strong><br>${esc(err.message||"오류")}</div>`;
  }
}

if(secureViewerBack){
  secureViewerBack.addEventListener("click",()=>{
    if(history.state && history.state.view === "msds"){
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
