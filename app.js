// Storyboard Shot Builder v3.6 — workflow continuity + sidebar shot controls + collaboration chat
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
  chatChannel: null,
  permissions: fullPermissions(),
  isOwner: true,
  pendingInvite: new URLSearchParams(location.search).get("invite"),
  projectSearch: "",
  projectFilter: "all",
  projectFolder: "all",
  detailsProjectId: null,
  shotClipboard: null,
  suppressRealtime: 0,
  ignoreRealtimeUntil: 0
};
let autosaveTimer = null;

function uid(){return (crypto.randomUUID ? crypto.randomUUID() : "id-"+Date.now()+"-"+Math.random().toString(16).slice(2))}
function fullPermissions(){return {project_settings:true,scenes:true,shots:true,media:true,members:true}}
function blankPermissions(){return {project_settings:false,scenes:false,shots:false,media:false,members:false}}
function editorPermissions(){return {project_settings:false,scenes:true,shots:true,media:true,members:false}}
function permissionPreset(name){return name==="viewer"?blankPermissions():name==="editor"?editorPermissions():readPermissionUI()}
function blankShot(no=1){return {id:uid(),shotNo:no,duration:"",shotSize:"CU · Close Up",angle:"Eye Level",cameraHeight:"Eye Level",lens:"50mm",focus:"Shallow Focus",movement:"Static",startEnd:"",composition:"Centered / Symmetrical",summary:"",subject:"",description:"",performance:"",subjectMovement:"",costume:"",timeOfDay:"Night",location:"",lightSource:"Candle",lightDirection:"Camera Left",lightQuality:"Low Key",lighting:"",props:"",dialogue:"",voiceOver:"",sfx:"",music:"",transitionIn:"Cut",transitionOut:"Cut",notes:"",image:null,imagePath:null,position:no}}
function blankScene(no=1){return {id:uid(),number:no,title:`Scene ${no}`,description:"",position:no,collapsed:false,shots:[blankShot(1)]}}
function blankProject(name="Untitled Storyboard"){return {id:uid(),name,aspect:"3:4 Portrait",aspectWidth:3,aspectHeight:4,style:"Storyboard B&W",owner_id:null,role:"owner",position:0,isFavorite:false,folder:"General",tags:[],metadata:{director:"",cinematographer:"",writer:"",production:"",status:"Planning",notes:""},scenes:[blankScene(1)],updated_at:new Date().toISOString()}}
function deepClone(x){return JSON.parse(JSON.stringify(x))}
function normalizeTags(v){
  if(Array.isArray(v))return v.map(x=>String(x).trim()).filter(Boolean);
  if(typeof v!=="string")return [];
  const s=v.trim();if(!s)return [];
  if(s.startsWith("[")||s.startsWith("{")){
    try{const parsed=JSON.parse(s);if(Array.isArray(parsed))return parsed.map(x=>String(x).trim()).filter(Boolean)}catch(e){}
    if(s.startsWith("{")&&s.endsWith("}"))return s.slice(1,-1).split(",").map(x=>x.replace(/^"|"$/g,"").trim()).filter(Boolean)
  }
  return s.split(",").map(x=>x.trim()).filter(Boolean)
}
function projectMeta(p){return {director:"",cinematographer:"",writer:"",production:"",status:"Planning",notes:"",...(p?.metadata||{})}}
function projectCanEdit(p){return app.mode==="local" || p?.owner_id===app.session?.user?.id || !!p?.dashboardPermissions?.project_settings}
function projectIsOwner(p){return app.mode==="local" || p?.owner_id===app.session?.user?.id}
function shotDbData(s){const data={...s};delete data.id;delete data.image;delete data.imagePath;return data}
function currentScene(){return app.current?.scenes.find(s=>s.id===app.activeSceneId) || app.current?.scenes[0] || null}
function currentShot(){const sc=currentScene(); return sc?.shots.find(s=>s.id===app.activeShotId) || sc?.shots[0] || null}
function allShots(){return (app.current?.scenes||[]).flatMap(scene=>scene.shots.map(shot=>({scene,shot})))}
function shortValue(v){return (v||"").split(" · ")[0]}
function escapeHtml(str){return String(str??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function show(el, yes=true){if(el) el.hidden=!yes}
function setMsg(id,msg,type=""){const el=$(id); if(!msg){el.hidden=true;el.textContent="";return} el.hidden=false;el.textContent=msg;el.className="notice"+(type?` ${type}`:"")}
function can(key){return app.isOwner || !!app.permissions?.[key]}


/* ---------- WORKSPACE CONTINUITY ---------- */
function workspaceKey(){return `storyboard-v3.6-workspace:${app.session?.user?.id||"local"}`}
function currentEditorVisible(){return !!app.current && $("editorView") && !$("editorView").hidden}
function openAccordionIds(){return [...document.querySelectorAll(".accordion details")].filter(x=>x.open&&x.id).map(x=>x.id)}
function readWorkspace(){
  try{return JSON.parse(localStorage.getItem(workspaceKey())||"null")}catch(e){return null}
}
function rememberWorkspace(overrides={}){
  if(app.mode!=="cloud"||!app.session)return;
  const previous=readWorkspace()||{};
  const data={
    ...previous,
    view:currentEditorVisible()?"editor":"projects",
    projectId:app.current?.id||previous.projectId||null,
    sceneId:app.activeSceneId||previous.sceneId||null,
    shotId:app.activeShotId||previous.shotId||null,
    scrollY:currentEditorVisible()?window.scrollY:(previous.scrollY||0),
    sheetOpen:!!app.sheetOpen,
    openDetails:currentEditorVisible()?openAccordionIds():(previous.openDetails||[]),
    savedAt:Date.now(),
    ...overrides
  };
  localStorage.setItem(workspaceKey(),JSON.stringify(data));
}
function rememberProjectsView(){
  if(app.mode!=="cloud"||!app.session)return;
  rememberWorkspace({view:"projects",scrollY:0});
}
function restoreAccordionState(ids){
  if(!Array.isArray(ids))return;
  const set=new Set(ids);
  document.querySelectorAll(".accordion details").forEach(d=>{if(d.id)d.open=set.has(d.id)})
}
let workspaceScrollTimer=null;
function queueWorkspaceScrollSave(){
  if(!currentEditorVisible())return;
  clearTimeout(workspaceScrollTimer);workspaceScrollTimer=setTimeout(()=>rememberWorkspace(),180)
}

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
  sb.auth.onAuthStateChange(async(event,session)=>{
    app.session=session;
    if(!session){app.profile=null;app.current=null;unsubscribeRealtime();unsubscribeChatRealtime();showAuth();return}
    // INITIAL_SESSION is already handled by getSession() below. Token refreshes must
    // never kick an editor back to the Projects screen.
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED"||event==="USER_UPDATED")return;
    if(event==="SIGNED_IN")await afterLogin();
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
  if(app.pendingInvite){await acceptPendingInvite();showProjects();return}
  const ws=readWorkspace();
  const canRestore=ws?.view==="editor" && ws.projectId && app.projects.some(p=>p.id===ws.projectId);
  if(canRestore){
    await openCloudProject(ws.projectId,{sceneId:ws.sceneId,shotId:ws.shotId,scrollY:ws.scrollY,sheetOpen:ws.sheetOpen,openDetails:ws.openDetails,preserveSelection:true});
  }else showProjects();
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
    tags:normalizeTags(p.tags),
    metadata:projectMeta(p)
  }
}
async function loadCloudProjects(){
  const {data,error}=await sb.from("projects").select("id,owner_id,name,aspect,aspect_width,aspect_height,style,updated_at,created_at,position,is_favorite,folder,tags,metadata");
  if(error){console.error(error);alert(`Could not load projects: ${error.message}`);return}

  let memberships=[];
  const {data:memberRows,error:memberError}=await sb.from("project_members").select("project_id,role,permissions").eq("user_id",app.session.user.id);
  if(!memberError)memberships=memberRows||[];

  const mapped=(data||[]).map(row=>{
    const p=normalizeProjectRecord(row);
    const member=memberships.find(m=>m.project_id===p.id);
    p.dashboardRole=p.owner_id===app.session.user.id?"owner":(member?.role||"shared");
    p.dashboardPermissions=member?.permissions||blankPermissions();
    return p
  });
  const mine=mapped.filter(p=>p.owner_id===app.session.user.id).sort((a,b)=>(Number(a.position||0)-Number(b.position||0)) || new Date(b.updated_at||0)-new Date(a.updated_at||0));
  const shared=mapped.filter(p=>p.owner_id!==app.session.user.id).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  app.projects=[...mine,...shared];
  renderProjects();
}
function projectMatchesSearch(p){
  const q=(app.projectSearch||"").trim().toLowerCase();
  if(!q)return true;
  const m=projectMeta(p);
  return [p.name,p.folder,...(p.tags||[]),m.director,m.cinematographer,m.writer,m.production,m.status,m.notes].join(" ").toLowerCase().includes(q)
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
    const owner=projectIsOwner(p),editable=projectCanEdit(p),m=projectMeta(p);
    const card=document.createElement("article");card.className="project-tile project-manage-card";card.dataset.projectId=p.id;
    const tags=normalizeTags(p.tags).slice(0,3).map(t=>`<span class="tag-chip">${escapeHtml(t)}</span>`).join("");
    card.innerHTML=`
      <div class="project-tile-top">
        <div class="project-role">${owner?"Owner":"Shared"}</div>
        <button type="button" class="favorite-btn ${p.isFavorite?"active":""}" title="Favorite" ${editable?"":"disabled"}>${p.isFavorite?"★":"☆"}</button>
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
        ${editable?'<button type="button" class="mini-btn rename">Rename</button>':''}
        ${owner?'<button type="button" class="mini-btn danger-lite delete">Delete</button>':''}
      </div>`;
    card.querySelector(".project-open-area").onclick=()=>openCloudProject(p.id);
    card.querySelector(".details").onclick=()=>openProjectDetails(p.id);
    card.querySelector(".duplicate").onclick=()=>duplicateProject(p.id);
    if(editable){
      card.querySelector(".favorite-btn").onclick=()=>toggleFavorite(p.id);
      card.querySelector(".rename").onclick=()=>renameProject(p.id);
    }
    if(owner)card.querySelector(".delete").onclick=()=>deleteProject(p.id);
    grid.appendChild(card)
  });
  setupProjectDrag();
}
async function createCloudProject(){
  const name=prompt("Project name:","Untitled Storyboard");if(!name)return;
  const myPositions=(app.projects||[]).filter(p=>p.owner_id===app.session.user.id).map(p=>Number(p.position||0));
  const position=Math.max(0,...myPositions)+1;
  const {data:p,error}=await sb.from("projects").insert({owner_id:app.session.user.id,name,aspect:"3:4 Portrait",aspect_width:3,aspect_height:4,style:"Storyboard B&W",position,is_favorite:false,folder:"General",tags:[],metadata:{director:"",cinematographer:"",writer:"",production:"",status:"Planning",notes:""}}).select().single();
  if(error){alert(error.message);return}
  const {data:s,error:se}=await sb.from("scenes").insert({project_id:p.id,scene_number:1,title:"Scene 1",description:"",position:1,collapsed:false}).select().single(); if(se){alert(se.message);return}
  const shot=blankShot(1);
  const {error:shErr}=await sb.from("shots").insert({project_id:p.id,scene_id:s.id,shot_number:1,position:1,data:shot});if(shErr){alert(shErr.message);return}
  await loadCloudProjects();await openCloudProject(p.id)
}
async function openCloudProject(id,options={}){
  const sameProject=app.current?.id===id;
  const preferredSceneId=options.sceneId || (sameProject&&options.preserveSelection!==false?app.activeSceneId:null);
  const preferredShotId=options.shotId || (sameProject&&options.preserveSelection!==false?app.activeShotId:null);
  const restoreScroll=Number.isFinite(Number(options.scrollY))?Number(options.scrollY):(sameProject?window.scrollY:null);
  unsubscribeRealtime();
  const {data:p,error}=await sb.from("projects").select("*").eq("id",id).single();if(error){alert(error.message);return}
  const {data:scenes,error:se}=await sb.from("scenes").select("*").eq("project_id",id).order("position");if(se){alert(se.message);return}
  const {data:shots,error:sh}=await sb.from("shots").select("*").eq("project_id",id).order("position");if(sh){alert(sh.message);return}
  const signed=await Promise.all((shots||[]).map(async row=>{
    let image=null;if(row.image_path){const {data}=await sb.storage.from("storyboards").createSignedUrl(row.image_path,604800);image=data?.signedUrl||null}
    const shotData={...blankShot(row.shot_number),...(row.data||{})};
    return {...shotData,id:row.id,shotNo:row.shot_number,position:row.position,imagePath:row.image_path,image}
  }));
  const sceneObjects=(scenes||[]).map(s=>({id:s.id,number:s.scene_number,title:s.title||`Scene ${s.scene_number}`,description:s.description||"",position:Number(s.position||s.scene_number||1),collapsed:!!s.collapsed,shots:signed.filter(x=>(shots||[]).find(r=>r.id===x.id)?.scene_id===s.id)}));
  sceneObjects.sort((a,b)=>a.position-b.position).forEach((scene,i)=>{
    scene.position=i+1;scene.number=i+1;
    scene.shots.sort((a,b)=>a.position-b.position).forEach((shot,j)=>{shot.position=j+1;shot.shotNo=j+1})
  });
  const pp=normalizeProjectRecord(p);
  app.current={id:p.id,owner_id:p.owner_id,name:p.name,aspect:p.aspect||"3:4 Portrait",aspectWidth:pp.aspectWidth,aspectHeight:pp.aspectHeight,style:p.style||"Storyboard B&W",position:pp.position,isFavorite:pp.isFavorite,folder:pp.folder,tags:pp.tags,metadata:pp.metadata,updated_at:p.updated_at,scenes:sceneObjects};
  app.isOwner=p.owner_id===app.session.user.id;
  if(app.isOwner){app.permissions=fullPermissions()}else{
    const {data:m}=await sb.from("project_members").select("permissions").eq("project_id",id).eq("user_id",app.session.user.id).maybeSingle();app.permissions=m?.permissions||blankPermissions()
  }
  const preferredScene=app.current.scenes.find(s=>s.id===preferredSceneId) || app.current.scenes[0] || null;
  app.activeSceneId=preferredScene?.id||null;
  const preferredShot=preferredScene?.shots.find(s=>s.id===preferredShotId) || preferredScene?.shots[0] || null;
  app.activeShotId=preferredShot?.id||null;
  if(options.sheetOpen!==undefined)app.sheetOpen=!!options.sheetOpen;
  showEditor();
  restoreAccordionState(options.openDetails);
  subscribeRealtime();
  rememberWorkspace();
  if(restoreScroll!==null)setTimeout(()=>window.scrollTo({top:restoreScroll,left:0,behavior:"auto"}),0)
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
function remoteRefresh(){if(app.suppressRealtime>0||Date.now()<app.ignoreRealtimeUntil)return;clearTimeout(refreshTimer);const pid=app.current?.id,sceneId=app.activeSceneId,shotId=app.activeShotId,scrollY=window.scrollY;refreshTimer=setTimeout(()=>{if(app.current?.id===pid&&app.suppressRealtime===0)openCloudProject(pid,{sceneId,shotId,scrollY,preserveSelection:true,openDetails:openAccordionIds(),sheetOpen:app.sheetOpen})},700)}

/* ---------- EDITOR RENDER ---------- */
function renderEditor(){
  if(!app.current)return;
  $("projectName").value=app.current.name||"";
  $("projectAspect").value=(["3:4 Portrait","9:16 Portrait","4:3","16:9","2.39:1","Custom"].includes(app.current.aspect)?app.current.aspect:"Custom");
  $("projectStyle").value=app.current.style||"Storyboard B&W";
  $("aspectWidth").value=app.current.aspectWidth||3;$("aspectHeight").value=app.current.aspectHeight||4;
  $("customAspectFields").hidden=$("projectAspect").value!=="Custom";
  if($("projectFolderBadge"))$("projectFolderBadge").textContent=app.current.folder||"General";
  renderSceneList();renderSceneSettings();renderShot();renderSheet();updateSheetButtons();applyPermissionLocks();
  if(app.mode==="cloud")rememberWorkspace()
}
function renderSceneList(){
  const wrap=$("sceneList");wrap.innerHTML="";
  const scenes=(app.current.scenes||[]).sort((a,b)=>a.position-b.position);
  scenes.forEach((scene,sceneIndex)=>{
    const group=document.createElement("div");group.className="scene-group"+(scene.id===app.activeSceneId?" active":"")+(scene.collapsed?" collapsed":"");
    const row=document.createElement("div");row.className="scene-row";
    const actions=scene.collapsed?`
        <button class="scene-mini rename-scene" type="button" title="Rename scene">✎</button>
        <button class="scene-mini duplicate-scene" type="button" title="Duplicate scene">⧉</button>
        <button class="scene-mini move-scene-up" type="button" title="Move scene up" ${sceneIndex===0?"disabled":""}>↑</button>
        <button class="scene-mini move-scene-down" type="button" title="Move scene down" ${sceneIndex===scenes.length-1?"disabled":""}>↓</button>`:`
        <button class="scene-mini add-shot-scene" type="button" title="Add shot to this scene">＋</button>
        <button class="scene-mini delete-shot-scene" type="button" title="Delete selected shot" ${scene.shots.length<=1?"disabled":""}>−</button>`;
    row.innerHTML=`
      <button class="scene-select" type="button" title="Click scene name to open / close">
        <span class="scene-title-stack"><strong>Scene ${scene.number}</strong><small>${escapeHtml(scene.title||"")}</small></span>
        <span class="scene-count">${scene.shots.length} shots</span>
      </button>
      <div class="scene-actions">${actions}</div>`;
    row.querySelector(".scene-select").onclick=()=>toggleSceneCollapse(scene.id,true);
    row.querySelector(".rename-scene")?.addEventListener("click",()=>renameScene(scene.id));
    row.querySelector(".duplicate-scene")?.addEventListener("click",()=>duplicateScene(scene.id));
    row.querySelector(".move-scene-up")?.addEventListener("click",()=>moveScene(scene.id,-1));
    row.querySelector(".move-scene-down")?.addEventListener("click",()=>moveScene(scene.id,1));
    row.querySelector(".add-shot-scene")?.addEventListener("click",()=>addShotToScene(scene.id));
    row.querySelector(".delete-shot-scene")?.addEventListener("click",()=>deleteSelectedShotFromScene(scene.id));
    row.querySelectorAll(".rename-scene,.duplicate-scene,.move-scene-up,.move-scene-down").forEach(b=>b.disabled=b.disabled||!can("scenes"));
    row.querySelectorAll(".add-shot-scene,.delete-shot-scene").forEach(b=>b.disabled=b.disabled||!can("shots"));

    const shots=document.createElement("div");shots.className="scene-shots";
    const ordered=[...scene.shots].sort((a,b)=>a.position-b.position);
    ordered.forEach((shot,shotIndex)=>{
      const sr=document.createElement("div");sr.className="shot-row";
      const b=document.createElement("button");b.type="button";b.className="shot-item"+(shot.id===app.activeShotId?" active":"");
      const th=document.createElement("span");th.className="shot-thumb";if(shot.image)th.style.backgroundImage=`url(${shot.image})`;
      const txt=document.createElement("span");txt.className="shot-item-text";txt.innerHTML=`<strong>Shot ${shot.shotNo}</strong><small>${shortValue(shot.shotSize)} · ${shot.duration||"No duration"}</small>`;
      b.append(th,txt);b.onclick=()=>{app.activeSceneId=scene.id;app.activeShotId=shot.id;renderEditor();rememberWorkspace()};
      const controls=document.createElement("span");controls.className="shot-inline-actions";
      controls.innerHTML=`<button type="button" class="shot-up" title="Move shot up" ${shotIndex===0?"disabled":""}>↑</button><button type="button" class="shot-down" title="Move shot down" ${shotIndex===ordered.length-1?"disabled":""}>↓</button>`;
      controls.querySelector(".shot-up").onclick=()=>moveShotById(scene.id,shot.id,-1);
      controls.querySelector(".shot-down").onclick=()=>moveShotById(scene.id,shot.id,1);
      controls.querySelectorAll("button").forEach(x=>x.disabled=x.disabled||!can("shots"));
      sr.append(b,controls);shots.appendChild(sr)
    });
    group.append(row,shots);wrap.appendChild(group)
  });
  updateSceneHeaderToggle();
}
function renderSceneSettings(){
  const s=currentScene();if(!s)return;$("sceneNumber").value=s.number;$("sceneTitle").value=s.title||"";$("sceneDescription").value=s.description||""
}
function renderShot(){
  const s=currentShot(),sc=currentScene();if(!s||!sc)return;
  SHOT_FIELDS.forEach(id=>{if($(id))$(id).value=s[id]??""});
  $("shotKicker").textContent=`SCENE ${String(sc.number).padStart(2,"0")} · SHOT ${String(s.shotNo).padStart(2,"0")}`;
  $("shotTitle").textContent=`Shot ${s.shotNo}`;
  $("quickSize").textContent=shortValue(s.shotSize);$("quickAngle").textContent=s.angle;$("quickLens").textContent=s.lens;$("quickMove").textContent=s.movement;
  $("frameMeta").textContent=`${projectAspectText(app.current)} · ${shortValue(s.shotSize)} · ${s.angle}`;
  const f=$("storyFrame");f.style.aspectRatio=`${aspectNumbers(app.current).w}/${aspectNumbers(app.current).h}`;
  const img=$("frameImage"),ph=document.querySelector(".frame-placeholder");
  if(s.image){img.src=s.image;img.hidden=false;ph.hidden=true;$("removeImageBtn").hidden=false}else{img.hidden=true;img.removeAttribute("src");ph.hidden=false;$("removeImageBtn").hidden=true}
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
function applyPermissionLocks(){
  const projectLocked=!can("project_settings"),sceneLocked=!can("scenes"),shotLocked=!can("shots"),mediaLocked=!can("media");
  ["projectName","projectAspect","projectStyle","aspectWidth","aspectHeight"].forEach(id=>$(id).disabled=projectLocked);
  // Project Details remains viewable for collaborators; the modal itself becomes read-only.
  $("projectDetailsBtn").disabled=false;
  $("sceneNumber").readOnly=true;$("sceneNumber").disabled=false;
  ["sceneTitle","sceneDescription"].forEach(id=>$(id).disabled=sceneLocked);
  ["addSceneBtn","deleteSceneBtn"].forEach(id=>$(id).disabled=sceneLocked);
  ["addShotBtn","mobileAddShotBtn","duplicateShotBtn","moveShotUpBtn","moveShotDownBtn","deleteShotBtn"].forEach(id=>$(id).disabled=shotLocked);
  $("pasteShotBtn").disabled=shotLocked||!app.shotClipboard;
  $("copyShotBtn").disabled=!currentShot();
  SHOT_FIELDS.forEach(id=>{if($(id))$(id).disabled=shotLocked});
  $("shotNo").readOnly=true;$("shotNo").disabled=false;
  $("frameImageInput").disabled=mediaLocked;$("chooseImageLabel").classList.toggle("permission-locked",mediaLocked);$("removeImageBtn").disabled=mediaLocked;
  $("collaborateBtn").hidden=app.mode!=="cloud";
}

/* ---------- SAVING ---------- */
function queueSave(kind){
  if(app.mode==="local"){saveLocal();return}
  clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveCloud(kind),550)
}
async function saveCloud(kind){
  if(!sb||!app.current)return;
  app.ignoreRealtimeUntil=Date.now()+1400;
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
  $("customAspectFields").hidden=app.current.aspect!=="Custom";renderShot();renderSheet();queueSave("project");rememberWorkspace()
}
function onSceneChange(){
  if(!can("scenes"))return;const s=currentScene();if(!s)return;s.title=$("sceneTitle").value;s.description=$("sceneDescription").value;renderSceneList();renderShot();renderSheet();queueSave("scene");rememberWorkspace()
}
function onShotChange(id){
  if(!can("shots")||id==="shotNo")return;const s=currentShot();if(!s)return;s[id]=$(id).value;renderShot();renderSceneList();renderSheet();queueSave("shot");rememberWorkspace()
}

/* ---------- MEDIA COPY HELPERS ---------- */
async function copyMediaPath(sourcePath,newProjectId,newShotId){
  if(app.mode!=="cloud"||!sourcePath)return null;
  const clean=String(sourcePath);const ext=(clean.match(/\.([a-zA-Z0-9]+)$/)||[])[1]||"jpg";
  const dest=`${newProjectId}/${newShotId}/${Date.now()}-copy.${ext}`;
  const {error}=await sb.storage.from("storyboards").copy(clean,dest);
  if(error){console.warn("Could not copy storyboard image",error);return null}
  return dest
}
async function removeMediaPaths(paths){
  const clean=[...new Set((paths||[]).filter(Boolean))];if(app.mode!=="cloud"||!clean.length)return;
  const {error}=await sb.storage.from("storyboards").remove(clean);if(error)console.warn("Could not remove storyboard media",error)
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
  app.suppressRealtime++;
  try{
    for(const s of app.current.scenes){
      const {error}=await sb.from("scenes").update({scene_number:s.number,position:s.position,collapsed:!!s.collapsed}).eq("id",s.id);
      if(error)throw error
    }
  }catch(err){alert(`Could not save scene order: ${err.message}`)}finally{app.suppressRealtime--}
  renderEditor();
}
async function persistShotOrder(scene){
  normalizeShotNumbers(scene);
  if(app.mode==="local"){saveLocal();renderEditor();return}
  app.suppressRealtime++;
  try{
    for(const s of scene.shots){
      const {error}=await sb.from("shots").update({shot_number:s.shotNo,position:s.position,data:shotDbData(s)}).eq("id",s.id);
      if(error)throw error
    }
  }catch(err){alert(`Could not save shot order: ${err.message}`)}finally{app.suppressRealtime--}
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
  if(!can("scenes")||!can("shots"))return;
  const source=app.current.scenes.find(s=>s.id===sceneId);if(!source)return;
  if(app.mode==="local"){
    const clone=deepClone(source);clone.id=uid();clone.title=`${source.title||`Scene ${source.number}`} Copy`;clone.position=source.position+.5;clone.collapsed=false;
    clone.shots=source.shots.map((s,i)=>({...deepClone(s),id:uid(),shotNo:i+1,position:i+1}));
    app.current.scenes.push(clone);normalizeSceneOrder();app.activeSceneId=clone.id;app.activeShotId=clone.shots[0]?.id||null;saveLocal();renderEditor();return
  }
  app.suppressRealtime++;
  try{
    const {data:newScene,error}=await sb.from("scenes").insert({project_id:app.current.id,scene_number:source.number+1,title:`${source.title||`Scene ${source.number}`} Copy`,description:source.description||"",position:source.position+.5,collapsed:false}).select().single();
    if(error)throw error;
    let firstShotId=null;
    for(const sh of [...source.shots].sort((a,b)=>a.position-b.position)){
      const {data:newRow,error:shotErr}=await sb.from("shots").insert({project_id:app.current.id,scene_id:newScene.id,shot_number:sh.shotNo,position:sh.position,data:shotDbData(sh),image_path:null}).select().single();
      if(shotErr)throw shotErr;if(!firstShotId)firstShotId=newRow.id;
      const copied=await copyMediaPath(sh.imagePath,app.current.id,newRow.id);
      if(copied){const {error:u}=await sb.from("shots").update({image_path:copied}).eq("id",newRow.id);if(u)throw u}
    }
    await openCloudProject(app.current.id);normalizeSceneOrder();
    for(const s of app.current.scenes){const {error:e}=await sb.from("scenes").update({scene_number:s.number,position:s.position}).eq("id",s.id);if(e)throw e}
    await openCloudProject(app.current.id);app.activeSceneId=newScene.id;app.activeShotId=firstShotId;renderEditor()
  }catch(err){alert(`Could not duplicate scene: ${err.message}`)}finally{app.suppressRealtime--}
}
async function moveScene(sceneId,delta){
  if(!can("scenes"))return;const arr=app.current.scenes.sort((a,b)=>a.position-b.position),i=arr.findIndex(x=>x.id===sceneId),j=i+delta;if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((s,k)=>s.position=k+1);await persistSceneOrder();
}
async function deleteScene(){
  if(!can("scenes"))return;if(app.current.scenes.length===1){alert("At least one scene must remain.");return}const s=currentScene();if(!confirm(`Delete Scene ${s.number} and all of its shots?`))return;
  if(app.mode==="local"){app.current.scenes=app.current.scenes.filter(x=>x.id!==s.id);normalizeSceneOrder();selectFirst();saveLocal();renderEditor();return}
  app.suppressRealtime++;
  try{
    await removeMediaPaths(s.shots.map(x=>x.imagePath));
    const {error}=await sb.from("scenes").delete().eq("id",s.id);if(error)throw error;
    await openCloudProject(app.current.id);normalizeSceneOrder();
    for(const x of app.current.scenes){const {error:e}=await sb.from("scenes").update({scene_number:x.number,position:x.position}).eq("id",x.id);if(e)throw e}
    await openCloudProject(app.current.id)
  }catch(err){alert(`Could not delete scene: ${err.message}`)}finally{app.suppressRealtime--}
}
async function toggleSceneCollapse(sceneId,selectScene=false){
  const scene=app.current?.scenes.find(s=>s.id===sceneId);if(!scene)return;
  if(selectScene){
    app.activeSceneId=scene.id;
    if(!scene.shots.some(s=>s.id===app.activeShotId))app.activeShotId=scene.shots[0]?.id||null;
  }
  scene.collapsed=!scene.collapsed;renderEditor();rememberWorkspace();
  if(app.mode==="local")saveLocal();else if(can("scenes")){app.ignoreRealtimeUntil=Date.now()+1200;await sb.from("scenes").update({collapsed:scene.collapsed}).eq("id",scene.id)}
}
function updateSceneHeaderToggle(){
  const b=$("expandAllScenesBtn");if(!b||!app.current)return;
  const allExpanded=(app.current.scenes||[]).every(s=>!s.collapsed);
  b.title=allExpanded?"Collapse all scenes":"Expand all scenes";
  b.classList.toggle("all-expanded",allExpanded)
}
async function setAllScenesCollapsed(collapsed){
  (app.current?.scenes||[]).forEach(s=>s.collapsed=collapsed);renderSceneList();rememberWorkspace();
  if(app.mode==="local")saveLocal();else if(can("scenes")){app.ignoreRealtimeUntil=Date.now()+1200;await Promise.all(app.current.scenes.map(s=>sb.from("scenes").update({collapsed}).eq("id",s.id)))}
}
async function toggleAllScenes(){
  const allExpanded=(app.current?.scenes||[]).every(s=>!s.collapsed);
  await setAllScenesCollapsed(allExpanded)
}
async function addShot(){return addShotToScene(app.activeSceneId)}
async function addShotToScene(sceneId){
  if(!can("shots"))return;const sc=app.current?.scenes.find(s=>s.id===sceneId);if(!sc)return;const no=sc.shots.length+1,pos=no;
  app.activeSceneId=sc.id;sc.collapsed=false;
  if(app.mode==="local"){const sh=blankShot(no);sh.position=pos;sc.shots.push(sh);app.activeShotId=sh.id;saveLocal();renderEditor();rememberWorkspace();return}
  const sh=blankShot(no);app.ignoreRealtimeUntil=Date.now()+1400;const {data,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sc.id,shot_number:no,position:pos,data:shotDbData(sh)}).select().single();if(error){alert(error.message);return}
  await openCloudProject(app.current.id,{sceneId:sc.id,shotId:data.id,preserveSelection:true});rememberWorkspace()
}
async function deleteSelectedShotFromScene(sceneId){
  const sc=app.current?.scenes.find(s=>s.id===sceneId);if(!sc||sc.shots.length<=1)return;
  const selected=sc.shots.find(s=>s.id===app.activeShotId);
  if(!selected){app.activeSceneId=sc.id;app.activeShotId=[...sc.shots].sort((a,b)=>a.position-b.position)[0]?.id||null;renderEditor();alert("Select the shot you want to delete, then press − again.");return}
  app.activeSceneId=sc.id;await deleteShot()
}
async function moveShotById(sceneId,shotId,delta){
  if(!can("shots"))return;const sc=app.current?.scenes.find(s=>s.id===sceneId);if(!sc)return;const arr=sc.shots.sort((a,b)=>a.position-b.position),i=arr.findIndex(x=>x.id===shotId),j=i+delta;if(i<0||j<0||j>=arr.length)return;
  app.activeSceneId=sc.id;app.activeShotId=shotId;[arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((x,k)=>x.position=k+1);await persistShotOrder(sc);rememberWorkspace()
}
async function insertShotCopy(source,afterIndex){
  const sc=currentScene();if(!sc||!source)return;
  const copy=deepClone(source);copy.id=uid();copy.position=afterIndex+1.5;copy.shotNo=afterIndex+2;
  if(app.mode==="local"){sc.shots.push(copy);normalizeShotNumbers(sc);app.activeShotId=copy.id;saveLocal();renderEditor();return}
  app.suppressRealtime++;
  try{
    const {data:row,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sc.id,shot_number:copy.shotNo,position:copy.position,image_path:null,data:shotDbData(copy)}).select().single();if(error)throw error;
    const copied=await copyMediaPath(source.imagePath,app.current.id,row.id);
    if(copied){const {error:u}=await sb.from("shots").update({image_path:copied}).eq("id",row.id);if(u)throw u}
    await openCloudProject(app.current.id);const target=app.current.scenes.find(x=>x.id===sc.id);
    if(target){normalizeShotNumbers(target);for(const s of target.shots){const {error:e}=await sb.from("shots").update({shot_number:s.shotNo,position:s.position,data:shotDbData(s)}).eq("id",s.id);if(e)throw e}}
    await openCloudProject(app.current.id);app.activeSceneId=sc.id;app.activeShotId=row.id;renderEditor()
  }catch(err){alert(`Could not duplicate shot: ${err.message}`)}finally{app.suppressRealtime--}
}
async function duplicateShot(){
  if(!can("shots"))return;const s=currentShot(),sc=currentScene();if(!s)return;const idx=sc.shots.sort((a,b)=>a.position-b.position).findIndex(x=>x.id===s.id);await insertShotCopy(s,idx)
}
function copyShot(){
  const s=currentShot();if(!s)return;app.shotClipboard=deepClone(s);if(app.mode==="cloud")app.shotClipboard.image=null;$("pasteShotBtn").disabled=!can("shots");setMsg("editorNotice",`Shot ${s.shotNo} copied. Paste inserts a copy after the current shot.`)
}
async function pasteShot(){
  if(!can("shots")||!app.shotClipboard)return;const sc=currentScene();const s=currentShot();const idx=Math.max(0,sc.shots.sort((a,b)=>a.position-b.position).findIndex(x=>x.id===s?.id));await insertShotCopy(app.shotClipboard,idx)
}
async function moveShot(delta){
  const sc=currentScene(),s=currentShot();if(!sc||!s)return;await moveShotById(sc.id,s.id,delta)
}
async function deleteShot(){
  if(!can("shots"))return;const s=currentShot(),sc=currentScene();if(sc.shots.length===1){alert("Each scene needs at least one shot.");return}if(!confirm(`Delete Shot ${s.shotNo}?`))return;
  const sorted=[...sc.shots].sort((a,b)=>a.position-b.position);const oldIndex=sorted.findIndex(x=>x.id===s.id);const nextId=sorted[oldIndex+1]?.id||sorted[oldIndex-1]?.id||null;
  if(app.mode==="local"){sc.shots=sc.shots.filter(x=>x.id!==s.id);normalizeShotNumbers(sc);app.activeShotId=nextId||sc.shots[0].id;saveLocal();renderEditor();return}
  app.suppressRealtime++;
  try{
    await removeMediaPaths([s.imagePath]);
    const {error}=await sb.from("shots").delete().eq("id",s.id);if(error)throw error;
    const remaining=sc.shots.filter(x=>x.id!==s.id).sort((a,b)=>a.position-b.position);remaining.forEach((x,i)=>{x.position=i+1;x.shotNo=i+1});
    for(const x of remaining){const {error:e}=await sb.from("shots").update({shot_number:x.shotNo,position:x.position,data:shotDbData(x)}).eq("id",x.id);if(e)throw e}
    await openCloudProject(app.current.id);app.activeSceneId=sc.id;app.activeShotId=nextId||currentScene()?.shots?.[0]?.id||null;renderEditor()
  }catch(err){alert(`Could not delete shot: ${err.message}`)}finally{app.suppressRealtime--}
}
function adjacentShot(delta){
  const arr=allShots(),idx=arr.findIndex(x=>x.shot.id===app.activeShotId),target=arr[idx+delta];if(!target)return;app.activeSceneId=target.scene.id;app.activeShotId=target.shot.id;renderEditor();rememberWorkspace();window.scrollTo({top:0,behavior:"smooth"})
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
  s.image=null;s.imagePath=null;if(app.mode==="local")saveLocal();renderEditor();rememberWorkspace()
}

/* ---------- SHEET TOGGLE ---------- */
function toggleSheet(force){
  app.sheetOpen=typeof force==="boolean"?force:!app.sheetOpen;$("sheetPanel").hidden=!app.sheetOpen;updateSheetButtons();rememberWorkspace();
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

function setCollabTab(tab){
  const chat=tab==="chat";
  $("collabChatTab").classList.toggle("active",chat);$("collabMembersTab").classList.toggle("active",!chat);
  $("collabChatPane").hidden=!chat;$("collabMembersPane").hidden=chat;
  if(chat){renderChatReferenceOptions();renderChatMessages();setTimeout(()=>{const box=$("chatMessages");if(box)box.scrollTop=box.scrollHeight},30)}
  else renderMembers();
}
function renderChatReferenceOptions(){
  const el=$("chatReferenceSelect");if(!el||!app.current)return;
  const previous=el.value;
  const opts=[`<option value="">No reference</option>`,`<option value="project|${app.current.id}">Project · ${escapeHtml(app.current.name)}</option>`];
  opts.push('<optgroup label="Scenes">');
  for(const sc of [...app.current.scenes].sort((a,b)=>a.position-b.position))opts.push(`<option value="scene|${sc.id}">Scene ${sc.number} · ${escapeHtml(sc.title||"")}</option>`);
  opts.push('</optgroup><optgroup label="Shots">');
  for(const sc of [...app.current.scenes].sort((a,b)=>a.position-b.position))for(const sh of [...sc.shots].sort((a,b)=>a.position-b.position))opts.push(`<option value="shot|${sh.id}">Scene ${sc.number} · Shot ${sh.shotNo} · ${escapeHtml((sh.summary||sh.subject||"").slice(0,50))}</option>`);
  opts.push('</optgroup>');
  const sh=currentShot(),sc=currentScene();
  if(sh&&sc){
    const sections=[["shot_frame","Frame · Camera & Composition"],["shot_subject","Subject · Character & Action"],["shot_light","Light & Space"],["shot_audio","Audio"],["shot_edit","Edit & Notes"]];
    opts.push('<optgroup label="Current Shot Sections">');
    for(const [type,label] of sections)opts.push(`<option value="${type}|${sh.id}">Scene ${sc.number} · Shot ${sh.shotNo} · ${label}</option>`);
    opts.push('</optgroup>')
  }
  el.innerHTML=opts.join("");
  if([...el.options].some(o=>o.value===previous))el.value=previous
}
function chatReferenceFromSelect(){
  const el=$("chatReferenceSelect"),raw=el?.value||"";if(!raw)return {context_type:null,context_id:null,context_label:null};
  const [context_type,context_id]=raw.split("|");return {context_type,context_id,context_label:el.options[el.selectedIndex]?.textContent||null}
}
async function renderChatMessages(){
  if(app.mode!=="cloud"||!app.current||!$("chatMessages"))return;
  const box=$("chatMessages");box.innerHTML='<div class="chat-loading">Loading conversation…</div>';
  const {data:rows,error}=await sb.from("project_messages").select("id,user_id,body,context_type,context_id,context_label,created_at").eq("project_id",app.current.id).order("created_at",{ascending:true}).limit(300);
  if(error){box.innerHTML=`<div class="notice warning">${escapeHtml(error.message)}</div>`;return}
  const ids=[...new Set((rows||[]).map(x=>x.user_id))];let profiles=[];
  if(ids.length){const {data}=await sb.from("profiles").select("id,username,display_name").in("id",ids);profiles=data||[]}
  box.innerHTML="";
  if(!rows?.length){box.innerHTML='<div class="chat-empty">No messages yet. Start the project conversation.</div>';return}
  for(const row of rows){
    const mine=row.user_id===app.session.user.id,pr=profiles.find(p=>p.id===row.user_id)||{},name=pr.display_name||pr.username||(mine?"You":"Collaborator");
    const item=document.createElement("div");item.className="chat-message"+(mine?" mine":"");
    const ref=row.context_type&&row.context_label?`<button type="button" class="chat-ref" data-type="${escapeHtml(row.context_type)}" data-id="${escapeHtml(row.context_id||"")}">↗ ${escapeHtml(row.context_label)}</button>`:"";
    item.innerHTML=`<div class="chat-meta"><strong>${escapeHtml(name)}</strong><span>${new Date(row.created_at).toLocaleString()}</span></div>${ref}<div class="chat-body">${escapeHtml(row.body).replace(/\n/g,"<br>")}</div>`;
    item.querySelector(".chat-ref")?.addEventListener("click",e=>jumpToChatReference(e.currentTarget.dataset.type,e.currentTarget.dataset.id));
    box.appendChild(item)
  }
  box.scrollTop=box.scrollHeight
}
async function sendChatMessage(){
  if(app.mode!=="cloud"||!app.current)return;const input=$("chatMessageInput"),body=input.value.trim();if(!body)return;
  const ref=chatReferenceFromSelect();$("sendChatMessageBtn").disabled=true;
  const {error}=await sb.from("project_messages").insert({project_id:app.current.id,user_id:app.session.user.id,body,...ref});
  $("sendChatMessageBtn").disabled=false;
  if(error){setMsg("collabMessage",error.message,"warning");return}
  input.value="";$("chatReferenceSelect").value="";await renderChatMessages()
}
function jumpToChatReference(type,id){
  if(!app.current)return;
  if(type==="project"){$("collabModal").close();unsubscribeChatRealtime();openProjectDetails(app.current.id);return}
  let sc=null,sh=null;
  if(type==="scene")sc=app.current.scenes.find(x=>x.id===id)||null;
  else{for(const s of app.current.scenes){const found=s.shots.find(x=>x.id===id);if(found){sc=s;sh=found;break}}}
  if(!sc)return;sc.collapsed=false;app.activeSceneId=sc.id;app.activeShotId=sh?.id||sc.shots[0]?.id||null;
  $("collabModal").close();unsubscribeChatRealtime();renderEditor();rememberWorkspace();
  const sectionMap={shot_frame:"frameSection",shot_subject:"subjectSection",shot_light:"lightSection",shot_audio:"audioSection",shot_edit:"editSection"};
  const sectionId=sectionMap[type];if(sectionId){const d=$(sectionId);if(d){d.open=true;setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),30)}}
}
function subscribeChatRealtime(){
  unsubscribeChatRealtime();if(!sb||app.mode!=="cloud"||!app.current)return;
  const pid=app.current.id;app.chatChannel=sb.channel(`project-chat-${pid}`)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"project_messages",filter:`project_id=eq.${pid}`},()=>renderChatMessages())
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"project_messages",filter:`project_id=eq.${pid}`},()=>renderChatMessages())
    .subscribe()
}
function unsubscribeChatRealtime(){if(sb&&app.chatChannel){sb.removeChannel(app.chatChannel);app.chatChannel=null}}
async function openCollab(){
  if(app.mode!=="cloud"){alert("Collaboration becomes available after Supabase cloud accounts are connected.");return}
  $("collabModal").showModal();setMsg("collabMessage","");$("shareLinkBox").hidden=true;
  $("collabOwnerTools").hidden=!(app.isOwner||can("members"));
  setCollabTab("chat");subscribeChatRealtime()
}
async function renderMembers(){
  const wrap=$("membersList");wrap.innerHTML="";const pid=app.current.id;
  const {data:members,error}=await sb.from("project_members").select("user_id,role,permissions,joined_at").eq("project_id",pid);if(error){setMsg("collabMessage",error.message,"warning");return}
  const ids=(members||[]).map(x=>x.user_id);let profiles=[];
  if(ids.length){const {data}=await sb.from("profiles").select("id,username,display_name").in("id",ids);profiles=data||[]}
  const owner=document.createElement("div");owner.className="member-row";owner.innerHTML=`<span><strong>Project owner</strong><small>Full access</small></span><span>Owner</span>`;wrap.appendChild(owner);
  (members||[]).forEach(m=>{
    const pr=profiles.find(p=>p.id===m.user_id)||{};const row=document.createElement("div");row.className="member-row";
    const manage=app.isOwner||can("members");
    row.innerHTML=`<span><strong>${escapeHtml(pr.display_name||pr.username||"Member")}</strong><small>${pr.username?"@"+escapeHtml(pr.username):""}</small></span>${manage?'<span class="member-actions"><button type="button" class="btn ghost edit-member">Access</button><button type="button" class="btn ghost remove-member">Remove</button></span>':`<span class="member-role-label">${escapeHtml(m.role||"member")}</span>`}`;
    if(manage){
      row.querySelector(".edit-member").onclick=async()=>{const preset=prompt("Set role: viewer, editor or custom","editor");if(!preset)return;let perms=preset==="viewer"?blankPermissions():preset==="editor"?editorPermissions():m.permissions||editorPermissions();const {error}=await sb.from("project_members").update({role:preset,permissions:perms}).eq("project_id",pid).eq("user_id",m.user_id);if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
      row.querySelector(".remove-member").onclick=async()=>{if(!confirm("Remove this collaborator?"))return;const {error}=await sb.from("project_members").delete().eq("project_id",pid).eq("user_id",m.user_id);if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
    }
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
    name:pName,aspect,
    aspect_width:Number(projectData.aspectWidth||projectData.project?.aspectWidth||3),
    aspect_height:Number(projectData.aspectHeight||projectData.project?.aspectHeight||4),
    style:projectData.style||projectData.project?.style||"Storyboard B&W",
    owner_id:app.session.user.id,
    position:Math.max(0,...(app.projects||[]).filter(x=>projectIsOwner(x)).map(x=>Number(x.position||0)))+1,
    is_favorite:!!(projectData.isFavorite??projectData.is_favorite),
    folder:projectData.folder||"General",tags:normalizeTags(projectData.tags),metadata:projectMeta(projectData)
  }).select().single();
  if(pe) throw pe;
  let scenes=Array.isArray(projectData.scenes)?projectData.scenes:[];
  if(!scenes.length)scenes=[{number:1,title:"Scene 1",shots:Array.isArray(projectData.shots)?projectData.shots:[]}];
  for(let si=0;si<scenes.length;si++){
    const sc=scenes[si]||{};
    const {data:s,error:se}=await sb.from("scenes").insert({project_id:p.id,scene_number:si+1,title:sc.title||`Scene ${si+1}`,description:sc.description||"",position:si+1,collapsed:!!sc.collapsed}).select().single();
    if(se) throw se;
    let shots=Array.isArray(sc.shots)?sc.shots:[];if(!shots.length)shots=[blankShot(1)];
    for(let i=0;i<shots.length;i++){
      const shot={...blankShot(i+1),...shots[i],shotNo:i+1,position:i+1};delete shot.id;delete shot.image;delete shot.imagePath;
      const {error:e}=await sb.from("shots").insert({project_id:p.id,scene_id:s.id,shot_number:i+1,position:i+1,image_path:null,data:shot});if(e)throw e
    }
  }
  return p.id;
}

async function importJSONOnline(file){
  const text=await file.text();const data=JSON.parse(text);if(!data.scenes&&!data.shots)throw new Error("Unsupported storyboard JSON.");
  if(app.mode==="cloud"){
    const id=await createCloudProjectFromJSON(data);await loadCloudProjects();await openCloudProject(id);alert("Storyboard imported successfully. Images can be added manually to each shot.")
  }else{
    const p={...blankProject(data.name||"Imported Storyboard"),...data,id:uid(),owner_id:null};
    p.tags=normalizeTags(p.tags);p.metadata=projectMeta(p);p.folder=p.folder||"General";p.isFavorite=!!(p.isFavorite??p.is_favorite);
    let scenes=Array.isArray(p.scenes)?p.scenes:[];if(!scenes.length)scenes=[{title:"Scene 1",shots:Array.isArray(data.shots)?data.shots:[]}];
    p.scenes=scenes.map((sc,si)=>({...blankScene(si+1),...sc,id:uid(),number:si+1,position:si+1,collapsed:!!sc.collapsed,shots:(Array.isArray(sc.shots)&&sc.shots.length?sc.shots:[blankShot(1)]).map((sh,i)=>({...blankShot(i+1),...sh,id:uid(),shotNo:i+1,position:i+1}))}));
    app.current=p;app.projects.push(p);selectFirst();saveLocal();renderEditor();alert("Storyboard imported locally.")
  }
}

/* ---------- PROJECT MANAGEMENT ---------- */
function projectDragEnabled(){return app.projectFilter==="all" && !app.projectSearch.trim() && app.projectFolder==="all"}
async function persistProjectPositions(){
  const mine=app.projects.filter(p=>projectIsOwner(p));
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
  const p=app.projects.find(x=>x.id===id);if(!p||!projectCanEdit(p))return;const name=prompt("New project name:",p.name);if(!name?.trim())return;
  const clean=name.trim();
  if(app.mode==="cloud"){const {error}=await sb.from("projects").update({name:clean,updated_at:new Date().toISOString()}).eq("id",id);if(error)return alert(error.message)}
  p.name=clean;if(app.current?.id===id)app.current.name=clean;if(app.mode==="local")saveLocal();renderProjects()
}
async function deleteProject(id){
  const p=app.projects.find(x=>x.id===id);if(!p||!projectIsOwner(p)||!confirm(`Delete "${p.name}"? This cannot be undone.`))return;
  if(app.mode==="cloud"){
    app.suppressRealtime++;
    try{
      const {data:paths}=await sb.from("shots").select("image_path").eq("project_id",id);await removeMediaPaths((paths||[]).map(x=>x.image_path));
      const rpc=await sb.rpc("delete_own_project",{p_project_id:id});
      if(rpc.error){
        const {data:deleted,error}=await sb.from("projects").delete().eq("id",id).eq("owner_id",app.session.user.id).select("id");
        if(error)throw error;if(!deleted?.length)throw new Error("Project was not deleted. Run the v3.5 Supabase migration and try again.")
      }
    }catch(err){alert(`Could not delete project: ${err.message}`);app.suppressRealtime--;return}
    app.suppressRealtime--
  }
  app.projects=app.projects.filter(x=>x.id!==id);if(app.current?.id===id)app.current=null;
  if(app.mode==="local"){localStorage.setItem("storyboard-v3-projects",JSON.stringify(app.projects))}else await persistProjectPositions();
  renderProjects()
}
async function toggleFavorite(id){
  const p=app.projects.find(x=>x.id===id);if(!p||!projectCanEdit(p))return;const old=p.isFavorite;p.isFavorite=!old;
  if(app.mode==="cloud"){const {error}=await sb.from("projects").update({is_favorite:p.isFavorite,updated_at:new Date().toISOString()}).eq("id",id);if(error){p.isFavorite=old;return alert(error.message)}}
  else localStorage.setItem("storyboard-v3-projects",JSON.stringify(app.projects));renderProjects()
}
async function duplicateProject(id){
  const source=app.projects.find(x=>x.id===id);if(!source)return;
  if(app.mode==="local"){
    const clone=deepClone(source);clone.id=uid();clone.name=`${source.name} Copy`;clone.owner_id=null;clone.position=app.projects.length+1;clone.isFavorite=false;clone.scenes=(clone.scenes||[]).map((sc,si)=>({...sc,id:uid(),number:si+1,position:si+1,collapsed:false,shots:(sc.shots||[]).map((sh,ii)=>({...sh,id:uid(),shotNo:ii+1,position:ii+1}))}));app.projects.push(clone);localStorage.setItem("storyboard-v3-projects",JSON.stringify(app.projects));renderProjects();return
  }
  app.suppressRealtime++;
  try{
    const {data:p,error}=await sb.from("projects").select("*").eq("id",id).single();if(error)throw error;
    const {data:scenes,error:se}=await sb.from("scenes").select("*").eq("project_id",id).order("position");if(se)throw se;
    const {data:shots,error:shErr}=await sb.from("shots").select("*").eq("project_id",id).order("position");if(shErr)throw shErr;
    const position=Math.max(0,...app.projects.filter(x=>projectIsOwner(x)).map(x=>Number(x.position||0)))+1;
    const {data:newP,error:pe}=await sb.from("projects").insert({owner_id:app.session.user.id,name:`${p.name} Copy`,aspect:p.aspect,aspect_width:p.aspect_width,aspect_height:p.aspect_height,style:p.style,position,is_favorite:false,folder:p.folder||"General",tags:normalizeTags(p.tags),metadata:p.metadata||{}}).select().single();if(pe)throw pe;
    for(const [si,sc] of (scenes||[]).entries()){
      const {data:newSc,error:sce}=await sb.from("scenes").insert({project_id:newP.id,scene_number:si+1,title:sc.title,description:sc.description||"",position:si+1,collapsed:false}).select().single();if(sce)throw sce;
      const rows=(shots||[]).filter(r=>r.scene_id===sc.id).sort((a,b)=>a.position-b.position);
      for(const [ri,row] of rows.entries()){
        const {data:newRow,error:e}=await sb.from("shots").insert({project_id:newP.id,scene_id:newSc.id,shot_number:ri+1,position:ri+1,image_path:null,data:row.data||{}}).select().single();if(e)throw e;
        const copied=await copyMediaPath(row.image_path,newP.id,newRow.id);if(copied){const {error:u}=await sb.from("shots").update({image_path:copied}).eq("id",newRow.id);if(u)throw u}
      }
    }
    await loadCloudProjects();await openCloudProject(newP.id)
  }catch(err){alert(`Could not duplicate project: ${err.message}`)}finally{app.suppressRealtime--}
}
function openProjectDetails(id){
  const p=(app.current?.id===id?app.current:app.projects.find(x=>x.id===id));if(!p)return;app.detailsProjectId=id;const m=projectMeta(p);
  $("detailProjectName").value=p.name||"";$("detailProjectFolder").value=p.folder||"General";$("detailProjectTags").value=(p.tags||[]).join(", ");
  $("detailDirector").value=m.director||"";$("detailCinematographer").value=m.cinematographer||"";$("detailWriter").value=m.writer||"";$("detailProduction").value=m.production||"";$("detailStatus").value=m.status||"Planning";$("detailNotes").value=m.notes||"";$("detailFavorite").checked=!!p.isFavorite;
  const editable=projectCanEdit(p)||(app.current?.id===id&&can("project_settings"));
  ["detailProjectName","detailProjectFolder","detailProjectTags","detailDirector","detailCinematographer","detailWriter","detailProduction","detailStatus","detailNotes","detailFavorite"].forEach(x=>$(x).disabled=!editable);
  $("saveProjectDetailsBtn").hidden=!editable;$("projectDetailsModal").showModal()
}
async function saveProjectDetails(){
  const id=app.detailsProjectId,p=(app.current?.id===id?app.current:app.projects.find(x=>x.id===id));if(!p)return;
  p.name=$("detailProjectName").value.trim()||p.name;p.folder=$("detailProjectFolder").value.trim()||"General";p.tags=normalizeTags($("detailProjectTags").value);p.isFavorite=$("detailFavorite").checked;
  p.metadata={director:$("detailDirector").value.trim(),cinematographer:$("detailCinematographer").value.trim(),writer:$("detailWriter").value.trim(),production:$("detailProduction").value.trim(),status:$("detailStatus").value,notes:$("detailNotes").value.trim()};
  if(app.mode==="cloud"){
    const {error}=await sb.from("projects").update({name:p.name,folder:p.folder,tags:p.tags,is_favorite:p.isFavorite,metadata:p.metadata,updated_at:new Date().toISOString()}).eq("id",id);if(error)return alert(error.message)
  }else saveLocal();
  if(app.current?.id===id){app.current={...app.current,...p};$("projectName").value=p.name;if($("projectFolderBadge"))$("projectFolderBadge").textContent=p.folder}
  p.updated_at=new Date().toISOString();const listP=app.projects.find(x=>x.id===id);if(listP)Object.assign(listP,p);$("projectDetailsModal").close();renderProjects()
}

/* ---------- EVENTS ---------- */
function bind(){
  $("loginTabBtn").onclick=()=>toggleAuthTab("login");$("signupTabBtn").onclick=()=>toggleAuthTab("signup");$("loginEmailMode").onclick=()=>setLoginKind("email");$("loginUsernameMode").onclick=()=>setLoginKind("username");
  $("loginForm").onsubmit=doLogin;$("signupForm").onsubmit=doSignup;$("forgotPasswordBtn").onclick=forgotPassword;$("continueOfflineBtn").onclick=continueOffline;
  $("logoutBtn").onclick=logout;$("newCloudProjectBtn").onclick=createCloudProject;$("emptyNewProjectBtn").onclick=createCloudProject;
  $("accountBtn").onclick=()=>$("accountModal").showModal();$("closeAccountBtn").onclick=()=>$("accountModal").close();
  $("backProjectsBtn").onclick=async()=>{unsubscribeRealtime();unsubscribeChatRealtime();if(app.mode==="cloud"){rememberProjectsView();await loadCloudProjects();showProjects()}else showAuth()};
  $("projectSearch").oninput=e=>{app.projectSearch=e.target.value;renderProjects()};
  $("projectFilter").onchange=e=>{app.projectFilter=e.target.value;renderProjects()};
  $("projectFolderFilter").onchange=e=>{app.projectFolder=e.target.value;renderProjects()};
  $("closeProjectDetailsBtn").onclick=()=>$("projectDetailsModal").close();$("saveProjectDetailsBtn").onclick=saveProjectDetails;$("projectDetailsBtn").onclick=()=>openProjectDetails(app.current.id);
  ["projectName","projectAspect","projectStyle","aspectWidth","aspectHeight"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onProjectChange))});
  ["sceneTitle","sceneDescription"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onSceneChange))});
  SHOT_FIELDS.filter(id=>id!=="shotNo").forEach(id=>{if($(id))["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>onShotChange(id)))});
  $("addSceneBtn").onclick=addScene;$("deleteSceneBtn").onclick=deleteScene;$("collapseAllScenesBtn").onclick=()=>setAllScenesCollapsed(true);$("expandAllScenesBtn").onclick=toggleAllScenes;
  $("addShotBtn").onclick=addShot;$("mobileAddShotBtn").onclick=addShot;$("duplicateShotBtn").onclick=duplicateShot;$("copyShotBtn").onclick=copyShot;$("pasteShotBtn").onclick=pasteShot;$("moveShotUpBtn").onclick=()=>moveShot(-1);$("moveShotDownBtn").onclick=()=>moveShot(1);$("deleteShotBtn").onclick=deleteShot;
  $("prevShotBtn").onclick=()=>adjacentShot(-1);$("nextShotBtn").onclick=()=>adjacentShot(1);
  $("frameImageInput").onchange=loadImage;$("removeImageBtn").onclick=removeImage;
  $("sheetToggleBtn").onclick=()=>toggleSheet();$("mobileSheetBtn").onclick=()=>toggleSheet();$("closeSheetBtn").onclick=()=>toggleSheet(false);$("shotsPerPage").onchange=renderSheet;$("printSheetBtn").onclick=()=>window.print();
  $("exportBtn").onclick=exportJSON;$("importInput").onchange=e=>{const f=e.target.files[0];if(f)importJSONOnline(f).catch(err=>alert(err.message||"Import failed."));e.target.value="";};
  document.querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>{$(b.dataset.focus).focus();$(b.dataset.focus).scrollIntoView({behavior:"smooth",block:"center"})});
  $("collaborateBtn").onclick=openCollab;$("addMemberBtn").onclick=addMemberByUsername;$("createShareLinkBtn").onclick=createShareLink;$("copyShareLinkBtn").onclick=async()=>{await navigator.clipboard.writeText($("shareLinkOutput").value);setMsg("collabMessage","Invite link copied.")};
  $("permissionPreset").onchange=e=>{if(e.target.value!=="custom")setPermissionPreset(e.target.value)};
  $("collabMembersTab").onclick=()=>setCollabTab("members");$("collabChatTab").onclick=()=>setCollabTab("chat");$("sendChatMessageBtn").onclick=sendChatMessage;
  $("chatMessageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendChatMessage()}});
  $("closeCollabBtn").onclick=()=>{$("collabModal").close();unsubscribeChatRealtime()};$("collabModal").addEventListener("close",unsubscribeChatRealtime);
  document.querySelectorAll(".accordion details").forEach(d=>d.addEventListener("toggle",()=>rememberWorkspace()));
  window.addEventListener("scroll",queueWorkspaceScrollSave,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)rememberWorkspace()});window.addEventListener("pagehide",()=>rememberWorkspace())
}

start();
