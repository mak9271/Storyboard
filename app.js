const OPTIONS = {
  shotSize:["ECU · Extreme Close Up","CU · Close Up","MCU · Medium Close Up","MS · Medium Shot","MLS · Medium Long Shot","WS · Wide Shot","EWS · Extreme Wide Shot","OTS · Over The Shoulder","POV · Point of View","Insert","Top Shot"],
  angle:["Eye Level","High Angle","Low Angle","Top / Bird's Eye","Dutch Angle","Ground Level","Overhead"],
  cameraHeight:["هم‌سطح چشم","هم‌سطح سینه","هم‌سطح کمر","روی میز","نزدیک زمین","بالای سر","سفارشی"],
  lens:["18mm","24mm","28mm","35mm","40mm","50mm","65mm","85mm","100mm","135mm","Wide","Normal","Telephoto"],
  focus:["Shallow Focus","Deep Focus","Rack Focus","Selective Focus","Soft Focus","Split Diopter","Auto / نامشخص"],
  movement:["Static","Pan Left","Pan Right","Tilt Up","Tilt Down","Dolly In","Dolly Out","Tracking Left","Tracking Right","Push In","Pull Out","Crane / Jib","Handheld","Zoom In","Zoom Out","Orbit","Whip Pan"],
  composition:["Centered / متقارن","Rule of Thirds","Subject Left","Subject Right","Negative Space Left","Negative Space Right","Foreground Framing","Layered Depth","Silhouette","Two Shot","Custom"],
  timeOfDay:["شب","صبح","طلوع","روز","غروب","گرگ‌ومیش","نامشخص"],
  lightSource:["شمع","نور پنجره","ماه","خورشید","مشعل","چراغ عملی داخل صحنه","نور مصنوعی خارج قاب","ترکیبی","نامشخص"],
  lightDirection:["روبرو","پشت","سمت چپ دوربین","سمت راست دوربین","بالا","پایین","Backlight","Side Light","3/4 Light","نامشخص"],
  lightQuality:["Hard","Soft","Low Key","High Key","High Contrast","Diffused","Flicker","Silhouette","نامشخص"],
  transitionIn:["Cut","Match Cut","Hard Cut","J Cut","L Cut","Dissolve","Fade In","Whip Transition","From Black"],
  transitionOut:["Cut","Match Cut","Hard Cut","J Cut","L Cut","Dissolve","Fade Out","Whip Transition","To Black"]
};

const FIELDS = ["sceneNo","shotNo","duration","shotSize","angle","cameraHeight","lens","focus","movement","startEnd","composition","summary","subject","description","performance","subjectMovement","costume","timeOfDay","location","lightSource","lightDirection","lightQuality","lighting","props","dialogue","voiceOver","sfx","music","transitionIn","transitionOut","notes"];

const $ = id => document.getElementById(id);

let state = loadState() || {
  project:{name:"روزنه",aspect:"3:4 عمودی",style:"Storyboard B&W"},
  shots:[blankShot(1)],
  active:0
};

function blankShot(no){
  return {
    sceneNo:1, shotNo:no, duration:"", shotSize:"CU · Close Up", angle:"Eye Level",
    cameraHeight:"هم‌سطح چشم", lens:"50mm", focus:"Shallow Focus", movement:"Static",
    startEnd:"", composition:"Centered / متقارن", summary:"", subject:"", description:"",
    performance:"", subjectMovement:"", costume:"", timeOfDay:"شب", location:"",
    lightSource:"شمع", lightDirection:"سمت چپ دوربین", lightQuality:"Low Key",
    lighting:"", props:"", dialogue:"", voiceOver:"", sfx:"", music:"",
    transitionIn:"Cut", transitionOut:"Cut", notes:"", image:null
  };
}

function initOptions(){
  Object.entries(OPTIONS).forEach(([id,vals])=>{
    const el=$(id); el.innerHTML="";
    vals.forEach(v=>{ const o=document.createElement("option"); o.value=v;o.textContent=v;el.appendChild(o);});
  });
}
function saveState(){
  localStorage.setItem("storyboard-shot-builder-v1", JSON.stringify(state));
  $("saveState").textContent="ذخیره شد ✓";
  clearTimeout(saveState.t); saveState.t=setTimeout(()=>$("saveState").textContent="ذخیره خودکار فعال است",1000);
}
function loadState(){try{return JSON.parse(localStorage.getItem("storyboard-shot-builder-v1"));}catch(e){return null}}
function current(){return state.shots[state.active]}

function render(){
  const s=current(); if(!s)return;
  $("projectName").value=state.project.name;
  $("projectAspect").value=state.project.aspect;
  $("projectStyle").value=state.project.style;
  FIELDS.forEach(id=>{if($(id)) $(id).value=s[id] ?? ""});
  $("shotKicker").textContent=`SCENE ${String(s.sceneNo).padStart(2,"0")} · SHOT ${String(s.shotNo).padStart(2,"0")}`;
  $("shotTitle").textContent=`پلان ${s.shotNo}`;
  $("quickSize").textContent=shortValue(s.shotSize);
  $("quickAngle").textContent=s.angle;
  $("quickLens").textContent=s.lens;
  $("quickMove").textContent=s.movement;
  $("frameMeta").textContent=`${state.project.aspect} · ${shortValue(s.shotSize)} · ${s.angle}`;
  renderFrame(); renderList(); applyAspect();
}
function shortValue(v){return (v||"").split(" · ")[0]}

function renderList(){
  const wrap=$("shotList"); wrap.innerHTML="";
  state.shots.forEach((s,i)=>{
    const b=document.createElement("button"); b.className="shot-item"+(i===state.active?" active":"");
    const thumb=document.createElement("span"); thumb.className="shot-thumb";
    if(s.image) thumb.style.backgroundImage=`url(${s.image})`;
    const txt=document.createElement("span");
    txt.innerHTML=`<strong>پلان ${s.shotNo}</strong><small>Scene ${s.sceneNo} · ${shortValue(s.shotSize)} · ${s.duration||"بدون زمان"}</small>`;
    b.append(thumb,txt); b.onclick=()=>{state.active=i;render();saveState()}; wrap.appendChild(b);
  });
}
function renderFrame(){
  const s=current(), img=$("frameImage"), ph=document.querySelector(".frame-placeholder");
  if(s.image){img.src=s.image;img.hidden=false;ph.hidden=true;$("removeImageBtn").hidden=false}
  else{img.hidden=true;img.removeAttribute("src");ph.hidden=false;$("removeImageBtn").hidden=true}
}
function applyAspect(){
  const f=$("storyFrame"); f.className="story-frame";
  const a=state.project.aspect;
  f.classList.add(a.startsWith("3:4")?"aspect-3-4":a.startsWith("9:16")?"aspect-9-16":a==="4:3"?"aspect-4-3":a==="16:9"?"aspect-16-9":"aspect-cinema");
}
function bind(){
  FIELDS.forEach(id=>{
    const el=$(id); if(!el)return;
    el.addEventListener("input",()=>{current()[id]=el.value;renderDerived();saveState()});
    el.addEventListener("change",()=>{current()[id]=el.value;renderDerived();saveState()});
  });
  ["projectName","projectAspect","projectStyle"].forEach(id=>{
    $(id).addEventListener("input",()=>{
      state.project[id==="projectName"?"name":id==="projectAspect"?"aspect":"style"]=$(id).value;
      renderDerived();saveState();
    });
    $(id).addEventListener("change",()=>{
      state.project[id==="projectName"?"name":id==="projectAspect"?"aspect":"style"]=$(id).value;
      renderDerived();saveState();
    });
  });

  $("addShotBtn").onclick=()=>{const no=Math.max(0,...state.shots.map(s=>Number(s.shotNo)||0))+1;state.shots.push(blankShot(no));state.active=state.shots.length-1;render();saveState()};
  $("duplicateShotBtn").onclick=()=>{const copy=JSON.parse(JSON.stringify(current()));copy.shotNo=Math.max(...state.shots.map(s=>Number(s.shotNo)||0))+1;state.shots.splice(state.active+1,0,copy);state.active++;render();saveState()};
  $("deleteShotBtn").onclick=()=>{if(state.shots.length===1){alert("حداقل یک پلان باید باقی بماند.");return}state.shots.splice(state.active,1);state.active=Math.max(0,state.active-1);render();saveState()};
  $("prevShotBtn").onclick=()=>{if(state.active>0){state.active--;render();saveState()}};
  $("nextShotBtn").onclick=()=>{if(state.active<state.shots.length-1){state.active++;render();saveState()}};
  $("newProjectBtn").onclick=()=>{if(confirm("پروژه فعلی پاک و پروژه جدید ساخته شود؟")){state={project:{name:"پروژه جدید",aspect:"3:4 عمودی",style:"Storyboard B&W"},shots:[blankShot(1)],active:0};render();saveState()}};
  $("printBtn").onclick=()=>window.print();
  $("exportBtn").onclick=exportJSON;
  $("importInput").onchange=importJSON;
  $("frameImageInput").onchange=loadImage;
  $("removeImageBtn").onclick=()=>{current().image=null;renderFrame();renderList();saveState()};
  document.querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>{$(b.dataset.focus).focus();$(b.dataset.focus).scrollIntoView({behavior:"smooth",block:"center"})});
}
function renderDerived(){
  const s=current();
  $("shotKicker").textContent=`SCENE ${String(s.sceneNo).padStart(2,"0")} · SHOT ${String(s.shotNo).padStart(2,"0")}`;
  $("shotTitle").textContent=`پلان ${s.shotNo}`;
  $("quickSize").textContent=shortValue(s.shotSize);$("quickAngle").textContent=s.angle;$("quickLens").textContent=s.lens;$("quickMove").textContent=s.movement;
  $("frameMeta").textContent=`${state.project.aspect} · ${shortValue(s.shotSize)} · ${s.angle}`;applyAspect();renderList();
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(state.project.name||"storyboard-project")+".json";a.click();URL.revokeObjectURL(a.href);
}
function importJSON(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x.shots||!Array.isArray(x.shots))throw new Error();state=x;state.active=Math.min(state.active||0,state.shots.length-1);render();saveState()}catch(err){alert("فایل JSON معتبر نیست.")}};reader.readAsText(file);e.target.value="";
}
function loadImage(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{current().image=reader.result;renderFrame();renderList();saveState()};reader.readAsDataURL(file);e.target.value="";
}

initOptions();bind();render();
