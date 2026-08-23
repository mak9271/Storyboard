const OPTIONS = {
  shotSize:["ECU · Extreme Close Up","CU · Close Up","MCU · Medium Close Up","MS · Medium Shot","MLS · Medium Long Shot","WS · Wide Shot","EWS · Extreme Wide Shot","OTS · Over The Shoulder","POV · Point of View","Insert","Top Shot"],
  angle:["Eye Level","High Angle","Low Angle","Top / Bird's Eye","Dutch Angle","Ground Level","Overhead"],
  cameraHeight:["Eye Level","Chest Level","Waist Level","Table Level","Ground Level","Overhead","Custom"],
  lens:["18mm","24mm","28mm","35mm","40mm","50mm","65mm","85mm","100mm","135mm","Wide","Normal","Telephoto"],
  focus:["Shallow Focus","Deep Focus","Rack Focus","Selective Focus","Soft Focus","Split Diopter","Auto / Unspecified"],
  movement:["Static","Pan Left","Pan Right","Tilt Up","Tilt Down","Dolly In","Dolly Out","Tracking Left","Tracking Right","Push In","Pull Out","Crane / Jib","Handheld","Zoom In","Zoom Out","Orbit","Whip Pan"],
  composition:["Centered / Symmetrical","Rule of Thirds","Subject Left","Subject Right","Negative Space Left","Negative Space Right","Foreground Framing","Layered Depth","Silhouette","Two Shot","Custom"],
  timeOfDay:["Night","Morning","Sunrise","Day","Sunset","Twilight","Unspecified"],
  lightSource:["Candle","Window Light","Moonlight","Sunlight","Torch","Practical Light","Off-camera Artificial Light","Mixed","Unspecified"],
  lightDirection:["Front","Back","Camera Left","Camera Right","Top","Bottom","Backlight","Side Light","3/4 Light","Unspecified"],
  lightQuality:["Hard","Soft","Low Key","High Key","High Contrast","Diffused","Flicker","Silhouette","Unspecified"],
  transitionIn:["Cut","Match Cut","Hard Cut","J Cut","L Cut","Dissolve","Fade In","Whip Transition","From Black"],
  transitionOut:["Cut","Match Cut","Hard Cut","J Cut","L Cut","Dissolve","Fade Out","Whip Transition","To Black"]
};

const FIELDS = ["sceneNo","shotNo","duration","shotSize","angle","cameraHeight","lens","focus","movement","startEnd","composition","summary","subject","description","performance","subjectMovement","costume","timeOfDay","location","lightSource","lightDirection","lightQuality","lighting","props","dialogue","voiceOver","sfx","music","transitionIn","transitionOut","notes"];
const $ = id => document.getElementById(id);

let state = loadState() || {
  project:{name:"Roozaneh",aspect:"3:4 Portrait",style:"Storyboard B&W"},
  shots:[blankShot(1)],
  active:0
};

function blankShot(no){
  return {sceneNo:1,shotNo:no,duration:"",shotSize:"CU · Close Up",angle:"Eye Level",cameraHeight:"Eye Level",lens:"50mm",focus:"Shallow Focus",movement:"Static",startEnd:"",composition:"Centered / Symmetrical",summary:"",subject:"",description:"",performance:"",subjectMovement:"",costume:"",timeOfDay:"Night",location:"",lightSource:"Candle",lightDirection:"Camera Left",lightQuality:"Low Key",lighting:"",props:"",dialogue:"",voiceOver:"",sfx:"",music:"",transitionIn:"Cut",transitionOut:"Cut",notes:"",image:null};
}
function migrate(){
  if(state.project.aspect==="3:4 عمودی") state.project.aspect="3:4 Portrait";
  if(state.project.aspect==="9:16 عمودی") state.project.aspect="9:16 Portrait";
}
function initOptions(){Object.entries(OPTIONS).forEach(([id,vals])=>{const el=$(id);el.innerHTML="";vals.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)})})}
function saveState(){localStorage.setItem("storyboard-shot-builder-v2",JSON.stringify(state));localStorage.setItem("storyboard-shot-builder-v1",JSON.stringify(state))}
function loadState(){try{return JSON.parse(localStorage.getItem("storyboard-shot-builder-v2")||localStorage.getItem("storyboard-shot-builder-v1"))}catch(e){return null}}
function current(){return state.shots[state.active]}
function shortValue(v){return (v||"").split(" · ")[0]}

function render(){
  migrate();
  const s=current(); if(!s)return;
  $("projectName").value=state.project.name;$("projectAspect").value=state.project.aspect;$("projectStyle").value=state.project.style;
  FIELDS.forEach(id=>{if($(id))$(id).value=s[id]??""});
  renderDerived();renderFrame();renderList();renderSheet();
}
function renderDerived(){
  const s=current();
  $("shotKicker").textContent=`SCENE ${String(s.sceneNo).padStart(2,"0")} · SHOT ${String(s.shotNo).padStart(2,"0")}`;
  $("shotTitle").textContent=`Shot ${s.shotNo}`;
  $("quickSize").textContent=shortValue(s.shotSize);$("quickAngle").textContent=s.angle;$("quickLens").textContent=s.lens;$("quickMove").textContent=s.movement;
  $("frameMeta").textContent=`${state.project.aspect} · ${shortValue(s.shotSize)} · ${s.angle}`;applyAspect();renderList();
}
function renderList(){
  const wrap=$("shotList");wrap.innerHTML="";
  state.shots.forEach((s,i)=>{const b=document.createElement("button");b.className="shot-item"+(i===state.active?" active":"");const thumb=document.createElement("span");thumb.className="shot-thumb";if(s.image)thumb.style.backgroundImage=`url(${s.image})`;const txt=document.createElement("span");txt.innerHTML=`<strong>Shot ${s.shotNo}</strong><small>Scene ${s.sceneNo} · ${shortValue(s.shotSize)} · ${s.duration||"No duration"}</small>`;b.append(thumb,txt);b.onclick=()=>{state.active=i;render();saveState()};wrap.appendChild(b)})
}
function renderFrame(){
  const s=current(),img=$("frameImage"),ph=document.querySelector(".frame-placeholder");
  if(s.image){img.src=s.image;img.hidden=false;ph.hidden=true;$("removeImageBtn").hidden=false}else{img.hidden=true;img.removeAttribute("src");ph.hidden=false;$("removeImageBtn").hidden=true}
}
function applyAspect(){
  const f=$("storyFrame");f.className="story-frame";const a=state.project.aspect;
  f.classList.add(a.startsWith("3:4")?"aspect-3-4":a.startsWith("9:16")?"aspect-9-16":a==="4:3"?"aspect-4-3":a==="16:9"?"aspect-16-9":"aspect-cinema");
}
function sheetCols(per){
  return per>=8?"cols-3":"cols-2";
}
function renderSheet(){
  $("sheetProjectTitle").textContent=state.project.name+" · Storyboard Sheet";
  const per=Number($("shotsPerPage").value||6),pages=$("sheetPages");pages.innerHTML="";
  for(let i=0;i<state.shots.length;i+=per){
    const page=document.createElement("article");page.className="sheet-page";
    const chunk=state.shots.slice(i,i+per);
    page.innerHTML=`<div class="sheet-page-head"><h3>${escapeHtml(state.project.name)}</h3><span>Page ${Math.floor(i/per)+1} · ${escapeHtml(state.project.aspect)}</span></div>`;
    const grid=document.createElement("div");grid.className=`sheet-grid ${sheetCols(per)}`;
    chunk.forEach(s=>{
      const card=document.createElement("div");card.className="sheet-shot";
      const image=s.image?`<img src="${s.image}" alt="">`:`<div class="sheet-placeholder">Storyboard Frame<br>Shot ${s.shotNo}</div>`;
      card.innerHTML=`<div class="sheet-image">${image}</div><div class="sheet-info"><div class="sheet-info-top"><span>SHOT ${s.shotNo}</span><span>SCENE ${s.sceneNo}</span></div><div class="sheet-meta">${escapeHtml(shortValue(s.shotSize))} · ${escapeHtml(s.angle||"")} · ${escapeHtml(s.lens||"")} · ${escapeHtml(s.movement||"")}<br>${escapeHtml(s.duration||"")}</div><div class="sheet-summary">${escapeHtml(s.summary||s.description||"")}</div></div>`;
      grid.appendChild(card);
    });
    page.appendChild(grid);pages.appendChild(page);
  }
}
function escapeHtml(str){return String(str??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showBuilder(){ $("builderView").hidden=false;$("sheetView").hidden=true;$("builderTabBtn").className="btn active-tab";$("sheetTabBtn").className="btn ghost";window.scrollTo(0,0)}
function showSheet(){renderSheet();$("builderView").hidden=true;$("sheetView").hidden=false;$("builderTabBtn").className="btn ghost";$("sheetTabBtn").className="btn active-tab";window.scrollTo(0,0)}

function bind(){
  FIELDS.forEach(id=>{const el=$(id);if(!el)return;["input","change"].forEach(ev=>el.addEventListener(ev,()=>{current()[id]=el.value;renderDerived();renderSheet();saveState()}))});
  [["projectName","name"],["projectAspect","aspect"],["projectStyle","style"]].forEach(([id,key])=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>{state.project[key]=$(id).value;renderDerived();renderSheet();saveState()}))});
  $("addShotBtn").onclick=addShot;$("mobileAddBtn").onclick=addShot;
  $("duplicateShotBtn").onclick=()=>{const copy=JSON.parse(JSON.stringify(current()));copy.shotNo=Math.max(...state.shots.map(s=>Number(s.shotNo)||0))+1;state.shots.splice(state.active+1,0,copy);state.active++;render();saveState()};
  $("deleteShotBtn").onclick=()=>{if(state.shots.length===1){alert("At least one shot must remain.");return}state.shots.splice(state.active,1);state.active=Math.max(0,state.active-1);render();saveState()};
  $("prevShotBtn").onclick=()=>{if(state.active>0){state.active--;render();saveState();window.scrollTo({top:0,behavior:"smooth"})}};
  $("nextShotBtn").onclick=()=>{if(state.active<state.shots.length-1){state.active++;render();saveState();window.scrollTo({top:0,behavior:"smooth"})}};
  $("newProjectBtn").onclick=()=>{if(confirm("Create a new project and clear the current one?")){state={project:{name:"New Project",aspect:"3:4 Portrait",style:"Storyboard B&W"},shots:[blankShot(1)],active:0};render();saveState()}};
  $("exportBtn").onclick=exportJSON;$("importInput").onchange=importJSON;$("frameImageInput").onchange=loadImage;
  $("removeImageBtn").onclick=()=>{current().image=null;render();saveState()};
  document.querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>{$(b.dataset.focus).focus();$(b.dataset.focus).scrollIntoView({behavior:"smooth",block:"center"})});
  $("builderTabBtn").onclick=showBuilder;$("sheetTabBtn").onclick=showSheet;$("mobileSheetBtn").onclick=showSheet;
  $("shotsPerPage").onchange=renderSheet;$("printSheetBtn").onclick=()=>window.print();
}
function addShot(){const no=Math.max(0,...state.shots.map(s=>Number(s.shotNo)||0))+1;state.shots.push(blankShot(no));state.active=state.shots.length-1;showBuilder();render();saveState()}
function exportJSON(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(state.project.name||"storyboard-project")+".json";a.click();URL.revokeObjectURL(a.href)}
function importJSON(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x.shots||!Array.isArray(x.shots))throw new Error();state=x;state.active=Math.min(state.active||0,state.shots.length-1);render();saveState()}catch(err){alert("Invalid JSON file.")}};reader.readAsText(file);e.target.value=""}
function loadImage(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{current().image=reader.result;render();saveState()};reader.readAsDataURL(file);e.target.value=""}

initOptions();bind();render();showBuilder();
