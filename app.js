// Storyboard Shot Builder v3.5 Production Management
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
const SHOT_FIELDS = ["shotNo","duration","shotSize","angle","cameraHeight","lens","focus","movement","startEnd","composition","summary","subject","description","performance","subjectMovement","costume","timeOfDay","location","lightSource","lightDirection","lightQuality","lighting","props","dialogue","voiceOver","sfx","music","transitionIn","transitionOut","notes"];
const $ = id => document.getElementById(id);
const cfg = window.APP_CONFIG || {};
const cloudConfigured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const sb = cloudConfigured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;

let app = {
  mode: "local",
  session: null,
  profile: null,
  projects: [],
  current: null,
  activeSceneId: null,
  activeShotId: null,
  sheetOpen: false,
  realtimeChannel: null,
  permissions: fullPermissions(),
  isOwner: true,
  pendingInvite: new URLSearchParams(location.search).get("invite"),
  projectSearch: "",
  projectFilter: "all",
  projectFolder: "all",
  detailsProjectId: null,
  shotClipboard: null
};
let autosaveTimer = null;

function uid(){return (crypto.randomUUID ? crypto.randomUUID() : "id-"+Date.now()+"-"+Math.random().toString(16).slice(2))}
function fullPermissions(){return {project_settings:true,scenes:true,shots:true,media:true,members:true}}
function blankPermissions(){return {project_settings:false,scenes:false,shots:false,media:false,members:false}}
function editorPermissions(){return {project_settings:false,scenes:true,shots:true,media:true,members:false}}
function permissionPreset(name){return name==="viewer"?blankPermissions():name==="editor"?editorPermissions():readPermissionUI()}
function blankShot(no=1){return {id:uid(),shotNo:no,duration:"",shotSize:"CU · Close Up",angle:"Eye Level",cameraHeight:"Eye Level",lens:"50mm",focus:"Shallow Focus",movement:"Static",startEnd:"",composition:"Centered / Symmetrical",summary:"",subject:"",description:"",performance:"",subjectMovement:"",costume:"",timeOfDay:"Night",location:"",lightSource:"Candle",lightDirection:"Camera Left",lightQuality:"Low Key",lighting:"",props:"",dialogue:"",voiceOver:"",sfx:"",music:"",transitionIn:"Cut",transitionOut:"Cut",notes:"",aiPromptOverride:"",aiStatus:"idle",aiError:"",aiMode:"storyboard_sketch_bw",aiVariations:[],aiLastPrompt:"",aiLastGeneratedAt:"",image:null,imagePath:null,position:no}}
function blankScene(no=1){return {id:uid(),number:no,title:`Scene ${no}`,description:"",position:no,collapsed:false,shots:[blankShot(1)]}}
function blankProject(name="Untitled Storyboard"){return {id:uid(),name,aspect:"3:4 Portrait",aspectWidth:3,aspectHeight:4,style:"Storyboard B&W",owner_id:null,role:"owner",position:0,isFavorite:false,folder:"General",tags:[],metadata:{director:"",writer:"",production:"",status:"Planning",notes:""},scenes:[blankScene(1)],updated_at:new Date().toISOString()}}
function deepClone(x){return JSON.parse(JSON.stringify(x))}
function projectMeta(p){return {director:"",writer:"",production:"",status:"Planning",notes:"",...(p?.metadata||{})}}
function shotDbData(s){const data={...s};delete data.id;delete data.image;delete data.imagePath;return data}
function currentScene(){return app.current?.scenes.find(s=>s.id===app.activeSceneId) || app.current?.scenes[0] || null}
function currentShot(){const sc=currentScene(); return sc?.shots.find(s=>s.id===app.activeShotId) || sc?.shots[0] || null}
function allShots(){return (app.current?.scenes||[]).flatMap(scene=>scene.shots.map(shot=>({scene,shot})))}
function shortValue(v){return (v||"").split(" · ")[0]}
function escapeHtml(str){return String(str??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function show(el, yes=true){if(el) el.hidden=!yes}
function setMsg(id,msg,type=""){const el=$(id); if(!msg){el.hidden=true;el.textContent="";return} el.hidden=false;el.textContent=msg;el.className="notice"+(type?` ${type}`:"")}
function can(key){return app.isOwner || !!app.permissions?.[key]}

function initOptions(){
  Object.entries(OPTIONS).forEach(([id,vals])=>{
    const el=$(id); if(!el)return; el.innerHTML="";
    vals.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)})
  });
}
function getLocalProjects(){
  try{
    const v3=JSON.parse(localStorage.getItem("storyboard-v3-projects")||"null");
    if(Array.isArray(v3)&&v3.length)return v3;
    const old=JSON.parse(localStorage.getItem("storyboard-shot-builder-v2")||localStorage.getItem("storyboard-shot-builder-v1")||"null");
    if(old?.shots?.length){
      const p=blankProject(old.project?.name||"Imported Storyboard");
      p.aspect=(old.project?.aspect||"3:4 Portrait").replace("3:4 عمودی","3:4 Portrait").replace("9:16 عمودی","9:16 Portrait");
      p.style=old.project?.style||"Storyboard B&W";
      p.scenes=[{id:uid(),number:1,title:"Scene 1",description:"",position:1,shots:old.shots.map((x,i)=>({...blankShot(i+1),...x,id:uid(),shotNo:Number(x.shotNo||i+1)}))}];
      localStorage.setItem("storyboard-v3-projects",JSON.stringify([p]));
      return [p];
    }
  }catch(e){}
  return [blankProject("Roozaneh")];
}
function saveLocal(){
  if(app.mode!=="local")return;
  app.current.updated_at=new Date().toISOString();
  const idx=app.projects.findIndex(p=>p.id===app.current.id);
  if(idx>=0)app.projects[idx]=app.current; else app.projects.push(app.current);
  localStorage.setItem("storyboard-v3-projects",JSON.stringify(app.projects));
}
function selectFirst(){
  const sc=app.current?.scenes?.[0]; app.activeSceneId=sc?.id||null; app.activeShotId=sc?.shots?.[0]?.id||null
}

/* ---------- AUTH / APP START ---------- */
async function start(){
  initOptions(); bind();
  if(!cloudConfigured){
    $("cloudNotConfigured").hidden=false;
    showAuth();
    return;
  }
  const {data:{session}}=await sb.auth.getSession();
  app.session=session;
  sb.auth.onAuthStateChange(async(_event,session)=>{
    app.session=session;
    if(session){await afterLogin()} else {app.profile=null;showAuth()}
  });
  if(session) await afterLogin(); else showAuth();
}
function showAuth(){
  show($("authView")); show($("projectsView"),false); show($("editorView"),false);
}
function showProjects(){
  show($("authView"),false); show($("projectsView")); show($("editorView"),false);
}
function showEditor(){
  show($("authView"),false); show($("projectsView"),false); show($("editorView"));
  renderEditor();
}
async function afterLogin(){
  app.mode="cloud";
  await loadProfile();
  await loadCloudProjects();
  showProjects();
  if(app.pendingInvite) await acceptPendingInvite();
}
async function loadProfile(){
  if(!sb||!app.session)return;
  const {data}=await sb.from("profiles").select("id,username,display_name").eq("id",app.session.user.id).maybeSingle();
  app.profile=data||{id:app.session.user.id,username:"",display_name:""};
  $("accountDisplayName").textContent=app.profile.display_name||app.profile.username||"Account";
  $("accountUsername").textContent=app.profile.username?`@${app.profile.username}`:"";
  $("accountEmail").textContent=app.session.user.email||"";
}
function toggleAuthTab(tab){
  const login=tab==="login";
  $("loginTabBtn").classList.toggle("active",login);$("signupTabBtn").classList.toggle("active",!login);
  $("loginForm").hidden=!login;$("signupForm").hidden=login;setMsg("authMessage","");
}
let loginKind="email";
function setLoginKind(kind){
  loginKind=kind;const isEmail=kind==="email";
  $("loginEmailMode").classList.toggle("active",isEmail);$("loginUsernameMode").classList.toggle("active",!isEmail);
  $("loginIdentityLabel").textContent=isEmail?"Email":"Username";$("loginIdentity").placeholder=isEmail?"you@example.com":"yourname";
}
async function doLogin(e){
  e.preventDefault(); if(!cloudConfigured)return;
  setMsg("authMessage","Signing in...");
  const identity=$("loginIdentity").value.trim(),password=$("loginPassword").value;
  try{
    if(loginKind==="email"){
      const {error}=await sb.auth.signInWithPassword({email:identity,password}); if(error)throw error;
    }else{
      const {data,error}=await sb.functions.invoke("username-login",{body:{username:identity,password}});
      if(error)throw error;
      if(!data?.session?.access_token)throw new Error(data?.error||"Username sign-in failed.");
      const {error:setErr}=await sb.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token}); if(setErr)throw setErr;
    }
    setMsg("authMessage","");
  }catch(err){setMsg("authMessage",err.message||"Sign-in failed.","warning")}
}
async function doSignup(e){
  e.preventDefault(); if(!cloudConfigured)return;
  const username=$("signupUsername").value.trim().toLowerCase(),email=$("signupEmail").value.trim(),password=$("signupPassword").value,display_name=$("signupDisplayName").value.trim();
  if(!/^[a-z0-9_.-]{3,30}$/.test(username)){setMsg("authMessage","Username may contain only letters, numbers, dot, underscore and hyphen.","warning");return}
  try{
    const {data:available,error:availErr}=await sb.rpc("username_available",{p_username:username});
    if(availErr)throw availErr;if(!available){setMsg("authMessage","That username is already taken.","warning");return}
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{username,display_name},emailRedirectTo:cfg.SITE_URL||location.origin}});
    if(error)throw error;
    if(!data.session)setMsg("authMessage","Account created. Check your email to confirm your address.");
  }catch(err){setMsg("authMessage",err.message||"Sign-up failed.","warning")}
}
async function forgotPassword(){
  if(!cloudConfigured)return;
  const email=prompt("Enter your email address:"); if(!email)return;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:cfg.SITE_URL||location.origin});
  setMsg("authMessage",error?error.message:"Password reset email sent.",error?"warning":"");
}
function continueOffline(){
  app.mode="local";app.projects=getLocalProjects();app.current=app.projects[0];selectFirst();app.permissions=fullPermissions();app.isOwner=true;showEditor()
}
async function logout(){if(sb&&app.mode==="cloud")await sb.auth.signOut();else showAuth()}

/* ---------- CLOUD PROJECTS ---------- */
function normalizeProjectRecord(p){
  return {...p,
    aspectWidth:Number(p.aspect_width||p.aspectWidth||3),
    aspectHeight:Number(p.aspect_height||p.aspectHeight||4),
    position:Number(p.position||0),
    isFavorite:!!(p.is_favorite??p.isFavorite),
    folder:p.folder||"General",
    tags:Array.isArray(p.tags)?p.tags:[],
    metadata:projectMeta(p)
  }
}
async function loadCloudProjects(){
  const {data,error}=await sb.from("projects").select("id,owner_id,name,aspect,aspect_width,aspect_height,style,updated_at,created_at,position,is_favorite,folder,tags,metadata");
  if(error){console.error(error);return}
  const mine=(data||[]).filter(p=>p.owner_id===app.session?.user?.id).sort((a,b)=>(Number(a.position||0)-Number(b.position||0)) || new Date(b.updated_at||0)-new Date(a.updated_at||0));
  const shared=(data||[]).filter(p=>p.owner_id!==app.session?.user?.id).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  app.projects=[...mine,...shared].map(normalizeProjectRecord);
  renderProjects();
}
function projectMatchesSearch(p){
  const q=(app.projectSearch||"").trim().toLowerCase();
  if(!q)return true;
  const m=projectMeta(p);
  return [p.name,p.folder,...(p.tags||[]),m.director,m.writer,m.production,m.status,m.notes].join(" ").toLowerCase().includes(q)
}
function filteredProjects(){
  const now=Date.now(),recentMs=30*24*60*60*1000;
  return (app.projects||[]).filter(p=>{
    if(!projectMatchesSearch(p))return false;
    if(app.projectFolder!=="all" && (p.folder||"General")!==app.projectFolder)return false;
    if(app.projectFilter==="favorites" && !p.isFavorite)return false;
    if(app.projectFilter==="recent" && now-new Date(p.updated_at||0).getTime()>recentMs)return false;
    if(app.projectFilter==="shared" && p.owner_id===app.session?.user?.id)return false;
    return true;
  })
}
function refreshFolderFilter(){
  const el=$("projectFolderFilter"); if(!el)return;
  const folders=[...new Set((app.projects||[]).map(p=>p.folder||"General"))].sort((a,b)=>a.localeCompare(b));
  const keep=app.projectFolder;
  el.innerHTML='<option value="all">All folders</option>'+folders.map(f=>`<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
  el.value=folders.includes(keep)?keep:"all"; app.projectFolder=el.value;
}
function renderProjects(){
  refreshFolderFilter();
  const grid=$("projectsGrid");grid.innerHTML="";
  const list=filteredProjects();
  const empty=$("projectsEmpty");empty.hidden=list.length>0;
  if(!list.length){
    $("projectsEmptyTitle").textContent=(app.projects||[]).length?"No matching projects":"No projects yet";
    $("projectsEmptyCopy").textContent=(app.projects||[]).length?"Try another search or filter.":"Create your first storyboard project.";
  }
  list.forEach(p=>{
    const owner=p.owner_id===app.session?.user?.id,m=projectMeta(p);
    const card=document.createElement("article");card.className="project-tile project-manage-card";card.dataset.projectId=p.id;
    const tags=(p.tags||[]).slice(0,3).map(t=>`<span class="tag-chip">${escapeHtml(t)}</span>`).join("");
    card.innerHTML=`
      <div class="project-tile-top">
        <div class="project-role">${owner?"Owner":"Shared"}</div>
        <button type="button" class="favorite-btn ${p.isFavorite?"active":""}" title="${owner?"Favorite":"Favorites are available for owned projects"}" ${owner?"":"disabled"}>${p.isFavorite?"★":"☆"}</button>
      </div>
      <button type="button" class="project-open-area">
        <div class="project-folder-label">${escapeHtml(p.folder||"General")}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(projectAspectText(p))} · ${escapeHtml(p.style||"")}</p>
        ${m.status?`<div class="project-status">${escapeHtml(m.status)}</div>`:""}
        ${tags?`<div class="tag-row">${tags}</div>`:""}
        <p class="project-updated">Updated ${new Date(p.updated_at||Date.now()).toLocaleDateString()}</p>
      </button>
      <div class="project-card-actions">
        <button type="button" class="mini-btn details">Details</button>
        <button type="button" class="mini-btn duplicate">Duplicate</button>
        ${owner?'<button type="button" class="mini-btn rename">Rename</button><button type="button" class="mini-btn danger-lite delete">Delete</button>':''}
      </div>`;
    card.querySelector(".project-open-area").onclick=()=>openCloudProject(p.id);
    card.querySelector(".details").onclick=()=>openProjectDetails(p.id);
    card.querySelector(".duplicate").onclick=()=>duplicateProject(p.id);
    if(owner){
      card.querySelector(".favorite-btn").onclick=()=>toggleFavorite(p.id);
      card.querySelector(".rename").onclick=()=>renameProject(p.id);
      card.querySelector(".delete").onclick=()=>deleteProject(p.id);
    }
    grid.appendChild(card)
  });
  setupProjectDrag();
}
async function createCloudProject(){
  const name=prompt("Project name:","Untitled Storyboard");if(!name)return;
  const myPositions=(app.projects||[]).filter(p=>p.owner_id===app.session.user.id).map(p=>Number(p.position||0));
  const position=Math.max(0,...myPositions)+1;
  const {data:p,error}=await sb.from("projects").insert({owner_id:app.session.user.id,name,aspect:"3:4 Portrait",aspect_width:3,aspect_height:4,style:"Storyboard B&W",position,is_favorite:false,folder:"General",tags:[],metadata:{director:"",writer:"",production:"",status:"Planning",notes:""}}).select().single();
  if(error){alert(error.message);return}
  const {data:s,error:se}=await sb.from("scenes").insert({project_id:p.id,scene_number:1,title:"Scene 1",description:"",position:1,collapsed:false}).select().single(); if(se){alert(se.message);return}
  const shot=blankShot(1);
  const {error:shErr}=await sb.from("shots").insert({project_id:p.id,scene_id:s.id,shot_number:1,position:1,data:shot});if(shErr){alert(shErr.message);return}
  await loadCloudProjects();await openCloudProject(p.id)
}
async function openCloudProject(id){
  unsubscribeRealtime();
  const {data:p,error}=await sb.from("projects").select("*").eq("id",id).single();if(error){alert(error.message);return}
  const {data:scenes,error:se}=await sb.from("scenes").select("*").eq("project_id",id).order("position");if(se){alert(se.message);return}
  const {data:shots,error:sh}=await sb.from("shots").select("*").eq("project_id",id).order("position");if(sh){alert(sh.message);return}
  const signed=await Promise.all((shots||[]).map(async row=>{
    let image=null;if(row.image_path){const {data}=await sb.storage.from("storyboards").createSignedUrl(row.image_path,604800);image=data?.signedUrl||null}
    const shotData={...blankShot(row.shot_number),...(row.data||{})};
    if(Array.isArray(shotData.aiVariations)){
      shotData.aiVariations=await Promise.all(shotData.aiVariations.map(async v=>{
        if(v?.path){const {data}=await sb.storage.from("storyboards").createSignedUrl(v.path,604800);return {...v,url:data?.signedUrl||v.url||null}}
        return v
      }))
    }
    return {...shotData,id:row.id,shotNo:row.shot_number,position:row.position,imagePath:row.image_path,image}
  }));
  const sceneObjects=(scenes||[]).map(s=>({id:s.id,number:s.scene_number,title:s.title||`Scene ${s.scene_number}`,description:s.description||"",position:Number(s.position||s.scene_number||1),collapsed:!!s.collapsed,shots:signed.filter(x=>(shots||[]).find(r=>r.id===x.id)?.scene_id===s.id)}));
  const pp=normalizeProjectRecord(p);
  app.current={id:p.id,owner_id:p.owner_id,name:p.name,aspect:p.aspect||"3:4 Portrait",aspectWidth:pp.aspectWidth,aspectHeight:pp.aspectHeight,style:p.style||"Storyboard B&W",position:pp.position,isFavorite:pp.isFavorite,folder:pp.folder,tags:pp.tags,metadata:pp.metadata,updated_at:p.updated_at,scenes:sceneObjects};
  app.isOwner=p.owner_id===app.session.user.id;
  if(app.isOwner){app.permissions=fullPermissions()}else{
    const {data:m}=await sb.from("project_members").select("permissions").eq("project_id",id).eq("user_id",app.session.user.id).maybeSingle();app.permissions=m?.permissions||blankPermissions()
  }
  selectFirst();showEditor();subscribeRealtime()
}
function subscribeRealtime(){
  if(!sb||app.mode!=="cloud"||!app.current)return;
  const pid=app.current.id;
  app.realtimeChannel=sb.channel(`project-${pid}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"projects",filter:`id=eq.${pid}`},()=>remoteRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"scenes",filter:`project_id=eq.${pid}`},()=>remoteRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"shots",filter:`project_id=eq.${pid}`},()=>remoteRefresh())
    .subscribe()
}
function unsubscribeRealtime(){if(sb&&app.realtimeChannel){sb.removeChannel(app.realtimeChannel);app.realtimeChannel=null}}
let refreshTimer=null;
function remoteRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(app.current)openCloudProject(app.current.id)},700)}

/* ---------- EDITOR RENDER ---------- */
function renderEditor(){
  if(!app.current)return;
  $("projectName").value=app.current.name||"";
  $("projectAspect").value=(["3:4 Portrait","9:16 Portrait","4:3","16:9","2.39:1","Custom"].includes(app.current.aspect)?app.current.aspect:"Custom");
  $("projectStyle").value=app.current.style||"Storyboard B&W";
  $("aspectWidth").value=app.current.aspectWidth||3;$("aspectHeight").value=app.current.aspectHeight||4;
  $("customAspectFields").hidden=$("projectAspect").value!=="Custom";
  if($("projectFolderBadge"))$("projectFolderBadge").textContent=app.current.folder||"General";
  renderSceneList();renderSceneSettings();renderShot();renderSheet();updateSheetButtons();applyPermissionLocks();renderAI()
}
function renderSceneList(){
  const wrap=$("sceneList");wrap.innerHTML="";
  const scenes=(app.current.scenes||[]).sort((a,b)=>a.position-b.position);
  scenes.forEach((scene,sceneIndex)=>{
    const group=document.createElement("div");group.className="scene-group"+(scene.id===app.activeSceneId?" active":"")+(scene.collapsed?" collapsed":"");
    const row=document.createElement("div");row.className="scene-row";
    row.innerHTML=`
      <button class="scene-select" type="button">
        <span class="scene-title-stack"><strong>Scene ${scene.number}</strong><small>${escapeHtml(scene.title||"")}</small></span>
        <span class="scene-count">${scene.shots.length} shots</span>
      </button>
      <div class="scene-actions">
        <button class="collapse-btn" type="button" title="Collapse / Expand">${scene.collapsed?"▶":"▼"}</button>
        <button class="scene-mini rename-scene" type="button" title="Rename">✎</button>
        <button class="scene-mini duplicate-scene" type="button" title="Duplicate">⧉</button>
        <button class="scene-mini move-scene-up" type="button" title="Move up" ${sceneIndex===0?"disabled":""}>↑</button>
        <button class="scene-mini move-scene-down" type="button" title="Move down" ${sceneIndex===scenes.length-1?"disabled":""}>↓</button>
      </div>`;
    row.querySelector(".scene-select").onclick=()=>{app.activeSceneId=scene.id;app.activeShotId=scene.shots[0]?.id||null;renderEditor()};
    row.querySelector(".collapse-btn").onclick=()=>toggleSceneCollapse(scene.id);
    row.querySelector(".rename-scene").onclick=()=>renameScene(scene.id);
    row.querySelector(".duplicate-scene").onclick=()=>duplicateScene(scene.id);
    row.querySelector(".move-scene-up").onclick=()=>moveScene(scene.id,-1);
    row.querySelector(".move-scene-down").onclick=()=>moveScene(scene.id,1);
    row.querySelectorAll(".rename-scene,.duplicate-scene,.move-scene-up,.move-scene-down").forEach(b=>b.disabled=b.disabled||!can("scenes"));
    const shots=document.createElement("div");shots.className="scene-shots";
    scene.shots.sort((a,b)=>a.position-b.position).forEach(shot=>{
      const b=document.createElement("button");b.className="shot-item"+(shot.id===app.activeShotId?" active":"");
      const th=document.createElement("span");th.className="shot-thumb";if(shot.image)th.style.backgroundImage=`url(${shot.image})`;
      const txt=document.createElement("span");txt.innerHTML=`<strong>Shot ${shot.shotNo}</strong><small>${shortValue(shot.shotSize)} · ${shot.duration||"No duration"}</small>`;
      b.append(th,txt);b.onclick=()=>{app.activeSceneId=scene.id;app.activeShotId=shot.id;renderEditor()};shots.appendChild(b)
    });
    group.append(row,shots);wrap.appendChild(group)
  })
}
function renderSceneSettings(){
  const s=currentScene();if(!s)return;$("sceneNumber").value=s.number;$("sceneTitle").value=s.title||"";$("sceneDescription").value=s.description||""
}
function renderShot(){
  const s=currentShot(),sc=currentScene();if(!s||!sc)return;
  SHOT_FIELDS.forEach(id=>{if($(id))$(id).value=s[id]??""});
  if($("aiPromptOverride"))$("aiPromptOverride").value=s.aiPromptOverride||"";
  $("shotKicker").textContent=`SCENE ${String(sc.number).padStart(2,"0")} · SHOT ${String(s.shotNo).padStart(2,"0")}`;
  $("shotTitle").textContent=`Shot ${s.shotNo}`;
  $("quickSize").textContent=shortValue(s.shotSize);$("quickAngle").textContent=s.angle;$("quickLens").textContent=s.lens;$("quickMove").textContent=s.movement;
  $("frameMeta").textContent=`${projectAspectText(app.current)} · ${shortValue(s.shotSize)} · ${s.angle}`;
  const f=$("storyFrame");f.style.aspectRatio=`${aspectNumbers(app.current).w}/${aspectNumbers(app.current).h}`;
  const img=$("frameImage"),ph=document.querySelector(".frame-placeholder");
  if(s.image){img.src=s.image;img.hidden=false;ph.hidden=true;$("removeImageBtn").hidden=false}else{img.hidden=true;img.removeAttribute("src");ph.hidden=false;$("removeImageBtn").hidden=true}
  renderAI()
}
function projectAspectText(p){
  if((p.aspect||"")==="Custom")return `${cleanNum(p.aspectWidth||3)}:${cleanNum(p.aspectHeight||4)} Custom`;
  return p.aspect||"3:4 Portrait"
}
function cleanNum(x){const n=Number(x);return Number.isInteger(n)?String(n):String(n).replace(/0+$/,"").replace(/\.$/,"")}
function aspectNumbers(p){
  if(p.aspect==="Custom")return {w:Math.max(.1,Number(p.aspectWidth)||3),h:Math.max(.1,Number(p.aspectHeight)||4)};
  const m=String(p.aspect||"3:4").match(/([\d.]+)\s*:\s*([\d.]+)/);return m?{w:Number(m[1]),h:Number(m[2])}:{w:3,h:4}
}
function storyboardMediumText(){return app.current?.style||"Storyboard B&W"}
function buildShotPrompt(shot=currentShot(), scene=currentScene(), project=app.current){
  if(!shot||!scene||!project)return "";
  if((shot.aiPromptOverride||"").trim())return shot.aiPromptOverride.trim();
  const parts=[
    "black and white storyboard sketch",
    "clean cinematic line drawing",
    "minimal shading",
    `aspect ratio ${projectAspectText(project)}`,
    `scene ${scene.number}: ${scene.title||""}`,
    shot.summary && `shot summary: ${shot.summary}`,
    `shot size ${shortValue(shot.shotSize)}`,
    `camera angle ${shot.angle}`,
    `lens ${shot.lens}`,
    shot.composition && `composition ${shot.composition}`,
    shot.focus && `focus ${shot.focus}`,
    shot.movement && `camera movement ${shot.movement}`,
    shot.subject && `subject ${shot.subject}`,
    shot.description && `visual description: ${shot.description}`,
    shot.performance && `emotion/performance: ${shot.performance}`,
    shot.subjectMovement && `subject movement: ${shot.subjectMovement}`,
    shot.costume && `costume/appearance: ${shot.costume}`,
    shot.location && `location: ${shot.location}`,
    shot.timeOfDay && `time of day: ${shot.timeOfDay}`,
    shot.lightSource && `light source: ${shot.lightSource}`,
    shot.lightDirection && `light direction: ${shot.lightDirection}`,
    shot.lightQuality && `light quality: ${shot.lightQuality}`,
    shot.lighting && `lighting notes: ${shot.lighting}`,
    shot.props && `props/set elements: ${shot.props}`,
    shot.notes && `important notes: ${shot.notes}`,
    "single storyboard frame",
    "no text labels inside image"
  ].filter(Boolean);
  return parts.join(", ")
}
function renderAI(){
  const s=currentShot();if(!s||!$("aiStatusBadge"))return;
  const status=(s.aiStatus||"idle").toLowerCase();
  const badge=$("aiStatusBadge");
  badge.textContent=status==="done"?"Done":status==="failed"?"Failed":status==="generating"?"Generating":"Idle";
  badge.className=`ai-badge ${status}`;
  const prompt=buildShotPrompt(s);
  s.aiLastPrompt=prompt;
  $("aiPromptPreview").textContent=prompt||"Prompt preview will appear here.";
  const errBox=$("aiErrorBox");
  if(s.aiError){errBox.hidden=false;errBox.textContent=s.aiError}else{errBox.hidden=true;errBox.textContent=""}
  const wrap=$("aiVariationsWrap"), grid=$("aiVariationsGrid");
  const vars=Array.isArray(s.aiVariations)?s.aiVariations:[];
  wrap.hidden=!vars.length; grid.innerHTML="";
  vars.forEach((v,i)=>{
    const card=document.createElement("div");card.className="ai-var-card";
    const safe=v?.url||"";
    card.innerHTML=`<img src="${safe}" alt="Variation ${i+1}"><div class="ai-var-actions"><button type="button" class="btn">Use as Final</button><button type="button" class="btn ghost">Open</button></div>`;
    const [useBtn, openBtn]=card.querySelectorAll("button");
    useBtn.onclick=()=>useVariationAsFinal(i);
    openBtn.onclick=()=>window.open(safe, '_blank');
    grid.appendChild(card)
  });
  const isGenerating=status==="generating";
  ["generateAiBtn","generateAiVarsBtn","clearAiVarsBtn","aiPromptOverride"].forEach(id=>{if($(id))$(id).disabled=isGenerating});
}
function dataUrlToBlob(dataUrl){
  const parts=dataUrl.split(',');
  const mime=(parts[0].match(/:(.*?);/)||[])[1]||'image/png';
  const binary=atob(parts[1]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime})
}
function b64ToBlob(b64,mime='image/png'){
  const binary=atob(b64); const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime})
}
async function uploadGeneratedBlob(blob, makeFinal=false, existingIndex=null){
  const s=currentShot();
  if(app.mode==='local'){
    const r=new FileReader();
    return await new Promise(resolve=>{r.onload=()=>resolve({url:r.result,path:null});r.readAsDataURL(blob)})
  }
  const ext=(blob.type||'image/png').includes('jpeg')?'jpg':'png';
  const kind=makeFinal?'final':'variation';
  const path=`${app.current.id}/${s.id}/ai-${kind}-${Date.now()}${existingIndex!==null?'-'+existingIndex:''}.${ext}`;
  const {error}=await sb.storage.from('storyboards').upload(path, blob, {upsert:true,contentType:blob.type||'image/png'});
  if(error)throw error;
  const {data}=await sb.storage.from('storyboards').createSignedUrl(path,604800);
  return {path,url:data?.signedUrl||null}
}
async function persistShotAfterAi(){
  const s=currentShot();
  if(app.mode==='local'){saveLocal();renderEditor();return}
  const data={...s};delete data.id;delete data.image;delete data.imagePath;
  const {error}=await sb.from('shots').update({image_path:s.imagePath||null,data}).eq('id',s.id);
  if(error)throw error;
}
async function generateStoryboard(mode='single'){
  const s=currentShot(), sc=currentScene(); if(!s||!sc)return;
  if(app.mode==='local'){alert('AI generation needs the cloud-connected version with Supabase Edge Functions.');return}
  if(!can('media')){alert('You do not have permission to generate or store media in this project.');return}
  s.aiStatus='generating'; s.aiError=''; renderAI();
  try{
    const prompt=buildShotPrompt(s,sc,app.current); s.aiLastPrompt=prompt;
    const {data,error}=await sb.functions.invoke('generate-storyboard',{body:{prompt,aspectRatio:projectAspectText(app.current),mode:modelMode(mode)}});
    if(error)throw error;
    const images=Array.isArray(data?.images)?data.images:[];
    if(!images.length)throw new Error('No images were returned by the AI function.');
    const uploaded=[];
    for(let i=0;i<images.length;i++){
      const item=images[i];
      const blob=item?.base64?b64ToBlob(item.base64,item.mimeType||'image/png'):item?.dataUrl?dataUrlToBlob(item.dataUrl):null;
      if(!blob)continue;
      const saved=await uploadGeneratedBlob(blob, false, i+1);
      uploaded.push(saved)
    }
    s.aiVariations=uploaded;
    if(uploaded[0]){
      s.image=uploaded[0].url;
      s.imagePath=uploaded[0].path;
    }
    s.aiStatus='done'; s.aiError=''; s.aiLastGeneratedAt=new Date().toISOString();
    await persistShotAfterAi();
    renderEditor()
  }catch(err){
    s.aiStatus='failed';
    s.aiError=err?.message||'AI generation failed.';
    renderAI()
  }
}
function modelMode(mode){return mode==='variations'?'variations':'single'}
async function useVariationAsFinal(index){
  const s=currentShot(); if(!Array.isArray(s.aiVariations)||!s.aiVariations[index])return;
  const chosen=s.aiVariations[index];
  s.image=chosen.url||null; s.imagePath=chosen.path||null; s.aiStatus='done'; s.aiError='';
  try{await persistShotAfterAi(); renderEditor()}catch(err){alert(err.message||'Could not set final image.')}
}
async function clearAiVariations(){
  const s=currentShot(); if(!s)return; if(!confirm('Clear AI variations for this shot?'))return;
  s.aiVariations=[]; s.aiStatus='idle'; s.aiError='';
  try{await persistShotAfterAi(); renderEditor()}catch(err){alert(err.message||'Could not clear variations.')}
}

function applyPermissionLocks(){
  const projectLocked=!can("project_settings"),sceneLocked=!can("scenes"),shotLocked=!can("shots"),mediaLocked=!can("media");
  ["projectName","projectAspect","projectStyle","aspectWidth","aspectHeight"].forEach(id=>$(id).disabled=projectLocked);
  $("projectDetailsBtn").disabled=projectLocked;
  $("sceneNumber").readOnly=true;$("sceneNumber").disabled=false;
  ["sceneTitle","sceneDescription"].forEach(id=>$(id).disabled=sceneLocked);
  ["addSceneBtn","deleteSceneBtn"].forEach(id=>$(id).disabled=sceneLocked);
  ["addShotBtn","mobileAddShotBtn","duplicateShotBtn","pasteShotBtn","moveShotUpBtn","moveShotDownBtn","deleteShotBtn"].forEach(id=>$(id).disabled=shotLocked);
  $("copyShotBtn").disabled=!currentShot();
  SHOT_FIELDS.forEach(id=>{if($(id))$(id).disabled=shotLocked});
  $("shotNo").readOnly=true;$("shotNo").disabled=false;
  $("frameImageInput").disabled=mediaLocked;$("chooseImageLabel").classList.toggle("permission-locked",mediaLocked);$("removeImageBtn").disabled=mediaLocked;
  $("collaborateBtn").hidden=!(app.isOwner||can("members"));
}

/* ---------- SAVING ---------- */
function queueSave(kind){
  if(app.mode==="local"){saveLocal();return}
  clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveCloud(kind),550)
}
async function saveCloud(kind){
  if(!sb||!app.current)return;
  if(kind==="project"&&can("project_settings")){
    await sb.from("projects").update({name:app.current.name,aspect:app.current.aspect,aspect_width:app.current.aspectWidth,aspect_height:app.current.aspectHeight,style:app.current.style,folder:app.current.folder||"General",tags:app.current.tags||[],metadata:projectMeta(app.current),is_favorite:!!app.current.isFavorite,updated_at:new Date().toISOString()}).eq("id",app.current.id)
  }else if(kind==="scene"&&can("scenes")){
    const s=currentScene();await sb.from("scenes").update({scene_number:s.number,title:s.title,description:s.description,position:s.position,collapsed:!!s.collapsed}).eq("id",s.id)
  }else if(kind==="shot"&&can("shots")){
    const s=currentShot();const data=shotDbData(s);
    await sb.from("shots").update({shot_number:Number(s.shotNo)||1,position:s.position,data}).eq("id",s.id)
  }
}
function onProjectChange(){
  if(!can("project_settings"))return;
  app.current.name=$("projectName").value;app.current.aspect=$("projectAspect").value;app.current.style=$("projectStyle").value;app.current.aspectWidth=Number($("aspectWidth").value)||3;app.current.aspectHeight=Number($("aspectHeight").value)||4;
  $("customAspectFields").hidden=app.current.aspect!=="Custom";renderShot();renderSheet();queueSave("project")
}
function onSceneChange(){
  if(!can("scenes"))return;const s=currentScene();if(!s)return;s.title=$("sceneTitle").value;s.description=$("sceneDescription").value;renderSceneList();renderShot();renderSheet();queueSave("scene")
}
function onShotChange(id){
  if(!can("shots")||id==="shotNo")return;const s=currentShot();if(!s)return;s[id]=$(id).value;renderShot();renderSceneList();renderSheet();queueSave("shot")
}

/* ---------- SCENE / SHOT CRUD ---------- */
function normalizeSceneOrder(){
  app.current.scenes.sort((a,b)=>a.position-b.position).forEach((s,i)=>{s.position=i+1;s.number=i+1});
}
function normalizeShotNumbers(scene){
  scene.shots.sort((a,b)=>a.position-b.position).forEach((shot,i)=>{shot.shotNo=i+1;shot.position=i+1});
}
async function persistSceneOrder(){
  normalizeSceneOrder();
  if(app.mode==="local"){saveLocal();renderEditor();return}
  await Promise.all(app.current.scenes.map(s=>sb.from("scenes").update({scene_number:s.number,position:s.position,collapsed:!!s.collapsed}).eq("id",s.id)));
  renderEditor();
}
async function persistShotOrder(scene){
  normalizeShotNumbers(scene);
  if(app.mode==="local"){saveLocal();renderEditor();return}
  await Promise.all(scene.shots.map(s=>sb.from("shots").update({shot_number:s.shotNo,position:s.position,data:shotDbData(s)}).eq("id",s.id)));
  renderEditor();
}
async function addScene(){
  if(!can("scenes"))return;const no=app.current.scenes.length+1,pos=no;
  if(app.mode==="local"){
    const s=blankScene(no);s.position=pos;app.current.scenes.push(s);normalizeSceneOrder();app.activeSceneId=s.id;app.activeShotId=s.shots[0].id;saveLocal();renderEditor();return
  }
  const {data:s,error}=await sb.from("scenes").insert({project_id:app.current.id,scene_number:no,title:`Scene ${no}`,description:"",position:pos,collapsed:false}).select().single();if(error){alert(error.message);return}
  const {data:sh,error:er}=await sb.from("shots").insert({project_id:app.current.id,scene_id:s.id,shot_number:1,position:1,data:blankShot(1)}).select().single();if(er){alert(er.message);return}
  await openCloudProject(app.current.id);app.activeSceneId=s.id;app.activeShotId=sh.id;renderEditor()
}
async function renameScene(sceneId){
  if(!can("scenes"))return;const s=app.current.scenes.find(x=>x.id===sceneId);if(!s)return;
  const title=prompt("Scene title:",s.title||`Scene ${s.number}`);if(title===null)return;s.title=title.trim()||`Scene ${s.number}`;
  if(app.mode==="cloud"){const {error}=await sb.from("scenes").update({title:s.title}).eq("id",s.id);if(error)return alert(error.message)}else saveLocal();
  renderEditor()
}
async function duplicateScene(sceneId){
  if(!can("scenes"))return;const source=app.current.scenes.find(x=>x.id===sceneId);if(!source)return;
  if(app.mode==="local"){
    const clone=deepClone(source);clone.id=uid();clone.title=`${source.title||`Scene ${source.number}`} Copy`;clone.position=source.position+.5;clone.collapsed=false;
    clone.shots=source.shots.map((s,i)=>({...deepClone(s),id:uid(),shotNo:i+1,position:i+1}));
    app.current.scenes.push(clone);normalizeSceneOrder();app.activeSceneId=clone.id;app.activeShotId=clone.shots[0]?.id||null;saveLocal();renderEditor();return
  }
  const {data:newScene,error}=await sb.from("scenes").insert({project_id:app.current.id,scene_number:source.number+1,title:`${source.title||`Scene ${source.number}`} Copy`,description:source.description||"",position:source.position+.5,collapsed:false}).select().single();if(error)return alert(error.message);
  for(const sh of source.shots.sort((a,b)=>a.position-b.position)){
    const data=shotDbData(sh);
    const {error:shotErr}=await sb.from("shots").insert({project_id:app.current.id,scene_id:newScene.id,shot_number:sh.shotNo,position:sh.position,image_path:sh.imagePath||null,data});
    if(shotErr)return alert(shotErr.message)
  }
  await openCloudProject(app.current.id);normalizeSceneOrder();await Promise.all(app.current.scenes.map(s=>sb.from("scenes").update({scene_number:s.number,position:s.position}).eq("id",s.id)));await openCloudProject(app.current.id);app.activeSceneId=newScene.id;app.activeShotId=currentScene()?.shots?.[0]?.id||null;renderEditor()
}
async function moveScene(sceneId,delta){
  if(!can("scenes"))return;const arr=app.current.scenes.sort((a,b)=>a.position-b.position),i=arr.findIndex(x=>x.id===sceneId),j=i+delta;if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((s,k)=>s.position=k+1);await persistSceneOrder();
}
async function deleteScene(){
  if(!can("scenes"))return;if(app.current.scenes.length===1){alert("At least one scene must remain.");return}const s=currentScene();if(!confirm(`Delete Scene ${s.number} and all of its shots?`))return;
  if(app.mode==="local"){app.current.scenes=app.current.scenes.filter(x=>x.id!==s.id);normalizeSceneOrder();selectFirst();saveLocal();renderEditor();return}
  const {error}=await sb.from("scenes").delete().eq("id",s.id);if(error)return alert(error.message);
  await openCloudProject(app.current.id);normalizeSceneOrder();await Promise.all(app.current.scenes.map(x=>sb.from("scenes").update({scene_number:x.number,position:x.position}).eq("id",x.id)));await openCloudProject(app.current.id)
}
async function toggleSceneCollapse(sceneId){
  const scene=app.current?.scenes.find(s=>s.id===sceneId);if(!scene)return;scene.collapsed=!scene.collapsed;renderSceneList();
  if(app.mode==="local")saveLocal();else if(can("scenes"))await sb.from("scenes").update({collapsed:scene.collapsed}).eq("id",scene.id)
}
async function setAllScenesCollapsed(collapsed){
  (app.current?.scenes||[]).forEach(s=>s.collapsed=collapsed);renderSceneList();
  if(app.mode==="local")saveLocal();else if(can("scenes"))await Promise.all(app.current.scenes.map(s=>sb.from("scenes").update({collapsed}).eq("id",s.id)))
}
async function addShot(){
  if(!can("shots"))return;const sc=currentScene();if(!sc)return;const no=sc.shots.length+1,pos=no;
  if(app.mode==="local"){const sh=blankShot(no);sh.position=pos;sc.shots.push(sh);app.activeShotId=sh.id;saveLocal();renderEditor();return}
  const sh=blankShot(no);const {data,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sc.id,shot_number:no,position:pos,data:shotDbData(sh)}).select().single();if(error){alert(error.message);return}
  await openCloudProject(app.current.id);app.activeSceneId=sc.id;app.activeShotId=sh.id;renderEditor()
}
async function insertShotCopy(source,afterIndex){
  const sc=currentScene();if(!sc||!source)return;
  const copy=deepClone(source);copy.id=uid();copy.position=afterIndex+1.5;copy.shotNo=afterIndex+2;
  if(app.mode==="local"){sc.shots.push(copy);normalizeShotNumbers(sc);app.activeShotId=copy.id;saveLocal();renderEditor();return}
  const data=shotDbData(copy);
  const {data:row,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sc.id,shot_number:copy.shotNo,position:copy.position,image_path:source.imagePath||null,data}).select().single();if(error){alert(error.message);return}
  await openCloudProject(app.current.id);const target=app.current.scenes.find(x=>x.id===sc.id);if(target){normalizeShotNumbers(target);await Promise.all(target.shots.map(s=>sb.from("shots").update({shot_number:s.shotNo,position:s.position,data:shotDbData(s)}).eq("id",s.id)))}await openCloudProject(app.current.id);app.activeSceneId=sc.id;app.activeShotId=row.id;renderEditor()
}
async function duplicateShot(){
  if(!can("shots"))return;const s=currentShot(),sc=currentScene();if(!s)return;const idx=sc.shots.sort((a,b)=>a.position-b.position).findIndex(x=>x.id===s.id);await insertShotCopy(s,idx)
}
function copyShot(){
  const s=currentShot();if(!s)return;app.shotClipboard=deepClone(s);$("pasteShotBtn").disabled=!can("shots");setMsg("editorNotice",`Shot ${s.shotNo} copied.`)
}
async function pasteShot(){
  if(!can("shots")||!app.shotClipboard)return;const sc=currentScene();const s=currentShot();const idx=Math.max(0,sc.shots.sort((a,b)=>a.position-b.position).findIndex(x=>x.id===s?.id));await insertShotCopy(app.shotClipboard,idx)
}
async function moveShot(delta){
  if(!can("shots"))return;const sc=currentScene(),s=currentShot();if(!sc||!s)return;const arr=sc.shots.sort((a,b)=>a.position-b.position),i=arr.findIndex(x=>x.id===s.id),j=i+delta;if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((x,k)=>x.position=k+1);await persistShotOrder(sc)
}
async function deleteShot(){
  if(!can("shots"))return;const s=currentShot(),sc=currentScene();if(sc.shots.length===1){alert("Each scene needs at least one shot.");return}if(!confirm(`Delete Shot ${s.shotNo}?`))return;
  if(app.mode==="local"){sc.shots=sc.shots.filter(x=>x.id!==s.id);normalizeShotNumbers(sc);app.activeShotId=sc.shots[0].id;saveLocal();renderEditor();return}
  const remaining=sc.shots.filter(x=>x.id!==s.id);const {error}=await sb.from("shots").delete().eq("id",s.id);if(error)return alert(error.message);
  remaining.sort((a,b)=>a.position-b.position).forEach((x,i)=>{x.position=i+1;x.shotNo=i+1});
  await Promise.all(remaining.map(x=>sb.from("shots").update({shot_number:x.shotNo,position:x.position,data:shotDbData(x)}).eq("id",x.id)));await openCloudProject(app.current.id)
}
function adjacentShot(delta){
  const arr=allShots(),idx=arr.findIndex(x=>x.shot.id===app.activeShotId),target=arr[idx+delta];if(!target)return;app.activeSceneId=target.scene.id;app.activeShotId=target.shot.id;renderEditor();window.scrollTo({top:0,behavior:"smooth"})
}

/* ---------- IMAGES ---------- */
async function loadImage(e){
  const file=e.target.files[0];if(!file||!can("media"))return;const s=currentShot();
  if(app.mode==="local"){
    const r=new FileReader();r.onload=()=>{s.image=r.result;saveLocal();renderEditor()};r.readAsDataURL(file);e.target.value="";return
  }
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`${app.current.id}/${s.id}/${Date.now()}-${safe}`;
  const {error}=await sb.storage.from("storyboards").upload(path,file,{upsert:true,contentType:file.type});if(error){alert(error.message);return}
  const {error:u}=await sb.from("shots").update({image_path:path}).eq("id",s.id);if(u){alert(u.message);return}
  s.imagePath=path;const {data}=await sb.storage.from("storyboards").createSignedUrl(path,604800);s.image=data?.signedUrl||null;renderEditor();e.target.value=""
}
async function removeImage(){
  if(!can("media"))return;const s=currentShot();
  if(app.mode==="cloud"&&s.imagePath){await sb.storage.from("storyboards").remove([s.imagePath]);await sb.from("shots").update({image_path:null}).eq("id",s.id)}
  s.image=null;s.imagePath=null;if(app.mode==="local")saveLocal();renderEditor()
}

/* ---------- SHEET TOGGLE ---------- */
function toggleSheet(force){
  app.sheetOpen=typeof force==="boolean"?force:!app.sheetOpen;$("sheetPanel").hidden=!app.sheetOpen;updateSheetButtons();
  if(app.sheetOpen){renderSheet();requestAnimationFrame(()=>$("sheetPanel").scrollIntoView({behavior:"smooth",block:"start"}))}
}
function updateSheetButtons(){
  $("sheetToggleBtn").classList.toggle("sheet-on",app.sheetOpen);$("mobileSheetBtn").classList.toggle("sheet-on",app.sheetOpen);$("sheetPanel").hidden=!app.sheetOpen
}
function sheetCols(per){return per>=8?"cols-3":"cols-2"}
function renderSheet(){
  if(!app.current)return;$("sheetProjectTitle").textContent=`${app.current.name} · Storyboard Sheet`;
  const per=Number($("shotsPerPage").value||6),pages=$("sheetPages");pages.innerHTML="";const flat=allShots();const ar=aspectNumbers(app.current);
  for(let i=0;i<flat.length;i+=per){
    const page=document.createElement("article");page.className="sheet-page";const chunk=flat.slice(i,i+per);
    page.innerHTML=`<div class="sheet-page-head"><h3>${escapeHtml(app.current.name)}</h3><span>Page ${Math.floor(i/per)+1} · ${escapeHtml(projectAspectText(app.current))}</span></div>`;
    const grid=document.createElement("div");grid.className=`sheet-grid ${sheetCols(per)}`;
    chunk.forEach(({scene,shot})=>{
      const card=document.createElement("div");card.className="sheet-shot";
      const image=shot.image?`<img src="${shot.image}" alt="">`:`<div class="sheet-placeholder">Storyboard Frame<br>Shot ${shot.shotNo}</div>`;
      card.innerHTML=`<div class="sheet-image" style="aspect-ratio:${ar.w}/${ar.h}">${image}</div><div class="sheet-info"><div class="sheet-scene">Scene ${scene.number} · ${escapeHtml(scene.title||"")}</div><div class="sheet-info-top"><span>SHOT ${shot.shotNo}</span><span>${escapeHtml(shot.duration||"")}</span></div><div class="sheet-meta">${escapeHtml(shortValue(shot.shotSize))} · ${escapeHtml(shot.angle||"")} · ${escapeHtml(shot.lens||"")} · ${escapeHtml(shot.movement||"")}</div><div class="sheet-summary">${escapeHtml(shot.summary||shot.description||"")}</div></div>`;
      grid.appendChild(card)
    });
    page.appendChild(grid);pages.appendChild(page)
  }
}

/* ---------- COLLABORATION ---------- */
function readPermissionUI(){return {project_settings:$("permProject").checked,scenes:$("permScenes").checked,shots:$("permShots").checked,media:$("permMedia").checked,members:$("permMembers").checked}}
function writePermissionUI(p){$("permProject").checked=!!p.project_settings;$("permScenes").checked=!!p.scenes;$("permShots").checked=!!p.shots;$("permMedia").checked=!!p.media;$("permMembers").checked=!!p.members}
function setPermissionPreset(name){if(name==="viewer")writePermissionUI(blankPermissions());else if(name==="editor")writePermissionUI(editorPermissions())}
async function openCollab(){
  if(app.mode!=="cloud"){alert("Collaboration becomes available after Supabase cloud accounts are connected.");return}
  $("collabModal").showModal();setMsg("collabMessage","");$("shareLinkBox").hidden=true;await renderMembers()
}
async function renderMembers(){
  const wrap=$("membersList");wrap.innerHTML="";const pid=app.current.id;
  const {data:members,error}=await sb.from("project_members").select("user_id,role,permissions,joined_at").eq("project_id",pid);if(error){setMsg("collabMessage",error.message,"warning");return}
  const ids=(members||[]).map(x=>x.user_id);let profiles=[];
  if(ids.length){const {data}=await sb.from("profiles").select("id,username,display_name").in("id",ids);profiles=data||[]}
  const owner=document.createElement("div");owner.className="member-row";owner.innerHTML=`<span><strong>Project owner</strong><small>Full access</small></span><span>Owner</span>`;wrap.appendChild(owner);
  (members||[]).forEach(m=>{
    const pr=profiles.find(p=>p.id===m.user_id)||{};const row=document.createElement("div");row.className="member-row";
    row.innerHTML=`<span><strong>${escapeHtml(pr.display_name||pr.username||"Member")}</strong><small>${pr.username?"@"+escapeHtml(pr.username):""}</small></span><span class="member-actions"><button type="button" class="btn ghost edit-member">Access</button><button type="button" class="btn ghost remove-member">Remove</button></span>`;
    row.querySelector(".edit-member").onclick=async()=>{const preset=prompt("Set role: viewer, editor or custom","editor");if(!preset)return;let perms=preset==="viewer"?blankPermissions():preset==="editor"?editorPermissions():m.permissions||editorPermissions();const {error}=await sb.from("project_members").update({role:preset,permissions:perms}).eq("project_id",pid).eq("user_id",m.user_id);if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
    row.querySelector(".remove-member").onclick=async()=>{if(!confirm("Remove this collaborator?"))return;const {error}=await sb.from("project_members").delete().eq("project_id",pid).eq("user_id",m.user_id);if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
    wrap.appendChild(row)
  })
}
async function addMemberByUsername(){
  const username=$("inviteUsername").value.trim().toLowerCase();if(!username)return;
  const {data:p,error}=await sb.from("profiles").select("id,username").eq("username",username).maybeSingle();if(error||!p){setMsg("collabMessage","User not found.","warning");return}
  if(p.id===app.current.owner_id){setMsg("collabMessage","That user is already the owner.","warning");return}
  const preset=$("permissionPreset").value,perms=permissionPreset(preset);
  const {error:e}=await sb.from("project_members").upsert({project_id:app.current.id,user_id:p.id,role:preset,permissions:perms,invited_by:app.session.user.id},{onConflict:"project_id,user_id"});
  if(e)setMsg("collabMessage",e.message,"warning");else{setMsg("collabMessage",`@${username} added.`);$("inviteUsername").value="";renderMembers()}
}
async function createShareLink(){
  const preset=$("permissionPreset").value,perms=permissionPreset(preset),email=$("inviteEmail").value.trim()||null;
  const {data,error}=await sb.from("project_invites").insert({project_id:app.current.id,invitee_email:email,role:preset,permissions:perms,created_by:app.session.user.id}).select("token").single();
  if(error){setMsg("collabMessage",error.message,"warning");return}
  const url=`${cfg.SITE_URL||location.origin}/?invite=${data.token}`;$("shareLinkOutput").value=url;$("shareLinkBox").hidden=false
}
async function acceptPendingInvite(){
  const token=app.pendingInvite;if(!token)return;
  const {data,error}=await sb.rpc("accept_project_invite",{p_token:token});
  if(error){$("inviteNotice").hidden=false;$("inviteNotice").textContent=error.message}else{$("inviteNotice").hidden=false;$("inviteNotice").textContent="Project invitation accepted.";await loadCloudProjects()}
  app.pendingInvite=null;history.replaceState({},document.title,location.pathname)
}

/* ---------- IMPORT / EXPORT ---------- */
function exportJSON(){const blob=new Blob([JSON.stringify(app.current,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(app.current.name||"storyboard-project")+".json";a.click();URL.revokeObjectURL(a.href)}
async function importJSON(e){
  const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=async()=>{try{
    const x=JSON.parse(r.result);if(!x.scenes&&!x.shots)throw new Error("Unsupported file");
    if(app.mode==="cloud"){alert("Cloud JSON import will be added after the account backend is connected. For now, import is available in Offline mode.");return}
    const p=x.scenes?x:blankProject(x.project?.name||"Imported");if(!x.scenes)p.scenes=[{id:uid(),number:1,title:"Scene 1",description:"",position:1,shots:x.shots.map((s,i)=>({...blankShot(i+1),...s,id:uid()}))}];
    p.id=uid();app.current=p;app.projects.push(p);selectFirst();saveLocal();renderEditor()
  }catch(err){alert("Invalid storyboard JSON.")}};r.readAsText(file);e.target.value=""
}


/* ---------- ONLINE JSON IMPORT ---------- */
async function createCloudProjectFromJSON(projectData){
  if(!sb || !app.session) throw new Error("Cloud account required.");

  const pName = projectData.name || projectData.project?.name || "Imported Storyboard";
  const aspect = projectData.aspect || projectData.project?.aspect || "3:4 Portrait";

  const {data:p,error:pe}=await sb.from("projects").insert({
    name:pName,
    aspect,
    aspect_width:Number(projectData.aspectWidth||projectData.project?.aspectWidth||3),
    aspect_height:Number(projectData.aspectHeight||projectData.project?.aspectHeight||4),
    style:projectData.style||"Storyboard B&W",
    owner_id:app.session.user.id,
    position:Math.max(0,...(app.projects||[]).filter(x=>x.owner_id===app.session.user.id).map(x=>Number(x.position||0)))+1,
    is_favorite:!!(projectData.isFavorite??projectData.is_favorite),
    folder:projectData.folder||"General",
    tags:Array.isArray(projectData.tags)?projectData.tags:[],
    metadata:projectMeta(projectData)
  }).select().single();

  if(pe) throw pe;

  const scenes = projectData.scenes || [
    {number:1,title:"Scene 1",shots:projectData.shots||[]}
  ];

  for(const sc of scenes){
    const {data:s,error:se}=await sb.from("scenes").insert({
      project_id:p.id,
      scene_number:Number(sc.number||1),
      title:sc.title||`Scene ${sc.number||1}`,
      description:sc.description||"",
      position:Number(sc.position||sc.number||1),
      collapsed:!!sc.collapsed
    }).select().single();

    if(se) throw se;

    const shots = sc.shots || [];
    for(let i=0;i<shots.length;i++){
      const shot = {
        ...blankShot(i+1),
        ...shots[i]
      };

      await sb.from("shots").insert({
        project_id:p.id,
        scene_id:s.id,
        shot_number:Number(shot.shotNo||i+1),
        position:Number(shot.position||i+1),
        data:shot
      });
    }
  }

  return p.id;
}

async function importJSONOnline(file){
  const text=await file.text();
  const data=JSON.parse(text);

  if(app.mode==="cloud"){
    const id=await createCloudProjectFromJSON(data);
    await loadCloudProjects();
    await openCloudProject(id);
    alert("Storyboard imported successfully.");
  }else{
    const p={...blankProject(data.name||"Imported Storyboard"),...data};
    app.current=p;
    app.projects.push(p);
    saveLocal();
    renderEditor();
    alert("Storyboard imported locally.");
  }
}


/* ---------- PROJECT MANAGEMENT ---------- */
function projectDragEnabled(){return app.projectFilter==="all" && !app.projectSearch.trim() && app.projectFolder==="all"}
async function persistProjectPositions(){
  const mine=app.projects.filter(p=>p.owner_id===app.session?.user?.id);
  mine.forEach((p,i)=>p.position=i+1);
  if(app.mode==="local"){saveLocal();return}
  await Promise.all(mine.map(p=>sb.from("projects").update({position:p.position}).eq("id",p.id)))
}
function setupProjectDrag(){
  if(!projectDragEnabled())return;
  const grid=$("projectsGrid");
  [...grid.children].forEach(card=>{
    const p=app.projects.find(x=>x.id===card.dataset.projectId),owner=p?.owner_id===app.session?.user?.id;
    if(!owner)return;card.draggable=true;
    card.ondragstart=e=>{card.classList.add("dragging");e.dataTransfer.effectAllowed="move"};
    card.ondragend=async()=>{
      card.classList.remove("dragging");
      const domIds=[...grid.children].map(x=>x.dataset.projectId);
      const mineInDom=domIds.map(id=>app.projects.find(p=>p.id===id)).filter(p=>p?.owner_id===app.session?.user?.id);
      const shared=app.projects.filter(p=>p.owner_id!==app.session?.user?.id);
      app.projects=[...mineInDom,...shared];await persistProjectPositions();renderProjects()
    };
    card.ondragover=e=>{e.preventDefault();const d=grid.querySelector(".dragging");if(d&&d!==card)grid.insertBefore(d,card)}
  })
}
async function renameProject(id){
  const p=app.projects.find(x=>x.id===id);if(!p)return;const name=prompt("New project name:",p.name);if(!name)return;
  if(app.mode==="cloud"){const {error}=await sb.from("projects").update({name,updated_at:new Date().toISOString()}).eq("id",id);if(error)return alert(error.message)}
  p.name=name;if(app.current?.id===id)app.current.name=name;renderProjects()
}
async function deleteProject(id){
  const p=app.projects.find(x=>x.id===id);if(!p||!confirm(`Delete "${p.name}"? This cannot be undone.`))return;
  if(app.mode==="cloud"){const {error}=await sb.from("projects").delete().eq("id",id);if(error)return alert(error.message)}
  app.projects=app.projects.filter(x=>x.id!==id);if(app.current?.id===id)app.current=null;await persistProjectPositions();renderProjects()
}
async function toggleFavorite(id){
  const p=app.projects.find(x=>x.id===id);if(!p||p.owner_id!==app.session?.user?.id)return;p.isFavorite=!p.isFavorite;
  const {error}=await sb.from("projects").update({is_favorite:p.isFavorite}).eq("id",id);if(error){p.isFavorite=!p.isFavorite;return alert(error.message)}renderProjects()
}
async function duplicateProject(id){
  const source=app.projects.find(x=>x.id===id);if(!source)return;
  if(app.mode==="local"){
    const clone=deepClone(source);clone.id=uid();clone.name=`${source.name} Copy`;clone.owner_id=null;clone.position=app.projects.length+1;clone.isFavorite=false;clone.scenes=clone.scenes.map((sc,si)=>({...sc,id:uid(),number:si+1,position:si+1,shots:sc.shots.map((sh,ii)=>({...sh,id:uid(),shotNo:ii+1,position:ii+1}))}));app.projects.push(clone);saveLocal();renderProjects();return
  }
  const {data:p,error}=await sb.from("projects").select("*").eq("id",id).single();if(error)return alert(error.message);
  const {data:scenes,error:se}=await sb.from("scenes").select("*").eq("project_id",id).order("position");if(se)return alert(se.message);
  const {data:shots,error:shErr}=await sb.from("shots").select("*").eq("project_id",id).order("position");if(shErr)return alert(shErr.message);
  const position=Math.max(0,...app.projects.filter(x=>x.owner_id===app.session.user.id).map(x=>Number(x.position||0)))+1;
  const {data:newP,error:pe}=await sb.from("projects").insert({owner_id:app.session.user.id,name:`${p.name} Copy`,aspect:p.aspect,aspect_width:p.aspect_width,aspect_height:p.aspect_height,style:p.style,position,is_favorite:false,folder:p.folder||"General",tags:p.tags||[],metadata:p.metadata||{}}).select().single();if(pe)return alert(pe.message);
  for(const sc of scenes||[]){
    const {data:newSc,error:sce}=await sb.from("scenes").insert({project_id:newP.id,scene_number:sc.scene_number,title:sc.title,description:sc.description||"",position:sc.position,collapsed:false}).select().single();if(sce)return alert(sce.message);
    for(const row of (shots||[]).filter(r=>r.scene_id===sc.id)){
      const {error:e}=await sb.from("shots").insert({project_id:newP.id,scene_id:newSc.id,shot_number:row.shot_number,position:row.position,image_path:row.image_path||null,data:row.data||{}});if(e)return alert(e.message)
    }
  }
  await loadCloudProjects();await openCloudProject(newP.id)
}
function openProjectDetails(id){
  const p=(app.current?.id===id?app.current:app.projects.find(x=>x.id===id));if(!p)return;app.detailsProjectId=id;const m=projectMeta(p);
  $("detailProjectName").value=p.name||"";$("detailProjectFolder").value=p.folder||"General";$("detailProjectTags").value=(p.tags||[]).join(", ");
  $("detailDirector").value=m.director||"";$("detailWriter").value=m.writer||"";$("detailProduction").value=m.production||"";$("detailStatus").value=m.status||"Planning";$("detailNotes").value=m.notes||"";$("detailFavorite").checked=!!p.isFavorite;
  const owner=p.owner_id===app.session?.user?.id,editable=app.mode==="local"||owner||(app.current?.id===id&&can("project_settings"));
  ["detailProjectName","detailProjectFolder","detailProjectTags","detailDirector","detailWriter","detailProduction","detailStatus","detailNotes","detailFavorite"].forEach(x=>$(x).disabled=!editable);
  $("saveProjectDetailsBtn").hidden=!editable;$("projectDetailsModal").showModal()
}
async function saveProjectDetails(){
  const id=app.detailsProjectId,p=(app.current?.id===id?app.current:app.projects.find(x=>x.id===id));if(!p)return;
  p.name=$("detailProjectName").value.trim()||p.name;p.folder=$("detailProjectFolder").value.trim()||"General";p.tags=$("detailProjectTags").value.split(",").map(x=>x.trim()).filter(Boolean);p.isFavorite=$("detailFavorite").checked;
  p.metadata={director:$("detailDirector").value.trim(),writer:$("detailWriter").value.trim(),production:$("detailProduction").value.trim(),status:$("detailStatus").value,notes:$("detailNotes").value.trim()};
  if(app.mode==="cloud"){
    const {error}=await sb.from("projects").update({name:p.name,folder:p.folder,tags:p.tags,is_favorite:p.isFavorite,metadata:p.metadata,updated_at:new Date().toISOString()}).eq("id",id);if(error)return alert(error.message)
  }else saveLocal();
  if(app.current?.id===id){app.current={...app.current,...p};$("projectName").value=p.name;if($("projectFolderBadge"))$("projectFolderBadge").textContent=p.folder}
  const listP=app.projects.find(x=>x.id===id);if(listP)Object.assign(listP,p);$("projectDetailsModal").close();renderProjects()
}

/* ---------- EVENTS ---------- */
function bind(){
  $("loginTabBtn").onclick=()=>toggleAuthTab("login");$("signupTabBtn").onclick=()=>toggleAuthTab("signup");$("loginEmailMode").onclick=()=>setLoginKind("email");$("loginUsernameMode").onclick=()=>setLoginKind("username");
  $("loginForm").onsubmit=doLogin;$("signupForm").onsubmit=doSignup;$("forgotPasswordBtn").onclick=forgotPassword;$("continueOfflineBtn").onclick=continueOffline;
  $("logoutBtn").onclick=logout;$("newCloudProjectBtn").onclick=createCloudProject;$("emptyNewProjectBtn").onclick=createCloudProject;
  $("accountBtn").onclick=()=>$("accountModal").showModal();$("closeAccountBtn").onclick=()=>$("accountModal").close();
  $("backProjectsBtn").onclick=async()=>{unsubscribeRealtime();if(app.mode==="cloud"){await loadCloudProjects();showProjects()}else showAuth()};
  $("projectSearch").oninput=e=>{app.projectSearch=e.target.value;renderProjects()};
  $("projectFilter").onchange=e=>{app.projectFilter=e.target.value;renderProjects()};
  $("projectFolderFilter").onchange=e=>{app.projectFolder=e.target.value;renderProjects()};
  $("closeProjectDetailsBtn").onclick=()=>$("projectDetailsModal").close();$("saveProjectDetailsBtn").onclick=saveProjectDetails;$("projectDetailsBtn").onclick=()=>openProjectDetails(app.current.id);
  ["projectName","projectAspect","projectStyle","aspectWidth","aspectHeight"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onProjectChange))});
  ["sceneTitle","sceneDescription"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onSceneChange))});
  SHOT_FIELDS.filter(id=>id!=="shotNo").forEach(id=>{if($(id))["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>onShotChange(id)))});
  $("addSceneBtn").onclick=addScene;$("deleteSceneBtn").onclick=deleteScene;$("collapseAllScenesBtn").onclick=()=>setAllScenesCollapsed(true);$("expandAllScenesBtn").onclick=()=>setAllScenesCollapsed(false);
  $("addShotBtn").onclick=addShot;$("mobileAddShotBtn").onclick=addShot;$("duplicateShotBtn").onclick=duplicateShot;$("copyShotBtn").onclick=copyShot;$("pasteShotBtn").onclick=pasteShot;$("moveShotUpBtn").onclick=()=>moveShot(-1);$("moveShotDownBtn").onclick=()=>moveShot(1);$("deleteShotBtn").onclick=deleteShot;
  $("prevShotBtn").onclick=()=>adjacentShot(-1);$("nextShotBtn").onclick=()=>adjacentShot(1);
  $("frameImageInput").onchange=loadImage;$("removeImageBtn").onclick=removeImage;
  $("sheetToggleBtn").onclick=()=>toggleSheet();$("mobileSheetBtn").onclick=()=>toggleSheet();$("closeSheetBtn").onclick=()=>toggleSheet(false);$("shotsPerPage").onchange=renderSheet;$("printSheetBtn").onclick=()=>window.print();
  $("exportBtn").onclick=exportJSON;$("importInput").onchange=e=>{const f=e.target.files[0];if(f)importJSONOnline(f).catch(err=>alert(err.message||"Import failed."));e.target.value="";};
  $("generateAiBtn").onclick=()=>generateStoryboard("single");$("generateAiVarsBtn").onclick=()=>generateStoryboard("variations");$("clearAiVarsBtn").onclick=clearAiVariations;
  $("aiPromptOverride").addEventListener("input",()=>{const s=currentShot(); if(!s)return; s.aiPromptOverride=$("aiPromptOverride").value; renderAI(); queueSave("shot")});
  document.querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>{$(b.dataset.focus).focus();$(b.dataset.focus).scrollIntoView({behavior:"smooth",block:"center"})});
  $("collaborateBtn").onclick=openCollab;$("addMemberBtn").onclick=addMemberByUsername;$("createShareLinkBtn").onclick=createShareLink;$("copyShareLinkBtn").onclick=async()=>{await navigator.clipboard.writeText($("shareLinkOutput").value);setMsg("collabMessage","Invite link copied.")};
  $("permissionPreset").onchange=e=>{if(e.target.value!=="custom")setPermissionPreset(e.target.value)}
}

start();
