const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#039;"}[c]));
const params = new URLSearchParams(location.search);
const ppeName = params.get("ppe") || "보호구";
const el = document.querySelector("#guideContent");

fetch("ppe-guides.json", {cache:"no-store"})
  .then(r=>r.json())
  .then(list=>{
    const guide = list.find(x=>x.name===ppeName) || {name:ppeName,icon:"🦺",guide_pdf:"",guide_image:"",description:""};

    let guideBody = "";
    if(guide.guide_image){
      guideBody = `
        <div class="guide-image-wrap">
          <img class="guide-image" src="${esc(guide.guide_image)}" alt="${esc(guide.name)} 안전한 보호구 착용 길잡이" loading="eager">
        </div>
        <p class="mobile-hint">화면을 확대하면 세부 내용을 크게 볼 수 있습니다.</p>
        <div class="guide-actions">
          <button class="btn primary" type="button" onclick="returnToMaterials()">자재 화면으로 돌아가기</button>
        </div>`;
    } else {
      guideBody = `<div class="guide-placeholder"><strong>착용 가이드 자료 준비중</strong><br>해당 보호구의 가이드 자료가 추가되면 이 화면에서 바로 표시됩니다.</div>
        <div class="guide-actions"><button class="btn primary" type="button" onclick="returnToMaterials()">자재 화면으로 돌아가기</button></div>`;
    }

    el.innerHTML = `
      <div class="guide-title-wrap">
        <div class="guide-big-icon">${esc(guide.icon||"🦺")}</div>
        <div><h1>${esc(guide.name)}</h1><p class="sub">보호구 착용 가이드</p></div>
      </div>
      ${guide.description ? `<p class="guide-description">${esc(guide.description)}</p>` : ""}
      ${guideBody}`;
  })
  .catch(()=>{ el.innerHTML = `<div class="guide-placeholder"><strong>가이드 정보를 불러오지 못했습니다.</strong><br>GitHub Pages 배포 상태를 확인하세요.</div>`; });


function returnToMaterials(){
  // 상세 화면에서 들어왔다면 그 상세 화면으로 되돌아간다.
  if(history.length > 1){
    history.back();
  }else{
    location.href = "index.html";
  }
}
window.returnToMaterials = returnToMaterials;
