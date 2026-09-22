// Storyboard Shot Builder v4.6.0 — folders, unified image crop and bilingual rich Script editing
const OPTIONS = {
  shotSize:["ECU · Extreme Close Up","CU · Close Up","MCU · Medium Close Up","MS · Medium Shot","MLS · Medium Long Shot","WS · Wide Shot","EWS · Extreme Wide Shot","OTS · Over The Shoulder","POV · Point of View","Insert","Top Shot"],
  angle:["Eye Level","High Angle","Low Angle","Top / Bird's Eye","Dutch Angle","Ground Level","Overhead","Custom"],
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
const SHOT_FIELDS = ["shotNo","duration","shotSize","angle","lens","focus","movement","startEnd","composition","summary","subject","description","performance","subjectMovement","costume","timeOfDay","location","lightSource","lightDirection","lightQuality","lighting","props","dialogue","voiceOver","sfx","music","transitionIn","transitionOut","notes"];
const SCENE_TIME_OPTIONS = ["Unspecified","Dawn","Morning","Day","Sunset","Twilight","Night"];
const SCENE_TIME_STRATEGIES = [
  ["natural","Natural / Same as Story"],
  ["day_for_night","Day for Night"],
  ["night_for_day","Night for Day"]
];
const SCRIPT_MAX_ANALYSIS_CHARS = 180000;
const $ = id => document.getElementById(id);
const cfg = window.APP_CONFIG || {};
const cloudConfigured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const sb = cloudConfigured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
const initialAuthSearch=new URLSearchParams(location.search),initialAuthHash=new URLSearchParams(location.hash.replace(/^#/,""));
const initialAuthType=initialAuthHash.get("type")||initialAuthSearch.get("type")||"";
const initialAuthError=initialAuthHash.get("error_description")||initialAuthSearch.get("error_description")||"";

let app = {
  mode: "local",
  session: null,
  passwordRecovery: {
    active: initialAuthType==="recovery"||initialAuthSearch.get("recovery")==="1",
    error: initialAuthError,
    verified: false,
    updating: false
  },
  profile: null,
  account: {
    score: null,
    scoreLoading: false,
    profileSaving: false
  },
  projects: [],
  projectFolders: [],
  foldersReady: false,
  folderMigrationMessage: "Run the saved v4.6 Project Folders SQL query, then reload Projects.",
  moveProjectId: null,
  current: null,
  activeSceneId: null,
  activeShotId: null,
  sheetOpen: false,
  mobileScreen: "shot",
  realtimeChannel: null,
  presenceChannel: null,
  chatChannel: null,
  chatNoticeChannel: null,
  collabTab: "chat",
  permissions: fullPermissions(),
  isOwner: true,
  admin: {
    isAdmin: false,
    role: null,
    selectedUser: null,
    users: [],
    usersOffset: 0,
    usersTotal: 0,
    usersQuery: "",
    supportProjectId: null,
    supportUserId: null,
    supportUsername: null,
    supportProjectName: null
  },
  pendingInvite: new URLSearchParams(location.search).get("invite"),
  pendingLightingProject: new URLSearchParams(location.search).get("project"),
  pendingLightingDiagram: new URLSearchParams(location.search).get("diagram"),
  ai: {
    ready: false,
    sourceReady: false,
    loading: false,
    generating: false,
    generatingAssetId: null,
    generationMode: null,
    requestController: null,
    cancelRequested: false,
    previousFocus: null,
    characters: [],
    locations: [],
    usage: {
      loaded: false,
      loading: false,
      error: "",
      used: 0,
      remaining: 20,
      dailyLimit: 20,
      personalRemaining: 20,
      globalRemaining: 70,
      unlimited: false,
      usageDate: ""
    },
    migrationMessage: "Run supabase-v4.0-ai.sql to enable the Bible."
  },
  script: {
    ready: false,
    loading: false,
    saving: false,
    analyzing: false,
    applying: false,
    record: null,
    links: [],
    analysis: null,
    editorHydrated: false,
    pendingFileName: "",
    pendingFileType: "",
    selectedStart: 0,
    selectedEnd: 0,
    migrationMessage: "Run the saved v4.5 Bible Script SQL query, then reload this project."
  },
  lighting: {
    diagrams: [],
    current: null,
    selectedId: null,
    dragging: null,
    pointers: {},
    playback: {playing:false,elapsed:0,duration:4,baseCamera:null,movement:"Static"},
    godToastTimer: null,
    channel: null,
    dirty: false,
    drawerCollapsed: false,
    viewMode: "plan",
    activeCameraId: null,
    three: null
  },
  projectSearch: "",
  projectFilter: "all",
  projectFolder: "all",
  detailsProjectId: null,
  shotClipboard: null,
  suppressRealtime: 0,
  ignoreRealtimeUntil: 0
};
let autosaveTimer = null;
let scriptRenderTimer = null;
let signedImageRefreshTimer = null;
let presenceTrackTimer = null;
let lastPresenceSignature = "";
const LAYOUT_STORAGE_KEY = "storyboard-layout-mode";
let imageViewerTarget=null;
let cropState={active:false,target:null,drawable:null,cleanup:null,width:0,height:0,zoom:1,offsetX:0,offsetY:0,dragging:false,pointerId:null,startX:0,startY:0,startOffsetX:0,startOffsetY:0,saving:false};

function uid(){return (crypto.randomUUID ? crypto.randomUUID() : "id-"+Date.now()+"-"+Math.random().toString(16).slice(2))}
function fullPermissions(){return {project_settings:true,scenes:true,shots:true,media:true,members:true}}
function blankPermissions(){return {project_settings:false,scenes:false,shots:false,media:false,members:false}}
function editorPermissions(){return {project_settings:false,scenes:true,shots:true,media:true,members:false}}
function permissionPreset(name){return name==="viewer"?blankPermissions():name==="editor"?editorPermissions():readPermissionUI()}
function blankShot(no=1){return {id:uid(),shotNo:no,duration:"",shotSize:"CU · Close Up",angle:"Eye Level",lens:"50mm",focus:"Shallow Focus",movement:"Static",startEnd:"",composition:"Centered / Symmetrical",summary:"",subject:"",description:"",performance:"",subjectMovement:"",costume:"",timeOfDay:"Night",location:"",lightSource:"Candle",lightDirection:"Camera Left",lightQuality:"Low Key",lighting:"",props:"",dialogue:"",voiceOver:"",sfx:"",music:"",transitionIn:"Cut",transitionOut:"Cut",notes:"",aiCharacterIds:[],aiLocationId:"",aiGeneration:null,image:null,imagePath:null,position:no}}
function blankScene(no=1){return {id:uid(),number:no,title:`Scene ${no}`,description:"",storyLocation:"",storyTime:"Unspecified",shootTime:"Unspecified",timeStrategy:"natural",aiLocationId:"",aiCharacterIds:[],scriptSceneKey:null,position:no,collapsed:false,shots:[blankShot(1)]}}
function blankShotForScene(no,scene){const shot=blankShot(no);if(!scene)return shot;shot.aiLocationId=scene.aiLocationId||"";shot.aiCharacterIds=[...(scene.aiCharacterIds||[])];if(scene.storyTime&&scene.storyTime!=="Unspecified")shot.timeOfDay=scene.storyTime;if(scene.storyLocation)shot.location=scene.storyLocation;return shot}
function blankProject(name="Untitled Storyboard"){return {id:uid(),name,aspect:"3:4 Portrait",aspectWidth:3,aspectHeight:4,style:"Storyboard B&W",owner_id:null,role:"owner",position:0,isFavorite:false,folderId:null,folder:"General",tags:[],metadata:{director:"",cinematographer:"",writer:"",production:"",status:"Planning",notes:""},scenes:[blankScene(1)],updated_at:new Date().toISOString()}}
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
function adminSupporting(projectId=app.current?.id){return !!(app.admin.isAdmin&&app.admin.supportProjectId&&app.admin.supportProjectId===projectId)}
function projectCanEdit(p){return app.mode==="local" || p?.owner_id===app.session?.user?.id || adminSupporting(p?.id) || !!p?.dashboardPermissions?.project_settings}
function projectIsOwner(p){return app.mode==="local" || p?.owner_id===app.session?.user?.id || adminSupporting(p?.id)}
function shotDbData(s){const data={...s};delete data.id;delete data.image;delete data.imagePath;delete data.cameraHeight;return data}
function currentScene(){return app.current?.scenes.find(s=>s.id===app.activeSceneId) || app.current?.scenes[0] || null}
function currentShot(){const sc=currentScene(); return sc?.shots.find(s=>s.id===app.activeShotId) || sc?.shots[0] || null}
function allShots(){return (app.current?.scenes||[]).flatMap(scene=>scene.shots.map(shot=>({scene,shot})))}
function shortValue(v){return (v||"").split(" · ")[0]}
function escapeHtml(str){return String(str??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function show(el, yes=true){if(el) el.hidden=!yes}
function uiText(value){return window.storyboardI18n?.t(value)??String(value??"")}
function uiLocale(){return window.storyboardI18n?.locale||"en-US"}
function uiAlert(message){return window.alert(uiText(message))}
function uiConfirm(message){return window.confirm(uiText(message))}
function uiPrompt(message,defaultValue){return window.prompt(uiText(message),defaultValue===undefined?undefined:uiText(defaultValue))}
function setMsg(id,msg,type=""){const el=$(id); if(!msg){el.hidden=true;el.textContent="";return} el.hidden=false;el.textContent=uiText(msg);el.className="notice"+(type?` ${type}`:"")}
function can(key){return app.isOwner || adminSupporting() || !!app.permissions?.[key]}
const SIGNED_IMAGE_TTL_SECONDS = 3600;
const SIGNED_IMAGE_REFRESH_MS = 45 * 60 * 1000;
function conflictMessage(kind){return `This ${kind} was changed by another collaborator. I reloaded the latest version so you can review it before editing again.`}

function normalizeLayoutMode(value){return ["auto","mobile","desktop"].includes(value)?value:"auto"}
function prefixedMobileSelector(selector){
  const prefix='html[data-layout-mode="mobile"]';
  return selector.split(",").map(part=>{
    const value=part.trim();
    if(value.startsWith("html"))return value.replace(/^html/,prefix);
    if(value.startsWith(":root"))return value.replace(/^:root/,prefix);
    return `${prefix} ${value}`
  }).join(",")
}
function installForcedMobileRules(){
  if(document.getElementById("forcedMobileStyles"))return;
  const rules=[];
  for(const sheet of [...document.styleSheets]){
    if(!String(sheet.href||"").includes("styles.css"))continue;
    try{
      for(const media of [...sheet.cssRules]){
        if(media.type!==CSSRule.MEDIA_RULE||!/max-width:\s*(?:950|760|600|560|430)px/i.test(media.conditionText||""))continue;
        for(const rule of [...media.cssRules]){
          if(rule.type===CSSRule.STYLE_RULE)rules.push(`${prefixedMobileSelector(rule.selectorText)}{${rule.style.cssText}}`);
          else if(rule.type===CSSRule.KEYFRAMES_RULE)rules.push(rule.cssText)
        }
      }
    }catch(error){console.warn("Could not prepare forced mobile layout",error)}
  }
  const style=document.createElement("style");style.id="forcedMobileStyles";style.textContent=rules.join("\n");document.head.appendChild(style)
}
function applyLayoutPreference(value,{persist=true}={}){
  const mode=normalizeLayoutMode(value),viewport=$("viewportMeta");
  if(persist)localStorage.setItem(LAYOUT_STORAGE_KEY,mode);
  if(mode==="mobile")installForcedMobileRules();
  document.documentElement.dataset.layoutMode=mode;
  if(viewport)viewport.content=mode==="desktop"?"width=1180,initial-scale=1,viewport-fit=cover":"width=device-width,initial-scale=1,viewport-fit=cover";
  if($("accountLayoutSelect"))$("accountLayoutSelect").value=mode;
  closeEditorActions();syncMobileEditorUi();
  return mode
}
function currentLayoutPreference(){return normalizeLayoutMode(document.documentElement.dataset.layoutMode||localStorage.getItem(LAYOUT_STORAGE_KEY)||"auto")}

/* ---------- CHAT NOTIFICATIONS + MENTIONS ---------- */
function chatReadKey(projectId=app.current?.id){
  return `storyboard-v3.6.1-chat-read:${app.session?.user?.id||"local"}:${projectId||"none"}`
}
function escapeRegex(v){return String(v||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function messageMentionsCurrentUser(body){
  const username=String(app.profile?.username||"").trim();
  if(!username)return false;
  const re=new RegExp(`(^|[\\s([{"'.,;:!?])@${escapeRegex(username)}(?=$|[\\s)\\]}"'.,;:!?])`,"i");
  return re.test(String(body||""))
}
function renderChatBody(body){
  const username=String(app.profile?.username||"").trim().toLowerCase();
  let safe=escapeHtml(body).replace(/\n/g,"<br>");
  safe=safe.replace(/(^|[\s([{"'.,;:!?])@([A-Za-z0-9._-]+)(?=$|[\s)\]}"'.,;:!?])/gi,(m,prefix,handle)=>{
    const mine=username && handle.toLowerCase()===username;
    return `${prefix}<span class="chat-mention${mine?" me":""}">@${handle}</span>`
  });
  return safe
}
function readChatReadAt(projectId=app.current?.id){
  if(!projectId)return null;
  return localStorage.getItem(chatReadKey(projectId))
}
function writeChatReadAt(iso,projectId=app.current?.id){
  if(!projectId||!iso)return;
  localStorage.setItem(chatReadKey(projectId),iso)
}
function chatActivelyVisible(){
  return !!($("collabModal")?.open && app.collabTab==="chat" && document.visibilityState==="visible")
}
function updateChatBadges(count=0,mentioned=false){
  count=Math.max(0,Number(count||0));
  const visible=count>0;

  for(const id of ["collabUnreadBadge","chatTabUnreadBadge"]){
    const badge=$(id);if(!badge)continue;
    badge.hidden=!visible;
  }
  for(const id of ["collabUnreadCount","chatTabUnreadCount"]){
    const el=$(id);if(el)el.textContent=String(count);
  }
  for(const id of ["collabMentionMark","chatTabMentionMark"]){
    const el=$(id);if(el)el.hidden=!(visible&&mentioned);
  }

  if($("collaborateBtn")){
    $("collaborateBtn").classList.toggle("has-unread",visible);
    $("collaborateBtn").classList.toggle("has-mention",visible&&mentioned);
    $("collaborateBtn").title=visible
      ? `${count} unread chat message${count===1?"":"s"}${mentioned?" · You were mentioned":""}`
      : "Collaborate · Chat";
  }
}
async function ensureChatReadBaseline(){
  if(app.mode!=="cloud"||!app.current||!app.session)return;
  if(readChatReadAt(app.current.id))return;
  const {data,error}=await sb.from("project_messages")
    .select("created_at")
    .eq("project_id",app.current.id)
    .order("created_at",{ascending:false})
    .limit(1);
  if(error)return;
  writeChatReadAt(data?.[0]?.created_at||new Date().toISOString(),app.current.id)
}
async function refreshChatNotificationBadge(){
  if(app.mode!=="cloud"||!app.current||!app.session){updateChatBadges(0,false);return}
  await ensureChatReadBaseline();
  const since=readChatReadAt(app.current.id);
  if(!since){updateChatBadges(0,false);return}

  const {data:rows,error}=await sb.from("project_messages")
    .select("id,user_id,body,created_at")
    .eq("project_id",app.current.id)
    .gt("created_at",since)
    .neq("user_id",app.session.user.id)
    .order("created_at",{ascending:true})
    .limit(500);

  if(error){console.warn("Could not refresh chat notification badge:",error);return}
  const unread=rows||[];
  updateChatBadges(unread.length,unread.some(r=>messageMentionsCurrentUser(r.body)))
}
async function markChatRead(rows=null){
  if(app.mode!=="cloud"||!app.current||!app.session)return;
  let iso=null;
  if(Array.isArray(rows)&&rows.length)iso=rows[rows.length-1]?.created_at||null;
  writeChatReadAt(iso||new Date().toISOString(),app.current.id);
  updateChatBadges(0,false)
}
async function renderChatMentionOptions(){
  const el=$("chatMentionSelect");if(!el||app.mode!=="cloud"||!app.current)return;
  const current=el.value;
  const {data:members}=await sb.from("project_members")
    .select("user_id")
    .eq("project_id",app.current.id);
  const ids=[app.current.owner_id,...(members||[]).map(m=>m.user_id)]
    .filter(Boolean)
    .filter((id,i,a)=>a.indexOf(id)===i);
  let profiles=[];
  if(ids.length){
    const {data}=await sb.from("profiles")
      .select("id,username,display_name")
      .in("id",ids);
    profiles=data||[];
  }
  const opts=['<option value="">Mention collaborator…</option>'];
  for(const pr of profiles
    .filter(p=>p.id!==app.session.user.id&&p.username)
    .sort((a,b)=>(a.display_name||a.username||"").localeCompare(b.display_name||b.username||""))){
    opts.push(`<option value="${escapeHtml(pr.username)}">@${escapeHtml(pr.username)} · ${escapeHtml(pr.display_name||pr.username)}</option>`)
  }
  el.innerHTML=opts.join("");
  if([...el.options].some(o=>o.value===current))el.value=current
}
function insertChatMention(username){
  username=String(username||"").trim();if(!username)return;
  const input=$("chatMessageInput");if(!input)return;
  const mention=`@${username} `;
  const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;
  const before=input.value.slice(0,start),after=input.value.slice(end);
  const spacer=before && !/\s$/.test(before)?" ":"";
  input.value=before+spacer+mention+after;
  const pos=(before+spacer+mention).length;
  input.focus();input.setSelectionRange(pos,pos)
}
function subscribeChatNoticeRealtime(){
  unsubscribeChatNoticeRealtime();
  if(!sb||app.mode!=="cloud"||!app.current)return;
  const pid=app.current.id;
  app.chatNoticeChannel=sb.channel(`project-chat-notice-${pid}`)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"project_messages",filter:`project_id=eq.${pid}`},payload=>{
      if(chatActivelyVisible())renderChatMessages();
      else refreshChatNotificationBadge()
    })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"project_messages",filter:`project_id=eq.${pid}`},()=>{
      if(chatActivelyVisible())renderChatMessages();
      else refreshChatNotificationBadge()
    })
    .subscribe()
}
function unsubscribeChatNoticeRealtime(){
  if(sb&&app.chatNoticeChannel){sb.removeChannel(app.chatNoticeChannel);app.chatNoticeChannel=null}
}
async function setupChatNotifications(){
  if(app.mode!=="cloud"||!app.current)return;
  await ensureChatReadBaseline();
  await refreshChatNotificationBadge();
  subscribeChatNoticeRealtime()
}


/* ---------- WORKSPACE CONTINUITY ---------- */
function workspaceKey(){return `storyboard-v3.6-workspace:${app.session?.user?.id||"local"}`}
function currentEditorVisible(){return !!app.current && $("editorView") && !$("editorView").hidden}
function currentWorkspaceView(){
  if($("adminView")&&!$("adminView").hidden)return "admin";
  return currentEditorVisible()?"editor":"projects"
}
function openAccordionIds(){return [...document.querySelectorAll(".accordion details")].filter(x=>x.open&&x.id).map(x=>x.id)}
function readWorkspace(){
  try{return JSON.parse(localStorage.getItem(workspaceKey())||"null")}catch(e){return null}
}
function rememberWorkspace(overrides={}){
  if(app.mode!=="cloud"||!app.session)return;
  const previous=readWorkspace()||{};
  const data={
    ...previous,
    view:currentWorkspaceView(),
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
  for(const id of ["sceneStoryTime","sceneShootTime"]){
    const el=$(id);if(!el)continue;el.innerHTML="";SCENE_TIME_OPTIONS.forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=value;el.appendChild(option)})
  }
  if($("sceneTimeStrategy")){$("sceneTimeStrategy").innerHTML="";SCENE_TIME_STRATEGIES.forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;$("sceneTimeStrategy").appendChild(option)})}
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
  localStorage.setItem("storyboard-v46-folders",JSON.stringify(app.projectFolders||[]));
}
function resetScriptState(){app.script={ready:false,loading:false,saving:false,analyzing:false,applying:false,record:null,links:[],analysis:null,editorHydrated:false,pendingFileName:"",pendingFileType:"",selectedStart:0,selectedEnd:0,selectionCache:null,savedRange:null,migrationMessage:"Run the saved v4.5 Bible Script SQL and v4.6 Project Folders & Rich Script SQL queries, then reload this project."}}
function resetAiState(){app.ai.requestController?.abort();app.ai.ready=false;app.ai.sourceReady=false;app.ai.loading=false;app.ai.generating=false;app.ai.generatingAssetId=null;app.ai.generationMode=null;app.ai.requestController=null;app.ai.cancelRequested=false;app.ai.previousFocus=null;app.ai.characters=[];app.ai.locations=[];app.ai.usage={loaded:false,loading:false,error:"",used:0,remaining:20,dailyLimit:20,personalRemaining:20,globalRemaining:70,unlimited:false,usageDate:""};resetScriptState();syncAiGenerationLock();renderAiUsage()}
function selectFirst(){
  const sc=app.current?.scenes?.[0]; app.activeSceneId=sc?.id||null; app.activeShotId=sc?.shots?.[0]?.id||null
}

/* ---------- AUTH / APP START ---------- */
async function start(){
  applyLayoutPreference(localStorage.getItem(LAYOUT_STORAGE_KEY)||"auto",{persist:false});initOptions(); bind();
  if(!cloudConfigured){
    $("cloudNotConfigured").hidden=false;
    showAuth();
    return;
  }
  sb.auth.onAuthStateChange(async(event,session)=>{
    const previousUserId=app.session?.user?.id||null;
    app.session=session;
    if(event==="PASSWORD_RECOVERY"){
      app.passwordRecovery.active=true;app.passwordRecovery.error="";app.passwordRecovery.verified=true;showPasswordRecovery();return
    }
    if(!session){app.profile=null;app.account.score=null;app.current=null;resetAdminState();resetAiState();unsubscribeRealtime();unsubscribeChatRealtime();unsubscribeChatNoticeRealtime();unsubscribeLightingRealtime();updateChatBadges(0,false);showAuth();return}
    // INITIAL_SESSION is already handled by getSession() below. Token refreshes must
    // never kick an editor back to the Projects screen.
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED"||event==="USER_UPDATED"){if(app.passwordRecovery.active)showPasswordRecovery();return}
    // Supabase can emit SIGNED_IN again when a background browser tab regains
    // focus. Do not rebuild the app and send an already signed-in admin home.
    if(event==="SIGNED_IN"){
      if(app.passwordRecovery.active){showPasswordRecovery();return}
      if(previousUserId===session.user.id&&app.profile)return;
      await afterLogin()
    }
  });
  const {data:{session}}=await sb.auth.getSession();
  app.session=session;
  if(app.passwordRecovery.active){showPasswordRecovery();return}
  if(initialAuthError){showAuth();setMsg("authMessage",initialAuthError,"warning");cleanAuthCallbackUrl();return}
  if(session) await afterLogin(); else showAuth();
}
function showAuth(){
  show($("authView")); show($("projectsView"),false); show($("adminView"),false); show($("editorView"),false);
  document.body.dataset.appView="auth";closeEditorActions();
  renderPasswordRecoveryUi()
}
function renderPasswordRecoveryUi(){
  const active=!!app.passwordRecovery.active,ready=active&&app.passwordRecovery.verified&&!!app.session&&!app.passwordRecovery.error&&!app.passwordRecovery.updating;
  $("authTabs").hidden=active;$("passwordRecoveryForm").hidden=!active;$("continueOfflineBtn").hidden=active;
  if(active){$("loginForm").hidden=true;$("signupForm").hidden=true}
  else{const login=$("loginTabBtn").classList.contains("active");$("loginForm").hidden=!login;$("signupForm").hidden=login}
  $("recoveryAccountLabel").textContent=app.session?.user?.email?`Set a new password for ${app.session.user.email}.`:"Enter a new password for this Storyboard account.";
  $("recoveryPassword").disabled=active&&!ready;$("recoveryPasswordConfirm").disabled=active&&!ready;$("updatePasswordBtn").disabled=active&&!ready;
  $("updatePasswordBtn").textContent=app.passwordRecovery.updating?"Updating Password…":"Update Password"
}
function showPasswordRecovery(message=""){
  app.passwordRecovery.active=true;showAuth();
  const verifying=!message&&!app.passwordRecovery.error&&!app.passwordRecovery.verified,notice=message||app.passwordRecovery.error||(verifying?"Verifying your password-reset link…":!app.session?"This password-reset link is invalid or has expired. Request a new link from Forgot password.":"");
  setMsg("authMessage",notice,notice&&!verifying?"warning":"");
  if(app.session&&!notice)requestAnimationFrame(()=>$("recoveryPassword").focus())
}
function cleanAuthCallbackUrl(){
  const url=new URL(location.href),keys=["code","type","token","token_hash","access_token","refresh_token","expires_in","expires_at","token_type","error","error_code","error_description","recovery"];
  keys.forEach(key=>url.searchParams.delete(key));url.hash="";history.replaceState({},document.title,`${url.pathname}${url.search}`)
}
function showProjects(){
  show($("authView"),false); show($("projectsView")); show($("adminView"),false); show($("editorView"),false);
  document.body.dataset.appView="projects";closeEditorActions();
  renderAdminSupportBar();
}
function showAdminView(){
  show($("authView"),false); show($("projectsView"),false); show($("adminView")); show($("editorView"),false);
  document.body.dataset.appView="admin";closeEditorActions();
  renderAdminSupportBar();
}
function showEditor(){
  show($("authView"),false); show($("projectsView"),false); show($("adminView"),false); show($("editorView"));
  document.body.dataset.appView="editor";
  renderAdminSupportBar();
  renderEditor();
}

function isMobileEditor(){const mode=currentLayoutPreference();return mode==="mobile"||(mode!=="desktop"&&window.matchMedia("(max-width: 950px)").matches)}
function closeEditorActions(){
  $("editorView")?.classList.remove("editor-actions-open");
  if($("mobileMoreBtn")){$("mobileMoreBtn").setAttribute("aria-expanded","false");$("mobileMoreBtn").classList.remove("active")}
}
function toggleEditorActions(){
  const editor=$("editorView"),open=!editor.classList.contains("editor-actions-open");
  editor.classList.toggle("editor-actions-open",open);$("mobileMoreBtn").setAttribute("aria-expanded",String(open));$("mobileMoreBtn").classList.toggle("active",open)
}
function syncMobileEditorUi(){
  const editor=$("editorView");if(!editor)return;
  const screen=app.sheetOpen?"sheet":(app.mobileScreen||"shot");
  editor.dataset.mobileScreen=screen;
  editor.classList.toggle("mobile-sheet-open",app.sheetOpen);
  $("mobileScenesBtn")?.classList.toggle("active",screen==="scenes");
  $("mobileShotBtn")?.classList.toggle("active",screen==="shot");
  $("mobileSheetBtn")?.classList.toggle("active",screen==="sheet");
}
function setMobileEditorScreen(screen){
  if(!["scenes","shot","sheet"].includes(screen))screen="shot";
  if(screen==="sheet")app.sheetOpen=true;
  else{app.sheetOpen=false;app.mobileScreen=screen}
  $("sheetPanel").hidden=!app.sheetOpen;
  if(app.sheetOpen)renderSheet();
  updateSheetButtons();closeEditorActions();syncMobileEditorUi();rememberWorkspace();
  requestAnimationFrame(()=>{
    const target=screen==="scenes"?document.querySelector(".sidebar"):screen==="shot"?document.querySelector(".workspace"):$("sheetPanel");
    if(target)target.scrollTop=0
  })
}
async function returnToProjects(){
  closeEditorActions();if(adminSupporting()){await closeAdminSupport(true);return}
  unsubscribeRealtime();unsubscribePresence();stopSignedImageRefresh();unsubscribeChatRealtime();unsubscribeChatNoticeRealtime();unsubscribeLightingRealtime();updateChatBadges(0,false);
  if(app.mode==="cloud"){rememberProjectsView();await loadCloudProjects();showProjects()}else showAuth()
}
async function afterLogin(){
  app.mode="cloud";
  await loadProfile();
  await loadAdminStatus();
  await Promise.all([loadCloudProjects(),loadAiUsage()]);
  if(app.pendingInvite){await acceptPendingInvite();showProjects();return}
  if(app.pendingLightingProject){const opened=await openPendingLightingLink();if(opened)return}
  const ws=readWorkspace();
  if(ws?.view==="admin"&&app.admin.isAdmin){await openAdminCenter();return}
  const canRestore=ws?.view==="editor" && ws.projectId && app.projects.some(p=>p.id===ws.projectId);
  if(canRestore){
    await openCloudProject(ws.projectId,{sceneId:ws.sceneId,shotId:ws.shotId,scrollY:ws.scrollY,sheetOpen:ws.sheetOpen,openDetails:ws.openDetails,preserveSelection:true});
  }else showProjects();
}
async function loadProfile(){
  if(!sb||!app.session)return;
  let {data,error}=await sb.from("profiles").select("id,username,display_name,username_changed_at,preferred_language,preferred_layout").eq("id",app.session.user.id).maybeSingle(),accountSetupReady=!error;
  if(error){const fallback=await sb.from("profiles").select("id,username,display_name").eq("id",app.session.user.id).maybeSingle();data=fallback.data;accountSetupReady=false}
  app.profile={id:app.session.user.id,username:"",display_name:"",username_changed_at:null,preferred_language:null,preferred_layout:null,...(data||{}),accountSetupReady};
  if(["fa","en"].includes(app.profile.preferred_language))window.storyboardI18n?.setLanguage(app.profile.preferred_language,false);
  if(["auto","mobile","desktop"].includes(app.profile.preferred_layout))applyLayoutPreference(app.profile.preferred_layout);
  renderAccountProfile()
}
function usernameNextChangeAt(){
  if(!app.profile?.username_changed_at)return null;
  if(app.profile.username_next_change_at)return new Date(app.profile.username_next_change_at);
  const changed=new Date(app.profile.username_changed_at),day=changed.getUTCDate(),next=new Date(changed);
  next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+2);
  const lastDay=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();
  next.setUTCDate(Math.min(day,lastDay));return next
}
function usernameCooldownCopy(){
  const next=usernameNextChangeAt();if(!next||next<=new Date())return "You can change your username now. After a change, it is locked for two months.";
  const remaining=Math.max(0,next-Date.now()),days=Math.ceil(remaining/86400000);
  return `Username can be changed again in ${days} day${days===1?"":"s"} · ${next.toLocaleDateString(uiLocale())}.`
}
function renderAccountProfile(){
  if(!app.profile||!app.session)return;
  const name=app.profile.display_name||app.profile.username||"Account",username=app.profile.username||"";
  $("accountDisplayName").textContent=name;$("accountIdentityName").textContent=name;$("accountAvatarInitial").textContent=(name.trim()[0]||"S").toUpperCase();
  $("accountUsername").textContent=username?`@${username}`:"";$("accountEmail").textContent=app.session.user.email||"";
  $("accountDisplayNameInput").value=app.profile.display_name||"";$("accountUsernameInput").value=username;$("accountEmailInput").value=app.session.user.email||"";
  const next=usernameNextChangeAt(),canChange=!next||next<=new Date();$("accountUsernameInput").disabled=!canChange;$("accountUsernameCooldown").textContent=app.profile.accountSetupReady?usernameCooldownCopy():"Run the v4.3 Account & Creator Score SQL to edit account details.";
  $("accountLanguageSelect").value=window.storyboardI18n?.language||"en";$("accountLayoutSelect").value=currentLayoutPreference()
}
function accountProfileError(error){
  const message=String(error?.message||error||"");
  if(message.includes("USERNAME_COOLDOWN_UNTIL"))return "Your username is still in its two-month lock period.";
  if(message.includes("USERNAME_TAKEN"))return "That username is already taken.";
  if(message.includes("USERNAME_INVALID"))return "Username may contain only letters, numbers, dot, underscore and hyphen.";
  if(message.includes("DISPLAY_NAME_TOO_LONG"))return "Display name must be 80 characters or fewer.";
  if(message.includes("storyboard_update_my_profile"))return "Account editing is not active yet. Run the v4.3 Account & Creator Score SQL.";
  return message||"Could not save account changes."
}
async function openAccount(){
  renderAccountProfile();setMsg("accountProfileNotice","");$("accountModal").showModal();await loadCreatorScore()
}
async function saveAccountProfile(event){
  event.preventDefault();if(!sb||!app.session||app.account.profileSaving)return;
  const username=$("accountUsernameInput").value.trim().toLowerCase(),displayName=$("accountDisplayNameInput").value.trim(),email=$("accountEmailInput").value.trim(),language=$("accountLanguageSelect").value,layout=normalizeLayoutMode($("accountLayoutSelect").value);
  if(!/^[a-z0-9_.-]{3,30}$/.test(username))return setMsg("accountProfileNotice","Username may contain only letters, numbers, dot, underscore and hyphen.","warning");
  app.account.profileSaving=true;$("saveAccountProfileBtn").disabled=true;$("saveAccountProfileBtn").textContent="Saving…";setMsg("accountProfileNotice","Saving account changes…");
  try{
    const {data,error}=await sb.rpc("storyboard_update_my_profile",{p_username:username,p_display_name:displayName,p_preferred_language:language,p_preferred_layout:layout});if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(row)app.profile={...app.profile,...row,accountSetupReady:true};
    let emailPending=false;
    if(email&&email.toLowerCase()!==String(app.session.user.email||"").toLowerCase()){
      const {error:emailError}=await sb.auth.updateUser({email});if(emailError)throw emailError;emailPending=true
    }
    window.storyboardI18n?.setLanguage(language);applyLayoutPreference(layout);renderAccountProfile();
    setMsg("accountProfileNotice",emailPending?"Profile saved. Check your email to confirm the new address.":"Account changes saved.")
  }catch(error){setMsg("accountProfileNotice",accountProfileError(error),"warning")}
  finally{app.account.profileSaving=false;$("saveAccountProfileBtn").disabled=false;$("saveAccountProfileBtn").textContent="Save Account Changes"}
}
function scoreLevel(total){
  const levels=[{at:0,name:"Storyboard Starter"},{at:10,name:"Frame Explorer"},{at:25,name:"Scene Builder"},{at:50,name:"Visual Storyteller"},{at:100,name:"Storyboard Director"},{at:200,name:"Master Storyteller"}];
  let current=levels[0],next=levels[1];for(let i=0;i<levels.length;i++){if(total>=levels[i].at){current=levels[i];next=levels[i+1]||null}}
  const progress=next?Math.max(0,Math.min(100,((total-current.at)/(next.at-current.at))*100)):100;
  return {current,next,progress,remaining:next?next.at-total:0}
}
function renderCreatorScore(){
  const loading=$("accountScoreLoading"),content=$("accountScoreContent"),score=app.account.score;
  loading.hidden=!!score;content.hidden=!score;if(!score){loading.textContent=app.account.scoreLoading?"Loading your score…":"Creator score is unavailable. Run the v4.3 Account & Creator Score SQL.";return}
  const total=Number(score.total_score||0),level=scoreLevel(total);$("accountScoreTotal").textContent=String(total);$("accountScoreRank").textContent=`#${score.overall_rank||1} / ${score.total_users||1}`;$("accountScoreToday").textContent=String(score.today_score||0);$("accountScoreShots").textContent=String(score.shots_created||0);$("accountScoreImages").textContent=String(score.ai_images_generated||0);
  $("accountScoreLevel").textContent=level.current.name;$("accountScoreNextLevel").textContent=level.next?`${level.remaining} point${level.remaining===1?"":"s"} to ${level.next.name}`:"Highest creator level reached";$("accountScoreProgress").style.width=`${level.progress}%`;
  const leaderName=score.leader_display_name||score.leader_username;$("accountDailyLeader").textContent=Number(score.leader_score||0)>0?`${leaderName||"Creator"} · ${score.leader_score} point${Number(score.leader_score)===1?"":"s"}`:"No points yet today — be the first!"
}
async function loadCreatorScore(){
  if(!sb||!app.session)return;app.account.scoreLoading=true;app.account.score=null;renderCreatorScore();
  const {data,error}=await sb.rpc("storyboard_score_status");app.account.scoreLoading=false;
  if(error){console.warn("Creator score unavailable",error);renderCreatorScore();return}
  app.account.score=Array.isArray(data)?data[0]:data;renderCreatorScore();window.storyboardI18n?.translateTree($("accountModal"))
}
async function recordShotGenerationScore(shot,promptHash){
  if(!sb||!app.session||!shot||!promptHash)return;
  const {error}=await sb.rpc("storyboard_record_shot_generation",{p_project_id:app.current.id,p_shot_id:shot.id,p_prompt_hash:promptHash});
  if(error)console.warn("Could not record creator score",error);
  if($("accountModal")?.open)await loadCreatorScore()
}
function resetAdminState(){
  app.admin={isAdmin:false,role:null,selectedUser:null,users:[],usersOffset:0,usersTotal:0,usersQuery:"",supportProjectId:null,supportUserId:null,supportUsername:null,supportProjectName:null};
  if($("adminCenterBtn"))$("adminCenterBtn").hidden=true;
  renderAdminSupportBar()
}
async function loadAdminStatus(){
  resetAdminState();if(!sb||!app.session)return;
  const {data,error}=await sb.rpc("storyboard_admin_status");
  if(error)return;
  const status=Array.isArray(data)?data[0]:data;
  app.admin.isAdmin=!!status?.is_admin;app.admin.role=status?.role||null;
  $("adminCenterBtn").hidden=!app.admin.isAdmin
}
function renderAdminSupportBar(){
  const bar=$("adminSupportBar");if(!bar)return;
  const active=adminSupporting();bar.hidden=!active;$("editorView")?.classList.toggle("admin-support-active",active);
  if(active){
    $("adminSupportLabel").textContent=`Viewing @${app.admin.supportUsername||"user"} · ${app.admin.supportProjectName||app.current?.name||"Project"} · Full access`;
    requestAnimationFrame(()=>$("editorView")?.style.setProperty("--admin-support-height",`${bar.offsetHeight}px`))
  }else $("editorView")?.style.removeProperty("--admin-support-height")
}
function toggleAuthTab(tab){
  const login=tab==="login";
  $("loginTabBtn").classList.toggle("active",login);$("signupTabBtn").classList.toggle("active",!login);
  $("loginForm").hidden=!login;$("signupForm").hidden=login;setMsg("authMessage","");
}
let loginKind="email",loginPending=false;
function setLoginKind(kind){
  if(loginPending)return;
  loginKind=kind;const isEmail=kind==="email";
  $("loginEmailMode").classList.toggle("active",isEmail);$("loginUsernameMode").classList.toggle("active",!isEmail);
  $("loginIdentityLabel").textContent=isEmail?"Email":"Username";$("loginIdentity").placeholder=isEmail?"you@example.com":"yourname";
}
function waitFor(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function readEdgeFunctionError(error){
  const context=error?.context,status=Number(context?.status||0),name=String(error?.name||"");let payload=null;
  try{const response=typeof context?.clone==="function"?context.clone():context;if(typeof response?.json==="function")payload=await response.json()}catch{}
  const code=String(payload?.code||"").toUpperCase(),message=String(payload?.error||payload?.message||"").trim();
  const retryAfter=Math.max(0,Number(payload?.retry_after||context?.headers?.get?.("retry-after")||0));
  const transient=[408,500,502,503,504].includes(status)||name==="FunctionsFetchError"||name==="FunctionsRelayError";
  return {status,name,code,message,retryAfter,transient}
}
function usernameLoginErrorMessage(detail){
  const invalid=detail.code==="INVALID_CREDENTIALS"||/invalid (username|login|credentials)|username or password/i.test(detail.message);
  if(invalid)return "Username or password is incorrect.";
  if(detail.status===429||detail.code==="RATE_LIMITED"){
    const minutes=Math.max(1,Math.ceil((detail.retryAfter||60)/60));
    return `Too many sign-in attempts. Try again in ${minutes} minute${minutes===1?"":"s"}.`
  }
  if(detail.status===404||detail.code.includes("NOT_FOUND"))return "Username sign-in is temporarily unavailable. You can still sign in with your email.";
  return "The sign-in service is temporarily unavailable. Please wait a moment and try again."
}
async function signInWithUsername(username,password){
  let lastDetail={status:0,name:"",code:"",message:"",retryAfter:0,transient:false};
  for(let attempt=0;attempt<2;attempt+=1){
    const {data,error}=await sb.functions.invoke("username-login",{body:{username,password}});
    if(!error){if(!data?.session?.access_token)throw new Error(data?.error||"Username sign-in failed.");return data.session}
    lastDetail=await readEdgeFunctionError(error);
    if(attempt===0&&lastDetail.transient){await waitFor(650);continue}
    break
  }
  throw new Error(usernameLoginErrorMessage(lastDetail))
}
function setLoginPending(active){
  loginPending=active;for(const id of ["loginEmailMode","loginUsernameMode","loginIdentity","loginPassword","loginSubmitBtn"])$(id).disabled=active;
  $("loginSubmitBtn").textContent=uiText(active?"Signing in…":"Sign In")
}
async function doLogin(e){
  e.preventDefault(); if(!cloudConfigured||loginPending)return;
  setMsg("authMessage","Signing in...");
  const identity=$("loginIdentity").value.trim(),password=$("loginPassword").value;
  setLoginPending(true);
  try{
    if(loginKind==="email"){
      const {error}=await sb.auth.signInWithPassword({email:identity,password}); if(error)throw error;
    }else{
      const session=await signInWithUsername(identity,password);
      const {error:setErr}=await sb.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}); if(setErr)throw setErr;
    }
    setMsg("authMessage","");
  }catch(err){setMsg("authMessage",err.message||"Sign-in failed.","warning")}
  finally{setLoginPending(false)}
}
function passwordPolicyError(password){
  if(String(password||"").length<8)return "Password must contain at least 8 characters.";
  if(!/[a-z]/.test(password))return "Password must include at least one lowercase letter.";
  if(!/[A-Z]/.test(password))return "Password must include at least one uppercase letter.";
  if(!/[^A-Za-z0-9\s]/.test(password))return "Password must include at least one symbol.";
  return ""
}
function updatePasswordFieldValidity(field,announce=false){
  if(!field)return "";const error=passwordPolicyError(field.value);field.setCustomValidity(error?uiText(error):"");if(announce&&error)setMsg("authMessage",error,"warning");return error
}
async function doSignup(e){
  e.preventDefault(); if(!cloudConfigured)return;
  const username=$("signupUsername").value.trim().toLowerCase(),email=$("signupEmail").value.trim(),password=$("signupPassword").value,display_name=$("signupDisplayName").value.trim();
  if(!/^[a-z0-9_.-]{3,30}$/.test(username)){setMsg("authMessage","Username may contain only letters, numbers, dot, underscore and hyphen.","warning");return}
  const passwordError=passwordPolicyError(password);if(passwordError){setMsg("authMessage",passwordError,"warning");return}
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
  const email=uiPrompt("Enter your email address:"); if(!email)return;
  const redirectTo=`${String(cfg.SITE_URL||location.origin).replace(/\/$/,"")}/`;
  const {error}=await sb.auth.resetPasswordForEmail(email.trim(),{redirectTo});
  setMsg("authMessage",error?error.message:"Password reset email sent. Open the newest link; reset links can expire or be used only once.",error?"warning":"");
}
async function updateRecoveredPassword(event){
  event.preventDefault();if(!cloudConfigured)return;
  const password=$("recoveryPassword").value,confirmation=$("recoveryPasswordConfirm").value;
  if(!app.passwordRecovery.verified||!app.session)return showPasswordRecovery("This password-reset link is invalid or has expired. Request a new link from Forgot password.");
  const passwordError=passwordPolicyError(password);if(passwordError)return setMsg("authMessage",passwordError,"warning");
  if(password!==confirmation)return setMsg("authMessage","The two passwords do not match.","warning");
  app.passwordRecovery.updating=true;renderPasswordRecoveryUi();setMsg("authMessage","Updating your password…");
  const {error}=await sb.auth.updateUser({password});
  if(error){app.passwordRecovery.updating=false;renderPasswordRecoveryUi();setMsg("authMessage",error.message||"Could not update the password.","warning");return}
  app.passwordRecovery={active:false,error:"",verified:false,updating:false};cleanAuthCallbackUrl();$("recoveryPassword").value="";$("recoveryPasswordConfirm").value="";
  await sb.auth.signOut({scope:"local"});toggleAuthTab("login");showAuth();setMsg("authMessage","Password updated. Sign in with your new password.")
}
async function cancelPasswordRecovery(){
  app.passwordRecovery={active:false,error:"",verified:false,updating:false};cleanAuthCallbackUrl();$("recoveryPassword").value="";$("recoveryPasswordConfirm").value="";
  if(sb&&app.session)await sb.auth.signOut({scope:"local"});toggleAuthTab("login");showAuth();setMsg("authMessage","Password reset canceled.")
}
function continueOffline(){
  app.mode="local";resetAdminState();resetAiState();app.projects=getLocalProjects();try{app.projectFolders=JSON.parse(localStorage.getItem("storyboard-v46-folders")||"[]")||[]}catch{app.projectFolders=[]}app.foldersReady=true;app.projects.forEach(project=>{project.folderId=project.folderId||null;project.folder=project.folderId?(app.projectFolders.find(folder=>folder.id===project.folderId)?.name||"General"):"General"});app.current=app.projects[0];selectFirst();app.permissions=fullPermissions();app.isOwner=true;showEditor()
}
async function logout(){unsubscribePresence();stopSignedImageRefresh();resetAdminState();if(sb&&app.mode==="cloud")await sb.auth.signOut();else showAuth()}

/* ---------- CLOUD PROJECTS ---------- */
function normalizeProjectRecord(p){
  return {...p,
    aspectWidth:Number(p.aspect_width||p.aspectWidth||3),
    aspectHeight:Number(p.aspect_height||p.aspectHeight||4),
    position:Number(p.position||0),
    isFavorite:!!(p.is_favorite??p.isFavorite),
    folderId:p.folderId||null,
    folder:p.folder||"General",
    tags:normalizeTags(p.tags),
    metadata:projectMeta(p)
  }
}
async function loadCloudFolderData(projects){
  const userId=app.session?.user?.id;if(!userId)return;
  const foldersResult=await sb.from("project_folders").select("id,owner_id,name,created_at,updated_at").eq("owner_id",userId).order("name");
  if(foldersResult.error){
    app.foldersReady=false;app.projectFolders=[];
    projects.forEach(project=>{project.folderId=null;project.folder=project.folder||"General"});
    console.warn("Project folders are unavailable",foldersResult.error);return
  }
  const assignmentsResult=await sb.from("project_folder_assignments").select("project_id,folder_id").eq("user_id",userId);
  if(assignmentsResult.error){
    app.foldersReady=false;app.projectFolders=foldersResult.data||[];
    projects.forEach(project=>{project.folderId=null;project.folder=project.folder||"General"});
    console.warn("Project folder assignments are unavailable",assignmentsResult.error);return
  }
  app.foldersReady=true;app.projectFolders=foldersResult.data||[];
  const folderById=new Map(app.projectFolders.map(folder=>[folder.id,folder])),assignmentByProject=new Map((assignmentsResult.data||[]).map(row=>[row.project_id,row.folder_id]));
  projects.forEach(project=>{const folderId=assignmentByProject.get(project.id)||null,folder=folderById.get(folderId);project.folderId=folder?.id||null;project.folder=folder?.name||"General"})
}
async function loadCloudProjects(){
  let memberships=[];
  const {data:memberRows,error:memberError}=await sb.from("project_members").select("project_id,role,permissions").eq("user_id",app.session.user.id);
  if(!memberError)memberships=memberRows||[];
  const membershipIds=memberships.map(x=>x.project_id).filter(Boolean);
  let projectQuery=sb.from("projects").select("id,owner_id,name,aspect,aspect_width,aspect_height,style,updated_at,created_at,position,is_favorite,folder,tags,metadata");
  projectQuery=membershipIds.length
    ?projectQuery.or(`owner_id.eq.${app.session.user.id},id.in.(${membershipIds.join(",")})`)
    :projectQuery.eq("owner_id",app.session.user.id);
  const {data,error}=await projectQuery;
  if(error){console.error(error);uiAlert(`Could not load projects: ${error.message}`);return}

  const membershipSet=new Set(membershipIds);
  const mapped=(data||[]).filter(row=>row.owner_id===app.session.user.id||membershipSet.has(row.id)).map(row=>{
    const p=normalizeProjectRecord(row);
    const member=memberships.find(m=>m.project_id===p.id);
    p.dashboardRole=p.owner_id===app.session.user.id?"owner":(member?.role||"shared");
    p.dashboardPermissions=member?.permissions||blankPermissions();
    return p
  });
  await loadCloudFolderData(mapped);
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
    if(app.projectFolder==="general" && p.folderId)return false;
    if(app.projectFolder!=="all"&&app.projectFolder!=="general"&&p.folderId!==app.projectFolder)return false;
    if(app.projectFilter==="favorites" && !p.isFavorite)return false;
    if(app.projectFilter==="recent" && now-new Date(p.updated_at||0).getTime()>recentMs)return false;
    if(app.projectFilter==="shared" && p.owner_id===app.session?.user?.id)return false;
    return true;
  })
}
function refreshFolderFilter(){
  const el=$("projectFolderFilter"); if(!el)return;
  const keep=app.projectFolder;
  const folders=[...(app.projectFolders||[])].sort((a,b)=>a.name.localeCompare(b.name));
  el.innerHTML='<option value="all">All folders</option><option value="general">General</option>'+folders.map(folder=>`<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`).join("");
  const values=[...el.options].map(option=>option.value);el.value=values.includes(keep)?keep:"all";app.projectFolder=el.value;
}
function renderProjects(){
  refreshFolderFilter();
  if($("manageProjectFoldersBtn"))$("manageProjectFoldersBtn").disabled=app.mode==="cloud"&&!app.foldersReady;
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
        <p class="project-updated">Updated ${new Date(p.updated_at||Date.now()).toLocaleDateString(uiLocale())}</p>
      </button>
      <div class="project-card-actions">
        <button type="button" class="mini-btn details">Details</button>
        <button type="button" class="mini-btn duplicate">Duplicate</button>
        <button type="button" class="mini-btn move-folder" ${app.mode==="cloud"&&!app.foldersReady?"disabled":""}>Move</button>
        ${editable?'<button type="button" class="mini-btn rename">Rename</button>':''}
        ${owner?'<button type="button" class="mini-btn danger-lite delete">Delete</button>':''}
      </div>`;
    card.querySelector(".project-open-area").onclick=()=>openCloudProject(p.id);
    card.querySelector(".details").onclick=()=>openProjectDetails(p.id);
    card.querySelector(".duplicate").onclick=()=>duplicateProject(p.id);
    card.querySelector(".move-folder").onclick=()=>openMoveProjectFolder(p.id);
    if(editable){
      card.querySelector(".favorite-btn").onclick=()=>toggleFavorite(p.id);
      card.querySelector(".rename").onclick=()=>renameProject(p.id);
    }
    if(owner)card.querySelector(".delete").onclick=()=>deleteProject(p.id);
    grid.appendChild(card)
  });
  setupProjectDrag();
}

/* ---------- MULTI-ADMIN SUPPORT CENTER ---------- */
function adminEmpty(message){return `<div class="admin-empty">${escapeHtml(message)}</div>`}
async function openAdminCenter(){
  if(!app.admin.isAdmin)return;
  $("adminAddForm").hidden=app.admin.role!=="superadmin";
  setMsg("adminCenterNotice","");
  showAdminView();
  rememberWorkspace({view:"admin",scrollY:0});
  await Promise.all([loadAdminUsers(true),loadAdminTeam(),loadAdminActivity()]);
  if(app.admin.selectedUser)await loadAdminUserProjects()
}
async function searchAdminUsers(event){
  event?.preventDefault();await loadAdminUsers(true)
}
async function showAllAdminUsers(){
  $("adminUserSearchInput").value="";await loadAdminUsers(true)
}
async function loadAdminUsers(reset=false){
  const q=$("adminUserSearchInput").value.trim().replace(/^@/,"");
  if(reset||q!==app.admin.usersQuery){app.admin.users=[];app.admin.usersOffset=0;app.admin.usersTotal=0}
  app.admin.usersQuery=q;
  setMsg("adminCenterNotice",q?"Searching users…":"Loading all users…");
  if(!app.admin.users.length)$("adminUserResults").innerHTML=adminEmpty("Loading users…");
  const {data,error}=await sb.rpc("storyboard_admin_list_users",{p_query:q||null,p_limit:100,p_offset:app.admin.usersOffset});
  if(error){setMsg("adminCenterNotice",error.message||"Could not load users.","warning");$("adminUserResults").innerHTML=adminEmpty("Could not load users.");return}
  const rows=data||[],known=new Set(app.admin.users.map(x=>x.user_id));
  app.admin.users.push(...rows.filter(x=>!known.has(x.user_id)));
  app.admin.usersOffset=app.admin.users.length;
  app.admin.usersTotal=rows.length?Number(rows[0].total_count||app.admin.users.length):(reset?0:app.admin.usersTotal);
  setMsg("adminCenterNotice","");renderAdminUserResults(app.admin.users);
  $("adminUserCount").textContent=app.admin.usersTotal===app.admin.users.length?`${app.admin.usersTotal} user${app.admin.usersTotal===1?"":"s"}`:`Showing ${app.admin.users.length} of ${app.admin.usersTotal} users`;
  $("adminLoadMoreUsersBtn").hidden=app.admin.users.length>=app.admin.usersTotal
}
function renderAdminUserResults(rows){
  const wrap=$("adminUserResults");wrap.innerHTML="";
  if(!rows.length){wrap.innerHTML=adminEmpty("No matching users found.");return}
  rows.forEach(user=>{
    const row=document.createElement("div");row.className="admin-result-row";
    row.innerHTML=`<div><strong>@${escapeHtml(user.username||"unknown")}</strong><small>${escapeHtml(user.display_name||"No display name")} · ${Number(user.project_count||0)} project${Number(user.project_count||0)===1?"":"s"}</small></div><button type="button" class="btn ghost">View Projects</button>`;
    row.querySelector("button").onclick=()=>selectAdminUser(user);wrap.appendChild(row)
  })
}
async function selectAdminUser(user){
  app.admin.selectedUser={user_id:user.user_id,username:user.username||"unknown",display_name:user.display_name||""};
  $("adminSelectedUserName").textContent=`@${app.admin.selectedUser.username}${app.admin.selectedUser.display_name?` · ${app.admin.selectedUser.display_name}`:""}`;
  $("adminUserProjectsPanel").hidden=false;await loadAdminUserProjects()
}
function clearAdminUser(){
  app.admin.selectedUser=null;$("adminUserProjectsPanel").hidden=true;$("adminUserProjects").innerHTML=""
}
async function loadAdminUserProjects(){
  const user=app.admin.selectedUser;if(!user)return;
  const wrap=$("adminUserProjects");wrap.innerHTML=adminEmpty("Loading projects…");
  const {data,error}=await sb.rpc("storyboard_admin_list_user_projects",{p_user_id:user.user_id});
  if(error){wrap.innerHTML=adminEmpty(error.message||"Could not load projects.");return}
  renderAdminUserProjects(data||[])
}
function renderAdminUserProjects(rows){
  const wrap=$("adminUserProjects");wrap.innerHTML="";
  if(!rows.length){wrap.innerHTML=adminEmpty("This user has no projects.");return}
  rows.forEach(project=>{
    const row=document.createElement("div");row.className="admin-project-row";
    const updated=project.updated_at?new Date(project.updated_at).toLocaleString(uiLocale()):"Unknown update time";
    row.innerHTML=`<div><strong>${escapeHtml(project.name||"Untitled Project")}</strong><small>${escapeHtml(project.access_role||"owner")} · ${escapeHtml(project.folder||"General")} · ${updated}</small></div><span class="member-actions"><button type="button" class="btn open-admin-project">Open Support</button><button type="button" class="btn ghost admin-danger delete-admin-project">Delete</button></span>`;
    row.querySelector(".open-admin-project").onclick=()=>openAdminSupportProject(project);
    row.querySelector(".delete-admin-project").onclick=()=>deleteAdminProject(project);
    wrap.appendChild(row)
  })
}
async function openAdminSupportProject(project){
  const user=app.admin.selectedUser;if(!user||!project)return;
  setMsg("adminCenterNotice","Opening secure support mode…");
  const {error}=await sb.rpc("storyboard_admin_open_project",{p_project_id:project.id,p_target_user_id:user.user_id});
  if(error){setMsg("adminCenterNotice",error.message||"Could not open this project.","warning");return}
  app.admin.supportProjectId=project.id;app.admin.supportUserId=user.user_id;app.admin.supportUsername=user.username;app.admin.supportProjectName=project.name||"Untitled Project";
  app.current=null;
  try{await openCloudProject(project.id,{preserveSelection:true});if(app.current?.id!==project.id)throw new Error("Project access did not open.")}
  catch(err){await closeAdminSupport(false);uiAlert(err.message||"Could not open this project.")}
}
async function closeAdminSupport(reopen=true){
  const projectId=app.admin.supportProjectId;
  if(projectId&&sb)await sb.rpc("storyboard_admin_close_project",{p_project_id:projectId});
  app.admin.supportProjectId=null;app.admin.supportUserId=null;app.admin.supportUsername=null;app.admin.supportProjectName=null;
  unsubscribeRealtime();unsubscribePresence();stopSignedImageRefresh();unsubscribeChatRealtime();unsubscribeChatNoticeRealtime();unsubscribeLightingRealtime();updateChatBadges(0,false);renderAdminSupportBar();
  await loadCloudProjects();showProjects();if(reopen)await openAdminCenter()
}
async function deleteAdminProject(project){
  const user=app.admin.selectedUser;if(!user||!project)return;
  if(!uiConfirm(`Permanently delete "${project.name}" from @${user.username}? This cannot be undone.`))return;
  setMsg("adminCenterNotice","Deleting project and stored media…");
  let supportOpened=false;
  try{
    const {error:accessError}=await sb.rpc("storyboard_admin_open_project",{p_project_id:project.id,p_target_user_id:user.user_id});if(accessError)throw accessError;
    supportOpened=true;
    const [{data:paths},{data:characters},{data:locations}]=await Promise.all([
      sb.from("shots").select("image_path").eq("project_id",project.id),
      sb.from("project_ai_characters").select("reference_path,source_path").eq("project_id",project.id),
      sb.from("project_ai_locations").select("reference_path,source_path").eq("project_id",project.id)
    ]);
    await removeMediaPaths([...(paths||[]).map(x=>x.image_path),...(characters||[]).flatMap(x=>[x.reference_path,x.source_path]),...(locations||[]).flatMap(x=>[x.reference_path,x.source_path])]);
    const {error}=await sb.rpc("storyboard_admin_delete_project",{p_project_id:project.id,p_target_user_id:user.user_id});if(error)throw error;
    supportOpened=false;setMsg("adminCenterNotice",`Project "${project.name}" deleted.`);await Promise.all([loadAdminUserProjects(),loadAdminActivity(),loadAdminUsers(true)])
  }catch(err){setMsg("adminCenterNotice",err.message||"Could not delete the project.","warning")}
  finally{if(supportOpened)await sb.rpc("storyboard_admin_close_project",{p_project_id:project.id})}
}
async function loadAdminTeam(){
  const wrap=$("adminTeamList");wrap.innerHTML=adminEmpty("Loading support team…");
  const {data,error}=await sb.rpc("storyboard_admin_list_admins");
  if(error){wrap.innerHTML=adminEmpty(error.message||"Could not load admins.");return}
  wrap.innerHTML="";(data||[]).forEach(admin=>{
    const row=document.createElement("div");row.className="admin-team-row";const me=admin.user_id===app.session.user.id;
    row.innerHTML=`<div><strong>@${escapeHtml(admin.username||"unknown")}${me?" · You":""}</strong><small>${escapeHtml(admin.display_name||"")}</small><span class="admin-role-badge">${escapeHtml(admin.role||"support_admin")}</span></div>${app.admin.role==="superadmin"&&!me?'<button type="button" class="btn ghost admin-danger">Remove</button>':""}`;
    row.querySelector("button")?.addEventListener("click",()=>removeAdmin(admin));wrap.appendChild(row)
  });
  if(!(data||[]).length)wrap.innerHTML=adminEmpty("No active admins found.")
}
async function addAdmin(event){
  event.preventDefault();const username=$("adminAddUsername").value.trim().toLowerCase().replace(/^@/,""),role=$("adminAddRole").value;
  if(!username)return;
  setMsg("adminCenterNotice",`Adding @${username}…`);
  const {error}=await sb.rpc("storyboard_admin_upsert",{p_username:username,p_role:role});
  if(error){setMsg("adminCenterNotice",error.message||"Could not add this admin.","warning");return}
  $("adminAddUsername").value="";setMsg("adminCenterNotice",`@${username} is now an active ${role}.`);await Promise.all([loadAdminTeam(),loadAdminActivity()])
}
async function removeAdmin(admin){
  if(!uiConfirm(`Remove @${admin.username} from the support team?`))return;
  const {error}=await sb.rpc("storyboard_admin_remove",{p_user_id:admin.user_id});
  if(error){setMsg("adminCenterNotice",error.message||"Could not remove this admin.","warning");return}
  setMsg("adminCenterNotice",`@${admin.username} removed from the support team.`);await Promise.all([loadAdminTeam(),loadAdminActivity()])
}
async function loadAdminActivity(){
  const wrap=$("adminActivityList");wrap.innerHTML=adminEmpty("Loading activity…");
  const {data,error}=await sb.rpc("storyboard_admin_recent_activity",{p_limit:40});
  if(error){wrap.innerHTML=adminEmpty(error.message||"Could not load activity.");return}
  wrap.innerHTML="";(data||[]).forEach(item=>{
    const row=document.createElement("div");row.className="admin-activity-row";
    const context=[item.target_username?`@${item.target_username}`:"",item.project_name||item.details?.project_name||""].filter(Boolean).join(" · ");
    row.innerHTML=`<div><strong>${escapeHtml(String(item.action||"admin action").replaceAll("_"," "))}</strong><small>@${escapeHtml(item.admin_username||"admin")}${context?` · ${escapeHtml(context)}`:""}</small></div><time>${new Date(item.created_at).toLocaleString(uiLocale())}</time>`;wrap.appendChild(row)
  });
  if(!(data||[]).length)wrap.innerHTML=adminEmpty("No administrative activity yet.")
}
async function createCloudProject(){
  const name=uiPrompt("Project name:","Untitled Storyboard");if(!name)return;
  const myPositions=(app.projects||[]).filter(p=>p.owner_id===app.session.user.id).map(p=>Number(p.position||0));
  const position=Math.max(0,...myPositions)+1;
  const {data:p,error}=await sb.from("projects").insert({owner_id:app.session.user.id,name,aspect:"3:4 Portrait",aspect_width:3,aspect_height:4,style:"Storyboard B&W",position,is_favorite:false,folder:"General",tags:[],metadata:{director:"",cinematographer:"",writer:"",production:"",status:"Planning",notes:""}}).select().single();
  if(error){const message=/row-level security|42501/i.test(String(error.message||""))?"Project creation is blocked by an outdated database policy. Run the saved SQL query “Storyboard v4.4 - Image Tools, Project RLS & Login Reliability”, then try again.":error.message;uiAlert(message);return}
  const {data:s,error:se}=await sb.from("scenes").insert({project_id:p.id,scene_number:1,title:"Scene 1",description:"",position:1,collapsed:false}).select().single(); if(se){await sb.from("projects").delete().eq("id",p.id);uiAlert(se.message);return}
  const shot=blankShot(1);
  const {error:shErr}=await sb.from("shots").insert({project_id:p.id,scene_id:s.id,shot_number:1,position:1,data:shot});if(shErr){await sb.from("projects").delete().eq("id",p.id);uiAlert(shErr.message);return}
  await loadCloudProjects();await openCloudProject(p.id)
}
async function openCloudProject(id,options={}){
  const sameProject=app.current?.id===id;
  const preferredSceneId=options.sceneId || (sameProject&&options.preserveSelection!==false?app.activeSceneId:null);
  const preferredShotId=options.shotId || (sameProject&&options.preserveSelection!==false?app.activeShotId:null);
  const restoreScroll=Number.isFinite(Number(options.scrollY))?Number(options.scrollY):(sameProject?window.scrollY:null);
  unsubscribeRealtime();
  unsubscribePresence();
  stopSignedImageRefresh();
  unsubscribeChatNoticeRealtime();
  updateChatBadges(0,false);
  const {data:p,error}=await sb.from("projects").select("*").eq("id",id).single();if(error){uiAlert(error.message);return}
  const {data:scenes,error:se}=await sb.from("scenes").select("*").eq("project_id",id).order("position");if(se){uiAlert(se.message);return}
  const {data:shots,error:sh}=await sb.from("shots").select("*").eq("project_id",id).order("position");if(sh){uiAlert(sh.message);return}
  const signed=await Promise.all((shots||[]).map(async row=>{
    let image=null;if(row.image_path){const {data}=await sb.storage.from("storyboards").createSignedUrl(row.image_path,SIGNED_IMAGE_TTL_SECONDS);image=data?.signedUrl||null}
    const shotData={...blankShot(row.shot_number),...(row.data||{})};
    shotData.aiCharacterIds=Array.isArray(shotData.aiCharacterIds)?shotData.aiCharacterIds.filter(Boolean):[];
    shotData.aiLocationId=String(shotData.aiLocationId||"");
    return {...shotData,id:row.id,shotNo:row.shot_number,position:row.position,version:Number(row.version||1),imagePath:row.image_path,image}
  }));
  const sceneObjects=(scenes||[]).map(s=>({id:s.id,number:s.scene_number,title:s.title||`Scene ${s.scene_number}`,description:s.description||"",storyLocation:s.story_location||"",storyTime:s.story_time||"Unspecified",shootTime:s.shoot_time||"Unspecified",timeStrategy:s.time_strategy||"natural",aiLocationId:s.ai_location_id||"",aiCharacterIds:Array.isArray(s.ai_character_ids)?s.ai_character_ids.filter(Boolean):[],scriptSceneKey:s.script_scene_key||null,position:Number(s.position||s.scene_number||1),collapsed:!!s.collapsed,version:Number(s.version||1),shots:signed.filter(x=>(shots||[]).find(r=>r.id===x.id)?.scene_id===s.id)}));
  sceneObjects.sort((a,b)=>a.position-b.position).forEach((scene,i)=>{
    scene.position=i+1;scene.number=i+1;
    scene.shots.sort((a,b)=>a.position-b.position).forEach((shot,j)=>{shot.position=j+1;shot.shotNo=j+1})
  });
  const pp=normalizeProjectRecord(p),dashboardProject=app.projects.find(project=>project.id===p.id);
  app.current={id:p.id,owner_id:p.owner_id,name:p.name,aspect:p.aspect||"3:4 Portrait",aspectWidth:pp.aspectWidth,aspectHeight:pp.aspectHeight,style:p.style||"Storyboard B&W",position:pp.position,isFavorite:pp.isFavorite,folderId:dashboardProject?.folderId||null,folder:dashboardProject?.folder||"General",tags:pp.tags,metadata:pp.metadata,updated_at:p.updated_at,scenes:sceneObjects};
  app.isOwner=p.owner_id===app.session.user.id||adminSupporting(p.id);
  if(app.isOwner){app.permissions=fullPermissions()}else{
    const {data:m}=await sb.from("project_members").select("permissions").eq("project_id",id).eq("user_id",app.session.user.id).maybeSingle();app.permissions=m?.permissions||blankPermissions()
  }
  await Promise.all([loadAiVisualBible(id),loadProjectScript(id)]);
  if(adminSupporting(id))app.admin.supportProjectName=p.name||app.admin.supportProjectName;
  const preferredScene=app.current.scenes.find(s=>s.id===preferredSceneId) || app.current.scenes[0] || null;
  app.activeSceneId=preferredScene?.id||null;
  const preferredShot=preferredScene?.shots.find(s=>s.id===preferredShotId) || preferredScene?.shots[0] || null;
  app.activeShotId=preferredShot?.id||null;
  if(!sameProject){app.mobileScreen="shot";if(options.sheetOpen===undefined)app.sheetOpen=false}
  if(options.sheetOpen!==undefined)app.sheetOpen=!!options.sheetOpen;
  showEditor();
  if($("aiBibleModal")?.open)renderAiVisualBible();
  restoreAccordionState(options.openDetails);
  subscribeRealtime();
  subscribePresence();
  startSignedImageRefresh();
  setupChatNotifications();
  rememberWorkspace();
  if(restoreScroll!==null)setTimeout(()=>window.scrollTo({top:restoreScroll,left:0,behavior:"auto"}),0)
}
function subscribeRealtime(){
  if(!sb||app.mode!=="cloud"||!app.current)return;
  const pid=app.current.id;
  let channel=sb.channel(`project-${pid}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"projects",filter:`id=eq.${pid}`},()=>remoteRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"scenes",filter:`project_id=eq.${pid}`},()=>remoteRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"shots",filter:`project_id=eq.${pid}`},()=>remoteRefresh());
  if(app.ai.ready)channel=channel
    .on("postgres_changes",{event:"*",schema:"public",table:"project_ai_characters",filter:`project_id=eq.${pid}`},()=>remoteRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"project_ai_locations",filter:`project_id=eq.${pid}`},()=>remoteRefresh());
  if(app.script.ready)channel=channel
    .on("postgres_changes",{event:"*",schema:"public",table:"project_scripts",filter:`project_id=eq.${pid}`},()=>remoteRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"script_shot_links",filter:`project_id=eq.${pid}`},()=>remoteRefresh());
  app.realtimeChannel=channel.subscribe()
}
function unsubscribeRealtime(){if(sb&&app.realtimeChannel){sb.removeChannel(app.realtimeChannel);app.realtimeChannel=null}}

function unsubscribePresence(){
  clearTimeout(presenceTrackTimer);
  lastPresenceSignature="";
  if(sb&&app.presenceChannel){sb.removeChannel(app.presenceChannel);app.presenceChannel=null}
  renderShotPresence()
}
function presencePayload(){
  return {
    user_id:app.session?.user?.id||"",
    username:app.profile?.username||"",
    display_name:app.profile?.display_name||app.profile?.username||"Collaborator",
    scene_id:app.activeSceneId||null,
    shot_id:app.activeShotId||null,
    editing:true,
    online_at:new Date().toISOString()
  }
}
function syncPresence(force=false){
  if(!app.presenceChannel||app.mode!=="cloud"||!app.current)return;
  const signature=`${app.current.id}|${app.activeSceneId||""}|${app.activeShotId||""}`;
  if(!force&&signature===lastPresenceSignature)return;
  lastPresenceSignature=signature;
  clearTimeout(presenceTrackTimer);
  presenceTrackTimer=setTimeout(()=>app.presenceChannel?.track(presencePayload()),80)
}
function renderShotPresence(){
  const el=$("shotPresence");if(!el)return;
  if(!app.presenceChannel||!app.activeShotId){el.hidden=true;el.textContent="";return}
  const state=app.presenceChannel.presenceState?.()||{};
  const people=[];
  for(const rows of Object.values(state)){
    for(const row of rows||[]){
      if(row.user_id===app.session?.user?.id)continue;
      if(row.shot_id===app.activeShotId)people.push(row)
    }
  }
  const unique=[...new Map(people.map(p=>[p.user_id,p])).values()];
  if(!unique.length){el.hidden=true;el.textContent="";return}
  const names=unique.slice(0,3).map(p=>p.display_name||p.username||"Collaborator");
  el.textContent=`● ${names.join(", ")} ${unique.length===1?"is":"are"} editing this shot${unique.length>3?` +${unique.length-3}`:""}`;
  el.hidden=false
}
function subscribePresence(){
  unsubscribePresence();
  if(!sb||app.mode!=="cloud"||!app.current||!app.session)return;
  const pid=app.current.id;
  app.presenceChannel=sb.channel(`storyboard-presence-${pid}`,{config:{presence:{key:app.session.user.id}}})
    .on("presence",{event:"sync"},renderShotPresence)
    .on("presence",{event:"join"},renderShotPresence)
    .on("presence",{event:"leave"},renderShotPresence)
    .subscribe(async status=>{
      if(status==="SUBSCRIBED"){
        lastPresenceSignature=`${app.current?.id||""}|${app.activeSceneId||""}|${app.activeShotId||""}`;
        await app.presenceChannel.track(presencePayload());
        renderShotPresence()
      }
    })
}
async function refreshSignedImages(){
  if(app.mode!=="cloud"||!app.current)return;
  const jobs=[];
  for(const {shot} of allShots()){
    if(!shot.imagePath)continue;
    jobs.push((async()=>{
      const {data,error}=await sb.storage.from("storyboards").createSignedUrl(shot.imagePath,SIGNED_IMAGE_TTL_SECONDS);
      if(!error&&data?.signedUrl)shot.image=data.signedUrl
    })())
  }
  if($("aiBibleModal")?.open){
    for(const asset of [...app.ai.characters,...app.ai.locations]){
      if(asset.reference_path||asset.source_path)jobs.push(signAiAsset(asset))
    }
  }
  await Promise.all(jobs);
  renderSceneList();renderShot();if($("aiBibleModal")?.open)renderAiVisualBible();if(app.sheetOpen)renderSheet()
}
function stopSignedImageRefresh(){if(signedImageRefreshTimer){clearInterval(signedImageRefreshTimer);signedImageRefreshTimer=null}}
function startSignedImageRefresh(){
  stopSignedImageRefresh();
  if(app.mode!=="cloud"||!app.current)return;
  signedImageRefreshTimer=setInterval(()=>refreshSignedImages().catch(console.warn),SIGNED_IMAGE_REFRESH_MS)
}
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
  syncMobileEditorUi();
  if(app.mode==="cloud"){rememberWorkspace();syncPresence()}
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
        <button class="scene-mini add-shot-scene" type="button" title="Add shot to this scene" aria-label="Add shot to this scene">＋</button>
        <button class="scene-mini delete-shot-scene" type="button" title="Delete selected shot" aria-label="Delete selected shot" ${scene.shots.length<=1?"disabled":""}>−</button>
        <button class="scene-mini copy-shot-scene" type="button" title="Copy selected shot" aria-label="Copy selected shot"><svg class="scene-action-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>
        <button class="scene-mini paste-shot-scene" type="button" title="Paste copied shot" aria-label="Paste copied shot" ${app.shotClipboard?"":"disabled"}><svg class="scene-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6l1 2h3v13H5V7h3z"/><path d="M9 4h6v4H9zM9 12h6M12 9v6"/></svg></button>`;
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
    row.querySelector(".copy-shot-scene")?.addEventListener("click",()=>copySelectedShotFromScene(scene.id));
    row.querySelector(".paste-shot-scene")?.addEventListener("click",()=>pasteShotIntoScene(scene.id));
    row.querySelectorAll(".rename-scene,.duplicate-scene,.move-scene-up,.move-scene-down").forEach(b=>b.disabled=b.disabled||!can("scenes"));
    row.querySelectorAll(".add-shot-scene,.delete-shot-scene,.copy-shot-scene,.paste-shot-scene").forEach(b=>b.disabled=b.disabled||!can("shots"));

    const shots=document.createElement("div");shots.className="scene-shots";
    const ordered=[...scene.shots].sort((a,b)=>a.position-b.position);
    ordered.forEach((shot,shotIndex)=>{
      const sr=document.createElement("div");sr.className="shot-row";
      const b=document.createElement("button");b.type="button";b.className="shot-item"+(shot.id===app.activeShotId?" active":"");
      const th=document.createElement("span");th.className="shot-thumb";if(shot.image)th.style.backgroundImage=`url(${shot.image})`;
      const txt=document.createElement("span");txt.className="shot-item-text";txt.innerHTML=`<strong>Shot ${shot.shotNo}</strong><small>${shortValue(shot.shotSize)} · ${shot.duration||"No duration"}</small>`;
      b.append(th,txt);b.onclick=()=>{app.activeSceneId=scene.id;app.activeShotId=shot.id;app.sheetOpen=false;renderEditor();rememberWorkspace()};
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
  const s=currentScene();if(!s)return;$("sceneNumber").value=s.number;$("sceneTitle").value=s.title||"";$("sceneDescription").value=s.description||"";
  $("sceneStoryLocation").value=s.storyLocation||"";$("sceneStoryTime").value=SCENE_TIME_OPTIONS.includes(s.storyTime)?s.storyTime:"Unspecified";$("sceneShootTime").value=SCENE_TIME_OPTIONS.includes(s.shootTime)?s.shootTime:"Unspecified";$("sceneTimeStrategy").value=SCENE_TIME_STRATEGIES.some(([value])=>value===s.timeStrategy)?s.timeStrategy:"natural";
  const location=$("sceneAiLocationId"),previous=s.aiLocationId||"";location.innerHTML='<option value="">No Bible location assigned</option>';
  for(const asset of app.ai.locations){const option=document.createElement("option");option.value=asset.id;option.textContent=asset.name+(!asset.reference_path?" · needs reference":!asset.locked?" · not locked":asset.style_snapshot!==app.current.style?" · style changed":"");location.appendChild(option)}
  location.value=[...location.options].some(option=>option.value===previous)?previous:"";
  const characters=$("sceneAiCharacterPicker");characters.innerHTML="";s.aiCharacterIds=Array.isArray(s.aiCharacterIds)?s.aiCharacterIds:[];
  if(!app.ai.ready||!app.ai.characters.length)characters.innerHTML=`<span class="ai-picker-empty">${app.ai.ready?"No Bible characters yet.":app.mode==="cloud"?app.ai.migrationMessage:"Bible assignments are available in cloud projects."}</span>`;
  else for(const asset of app.ai.characters){const selected=s.aiCharacterIds.includes(asset.id),label=document.createElement("label");label.className="ai-reference-choice"+(selected?" selected":"")+(!asset.reference_path||!asset.locked||asset.style_snapshot!==app.current.style?" needs-reference":"");label.innerHTML=`<input type="checkbox" value="${asset.id}" ${selected?"checked":""}><span>${escapeHtml(asset.name)}</span>`;label.querySelector("input").onchange=event=>{s.aiCharacterIds=event.target.checked?[...new Set([...s.aiCharacterIds,asset.id])]:s.aiCharacterIds.filter(id=>id!==asset.id);onSceneChange()};characters.appendChild(label)}
}
function renderShot(){
  const s=currentShot(),sc=currentScene();if(!s||!sc)return;
  SHOT_FIELDS.forEach(id=>{if($(id))$(id).value=s[id]??""});
  $("shotKicker").textContent=`SCENE ${String(sc.number).padStart(2,"0")}`;
  $("shotTitle").textContent=`Shot ${s.shotNo}`;
  $("mobileEditorTitle").textContent=app.current.name||"Storyboard";
  $("mobileEditorSubtitle").textContent=`Scene ${sc.number} · Shot ${s.shotNo}`;
  $("quickSize").textContent=shortValue(s.shotSize);$("quickAngle").textContent=s.angle;$("quickLens").textContent=s.lens;$("quickMove").textContent=s.movement;
  $("frameMeta").textContent=`${projectAspectText(app.current)} · ${shortValue(s.shotSize)} · ${s.angle}`;
  const f=$("storyFrame");f.style.aspectRatio=`${aspectNumbers(app.current).w}/${aspectNumbers(app.current).h}`;
  const img=$("frameImage"),ph=document.querySelector(".frame-placeholder");
  if(s.image){img.src=s.image;img.hidden=false;ph.hidden=true;$("removeImageBtn").hidden=false}else{img.hidden=true;img.removeAttribute("src");ph.hidden=false;$("removeImageBtn").hidden=true}
  renderAiShotControls()
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
  ["sceneTitle","sceneDescription","sceneStoryLocation","sceneStoryTime","sceneShootTime","sceneTimeStrategy"].forEach(id=>$(id).disabled=sceneLocked);$("sceneAiLocationId").disabled=sceneLocked||!app.ai.ready;
  $("sceneAiCharacterPicker").querySelectorAll("input").forEach(input=>input.disabled=sceneLocked||!app.ai.ready);
  $("syncSceneBibleBtn").disabled=sceneLocked||shotLocked||!currentScene()||!app.ai.ready;
  ["addSceneBtn","deleteSceneBtn"].forEach(id=>$(id).disabled=sceneLocked);
  ["addShotBtn","duplicateShotBtn","moveShotUpBtn","moveShotDownBtn","deleteShotBtn"].forEach(id=>{if($(id))$(id).disabled=shotLocked});
  $("pasteShotBtn").disabled=shotLocked||!app.shotClipboard;
  $("copyShotBtn").disabled=!currentShot();
  SHOT_FIELDS.forEach(id=>{if($(id))$(id).disabled=shotLocked});
  $("shotNo").readOnly=true;$("shotNo").disabled=false;
  $("frameImageInput").disabled=mediaLocked;$("chooseImageLabel").classList.toggle("permission-locked",mediaLocked);$("removeImageBtn").disabled=mediaLocked;
  $("aiBibleBtn").disabled=app.mode!=="cloud";
  const generateButton=$("generateShotImageBtn"),generationReady=aiShotReady();
  const generationBlocked=mediaLocked||app.mode!=="cloud"||app.ai.generating;
  generateButton.disabled=generationBlocked;
  generateButton.classList.toggle("is-not-ready",!generationBlocked&&!generationReady.ready);
  generateButton.setAttribute("aria-disabled",String(generationBlocked));
  generateButton.title=generationReady.ready?"":uiText(generationReady.message);
  $("aiLocationId").disabled=shotLocked||!app.ai.ready;
  $("shotCharacterPicker").querySelectorAll("input").forEach(x=>x.disabled=shotLocked||!app.ai.ready);
  $("collaborateBtn").hidden=app.mode!=="cloud";
}

/* ---------- SAVING ---------- */
function queueSave(kind){
  if(app.mode==="local"){saveLocal();return}
  clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveCloud(kind),550)
}
async function saveCloud(kind){
  if(!sb||!app.current)return false;
  app.ignoreRealtimeUntil=Date.now()+1400;
  if(kind==="project"&&can("project_settings")){
    const {error}=await sb.from("projects").update({name:app.current.name,aspect:app.current.aspect,aspect_width:app.current.aspectWidth,aspect_height:app.current.aspectHeight,style:app.current.style,folder:app.current.folder||"General",tags:app.current.tags||[],metadata:projectMeta(app.current),is_favorite:!!app.current.isFavorite,updated_at:new Date().toISOString()}).eq("id",app.current.id);
    if(error){setMsg("editorNotice",error.message||"Could not save project settings.","warning");return false}
  }else if(kind==="scene"&&can("scenes")){
    const s=currentScene();if(!s)return;
    const {data,error}=await sb.rpc("storyboard_update_scene_v45",{p_scene_id:s.id,p_expected_version:Number(s.version||1),p_title:s.title||"",p_description:s.description||"",p_story_location:s.storyLocation||"",p_story_time:s.storyTime||"Unspecified",p_shoot_time:s.shootTime||"Unspecified",p_time_strategy:s.timeStrategy||"natural",p_ai_location_id:s.aiLocationId||null,p_ai_character_ids:s.aiCharacterIds||[]});
    if(error){
      if(String(error.message||"").includes("EDIT_CONFLICT")){setMsg("editorNotice",conflictMessage("scene"),"warning");await openCloudProject(app.current.id,{sceneId:s.id,shotId:app.activeShotId,preserveSelection:true});return false}
      const message=/storyboard_update_scene_v45|schema cache/i.test(String(error.message||""))?"Scene Settings need the saved SQL query “Storyboard v4.5 - Bible Script & Scene Breakdown”. Run it in Supabase, then reload.":error.message||"Could not save scene.";setMsg("editorNotice",message,"warning");return false
    }
    s.version=Number(data||s.version+1);return true
  }else if(kind==="shot"&&can("shots")){
    const s=currentShot();if(!s)return;const data=shotDbData(s);
    const shotRpc=adminSupporting()?"storyboard_admin_update_shot":"update_storyboard_shot";
    const {data:newVersion,error}=await sb.rpc(shotRpc,{p_shot_id:s.id,p_expected_version:Number(s.version||1),p_data:data});
    if(error){
      if(String(error.message||"").includes("EDIT_CONFLICT")){setMsg("editorNotice",conflictMessage("shot"),"warning");await openCloudProject(app.current.id,{sceneId:app.activeSceneId,shotId:s.id,preserveSelection:true});return false}
      setMsg("editorNotice",error.message||"Could not save shot.","warning");return false
    }
    s.version=Number(newVersion||s.version+1);return true
  }
  return true
}
function onProjectChange(){
  if(!can("project_settings"))return;
  app.current.name=$("projectName").value;app.current.aspect=$("projectAspect").value;app.current.style=$("projectStyle").value;app.current.aspectWidth=Number($("aspectWidth").value)||3;app.current.aspectHeight=Number($("aspectHeight").value)||4;
  $("customAspectFields").hidden=app.current.aspect!=="Custom";renderShot();renderSheet();queueSave("project");rememberWorkspace()
}
function onSceneChange(){
  if(!can("scenes"))return;const s=currentScene();if(!s)return;s.title=$("sceneTitle").value;s.description=$("sceneDescription").value;s.storyLocation=$("sceneStoryLocation").value;s.storyTime=$("sceneStoryTime").value;s.shootTime=$("sceneShootTime").value;s.timeStrategy=$("sceneTimeStrategy").value;s.aiLocationId=$("sceneAiLocationId").value||"";s.aiCharacterIds=[...document.querySelectorAll('#sceneAiCharacterPicker input[type="checkbox"]:checked')].map(input=>input.value);renderSceneList();renderShot();renderSheet();queueSave("scene");rememberWorkspace()
}
async function syncSceneBibleToShots(){
  const scene=currentScene();if(!scene||!can("scenes")||!can("shots"))return;
  if(!uiConfirm(`Apply the Scene Bible location, characters and story time to all ${scene.shots.length} shot${scene.shots.length===1?"":"s"} in this scene?`))return;
  const priorSuppress=app.suppressRealtime;app.suppressRealtime++;
  try{
    for(const shot of scene.shots){shot.aiLocationId=scene.aiLocationId||"";shot.aiCharacterIds=[...(scene.aiCharacterIds||[])];if(scene.storyTime&&scene.storyTime!=="Unspecified")shot.timeOfDay=scene.storyTime;if(scene.storyLocation&&!shot.location)shot.location=scene.storyLocation;if(app.mode==="cloud"){const {error}=await sb.from("shots").update({data:shotDbData(shot)}).eq("id",shot.id).eq("project_id",app.current.id);if(error)throw error}}
    if(app.mode==="local")saveLocal();setMsg("editorNotice","Scene Bible assignments applied to every shot.");renderEditor();rememberWorkspace()
  }catch(error){setMsg("editorNotice",error.message||"Could not apply Scene Bible assignments.","warning")}
  finally{app.suppressRealtime=priorSuppress}
}
function onShotChange(id){
  if(!can("shots")||id==="shotNo")return;const s=currentShot();if(!s)return;s[id]=$(id).value;renderShot();renderSceneList();renderSheet();applyPermissionLocks();queueSave("shot");rememberWorkspace()
}
function openPrimarySetting(fieldId){
  const field=$(fieldId),section=$("frameSection");if(!field||field.disabled)return;
  section.open=true;
  // Force the newly-opened details panel to finish layout while the original
  // tap still owns browser user activation. Without this, some mobile browsers
  // focus the select on the first tap but refuse to open its native picker.
  void field.offsetHeight;
  try{field.focus({preventScroll:true})}catch{field.focus()}
  let pickerOpened=false;
  if(typeof field.showPicker==="function"){
    try{field.showPicker();pickerOpened=true}catch{}
  }
  if(!pickerOpened){try{field.click()}catch{}}
  requestAnimationFrame(()=>field.scrollIntoView({behavior:"auto",block:"center",inline:"nearest"}))
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
async function copyAiReferencePath(sourcePath,newProjectId,type,newAssetId,role="reference"){
  if(app.mode!=="cloud"||!sourcePath)return null;
  const ext=(String(sourcePath).match(/\.([a-zA-Z0-9]+)$/)||[])[1]||"webp",dest=`${newProjectId}/ai/${aiFolder(type)}/${newAssetId}/${Date.now()}-${role}-copy.${ext}`;
  const {error}=await sb.storage.from("storyboards").copy(String(sourcePath),dest);if(error){console.warn("Could not copy AI reference",error);return null}return dest
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
  }catch(err){uiAlert(`Could not save scene order: ${err.message}`)}finally{app.suppressRealtime--}
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
  }catch(err){uiAlert(`Could not save shot order: ${err.message}`)}finally{app.suppressRealtime--}
  renderEditor();
}
async function addScene(){
  if(!can("scenes"))return;const no=app.current.scenes.length+1,pos=no;
  if(app.mode==="local"){
    const s=blankScene(no);s.position=pos;app.current.scenes.push(s);normalizeSceneOrder();app.activeSceneId=s.id;app.activeShotId=s.shots[0].id;saveLocal();renderEditor();return
  }
  const {data:s,error}=await sb.from("scenes").insert({project_id:app.current.id,scene_number:no,title:`Scene ${no}`,description:"",position:pos,collapsed:false}).select().single();if(error){uiAlert(error.message);return}
  const {data:sh,error:er}=await sb.from("shots").insert({project_id:app.current.id,scene_id:s.id,shot_number:1,position:1,data:blankShot(1)}).select().single();if(er){uiAlert(er.message);return}
  await openCloudProject(app.current.id);app.activeSceneId=s.id;app.activeShotId=sh.id;renderEditor()
}
async function renameScene(sceneId){
  if(!can("scenes"))return;const s=app.current.scenes.find(x=>x.id===sceneId);if(!s)return;
  const title=uiPrompt("Scene title:",s.title||`Scene ${s.number}`);if(title===null)return;s.title=title.trim()||`Scene ${s.number}`;
  if(app.mode==="cloud"){const {error}=await sb.from("scenes").update({title:s.title}).eq("id",s.id);if(error)return uiAlert(error.message)}else saveLocal();
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
    const {data:newScene,error}=await sb.from("scenes").insert({project_id:app.current.id,scene_number:source.number+1,title:`${source.title||`Scene ${source.number}`} Copy`,description:source.description||"",story_location:source.storyLocation||"",story_time:source.storyTime||"Unspecified",shoot_time:source.shootTime||"Unspecified",time_strategy:source.timeStrategy||"natural",ai_location_id:source.aiLocationId||null,ai_character_ids:source.aiCharacterIds||[],position:source.position+.5,collapsed:false}).select().single();
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
  }catch(err){uiAlert(`Could not duplicate scene: ${err.message}`)}finally{app.suppressRealtime--}
}
async function moveScene(sceneId,delta){
  if(!can("scenes"))return;const arr=app.current.scenes.sort((a,b)=>a.position-b.position),i=arr.findIndex(x=>x.id===sceneId),j=i+delta;if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((s,k)=>s.position=k+1);await persistSceneOrder();
}
async function deleteScene(sceneId=app.activeSceneId){
  if(!can("scenes"))return;
  if(app.current.scenes.length===1){uiAlert("At least one scene must remain.");return}
  const s=app.current.scenes.find(x=>x.id===sceneId)||currentScene();
  if(!s)return;
  const label=s.title?.trim()?`Scene ${s.number} · ${s.title.trim()}`:`Scene ${s.number}`;
  if(!uiConfirm(`Delete ${label} and all ${s.shots.length} of its shot${s.shots.length===1?"":"s"}?\n\nThis cannot be undone.`))return;

  if(app.mode==="local"){
    app.current.scenes=app.current.scenes.filter(x=>x.id!==s.id);
    normalizeSceneOrder();
    selectFirst();
    saveLocal();
    renderEditor();
    return
  }

  app.suppressRealtime++;
  try{
    await removeMediaPaths(s.shots.map(x=>x.imagePath));
    const {error}=await sb.from("scenes").delete().eq("id",s.id);
    if(error)throw error;

    await openCloudProject(app.current.id);
    normalizeSceneOrder();

    for(const x of app.current.scenes){
      const {error:e}=await sb.from("scenes")
        .update({scene_number:x.number,position:x.position})
        .eq("id",x.id);
      if(e)throw e
    }

    await openCloudProject(app.current.id)
  }catch(err){
    uiAlert(`Could not delete scene: ${err.message}`)
  }finally{
    app.suppressRealtime--
  }
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
  if(app.mode==="local"){const sh=blankShotForScene(no,sc);sh.position=pos;sc.shots.push(sh);app.activeShotId=sh.id;saveLocal();renderEditor();rememberWorkspace();return}
  const sh=blankShotForScene(no,sc);app.ignoreRealtimeUntil=Date.now()+1400;const {data,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sc.id,shot_number:no,position:pos,data:shotDbData(sh)}).select().single();if(error){uiAlert(error.message);return}
  await openCloudProject(app.current.id,{sceneId:sc.id,shotId:data.id,preserveSelection:true});rememberWorkspace()
}
async function deleteSelectedShotFromScene(sceneId){
  const sc=app.current?.scenes.find(s=>s.id===sceneId);if(!sc||sc.shots.length<=1)return;
  const selected=sc.shots.find(s=>s.id===app.activeShotId);
  if(!selected){app.activeSceneId=sc.id;app.activeShotId=[...sc.shots].sort((a,b)=>a.position-b.position)[0]?.id||null;renderEditor();uiAlert("Select the shot you want to delete, then press − again.");return}
  app.activeSceneId=sc.id;await deleteShot()
}
async function moveShotById(sceneId,shotId,delta){
  if(!can("shots"))return;const sc=app.current?.scenes.find(s=>s.id===sceneId);if(!sc)return;const arr=sc.shots.sort((a,b)=>a.position-b.position),i=arr.findIndex(x=>x.id===shotId),j=i+delta;if(i<0||j<0||j>=arr.length)return;
  app.activeSceneId=sc.id;app.activeShotId=shotId;[arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((x,k)=>x.position=k+1);await persistShotOrder(sc);rememberWorkspace()
}
async function insertShotCopy(source,afterIndex){
  const sc=currentScene();if(!sc||!source)return;
  const ordered=[...sc.shots].sort((a,b)=>a.position-b.position),insertIndex=Math.max(0,Math.min(ordered.length,Number(afterIndex)+1));
  const copy=deepClone(source);copy.id=uid();copy.position=ordered.length+1;copy.shotNo=ordered.length+1;
  if(app.mode==="local"){ordered.splice(insertIndex,0,copy);sc.shots=ordered;normalizeShotNumbers(sc);app.activeShotId=copy.id;saveLocal();renderEditor();return}
  app.suppressRealtime++;
  try{
    const {data:row,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sc.id,shot_number:copy.shotNo,position:copy.position,image_path:null,data:shotDbData(copy)}).select().single();if(error)throw error;
    const copied=await copyMediaPath(source.imagePath,app.current.id,row.id);
    if(copied){const {error:u}=await sb.from("shots").update({image_path:copied}).eq("id",row.id);if(u)throw u}
    await openCloudProject(app.current.id,{sceneId:sc.id,shotId:row.id,preserveSelection:true});const target=app.current.scenes.find(x=>x.id===sc.id);
    if(target){const currentOrder=[...target.shots].sort((a,b)=>a.position-b.position),newShotIndex=currentOrder.findIndex(x=>x.id===row.id),newShot=currentOrder.splice(newShotIndex,1)[0];currentOrder.splice(insertIndex,0,newShot);target.shots=currentOrder;normalizeShotNumbers(target);for(const s of target.shots){const {error:e}=await sb.from("shots").update({shot_number:s.shotNo,position:s.position,data:shotDbData(s)}).eq("id",s.id);if(e)throw e}}
    await openCloudProject(app.current.id);app.activeSceneId=sc.id;app.activeShotId=row.id;renderEditor()
  }catch(err){uiAlert(`Could not duplicate shot: ${err.message}`)}finally{app.suppressRealtime--}
}
async function duplicateShot(){
  if(!can("shots"))return;const s=currentShot(),sc=currentScene();if(!s)return;const idx=sc.shots.sort((a,b)=>a.position-b.position).findIndex(x=>x.id===s.id);await insertShotCopy(s,idx)
}
function copyShot(){
  const s=currentShot();if(!s)return;app.shotClipboard=deepClone(s);if(app.mode==="cloud")app.shotClipboard.image=null;$("pasteShotBtn").disabled=!can("shots");setMsg("editorNotice",`Shot ${s.shotNo} copied. Paste inserts a copy after the current shot.`);renderSceneList()
}
async function pasteShot(){
  if(!can("shots")||!app.shotClipboard)return;const sc=currentScene();const s=currentShot();const idx=Math.max(0,sc.shots.sort((a,b)=>a.position-b.position).findIndex(x=>x.id===s?.id));await insertShotCopy(app.shotClipboard,idx)
}
function copySelectedShotFromScene(sceneId){
  const scene=app.current?.scenes.find(item=>item.id===sceneId);if(!scene||!scene.shots.length)return;
  const selected=scene.shots.find(item=>item.id===app.activeShotId)||[...scene.shots].sort((a,b)=>a.position-b.position)[0];app.activeSceneId=scene.id;app.activeShotId=selected.id;copyShot();renderEditor()
}
async function pasteShotIntoScene(sceneId){
  if(!can("shots")||!app.shotClipboard)return;const scene=app.current?.scenes.find(item=>item.id===sceneId);if(!scene)return;
  const ordered=[...scene.shots].sort((a,b)=>a.position-b.position),selectedIndex=ordered.findIndex(item=>item.id===app.activeShotId);app.activeSceneId=scene.id;app.activeShotId=selectedIndex>=0?ordered[selectedIndex].id:ordered.at(-1)?.id||null;scene.collapsed=false;await insertShotCopy(app.shotClipboard,selectedIndex>=0?selectedIndex:ordered.length-1)
}
async function moveShot(delta){
  const sc=currentScene(),s=currentShot();if(!sc||!s)return;await moveShotById(sc.id,s.id,delta)
}
async function deleteShot(){
  if(!can("shots"))return;const s=currentShot(),sc=currentScene();if(sc.shots.length===1){uiAlert("Each scene needs at least one shot.");return}if(!uiConfirm(`Delete Shot ${s.shotNo}?`))return;
  const sorted=[...sc.shots].sort((a,b)=>a.position-b.position);const oldIndex=sorted.findIndex(x=>x.id===s.id);const nextId=sorted[oldIndex+1]?.id||sorted[oldIndex-1]?.id||null;
  if(app.mode==="local"){sc.shots=sc.shots.filter(x=>x.id!==s.id);normalizeShotNumbers(sc);app.activeShotId=nextId||sc.shots[0].id;saveLocal();renderEditor();return}
  app.suppressRealtime++;
  try{
    await removeMediaPaths([s.imagePath]);
    const {error}=await sb.from("shots").delete().eq("id",s.id);if(error)throw error;
    const remaining=sc.shots.filter(x=>x.id!==s.id).sort((a,b)=>a.position-b.position);remaining.forEach((x,i)=>{x.position=i+1;x.shotNo=i+1});
    for(const x of remaining){const {error:e}=await sb.from("shots").update({shot_number:x.shotNo,position:x.position,data:shotDbData(x)}).eq("id",x.id);if(e)throw e}
    await openCloudProject(app.current.id);app.activeSceneId=sc.id;app.activeShotId=nextId||currentScene()?.shots?.[0]?.id||null;renderEditor()
  }catch(err){uiAlert(`Could not delete shot: ${err.message}`)}finally{app.suppressRealtime--}
}
function adjacentShot(delta){
  const arr=allShots(),idx=arr.findIndex(x=>x.shot.id===app.activeShotId),target=arr[idx+delta];if(!target)return;app.activeSceneId=target.scene.id;app.activeShotId=target.shot.id;app.mobileScreen="shot";app.sheetOpen=false;renderEditor();rememberWorkspace();
  const workspace=document.querySelector(".workspace");if(isMobileEditor()&&workspace)workspace.scrollTo({top:0,behavior:"smooth"});else window.scrollTo({top:0,behavior:"smooth"})
}

/* ---------- IMAGES ---------- */
async function loadImage(e){
  const file=e.target.files[0];if(!file||!can("media"))return;const s=currentShot();
  if(app.mode==="local"){
    const r=new FileReader();r.onload=()=>{s.image=r.result;s.aiGeneration=null;saveLocal();renderEditor()};r.readAsDataURL(file);e.target.value="";return
  }
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024){e.target.value="";return uiAlert("Use a JPEG, PNG or WebP image up to 12 MB.")}
  try{
    const optimized=await optimizeImageBlob(file,1024,.82),format=optimizedImageFormat(optimized),path=`${app.current.id}/${s.id}/${Date.now()}-manual.${format.extension}`,oldPath=s.imagePath;s.aiGeneration=null;
    const {error}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(error)throw error;
    const {error:u}=await sb.from("shots").update({image_path:path}).eq("id",s.id);if(u){await removeMediaPaths([path]);throw u}
    s.imagePath=path;const {data}=await sb.storage.from("storyboards").createSignedUrl(path,SIGNED_IMAGE_TTL_SECONDS);s.image=data?.signedUrl||URL.createObjectURL(optimized);await removeMediaPaths([oldPath]);await saveCloud("shot");renderEditor()
  }catch(err){uiAlert(err.message||"Could not save image.")}finally{e.target.value=""}
}
async function removeImage(){
  if(!can("media"))return;const s=currentShot();
  if(app.mode==="cloud"&&s.imagePath){await sb.storage.from("storyboards").remove([s.imagePath]);await sb.from("shots").update({image_path:null}).eq("id",s.id)}
  s.image=null;s.imagePath=null;s.aiGeneration=null;if(app.mode==="local")saveLocal();else await saveCloud("shot");renderEditor();rememberWorkspace()
}

function shotById(id){return allShots().find(item=>item.shot.id===id)?.shot||null}
function shotImageTarget(shot){
  if(!shot?.image)return null;const scene=app.current?.scenes.find(item=>item.shots.some(candidate=>candidate.id===shot.id));
  return {kind:"shot",id:shot.id,url:shot.image,title:`Shot ${shot.shotNo}`,caption:`${scene?.title||`Scene ${scene?.number||""}`} · ${projectAspectText(app.current)}`,maxDimension:1024}
}
function aiAssetImageTarget(asset,type,role="reference"){
  const source=role==="source",url=source?asset?.sourceUrl:asset?.referenceUrl;if(!url)return null;
  return {kind:source?"asset-source":"asset-reference",id:asset.id,type,url,title:asset.name||uiText(type),caption:source?`${asset.name} · Source image used to guide AI generation`:`${asset.name} · ${type} reference`,maxDimension:496,aspect:type==="character"?{w:3,h:4}:{w:4,h:3}}
}
function canCropImageTarget(target){return !!(target?.url&&can("media")&&!app.ai.generating&&(target.kind==="shot"||target.kind==="asset-reference"||target.kind==="asset-source"))}
function openImageViewer(target){
  if(!target?.url)return;exitCropMode();imageViewerTarget=target;$("imageViewerTitle").textContent=target.title||"Image Preview";$("imageViewerCaption").dataset.baseCaption=target.caption||"";$("imageViewerCaption").textContent=target.caption||"";const stage=$("imageViewerStage"),fallback=target.aspect||aspectNumbers(app.current);stage.style.setProperty("--viewer-aspect",`${fallback.w}/${fallback.h}`);$("imageViewerImage").src=target.url;
  $("openCropFromViewerBtn").hidden=!canCropImageTarget(target);const dialog=$("imageViewerModal");if(!dialog.open)dialog.showModal()
}
function updateImageViewerAspect(){const image=$("imageViewerImage"),width=Number(image.naturalWidth),height=Number(image.naturalHeight);if(!width||!height)return;const stage=$("imageViewerStage"),card=document.querySelector(".image-viewer-card"),ratio=width/height,ratioLabel=String(Number(ratio.toFixed(3)));if(!cropState.active){stage.style.setProperty("--viewer-aspect",`${width}/${height}`);card.style.setProperty("--viewer-ratio",String(Math.max(.18,Math.min(5,ratio))))}const base=$("imageViewerCaption").dataset.baseCaption||"";$("imageViewerCaption").textContent=[base,`${width} × ${height} · ${ratioLabel}:1`].filter(Boolean).join(" · ")}
function closeImageViewer(){if(cropState.saving)return;exitCropMode();const dialog=$("imageViewerModal");if(dialog.open)dialog.close();$("imageViewerImage").removeAttribute("src");document.querySelector(".image-viewer-card")?.style.removeProperty("--viewer-ratio");imageViewerTarget=null}
function openCurrentShotImage(){const target=shotImageTarget(currentShot());if(target)openImageViewer(target)}
function cropOutputSize(target){
  const aspect=aspectNumbers(app.current),ratio=Math.max(.02,Math.min(50,aspect.w/aspect.h)),max=Math.max(128,Number(target?.maxDimension)||1024);
  return ratio>=1?{width:max,height:Math.max(1,Math.round(max/ratio))}:{width:Math.max(1,Math.round(max*ratio)),height:max}
}
function clearCropDrawable(){try{cropState.cleanup?.()}catch{}cropState.drawable=null;cropState.cleanup=null;cropState.width=0;cropState.height=0;cropState.dragging=false;cropState.pointerId=null}
async function decodeCropDrawable(blob){
  if(typeof createImageBitmap==="function"){
    try{const bitmap=await createImageBitmap(blob);return {drawable:bitmap,width:bitmap.width,height:bitmap.height,cleanup:()=>bitmap.close?.()}}catch{}
  }
  const url=URL.createObjectURL(blob),image=await new Promise((resolve,reject)=>{const node=new Image();node.onload=()=>resolve(node);node.onerror=()=>reject(new Error("Could not read image."));node.src=url});
  return {drawable:image,width:image.naturalWidth,height:image.naturalHeight,cleanup:()=>URL.revokeObjectURL(url)}
}
function clampCropOffset(){
  const canvas=$("cropCanvas");if(!cropState.drawable||!canvas.width||!canvas.height)return;
  const scale=Math.max(canvas.width/cropState.width,canvas.height/cropState.height)*cropState.zoom,maxX=Math.max(0,(cropState.width*scale-canvas.width)/2),maxY=Math.max(0,(cropState.height*scale-canvas.height)/2);
  cropState.offsetX=Math.max(-maxX,Math.min(maxX,cropState.offsetX));cropState.offsetY=Math.max(-maxY,Math.min(maxY,cropState.offsetY))
}
function drawCropCanvas(){
  const canvas=$("cropCanvas"),context=canvas.getContext("2d");if(!context||!cropState.drawable)return;
  clampCropOffset();const scale=Math.max(canvas.width/cropState.width,canvas.height/cropState.height)*cropState.zoom,drawWidth=cropState.width*scale,drawHeight=cropState.height*scale,x=(canvas.width-drawWidth)/2+cropState.offsetX,y=(canvas.height-drawHeight)/2+cropState.offsetY;
  context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle="#050607";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(cropState.drawable,x,y,drawWidth,drawHeight)
}
function resetCrop(){cropState.zoom=1;cropState.offsetX=0;cropState.offsetY=0;$("cropZoom").value="100";$("cropZoomValue").value="100%";drawCropCanvas()}
function updateCropZoom(){cropState.zoom=Math.max(1,Number($("cropZoom").value||100)/100);$("cropZoomValue").value=`${Math.round(cropState.zoom*100)}%`;drawCropCanvas()}
async function openCropEditor(target){
  if(!canCropImageTarget(target))return;if(!$("imageViewerModal").open)openImageViewer(target);clearCropDrawable();cropState.active=true;cropState.target=target;cropState.saving=false;
  const aspect=aspectNumbers(app.current),ratio=aspect.w/aspect.h,card=document.querySelector(".image-viewer-card"),stage=$("imageViewerStage");card.classList.add("is-cropping");card.style.setProperty("--viewer-ratio",String(Math.max(.18,Math.min(5,ratio))));stage.style.setProperty("--viewer-aspect",`${aspect.w}/${aspect.h}`);$("imageViewerEyebrow").textContent="CROP IMAGE";$("imageViewerTitle").textContent=`Crop · ${target.title||"Image"}`;$("imageViewerImage").hidden=true;$("imageViewerActions").hidden=true;$("cropInstructions").hidden=false;$("cropControls").hidden=false;$("cropActions").hidden=false;$("cropLoading").hidden=false;$("cropCanvas").hidden=true;$("saveCropBtn").disabled=true;setMsg("cropNotice","");resetCrop();
  try{
    const response=await fetch(target.url,{cache:"no-store"});if(!response.ok)throw new Error("Could not load the image for cropping.");const decoded=await decodeCropDrawable(await response.blob());
    cropState.drawable=decoded.drawable;cropState.cleanup=decoded.cleanup;cropState.width=decoded.width;cropState.height=decoded.height;const size=cropOutputSize(target),canvas=$("cropCanvas");canvas.width=size.width;canvas.height=size.height;resetCrop();canvas.hidden=false;$("cropLoading").hidden=true;$("saveCropBtn").disabled=false
  }catch(error){$("cropLoading").hidden=true;setMsg("cropNotice",error.message||"Could not open the crop editor.","warning")}
}
function exitCropMode(){
  if(cropState.saving)return;clearCropDrawable();cropState.active=false;cropState.target=null;document.querySelector(".image-viewer-card")?.classList.remove("is-cropping");$("imageViewerEyebrow").textContent="IMAGE PREVIEW";$("imageViewerImage").hidden=false;$("imageViewerActions").hidden=false;$("cropInstructions").hidden=true;$("cropControls").hidden=true;$("cropActions").hidden=true;$("cropCanvas").hidden=true;$("cropLoading").hidden=true;setMsg("cropNotice","");if(imageViewerTarget){$("imageViewerTitle").textContent=imageViewerTarget.title||"Image Preview";updateImageViewerAspect()}
}
function closeCropEditor(){if(cropState.saving)return;exitCropMode()}
function cropPointerDown(event){
  if(!cropState.drawable||cropState.saving)return;const canvas=$("cropCanvas");cropState.dragging=true;cropState.pointerId=event.pointerId;cropState.startX=event.clientX;cropState.startY=event.clientY;cropState.startOffsetX=cropState.offsetX;cropState.startOffsetY=cropState.offsetY;canvas.classList.add("dragging");canvas.setPointerCapture?.(event.pointerId)
}
function cropPointerMove(event){
  if(!cropState.dragging||event.pointerId!==cropState.pointerId)return;const canvas=$("cropCanvas"),rect=canvas.getBoundingClientRect();cropState.offsetX=cropState.startOffsetX+(event.clientX-cropState.startX)*(canvas.width/Math.max(1,rect.width));cropState.offsetY=cropState.startOffsetY+(event.clientY-cropState.startY)*(canvas.height/Math.max(1,rect.height));drawCropCanvas()
}
function cropPointerEnd(event){if(event.pointerId!==cropState.pointerId)return;cropState.dragging=false;cropState.pointerId=null;$("cropCanvas").classList.remove("dragging")}
function cropCanvasBlob(){return new Promise((resolve,reject)=>$("cropCanvas").toBlob(blob=>blob?resolve(blob):reject(new Error("Could not create the cropped image.")),"image/webp",.9))}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error("Could not save image."));reader.readAsDataURL(blob)})}
async function saveCroppedShot(target,blob){
  const shot=shotById(target.id);if(!shot)throw new Error("Shot not found.");
  if(app.mode==="local"){shot.image=await blobToDataUrl(blob);saveLocal();renderEditor();return}
  const format=optimizedImageFormat(blob),path=`${app.current.id}/${shot.id}/${Date.now()}-crop.${format.extension}`,oldPath=shot.imagePath;
  const {error:uploadError}=await sb.storage.from("storyboards").upload(path,blob,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
  const {error:updateError}=await sb.from("shots").update({image_path:path}).eq("id",shot.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
  shot.imagePath=path;const {data:signed}=await sb.storage.from("storyboards").createSignedUrl(path,SIGNED_IMAGE_TTL_SECONDS);shot.image=signed?.signedUrl||URL.createObjectURL(blob);await removeMediaPaths([oldPath]);renderEditor();rememberWorkspace()
}
async function saveCroppedAiAsset(target,blob){
  const asset=aiCollection(target.type).find(item=>item.id===target.id);if(!asset)throw new Error("Bible item not found.");const source=target.kind==="asset-source",format=optimizedImageFormat(blob),role=source?"source":"reference",path=`${app.current.id}/ai/${aiFolder(target.type)}/${asset.id}/${Date.now()}-${role}-crop.${format.extension}`,oldPath=source?asset.source_path:asset.reference_path,oldUrl=source?asset.sourceUrl:asset.referenceUrl;
  const {error:uploadError}=await sb.storage.from("storyboards").upload(path,blob,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
  const changes=source?{source_path:path,updated_at:new Date().toISOString()}:{reference_path:path,style_snapshot:null,locked:false,updated_at:new Date().toISOString()};const {error:updateError}=await sb.from(aiTable(target.type)).update(changes).eq("id",asset.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
  if(source){asset.source_path=path;asset.sourceUrl=null}else{asset.reference_path=path;asset.referenceUrl=null;asset.style_snapshot=null;asset.locked=false}
  await signAiAsset(asset);if(source&&!asset.sourceUrl)asset.sourceUrl=URL.createObjectURL(blob);if(!source&&!asset.referenceUrl)asset.referenceUrl=URL.createObjectURL(blob);if(String(oldUrl||"").startsWith("blob:"))URL.revokeObjectURL(oldUrl);await removeMediaPaths([oldPath]);renderAiVisualBible();renderShot();applyPermissionLocks()
}
async function saveCrop(){
  if(cropState.saving||!cropState.drawable||!cropState.target)return;cropState.saving=true;$("saveCropBtn").disabled=true;$("cancelCropBtn").disabled=true;$("closeImageViewerBtn").disabled=true;setMsg("cropNotice","Saving crop…");
  try{const blob=await cropCanvasBlob(),target=cropState.target;if(target.kind==="shot")await saveCroppedShot(target,blob);else await saveCroppedAiAsset(target,blob);const refreshed=target.kind==="shot"?shotImageTarget(shotById(target.id)):aiAssetImageTarget(aiCollection(target.type).find(item=>item.id===target.id),target.type,target.kind==="asset-source"?"source":"reference");cropState.saving=false;exitCropMode();if(refreshed){imageViewerTarget=refreshed;$("imageViewerTitle").textContent=refreshed.title||"Image Preview";$("imageViewerCaption").dataset.baseCaption=refreshed.caption||"";$("imageViewerImage").src=refreshed.url;$("openCropFromViewerBtn").hidden=!canCropImageTarget(refreshed)}setMsg("editorNotice","Image cropped and saved.")}
  catch(error){setMsg("cropNotice",error.message||"Could not save the cropped image.","warning")}
  finally{cropState.saving=false;$("saveCropBtn").disabled=!cropState.drawable;$("cancelCropBtn").disabled=false;$("closeImageViewerBtn").disabled=false}
}

/* ---------- AI VISUAL BIBLE + STORYBOARD GENERATION ---------- */
function aiTable(type){return type==="character"?"project_ai_characters":"project_ai_locations"}
function aiCollection(type){return type==="character"?app.ai.characters:app.ai.locations}
function aiFolder(type){return type==="character"?"characters":"locations"}
function renderAiUsage(){
  const usage=app.ai.usage,nodes=document.querySelectorAll("[data-ai-usage-summary]");
  for(const node of nodes){
    node.classList.toggle("exhausted",usage.loaded&&!usage.unlimited&&usage.remaining<=0);
    node.classList.toggle("unlimited",usage.loaded&&usage.unlimited);
    if(app.mode!=="cloud"){
      node.innerHTML='<span class="ai-usage-message">Daily AI usage is available in cloud projects.</span>';
      node.title="";
    }else if(usage.loading&&!usage.loaded){
      node.innerHTML='<span class="ai-usage-message">Loading AI usage…</span>';
      node.title="";
    }else if(usage.error){
      node.innerHTML='<span class="ai-usage-message error">AI usage unavailable · run the v4.1.7 usage setup.</span>';
      node.title=usage.error;
    }else if(usage.loaded){
      const remaining=usage.unlimited?"Unlimited":String(usage.remaining);
      node.innerHTML=`<span class="ai-usage-stat"><span>Generated today</span><strong>${usage.used}</strong></span><span class="ai-usage-divider" aria-hidden="true"></span><span class="ai-usage-stat"><span>Remaining today</span><strong>${remaining}</strong></span>`;
      node.title=usage.unlimited?"Admin generations are unlimited and do not consume the shared free pool. Counter resets at 00:00 UTC.":`Remaining includes both your ${usage.dailyLimit}-generation personal allowance and the shared app pool. Counters reset at 00:00 UTC.`;
    }else{
      node.innerHTML='<span class="ai-usage-message">AI usage will appear after sign-in.</span>';
      node.title="";
    }
  }
}
async function loadAiUsage(){
  if(app.mode!=="cloud"||!sb||!app.session){renderAiUsage();return}
  if(app.ai.usage.loading)return;
  app.ai.usage.loading=true;app.ai.usage.error="";renderAiUsage();
  const {data,error}=await sb.rpc("storyboard_ai_usage_status");
  if(error){app.ai.usage.loading=false;app.ai.usage.loaded=false;app.ai.usage.error=error.message||"Could not load AI usage.";renderAiUsage();return}
  const row=Array.isArray(data)?data[0]:data;
  if(!row){app.ai.usage.loading=false;app.ai.usage.loaded=false;app.ai.usage.error="AI usage status returned no data.";renderAiUsage();return}
  const numberOr=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  app.ai.usage={loaded:true,loading:false,error:"",used:Math.max(0,numberOr(row.used,0)),remaining:numberOr(row.remaining,0),dailyLimit:numberOr(row.daily_limit,20),personalRemaining:numberOr(row.personal_remaining,20),globalRemaining:numberOr(row.global_remaining,70),unlimited:!!row.unlimited,usageDate:row.usage_date||""};
  renderAiUsage()
}
function normalizeAiAsset(row,type,previous=null){
  const sameReference=!!(previous&&previous.reference_path===row.reference_path);
  const sameSource=!!(previous&&previous.source_path===row.source_path);
  return {...row,source_path:row.source_path||null,type,locked:!!row.locked,referenceUrl:sameReference?previous.referenceUrl:null,sourceUrl:sameSource?previous.sourceUrl:null,generationStatus:previous?.generationStatus||"",generationStatusKind:previous?.generationStatusKind||""}
}
async function signAiAsset(asset){
  if(!asset)return asset;
  const jobs=[];
  if(asset.reference_path)jobs.push((async()=>{const previous=asset.referenceUrl,{data,error}=await sb.storage.from("storyboards").createSignedUrl(asset.reference_path,SIGNED_IMAGE_TTL_SECONDS);asset.referenceUrl=!error&&data?.signedUrl?data.signedUrl:previous||null})());
  else asset.referenceUrl=null;
  if(asset.source_path)jobs.push((async()=>{const previous=asset.sourceUrl,{data,error}=await sb.storage.from("storyboards").createSignedUrl(asset.source_path,SIGNED_IMAGE_TTL_SECONDS);asset.sourceUrl=!error&&data?.signedUrl?data.signedUrl:previous||null})());
  else asset.sourceUrl=null;
  await Promise.all(jobs);
  return asset
}
async function loadAiVisualBible(projectId=app.current?.id){
  const previousAssets=new Map([...app.ai.characters,...app.ai.locations].map(asset=>[asset.id,asset]));
  app.ai.characters=[];app.ai.locations=[];app.ai.ready=false;
  if(app.mode!=="cloud"||!sb||!projectId)return;
  app.ai.loading=true;
  const modernColumns="id,project_id,name,description,reference_path,source_path,style_snapshot,locked,created_at,updated_at",legacyColumns="id,project_id,name,description,reference_path,style_snapshot,locked,created_at,updated_at";
  let [characters,locations]=await Promise.all([
    sb.from("project_ai_characters").select(modernColumns).eq("project_id",projectId).order("created_at"),
    sb.from("project_ai_locations").select(modernColumns).eq("project_id",projectId).order("created_at")
  ]);
  const sourceColumnMissing=[characters.error,locations.error].some(error=>/source_path/i.test(String(error?.message||"")));
  if(sourceColumnMissing){
    [characters,locations]=await Promise.all([
      sb.from("project_ai_characters").select(legacyColumns).eq("project_id",projectId).order("created_at"),
      sb.from("project_ai_locations").select(legacyColumns).eq("project_id",projectId).order("created_at")
    ]);app.ai.sourceReady=false
  }else app.ai.sourceReady=true;
  app.ai.loading=false;
  if(characters.error||locations.error){
    console.warn("Bible is unavailable",characters.error||locations.error);
    app.ai.migrationMessage="AI setup is not active yet. Run supabase-v4.0-ai.sql, then reload this project.";
    return
  }
  app.ai.characters=(characters.data||[]).map(x=>normalizeAiAsset(x,"character",previousAssets.get(x.id)));
  app.ai.locations=(locations.data||[]).map(x=>normalizeAiAsset(x,"location",previousAssets.get(x.id)));
  app.ai.ready=true;
  // A Realtime refresh can happen while the Bible dialog is open.
  // Restore any missing signed previews before that dialog is rendered again.
  if($("aiBibleModal")?.open)await Promise.all([...app.ai.characters,...app.ai.locations].filter(x=>(x.reference_path&&!x.referenceUrl)||(x.source_path&&!x.sourceUrl)).map(signAiAsset))
}

/* ---------- BIBLE SCRIPT + SHOT REFERENCES ---------- */
function scriptCanEdit(){return app.mode==="cloud"&&(can("project_settings")||can("scenes")||can("shots"))}
function scriptCanApply(){return scriptCanEdit()&&can("media")&&can("scenes")&&can("shots")}
function cleanScriptName(value,fallback="Untitled"){return String(value||fallback).replace(/\s+/g," ").trim().slice(0,160)||fallback}
function cleanScriptText(value,max=1200,fallback=""){return String(value||fallback).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g," ").replace(/\s+/g," ").trim().slice(0,max)||fallback}
function normalizeScriptAnalysis(value){
  const input=value&&typeof value==="object"?value:{},characters=Array.isArray(input.characters)?input.characters:[],locations=Array.isArray(input.locations)?input.locations:[],scenes=Array.isArray(input.scenes)?input.scenes:[];
  const uniqueItems=(items,descriptionFallback)=>[...new Map(items.map(item=>{const row=typeof item==="string"?{name:item}:item||{},name=cleanScriptName(row.name,"");return [name.toLocaleLowerCase(),{name,description:cleanScriptText(row.description,1400,descriptionFallback)}]}).filter(([key])=>key)).values()];
  const validTime=value=>SCENE_TIME_OPTIONS.includes(value)?value:"Unspecified";
  const sceneKeys=new Set();
  return {
    language:cleanScriptName(input.language,"Unknown"),
    title:cleanScriptName(input.title,"Imported Script"),
    characters:uniqueItems(characters,"Recurring character detected in the script; add stable appearance and costume details before generation."),
    locations:uniqueItems(locations,"Recurring location detected in the script; add stable architecture, layout and palette details before generation."),
    scenes:scenes.slice(0,500).map((scene,index)=>{const row=scene&&typeof scene==="object"?scene:{},fallback=`scene-${String(index+1).padStart(3,"0")}`,baseKey=cleanScriptName(row.key,fallback).toLowerCase().replace(/[^a-z0-9_-]+/g,"-").slice(0,80)||fallback;let key=baseKey,suffix=2;while(sceneKeys.has(key)){key=`${baseKey.slice(0,Math.max(1,76-String(suffix).length))}-${suffix}`;suffix++}sceneKeys.add(key);return {key,title:cleanScriptName(row.title,`Scene ${index+1}`),description:cleanScriptText(row.description,1200,"Script scene"),location:cleanScriptName(row.location,""),story_time:validTime(cleanScriptName(row.story_time,"Unspecified")),shoot_time:validTime(cleanScriptName(row.shoot_time,row.story_time||"Unspecified")),time_strategy:["natural","day_for_night","night_for_day"].includes(row.time_strategy)?row.time_strategy:"natural",characters:[...new Set((Array.isArray(row.characters)?row.characters:[]).map(name=>cleanScriptName(name,"")).filter(Boolean))].slice(0,40),start_line:Math.max(1,Number(row.start_line)||1),end_line:Math.max(1,Number(row.end_line)||Number(row.start_line)||1)}})
  }
}
async function loadProjectScript(projectId=app.current?.id){
  resetScriptState();if(app.mode!=="cloud"||!sb||!projectId)return;app.script.loading=true;
  const recordResult=await sb.from("project_scripts").select("*").eq("project_id",projectId).maybeSingle();app.script.loading=false;
  if(recordResult.error){console.warn("Bible Script is unavailable",recordResult.error);app.script.migrationMessage="Run the saved SQL query “Storyboard v4.5 - Bible Script & Scene Breakdown”, then reload this project.";return}
  app.script.ready=true;app.script.record=recordResult.data||null;app.script.analysis=recordResult.data?.analysis?normalizeScriptAnalysis(recordResult.data.analysis):null;app.script.editorHydrated=false;app.script.pendingFileName="";app.script.pendingFileType="";
  if(app.script.record){const linksResult=await sb.from("script_shot_links").select("*").eq("script_id",app.script.record.id).order("start_offset");if(!linksResult.error)app.script.links=linksResult.data||[]}
}
function scriptLineNumberAt(text,offset){return text.slice(0,Math.max(0,offset)).split("\n").length}
function scriptTextFromNode(root){
  let output="";const blocks=new Set(["DIV","P","LI","H1","H2","H3","BLOCKQUOTE"]),newline=()=>{if(output&&!output.endsWith("\n"))output+="\n"};
  const walk=(node,isRoot=false)=>{if(node.nodeType===Node.TEXT_NODE){output+=(node.nodeValue||"").replace(/\r\n?/g,"\n");return}if(node.nodeType!==Node.ELEMENT_NODE&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;if(node.nodeName==="BR"){output+="\n";return}const block=!isRoot&&blocks.has(node.nodeName);if(block)newline();for(const child of node.childNodes)walk(child);if(block&&node.nextSibling)newline()};walk(root,true);return output
}
function scriptEditorText(){return scriptTextFromNode($("scriptTextEditor"))}
function setScriptEditorText(value){
  const editor=$("scriptTextEditor"),text=String(value||"").replace(/\r\n?/g,"\n"),fragment=document.createDocumentFragment(),lines=text.split("\n");editor.replaceChildren();lines.forEach((line,index)=>{if(line)fragment.appendChild(document.createTextNode(line));if(index<lines.length-1)fragment.appendChild(document.createElement("br"))});editor.appendChild(fragment);app.script.selectionCache=null;app.script.savedRange=null
}
function setScriptEditorHtml(value,fallback=""){
  if(!value){setScriptEditorText(fallback);return}const editor=$("scriptTextEditor"),doc=new DOMParser().parseFromString(`<div>${String(value)}</div>`,"text/html"),source=doc.body.firstElementChild,fragment=document.createDocumentFragment();
  const append=(node,parent)=>{if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.nodeValue||""));return}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=node.tagName;if(tag==="BR"){parent.appendChild(document.createElement("br"));return}if(tag==="B"||tag==="STRONG"){const strong=document.createElement("strong");[...node.childNodes].forEach(child=>append(child,strong));parent.appendChild(strong);return}const block=["DIV","P","LI","H1","H2","H3","BLOCKQUOTE"].includes(tag);if(block&&parent.childNodes.length&&parent.lastChild?.nodeName!=="BR")parent.appendChild(document.createElement("br"));[...node.childNodes].forEach(child=>append(child,parent));if(block&&node!==source&&parent.lastChild?.nodeName!=="BR")parent.appendChild(document.createElement("br"))};
  [...(source?.childNodes||[])].forEach(child=>append(child,fragment));while(fragment.lastChild?.nodeName==="BR")fragment.removeChild(fragment.lastChild);editor.replaceChildren(fragment);if(scriptEditorText()!==String(fallback||"").replace(/\r\n?/g,"\n"))setScriptEditorText(fallback);app.script.selectionCache=null;app.script.savedRange=null
}
function scriptEditorHtml(){
  const encode=node=>{if(node.nodeType===Node.TEXT_NODE)return escapeHtml(node.nodeValue||"").replace(/\n/g,"<br>");if(node.nodeType!==Node.ELEMENT_NODE)return "";if(node.tagName==="BR")return "<br>";const content=[...node.childNodes].map(encode).join("");return node.tagName==="B"||node.tagName==="STRONG"?`<strong>${content}</strong>`:content};return [...$("scriptTextEditor").childNodes].map(encode).join("")
}
function scriptSelectionRange(){const editor=$("scriptTextEditor"),selection=window.getSelection();if(!selection?.rangeCount)return null;const range=selection.getRangeAt(0);return editor.contains(range.commonAncestorContainer)?range:null}
function currentScriptSelection(){
  const editor=$("scriptTextEditor"),range=scriptSelectionRange();if(!range)return app.script.selectionCache||{start:0,end:0,dbStart:0,dbEnd:0,text:""};
  const before=document.createRange();before.selectNodeContents(editor);before.setEnd(range.startContainer,range.startOffset);const through=document.createRange();through.selectNodeContents(editor);through.setEnd(range.endContainer,range.endOffset),start=scriptTextFromNode(before.cloneContents()).length,end=scriptTextFromNode(through.cloneContents()).length,text=scriptEditorText().slice(start,end),result={start,end,dbStart:[...scriptEditorText().slice(0,start)].length,dbEnd:[...scriptEditorText().slice(0,end)].length,text};app.script.selectionCache=result;app.script.savedRange=range.cloneRange();return result
}
function restoreScriptSelection(){const range=app.script.savedRange,editor=$("scriptTextEditor");if(!range||!editor.contains(range.commonAncestorContainer))return false;const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return true}
function setScriptDirection(value){const direction=value==="rtl"?"rtl":"ltr",editor=$("scriptTextEditor");editor.dir=direction;$("scriptDirectionSelect").value=direction}
function toggleScriptBold(){
  const editor=$("scriptTextEditor");if(editor.getAttribute("contenteditable")!=="true")return;editor.focus();restoreScriptSelection();document.execCommand("bold",false);app.script.savedRange=scriptSelectionRange()?.cloneRange()||null;editor.dispatchEvent(new Event("input",{bubbles:true}));updateScriptBoldState()
}
function updateScriptBoldState(){const active=!!scriptSelectionRange()&&document.queryCommandState?.("bold");$("scriptBoldBtn").classList.toggle("active",active);$("scriptBoldBtn").setAttribute("aria-pressed",String(active))}
function scriptShotLabel(shotId){const item=allShots().find(entry=>entry.shot.id===shotId);return item?`Scene ${item.scene.number} · Shot ${item.shot.shotNo}`:"Deleted shot"}
function renderScriptLinkSelectors(){
  const sceneSelect=$("scriptLinkSceneSelect"),shotSelect=$("scriptLinkShotSelect");if(!sceneSelect||!shotSelect||!app.current)return;
  const priorScene=sceneSelect.value||app.activeSceneId||"";sceneSelect.innerHTML="";for(const scene of [...app.current.scenes].sort((a,b)=>a.position-b.position)){const option=document.createElement("option");option.value=scene.id;option.textContent=`Scene ${scene.number} · ${scene.title||"Untitled"}`;sceneSelect.appendChild(option)}sceneSelect.value=[...sceneSelect.options].some(option=>option.value===priorScene)?priorScene:(app.current.scenes[0]?.id||"");
  const scene=app.current.scenes.find(item=>item.id===sceneSelect.value),priorShot=shotSelect.value||((scene?.id===app.activeSceneId&&app.activeShotId)||"");shotSelect.innerHTML="";for(const shot of [...(scene?.shots||[])].sort((a,b)=>a.position-b.position)){const option=document.createElement("option");option.value=shot.id;option.textContent=`Shot ${shot.shotNo} · ${shortValue(shot.shotSize)}`;shotSelect.appendChild(option)}shotSelect.value=[...shotSelect.options].some(option=>option.value===priorShot)?priorShot:(scene?.shots?.[0]?.id||"")
}
function updateScriptSelection(){
  const selection=currentScriptSelection(),hasText=selection.end>selection.start&&!!selection.text.trim(),editable=app.script.ready&&scriptCanEdit()&&can("shots")&&!app.script.analyzing&&!app.script.applying;app.script.selectedStart=selection.start;app.script.selectedEnd=selection.end;
  if(hasText){const content=scriptEditorText(),from=scriptLineNumberAt(content,selection.start),to=scriptLineNumberAt(content,selection.end);$("scriptSelectionTitle").textContent=`Selected ${selection.end-selection.start} characters · line ${from}${to===from?"":` to ${to}`}`;$("scriptSelectionMeta").textContent=selection.text.replace(/\s+/g," ").trim().slice(0,180)}else{$("scriptSelectionTitle").textContent="Select text to connect it to a shot";$("scriptSelectionMeta").textContent="A selection may begin or end in the middle of any line."}
  $("linkScriptSelectionBtn").disabled=!hasText||!editable||!$("scriptLinkShotSelect").value;$("createShotFromScriptBtn").disabled=!hasText||!editable||!$("scriptLinkSceneSelect").value
}
function renderScriptAnalysis(){
  const wrap=$("scriptAnalysisResults"),analysis=app.script.analysis;if(!analysis){wrap.hidden=true;wrap.innerHTML="";return}wrap.hidden=false;
  const sceneItems=analysis.scenes.slice(0,60).map(scene=>`<div class="script-analysis-item"><strong>${escapeHtml(scene.title)}</strong><small>${escapeHtml(scene.location||"Location not identified")} · Story ${escapeHtml(scene.story_time)} · Shoot ${escapeHtml(scene.shoot_time||scene.story_time)}${scene.time_strategy!=="natural"?` · ${escapeHtml(scene.time_strategy==="day_for_night"?"Day for Night":"Night for Day")}`:""} · lines ${scene.start_line}–${scene.end_line}</small><small>${escapeHtml(scene.characters.join(", ")||"No recurring characters identified")}</small></div>`).join("");
  wrap.innerHTML=`<div class="script-analysis-summary"><div class="script-analysis-stat"><strong>${analysis.scenes.length}</strong><small>Scenes</small></div><div class="script-analysis-stat"><strong>${analysis.characters.length}</strong><small>Characters</small></div><div class="script-analysis-stat"><strong>${analysis.locations.length}</strong><small>Locations</small></div></div><div class="script-analysis-list">${sceneItems||'<div class="ai-picker-empty">No scenes were detected. Review the script formatting and analyze again.</div>'}</div>`
}
function goToScriptShot(shotId){const item=allShots().find(entry=>entry.shot.id===shotId);if(!item)return;app.activeSceneId=item.scene.id;app.activeShotId=item.shot.id;app.mobileScreen="shot";app.sheetOpen=false;if($("aiBibleModal").open)$("aiBibleModal").close();renderEditor();rememberWorkspace()}
function renderScriptLinks(){
  const wrap=$("scriptLinkList");wrap.innerHTML="";for(const link of app.script.links){const row=document.createElement("div");row.className="script-link-row";row.innerHTML=`<blockquote title="${escapeHtml(link.selected_text||"")}">${escapeHtml(String(link.selected_text||"").replace(/\s+/g," ").slice(0,170))}</blockquote><strong>${escapeHtml(scriptShotLabel(link.shot_id))}</strong><button type="button" class="btn ghost danger-text">Remove</button>`;row.querySelector("strong").onclick=()=>goToScriptShot(link.shot_id);row.querySelector("button").onclick=()=>deleteScriptLink(link.id);wrap.appendChild(row)}
}
function renderScriptLineMap(){
  const wrap=$("scriptLineMap"),text=scriptEditorText(),lines=text.split("\n");wrap.innerHTML="";let offset=0,linkedCount=0,meaningfulCount=0;
  lines.forEach((line,index)=>{const start=offset,end=start+[...line].length,newlineEnd=end+(index<lines.length-1?1:0),links=app.script.links.filter(link=>Number(link.start_offset)<newlineEnd&&Number(link.end_offset)>start);if(line.trim())meaningfulCount++;if(line.trim()&&links.length)linkedCount++;const row=document.createElement("div");row.className="script-line-row";const number=document.createElement("span");number.className="script-line-number";number.textContent=String(index+1);const copy=document.createElement("span");copy.className="script-line-text";copy.textContent=line||" ";const refs=document.createElement("span");refs.className="script-line-shots";if(!links.length){const empty=document.createElement("span");empty.className="script-line-unlinked";empty.textContent="—";refs.appendChild(empty)}else for(const link of links){const button=document.createElement("button");button.type="button";button.className="script-shot-ref";button.textContent=scriptShotLabel(link.shot_id);button.onclick=()=>goToScriptShot(link.shot_id);refs.appendChild(button)}row.append(number,copy,refs);wrap.appendChild(row);offset=newlineEnd});
  const percent=meaningfulCount?Math.round(linkedCount/meaningfulCount*100):0;$("scriptCoverageBadge").textContent=`${percent}% linked`
}
function renderScriptBible(){
  const ready=app.script.ready,editable=ready&&scriptCanEdit(),editor=$("scriptTextEditor"),projectId=app.current?.id||"";
  editor.dataset.placeholder=uiText("Choose a script file or paste screenplay text here…");
  if(!app.script.editorHydrated||editor.dataset.projectId!==projectId){setScriptEditorHtml(app.script.record?.content_html||"",app.script.record?.content||"");setScriptDirection(app.script.record?.text_direction||"ltr");editor.dataset.projectId=projectId;app.script.editorHydrated=true}
  const content=scriptEditorText(),busy=app.script.analyzing||app.script.applying,fileName=app.script.pendingFileName||app.script.record?.file_name||"No script",analysisMatches=!!app.script.record&&content===app.script.record.content;$("scriptFileBadge").textContent=fileName;$("scriptFileInput").disabled=!editable||busy;editor.setAttribute("contenteditable",String(editable&&!busy));$("scriptDirectionSelect").disabled=!editable||busy;$("scriptBoldBtn").disabled=!editable||busy;$("saveScriptBtn").disabled=!editable||app.script.saving||busy;$("analyzeScriptBtn").disabled=!editable||busy||!content.trim();$("analyzeScriptBtn").textContent=app.script.analyzing?"Analyzing Script…":"✦ Analyze with AI";$("analyzeScriptBtn").classList.toggle("script-analysis-btn-busy",app.script.analyzing);$("applyScriptBreakdownBtn").disabled=!scriptCanApply()||!app.script.analysis||!analysisMatches||busy;$("applyScriptBreakdownBtn").textContent=app.script.applying?"Applying Breakdown…":"Apply Breakdown to Project";
  if(!ready)setMsg("scriptNotice",app.script.migrationMessage,"warning");renderScriptLinkSelectors();renderScriptAnalysis();renderScriptLinks();renderScriptLineMap();updateScriptSelection()
}
function rtfToPlainText(value){return String(value||"").replace(/\\u(-?\d+)\??/g,(_,code)=>String.fromCharCode(Number(code)<0?Number(code)+65536:Number(code))).replace(/\\'([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))).replace(/\\(?:par|line)\b\s?/g,"\n").replace(/\\tab\b\s?/g,"\t").replace(/\\[a-z]+-?\d*\s?/gi,"").replace(/\\([{}\\])/g,"$1").replace(/[{}]/g,"").replace(/\n{3,}/g,"\n\n").trim()}
function screenplayMarkupToText(raw,type,name){
  const lower=String(name||"").toLowerCase();if(type.includes("rtf")||lower.endsWith(".rtf"))return rtfToPlainText(raw);
  if(type.includes("html")||/\.html?$/.test(lower)){const doc=new DOMParser().parseFromString(raw,"text/html");return doc.body?.innerText||doc.body?.textContent||""}
  if(type.includes("xml")||/\.(fdx|xml)$/.test(lower)){const doc=new DOMParser().parseFromString(raw,"application/xml");if(doc.querySelector("parsererror"))throw new Error("This XML/FDX file could not be read.");const paragraphs=[...doc.querySelectorAll("Paragraph")];return paragraphs.length?paragraphs.map(node=>node.textContent||"").join("\n"):doc.documentElement?.textContent||""}
  return raw
}
async function loadScriptFile(event){
  const file=event.target.files?.[0];event.target.value="";if(!file||!scriptCanEdit())return;
  try{if(file.size>900000)throw new Error("Script files must be smaller than 900 KB.");const content=screenplayMarkupToText(await file.text(),file.type||"",file.name);if(!content.trim())throw new Error("This script file contains no readable text.");setScriptEditorText(content);app.script.pendingFileName=file.name.slice(0,240);app.script.pendingFileType=file.type||"text/plain";app.script.analysis=null;setMsg("scriptNotice",`${file.name} loaded. Review the text, then save or analyze it.`);renderScriptBible();$("scriptTextEditor").focus()}
  catch(error){setMsg("scriptNotice",error.message||"Could not read this script file.","warning")}
}
async function saveProjectScript({silent=false}={}){
  if(!app.script.ready||!scriptCanEdit())return null;const content=scriptEditorText(),contentHtml=scriptEditorHtml(),textDirection=$("scriptDirectionSelect").value==="rtl"?"rtl":"ltr",existing=app.script.record,changed=content!==(existing?.content||"");if(!content.trim()){setMsg("scriptNotice","Add or import script text first.","warning");return null}
  if(changed&&app.script.links.length&&!uiConfirm("Saving changed script text will remove existing shot links because their exact text offsets would no longer be reliable. Continue?"))return null;
  app.script.saving=true;app.ignoreRealtimeUntil=Date.now()+1800;renderScriptBible();const payload={project_id:app.current.id,file_name:app.script.pendingFileName||existing?.file_name||"script.txt",file_type:app.script.pendingFileType||existing?.file_type||"text/plain",content,content_html:contentHtml,text_direction:textDirection,analysis:changed?null:(app.script.analysis||null),analysis_model:changed?null:(existing?.analysis_model||null),analyzed_at:changed?null:(existing?.analyzed_at||null),applied_at:changed?null:(existing?.applied_at||null)};
  let result;if(existing)result=await sb.from("project_scripts").update(payload).eq("id",existing.id).eq("project_id",app.current.id).select().single();else result=await sb.from("project_scripts").insert({...payload,created_by:app.session.user.id}).select().single();
  app.script.saving=false;if(result.error){setMsg("scriptNotice",result.error.message||"Could not save the script.","warning");renderScriptBible();return null}
  if(changed&&app.script.links.length){const {error}=await sb.from("script_shot_links").delete().eq("script_id",result.data.id);if(!error)app.script.links=[]}
  app.script.record=result.data;app.script.analysis=result.data.analysis?normalizeScriptAnalysis(result.data.analysis):null;app.script.pendingFileName="";app.script.pendingFileType="";if(!silent)setMsg("scriptNotice","Script saved.");renderScriptBible();return result.data
}
async function analyzeProjectScript(){
  if(!app.script.ready||!scriptCanEdit()||app.script.analyzing)return;const text=scriptEditorText();if(text.trim().length<20)return setMsg("scriptNotice","Add more screenplay text before analysis.","warning");if(text.length>SCRIPT_MAX_ANALYSIS_CHARS)return setMsg("scriptNotice",`This script has ${text.length.toLocaleString()} characters. AI analysis currently accepts up to ${SCRIPT_MAX_ANALYSIS_CHARS.toLocaleString()} characters at once.`,"warning");
  const record=await saveProjectScript({silent:true});if(!record)return;app.script.analyzing=true;setMsg("scriptNotice","AI is identifying scenes, recurring characters, locations and story time…");renderScriptBible();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),240000);
  try{const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error("Your session expired. Sign in again.");const response=await fetch("/api/script/analyze",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify({project_id:app.current.id,script_id:record.id,script_text:text}),signal:controller.signal});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`Script analysis failed (${response.status}).`);const analysis=normalizeScriptAnalysis(body.analysis);if(!analysis.scenes.length)throw new Error("AI could not identify any scenes. Check screenplay headings and try again.");app.ignoreRealtimeUntil=Date.now()+1800;const analyzedAt=new Date().toISOString(),{data,error}=await sb.from("project_scripts").update({analysis,analysis_model:body.model||"glm-4.7-flash",analyzed_at:analyzedAt,applied_at:null}).eq("id",record.id).select().single();if(error)throw error;app.script.record=data;app.script.analysis=analysis;setMsg("scriptNotice",`Analysis ready: ${analysis.scenes.length} scenes, ${analysis.characters.length} characters and ${analysis.locations.length} locations. Review it, then apply the breakdown.`)}
  catch(error){setMsg("scriptNotice",error?.name==="AbortError"?"Script analysis took too long. Try again.":error.message||"Could not analyze the script.","warning")}
  finally{clearTimeout(timeout);app.script.analyzing=false;renderScriptBible()}
}
async function ensureBreakdownAsset(type,item){
  const collection=aiCollection(type),key=cleanScriptName(item?.name,"").toLocaleLowerCase(),existing=collection.find(asset=>asset.name.toLocaleLowerCase()===key);if(existing)return existing;
  const description=cleanScriptText(item?.description,type==="character"?1400:1800,type==="character"?"Recurring character detected in the script. Add stable face, body and costume details before generation.":"Recurring location detected in the script. Add stable architecture, layout and palette details before generation.");const {data,error}=await sb.from(aiTable(type)).insert({project_id:app.current.id,name:cleanScriptName(item.name),description,locked:false,created_by:app.session.user.id}).select().single();if(error)throw error;const asset=normalizeAiAsset(data,type);collection.push(asset);return asset
}
function defaultSceneCanBecomeScriptScene(scene){const shot=scene?.shots?.[0];return app.current.scenes.length===1&&scene?.shots?.length===1&&!scene.scriptSceneKey&&!scene.description?.trim()&&!scene.storyLocation?.trim()&&!shot?.image&&!String(shot?.summary||shot?.description||shot?.subject||"").trim()}
async function applyScriptBreakdown(){
  const analysis=app.script.analysis,record=app.script.record;if(!analysis||!record||!scriptCanApply()||app.script.applying)return;if(scriptEditorText()!==record.content)return setMsg("scriptNotice","The script text changed after analysis. Save and analyze it again before applying.","warning");if(!uiConfirm(`Add or update ${analysis.scenes.length} script scenes and place ${analysis.characters.length} characters and ${analysis.locations.length} locations in the Bible? Existing locked references will not be replaced.`))return;
  app.script.applying=true;app.suppressRealtime++;setMsg("scriptNotice","Applying the AI breakdown to the Bible and project scenes…");renderScriptBible();
  try{
    const characterMap=new Map(),locationMap=new Map();for(const item of analysis.characters){const asset=await ensureBreakdownAsset("character",item);characterMap.set(item.name.toLocaleLowerCase(),asset.id)}for(const item of analysis.locations){const asset=await ensureBreakdownAsset("location",item);locationMap.set(item.name.toLocaleLowerCase(),asset.id)}
    let reusable=defaultSceneCanBecomeScriptScene(app.current.scenes[0])?app.current.scenes[0]:null,firstSceneId=null,nextPosition=Math.max(0,...app.current.scenes.map(scene=>Number(scene.position)||0));
    for(const [index,item] of analysis.scenes.entries()){
      const locationId=locationMap.get(item.location.toLocaleLowerCase())||null,characterIds=item.characters.map(name=>characterMap.get(name.toLocaleLowerCase())).filter(Boolean),existing=app.current.scenes.find(scene=>scene.scriptSceneKey===item.key),payload={title:item.title,description:item.description||"",story_location:item.location||"",story_time:item.story_time||"Unspecified",shoot_time:item.shoot_time||item.story_time||"Unspecified",time_strategy:item.time_strategy||"natural",ai_location_id:locationId,ai_character_ids:characterIds,script_scene_key:item.key,collapsed:false};let sceneRow;
      if(existing){const {data,error}=await sb.from("scenes").update(payload).eq("id",existing.id).eq("project_id",app.current.id).select().single();if(error)throw error;sceneRow=data}
      else if(reusable){const {data,error}=await sb.from("scenes").update(payload).eq("id",reusable.id).eq("project_id",app.current.id).select().single();if(error)throw error;sceneRow=data;reusable=null}
      else{nextPosition++;const {data,error}=await sb.from("scenes").insert({project_id:app.current.id,scene_number:nextPosition,position:nextPosition,...payload}).select().single();if(error)throw error;sceneRow=data}
      if(!firstSceneId)firstSceneId=sceneRow.id;const {data:shotRows,error:shotReadError}=await sb.from("shots").select("*").eq("scene_id",sceneRow.id).order("position");if(shotReadError)throw shotReadError;
      if(!(shotRows||[]).length){const seed=blankShot(1);seed.aiLocationId=locationId||"";seed.aiCharacterIds=characterIds;seed.timeOfDay=item.story_time||"Unspecified";seed.location=item.location||"";seed.summary=item.description||item.title;const {error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:sceneRow.id,shot_number:1,position:1,data:shotDbData(seed)});if(error)throw error}
      else for(const row of shotRows){const data={...blankShot(row.shot_number),...(row.data||{}),aiLocationId:locationId||"",aiCharacterIds:characterIds};if(item.story_time&&item.story_time!=="Unspecified")data.timeOfDay=item.story_time;if(item.location&&!data.location)data.location=item.location;const {error}=await sb.from("shots").update({data:shotDbData(data)}).eq("id",row.id).eq("project_id",app.current.id);if(error)throw error}
    }
    const appliedAt=new Date().toISOString(),{error}=await sb.from("project_scripts").update({applied_at:appliedAt}).eq("id",record.id);if(error)throw error;await openCloudProject(app.current.id,{sceneId:firstSceneId,preserveSelection:true});setMsg("aiBibleNotice","Script breakdown applied. Generate or upload each new Bible reference, review it, then lock it. Scene references are already assigned to their shots.");setMsg("scriptNotice","Breakdown applied to the project.");renderAiVisualBible()
  }catch(error){setMsg("scriptNotice",error.message||"Could not apply the script breakdown.","warning")}
  finally{app.suppressRealtime=Math.max(0,app.suppressRealtime-1);app.script.applying=false;renderScriptBible();renderAiVisualBible()}
}
async function ensureScriptSavedForLink(){if(!app.script.record||scriptEditorText()!==app.script.record.content)return await saveProjectScript({silent:true});return app.script.record}
async function linkScriptSelectionToShot(){
  const selection=currentScriptSelection(),sceneId=$("scriptLinkSceneSelect").value,shotId=$("scriptLinkShotSelect").value;if(!selection.text.trim()||!sceneId||!shotId||!can("shots"))return;const record=await ensureScriptSavedForLink();if(!record)return;
  app.ignoreRealtimeUntil=Date.now()+1800;const {data,error}=await sb.from("script_shot_links").insert({project_id:app.current.id,script_id:record.id,scene_id:sceneId,shot_id:shotId,start_offset:selection.dbStart,end_offset:selection.dbEnd,selected_text:selection.text,created_by:app.session.user.id}).select().single();if(error){setMsg("scriptNotice",/duplicate key/i.test(error.message||"")?"This exact text range is already linked to that shot.":error.message,"warning");return}app.script.links.push(data);app.script.links.sort((a,b)=>a.start_offset-b.start_offset);setMsg("scriptNotice",`Selected text linked to ${scriptShotLabel(shotId)}.`);renderScriptBible()
}
async function createShotFromScriptSelection(){
  const selection=currentScriptSelection(),scene=app.current.scenes.find(item=>item.id===$("scriptLinkSceneSelect").value);if(!selection.text.trim()||!scene||!can("shots"))return;const record=await ensureScriptSavedForLink();if(!record)return;const no=scene.shots.length+1,shot=blankShotForScene(no,scene);shot.summary=selection.text.replace(/\s+/g," ").trim().slice(0,500);shot.description=selection.text.trim().slice(0,1800);app.suppressRealtime++;
  try{const {data,error}=await sb.from("shots").insert({project_id:app.current.id,scene_id:scene.id,shot_number:no,position:no,data:shotDbData(shot)}).select().single();if(error)throw error;const {data:link,error:linkError}=await sb.from("script_shot_links").insert({project_id:app.current.id,script_id:record.id,scene_id:scene.id,shot_id:data.id,start_offset:selection.dbStart,end_offset:selection.dbEnd,selected_text:selection.text,created_by:app.session.user.id}).select().single();if(linkError)throw linkError;app.script.links.push(link);await openCloudProject(app.current.id,{sceneId:scene.id,shotId:data.id,preserveSelection:true});setMsg("scriptNotice",`Shot ${no} created and linked to the selected script text.`);renderAiVisualBible()}
  catch(error){setMsg("scriptNotice",error.message||"Could not create a shot from this selection.","warning")}
  finally{app.suppressRealtime=Math.max(0,app.suppressRealtime-1)}
}
async function deleteScriptLink(id){if(!scriptCanEdit()||!can("shots"))return;if(!uiConfirm("Remove this script-to-shot link? The shot itself will stay."))return;app.ignoreRealtimeUntil=Date.now()+1800;const {error}=await sb.from("script_shot_links").delete().eq("id",id).eq("project_id",app.current.id);if(error)return setMsg("scriptNotice",error.message,"warning");app.script.links=app.script.links.filter(link=>link.id!==id);renderScriptBible()}

async function openAiVisualBible(){
  if(app.mode!=="cloud")return uiAlert("Bible and AI generation are available for signed-in cloud projects.");
  if(app.ai.ready&&!app.ai.generating)setMsg("aiBibleNotice","");
  renderAiVisualBible();$("aiBibleModal").showModal();
  await Promise.all([...app.ai.characters,...app.ai.locations].filter(x=>(x.reference_path&&!x.referenceUrl)||(x.source_path&&!x.sourceUrl)).map(signAiAsset));renderAiVisualBible()
}
function aiAssetCard(asset,type){
  const editable=can("media"),locked=!!asset.locked,styleMatches=!locked||asset.style_snapshot===app.current.style,hasReference=!!asset.reference_path,hasSource=!!asset.source_path,generatingThis=app.ai.generating&&app.ai.generatingAssetId===asset.id;
  const generateLabel=generatingThis?"Generating…":hasSource?(hasReference?"Regenerate from Source":"Generate from Source"):(hasReference?"Regenerate":"Generate Reference");
  const card=document.createElement("article");card.className="ai-asset-card"+(locked?" is-locked":"");card.dataset.assetId=asset.id;card.dataset.assetType=type;
  card.innerHTML=`
    <div class="ai-asset-preview">
      ${asset.referenceUrl?`<button type="button" class="ai-asset-image-open" aria-label="Open ${escapeHtml(asset.name)} reference"><img src="${escapeHtml(asset.referenceUrl)}" alt="${escapeHtml(asset.name)} reference" loading="lazy"></button>`:'<span>◇</span>'}
      ${locked?`<span class="ai-lock-badge">${styleMatches?"LOCKED":"STYLE CHANGED"}</span>`:""}
    </div>
    <div class="ai-asset-fields">
      <input class="ai-asset-name" value="${escapeHtml(asset.name||"")}" maxlength="80" aria-label="Name" ${!editable||locked?"disabled":""}>
      <textarea class="ai-asset-description" maxlength="1400" aria-label="Stable visual description" ${!editable||locked?"disabled":""}>${escapeHtml(asset.description||"")}</textarea>
      <div class="ai-asset-actions">
        <button type="button" class="generate${generatingThis?" is-generating":""}" ${!editable||locked||app.ai.generating?"disabled":""}>${generateLabel}</button>
        <label class="ai-upload-label ${!editable||locked||app.ai.generating?"disabled":""}" title="Upload a finished reference directly">Upload Final<input class="ai-reference-input" type="file" accept="image/jpeg,image/png,image/webp" hidden ${!editable||locked||app.ai.generating?"disabled":""}></label>
        <button type="button" class="lock" ${!editable||(!hasReference&&!locked)?"disabled":""}>${locked?"Unlock":"Lock"}</button>
        <button type="button" class="delete" ${!editable?"disabled":""}>Delete</button>
      </div>
      <div class="ai-source-panel${hasSource?" has-source":""}">
        ${hasSource&&asset.sourceUrl?`<button type="button" class="ai-source-preview has-image" aria-label="Open ${escapeHtml(asset.name)} source image"><img src="${escapeHtml(asset.sourceUrl)}" alt="${escapeHtml(asset.name)} source" loading="lazy"></button>`:`<span class="ai-source-preview" aria-hidden="true">＋</span>`}
        <div class="ai-source-copy">
          <strong>Source Image</strong>
          <small>${app.ai.sourceReady?"Optional identity or location image used to guide Generate. Upload Final above replaces the finished reference directly.":"Run the v4.4 SQL once to enable Source Image."}</small>
          <div class="ai-source-actions">
            <label class="ai-upload-label ${!editable||!app.ai.sourceReady||app.ai.generating?"disabled":""}">${hasSource?"Replace Source":"Add Source"}<input class="ai-source-input" type="file" accept="image/jpeg,image/png,image/webp" hidden ${!editable||!app.ai.sourceReady||app.ai.generating?"disabled":""}></label>
            ${hasSource?`<button type="button" class="remove-source" ${!editable||app.ai.generating?"disabled":""}>Remove Source</button>`:""}
          </div>
        </div>
      </div>
      <div class="ai-asset-status${asset.generationStatusKind?` ${escapeHtml(asset.generationStatusKind)}`:""}" role="status" aria-live="polite" ${asset.generationStatus?"":"hidden"}>${escapeHtml(asset.generationStatus||"")}</div>
    </div>`;
  const name=card.querySelector(".ai-asset-name"),description=card.querySelector(".ai-asset-description");
  [name,description].forEach(el=>el.addEventListener("change",()=>updateAiAssetText(type,asset.id,name.value,description.value)));
  card.querySelector(".generate").onclick=()=>generateAiReference(type,asset.id);
  card.querySelector(".ai-reference-input").onchange=e=>uploadAiReference(type,asset.id,e);
  card.querySelector(".ai-source-input").onchange=e=>uploadAiSource(type,asset.id,e);
  card.querySelector(".ai-asset-image-open")?.addEventListener("click",()=>openImageViewer(aiAssetImageTarget(asset,type,"reference")));
  card.querySelector(".ai-source-preview.has-image")?.addEventListener("click",()=>openImageViewer(aiAssetImageTarget(asset,type,"source")));
  card.querySelector(".remove-source")?.addEventListener("click",()=>removeAiSource(type,asset.id));
  card.querySelector(".lock").onclick=()=>toggleAiAssetLock(type,asset.id);
  card.querySelector(".delete").onclick=()=>deleteAiAsset(type,asset.id);
  return card
}
function renderAiVisualBible(){
  const ready=app.ai.ready,editable=can("media")&&ready;
  renderAiUsage();
  // Do not clear a running/success/error message here. This function is called
  // immediately after a click and again in finally; clearing it made generation
  // look as if the button did nothing.
  if(!ready)setMsg("aiBibleNotice",app.ai.migrationMessage,"warning");
  $("addAiCharacterBtn").disabled=!editable;$("addAiLocationBtn").disabled=!editable;
  ["newAiCharacterName","newAiCharacterDescription","newAiLocationName","newAiLocationDescription"].forEach(id=>$(id).disabled=!editable);
  const groups=[["character","aiCharacterList"],["location","aiLocationList"]];
  for(const [type,id] of groups){
    const wrap=$(id);wrap.innerHTML="";const list=aiCollection(type);
    if(!list.length){const empty=document.createElement("div");empty.className="ai-picker-empty";empty.textContent=ready?`No ${type}s yet.`:"AI database setup required.";wrap.appendChild(empty);continue}
    list.forEach(asset=>wrap.appendChild(aiAssetCard(asset,type)))
  }
  renderScriptBible()
}
async function addAiAsset(type){
  if(!app.ai.ready||!can("media"))return;
  const isCharacter=type==="character",nameEl=$(isCharacter?"newAiCharacterName":"newAiLocationName"),descriptionEl=$(isCharacter?"newAiCharacterDescription":"newAiLocationDescription");
  const name=nameEl.value.trim(),description=descriptionEl.value.trim();
  if(!name||!description)return setMsg("aiBibleNotice","Add both a name and a stable visual description.","warning");
  const {data,error}=await sb.from(aiTable(type)).insert({project_id:app.current.id,name,description,locked:false,created_by:app.session.user.id}).select().single();
  if(error)return setMsg("aiBibleNotice",error.message,"warning");
  aiCollection(type).push(normalizeAiAsset(data,type));nameEl.value="";descriptionEl.value="";setMsg("aiBibleNotice",`${name} added. Generate or upload a reference, approve it, then lock it.`);renderAiVisualBible();renderShot()
}
async function updateAiAssetText(type,id,name,description){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||asset.locked||!can("media"))return;
  name=name.trim();description=description.trim();if(!name||!description){renderAiVisualBible();return setMsg("aiBibleNotice","Name and stable description cannot be empty.","warning")}
  const {error}=await sb.from(aiTable(type)).update({name,description,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",app.current.id);
  if(error)return setMsg("aiBibleNotice",error.message,"warning");asset.name=name;asset.description=description;renderShot()
}
async function toggleAiAssetLock(type,id){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||!can("media"))return;
  if(!asset.locked&&!asset.reference_path)return setMsg("aiBibleNotice","Generate or upload a reference before locking this item.","warning");
  const locked=!asset.locked,style_snapshot=locked?app.current.style:asset.style_snapshot;
  const {error}=await sb.from(aiTable(type)).update({locked,style_snapshot,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",app.current.id);
  if(error)return setMsg("aiBibleNotice",error.message,"warning");asset.locked=locked;asset.style_snapshot=style_snapshot;setMsg("aiBibleNotice",`${asset.name} ${locked?`locked for ${app.current.style}`:"unlocked for editing"}.`);renderAiVisualBible();renderShot();applyPermissionLocks()
}
async function deleteAiAsset(type,id){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||!can("media")||!uiConfirm(`Delete ${asset.name} from the Bible?`))return;
  const {error}=await sb.from(aiTable(type)).delete().eq("id",id).eq("project_id",app.current.id);if(error)return setMsg("aiBibleNotice",error.message,"warning");
  await removeMediaPaths([asset.reference_path,asset.source_path]);app.ai[type==="character"?"characters":"locations"]=aiCollection(type).filter(x=>x.id!==id);
  for(const {shot} of allShots()){
    if(type==="character")shot.aiCharacterIds=(shot.aiCharacterIds||[]).filter(x=>x!==id);
    else if(shot.aiLocationId===id)shot.aiLocationId=""
  }
  setMsg("aiBibleNotice",`${asset.name} deleted.`);renderAiVisualBible();renderEditor()
}
async function optimizeImageBlob(source,maxDimension=1024,quality=.82){
  let drawable=null,width=0,height=0,cleanup=()=>{};
  // Some mobile Safari builds expose createImageBitmap but reject particular
  // JPEG responses. Fall back to an HTMLImageElement instead of losing the
  // successfully generated frame.
  if(typeof createImageBitmap==="function"){
    try{drawable=await createImageBitmap(source);width=drawable.width;height=drawable.height;cleanup=()=>drawable.close?.()}catch(error){drawable=null}
  }
  if(!drawable){
    const url=URL.createObjectURL(source);
    try{drawable=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Could not read image."));image.src=url});width=drawable.naturalWidth;height=drawable.naturalHeight;cleanup=()=>URL.revokeObjectURL(url)}
    catch(error){URL.revokeObjectURL(url);throw error}
  }
  const scale=Math.min(1,maxDimension/Math.max(width,height));width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d");
  if(!context){cleanup();throw new Error("Image optimization failed.")}
  context.drawImage(drawable,0,0,width,height);cleanup();
  // Browsers without WebP canvas encoding are allowed to return PNG here.
  // The upload code keeps the returned MIME type and matching extension.
  return await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error("Image optimization failed.")),"image/webp",quality))
}
function optimizedImageFormat(blob){
  const type=["image/webp","image/png","image/jpeg"].includes(blob?.type)?blob.type:"image/webp";
  return {type,extension:type==="image/png"?"png":type==="image/jpeg"?"jpg":"webp"}
}
async function storeAiReference(type,asset,sourceBlob,origin="ai"){
  // FLUX.2 Klein requires every reference input to be smaller than 512×512.
  const optimized=await optimizeImageBlob(sourceBlob,496,.84),format=optimizedImageFormat(optimized),path=`${app.current.id}/ai/${aiFolder(type)}/${asset.id}/${Date.now()}-${origin==="manual"?"manual":"ai"}.${format.extension}`,oldPath=asset.reference_path,oldUrl=asset.referenceUrl;
  const {error:uploadError}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
  const {error:updateError}=await sb.from(aiTable(type)).update({reference_path:path,style_snapshot:null,locked:false,updated_at:new Date().toISOString()}).eq("id",asset.id).eq("project_id",app.current.id);
  if(updateError){await removeMediaPaths([path]);throw updateError}
  asset.reference_path=path;asset.style_snapshot=null;asset.locked=false;asset.referenceUrl=null;await signAiAsset(asset);if(!asset.referenceUrl)asset.referenceUrl=URL.createObjectURL(optimized);if(String(oldUrl||"").startsWith("blob:"))URL.revokeObjectURL(oldUrl);await removeMediaPaths([oldPath]);return asset
}
async function uploadAiReference(type,id,event){
  const file=event.target.files?.[0],asset=aiCollection(type).find(x=>x.id===id);event.target.value="";if(!file||!asset||asset.locked||!can("media"))return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)return setMsg("aiBibleNotice","Use a JPEG, PNG or WebP image up to 12 MB.","warning");
  try{setMsg("aiBibleNotice",`Optimizing and saving ${asset.name}…`);await storeAiReference(type,asset,file,"manual");setMsg("aiBibleNotice",`${asset.name} reference saved. Review it, then lock it.`);renderAiVisualBible();renderShot()}catch(err){setMsg("aiBibleNotice",err.message||"Could not save reference.","warning")}
}
async function uploadAiSource(type,id,event){
  const file=event.target.files?.[0],asset=aiCollection(type).find(x=>x.id===id);event.target.value="";if(!file||!asset||!app.ai.sourceReady||!can("media")||app.ai.generating)return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)return setMsg("aiBibleNotice","Use a JPEG, PNG or WebP image up to 12 MB.","warning");
  const oldPath=asset.source_path,oldUrl=asset.sourceUrl;
  try{
    setMsg("aiBibleNotice",`Optimizing and saving source image for ${asset.name}…`);
    const optimized=await optimizeImageBlob(file,496,.86),format=optimizedImageFormat(optimized),path=`${app.current.id}/ai/${aiFolder(type)}/${asset.id}/${Date.now()}-source.${format.extension}`;
    const {error:uploadError}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
    const {error:updateError}=await sb.from(aiTable(type)).update({source_path:path,updated_at:new Date().toISOString()}).eq("id",asset.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
    asset.source_path=path;asset.sourceUrl=null;await signAiAsset(asset);if(!asset.sourceUrl)asset.sourceUrl=URL.createObjectURL(optimized);if(String(oldUrl||"").startsWith("blob:"))URL.revokeObjectURL(oldUrl);await removeMediaPaths([oldPath]);setMsg("aiBibleNotice",`${asset.name} source image saved. Generate will use it as the primary visual guide.`);renderAiVisualBible()
  }catch(error){setMsg("aiBibleNotice",error.message||"Could not save source image.","warning")}
}
async function removeAiSource(type,id){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset?.source_path||!app.ai.sourceReady||!can("media")||app.ai.generating)return;
  if(!uiConfirm(`Remove the source image for ${asset.name}? The finished reference will stay unchanged.`))return;
  const oldPath=asset.source_path,oldUrl=asset.sourceUrl,{error}=await sb.from(aiTable(type)).update({source_path:null,updated_at:new Date().toISOString()}).eq("id",asset.id).eq("project_id",app.current.id);
  if(error)return setMsg("aiBibleNotice",error.message||"Could not remove source image.","warning");
  asset.source_path=null;asset.sourceUrl=null;if(String(oldUrl||"").startsWith("blob:"))URL.revokeObjectURL(oldUrl);await removeMediaPaths([oldPath]);setMsg("aiBibleNotice",`${asset.name} source image removed.`);renderAiVisualBible()
}
function beginAiGeneration(mode,assetId=null){
  app.ai.previousFocus=document.activeElement;app.ai.generating=true;app.ai.generationMode=mode;app.ai.generatingAssetId=assetId;app.ai.cancelRequested=false;app.ai.requestController=null;syncAiGenerationLock();requestAnimationFrame(()=>$('cancelAiGenerationBtn')?.focus())
}
function finishAiGeneration(){
  const previousFocus=app.ai.previousFocus;app.ai.generating=false;app.ai.generationMode=null;app.ai.generatingAssetId=null;app.ai.requestController=null;app.ai.cancelRequested=false;app.ai.previousFocus=null;syncAiGenerationLock();if(previousFocus?.isConnected)requestAnimationFrame(()=>previousFocus.focus())
}
function setGenerationInert(active){
  const overlay=$('aiGenerationLock');
  // The lock disables only the app behind this overlay. Keep its Cancel
  // button interactive for the entire in-flight request.
  if(overlay)overlay.inert=false;
  for(const element of [...document.body.children]){
    if(element===overlay||element.tagName==='SCRIPT')continue;
    if(active){
      if(!element.inert)element.dataset.aiGenerationInert='true';
      element.inert=true
    }else if(element.dataset.aiGenerationInert==='true'){
      element.inert=false;delete element.dataset.aiGenerationInert
    }
  }
}
function syncAiGenerationLock(){
  const overlay=$("aiGenerationLock");if(!overlay)return;
  const active=!!app.ai.generating,mode=String(app.ai.generationMode||""),referenceType=mode==="character_reference"?"character":mode==="location_reference"?"location":null,asset=referenceType?aiCollection(referenceType).find(x=>x.id===app.ai.generatingAssetId):null,name=asset?.name||(referenceType==="character"?"character":"location");
  let title="Creating your storyboard image…",message="Editing is paused so the generated image matches the submitted shot settings.";
  if(referenceType==="character"){title=`Creating character reference · ${name}`;message=`Editing is paused while AI creates a consistent character reference for ${name}.`}
  if(referenceType==="location"){title=`Creating location reference · ${name}`;message=`Editing is paused while AI creates a consistent location reference for ${name}.`}
  $("aiGenerationLockTitle").textContent=uiText(app.ai.cancelRequested?"Canceling generation…":title);
  $("aiGenerationLockMessage").textContent=uiText(message);
  const cancel=$("cancelAiGenerationBtn");cancel.disabled=!active||app.ai.cancelRequested;cancel.textContent=uiText(app.ai.cancelRequested?"Canceling…":"Cancel Generation")
  if(active&&!overlay.open){try{overlay.showModal()}catch(error){overlay.setAttribute("open","")}}
  setGenerationInert(active);document.body.classList.toggle("ai-generation-active",active);
  if(!active&&overlay.open){if(typeof overlay.close==="function")overlay.close();else overlay.removeAttribute("open")}
}
function cancelAiGeneration(){
  if(!app.ai.generating||app.ai.cancelRequested)return;
  app.ai.cancelRequested=true;syncAiGenerationLock();app.ai.requestController?.abort()
}
async function requestAiImage(payload){
  const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error("Your session expired. Sign in again.");
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
  app.ai.requestController=controller;if(app.ai.cancelRequested)controller.abort();
  try{
    const response=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify(payload),signal:controller.signal});
    if(!response.ok){let message=`AI request failed (${response.status}).`;try{const body=await response.json();message=body.error||message;if(body.remaining!==undefined)message+=` ${body.remaining} generation(s) remain today.`}catch(e){}throw new Error(message)}
    const contentType=(response.headers.get("Content-Type")||"").toLowerCase();if(!contentType.startsWith("image/"))throw new Error("AI returned an invalid response instead of an image.");
    return {blob:await response.blob(),remaining:response.headers.get("X-AI-Remaining"),model:response.headers.get("X-AI-Model")||"flux-2-klein-4b",promptHash:response.headers.get("X-AI-Prompt-Hash")||""}
  }catch(error){
    if(app.ai.cancelRequested&&(error?.name==="AbortError"||error instanceof TypeError))throw new Error("Generation canceled.");
    if(error?.name==="AbortError")throw new Error("AI generation took more than 3 minutes. Please try again.");
    if(error instanceof TypeError)throw new Error("Could not reach the AI service. Check your connection, then try again.");
    throw error
  }finally{clearTimeout(timeout);if(app.ai.requestController===controller)app.ai.requestController=null}
}
function generationBalanceMessage(remaining){
  if(remaining===null||remaining===undefined||remaining==="")return "";
  if(Number(remaining)<0)return "";
  return ` ${remaining} generation(s) remain today.`
}
async function generateAiReference(type,id){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||asset.locked||!can("media")||app.ai.generating)return;
  app.suppressRealtime++;beginAiGeneration(`${type}_reference`,id);asset.generationStatus=`Generating ${asset.name} reference… Keep this window open.`;asset.generationStatusKind="loading";setMsg("aiBibleNotice",asset.generationStatus);renderAiVisualBible();
  try{
    const result=await requestAiImage({mode:`${type}_reference`,project_id:app.current.id,asset_id:id});
    await storeAiReference(type,asset,result.blob);asset.generationStatus=`Reference generated. Review it, then press Lock.${generationBalanceMessage(result.remaining)}`;asset.generationStatusKind="success";setMsg("aiBibleNotice",`${asset.name} reference generated. Review and lock it.${generationBalanceMessage(result.remaining)}`);renderShot()
  }catch(err){asset.generationStatus=err.message||"Reference generation failed.";asset.generationStatusKind="error";setMsg("aiBibleNotice",asset.generationStatus,"warning")}
  finally{finishAiGeneration();app.suppressRealtime=Math.max(0,app.suppressRealtime-1);renderAiVisualBible();applyPermissionLocks();await loadAiUsage()}
}
function renderAiShotControls(){
  const shot=currentShot(),characters=$("shotCharacterPicker"),location=$("aiLocationId");if(!shot||!characters||!location)return;
  renderAiUsage();
  const selectionDisabled=!can("shots")||!app.ai.ready;
  shot.aiCharacterIds=Array.isArray(shot.aiCharacterIds)?shot.aiCharacterIds:[];
  characters.innerHTML="";
  if(!app.ai.ready||!app.ai.characters.length){characters.innerHTML=`<span class="ai-picker-empty">${app.ai.ready?"No characters in the Bible. Add one only if this shot needs a recurring character.":app.mode==="cloud"?app.ai.migrationMessage:"Bible is available in signed-in cloud projects."}</span>`}
  else for(const asset of app.ai.characters){
    const styleMatches=asset.style_snapshot===app.current.style,hasReference=!!asset.reference_path,ready=asset.locked&&hasReference&&styleMatches,selected=shot.aiCharacterIds.includes(asset.id),status=!hasReference?" · needs reference":!asset.locked?" · not locked":!styleMatches?" · style changed":"",label=document.createElement("label");label.className="ai-reference-choice"+(selected?" selected":"")+(ready?"":" needs-reference");
    label.innerHTML=`<input type="checkbox" value="${asset.id}" ${selected?"checked":""} ${selectionDisabled?"disabled":""}><span>${escapeHtml(asset.name)}${status}</span>`;
    label.querySelector("input").onchange=e=>{shot.aiCharacterIds=e.target.checked?[...new Set([...shot.aiCharacterIds,asset.id])]:shot.aiCharacterIds.filter(x=>x!==asset.id);onAiShotLinksChange()};characters.appendChild(label)
  }
  const previous=shot.aiLocationId||"";
  const locationPrompt=!app.ai.ready?"Bible is unavailable":app.ai.locations.length?"Choose project location…":"No locations yet — open Bible";
  location.innerHTML=`<option value="">${locationPrompt}</option>`;
  for(const asset of app.ai.locations){const styleMatches=asset.style_snapshot===app.current.style,hasReference=!!asset.reference_path,status=!hasReference?" · needs reference":!asset.locked?" · not locked":!styleMatches?" · style changed":"",option=document.createElement("option");option.value=asset.id;option.textContent=asset.name+status;location.appendChild(option)}
  location.value=[...location.options].some(x=>x.value===previous)?previous:"";
  location.disabled=selectionDisabled;
  const state=aiShotReady(),status=$("aiGenerationStatus");status.textContent=app.ai.generating?"Generating the frame… Keep this tab open.":state.message;status.className="ai-generation-status"+(state.ready?"":" error");
  $("generateShotImageBtn").textContent=app.ai.generating?"Generating…":"✦ Generate Storyboard";$("generateShotImageBtn").classList.toggle("is-generating",app.ai.generating);$("generateShotImageBtn").setAttribute("aria-busy",String(app.ai.generating))
}
function onAiShotLinksChange(){
  const shot=currentShot();if(!shot||!can("shots"))return;shot.aiLocationId=$("aiLocationId").value||"";renderShot();queueSave("shot");rememberWorkspace();applyPermissionLocks()
}
function aiShotReady(){
  const shot=currentShot();if(app.mode!=="cloud")return {ready:false,message:"Sign in to a cloud project to generate images."};
  if(!app.ai.ready)return {ready:false,message:app.ai.migrationMessage};if(!can("media"))return {ready:false,message:"You need the project media permission to generate images."};if(!shot)return {ready:false,message:"Choose a shot first."};
  if(!String(shot.summary||shot.description||shot.subject||"").trim())return {ready:false,message:"Add a shot summary, subject or visual description first."};
  const location=app.ai.locations.find(x=>x.id===shot.aiLocationId);if(!location)return {ready:false,message:"Choose a project location for this shot."};
  if(!location.reference_path)return {ready:false,message:`${location.name} needs a generated or uploaded reference before this shot can be generated.`};
  if(!location.locked)return {ready:false,message:`Lock the ${location.name} reference before generating this shot.`};
  if(location.style_snapshot!==app.current.style)return {ready:false,message:`${location.name} was locked for a different style. Review and lock it again for ${app.current.style}.`};
  if((shot.aiCharacterIds||[]).length>3)return {ready:false,message:"Choose no more than 3 recurring characters for one generated shot."};
  const invalid=(shot.aiCharacterIds||[]).map(id=>app.ai.characters.find(c=>c.id===id)).find(x=>!x||!x.reference_path||!x.locked||x.style_snapshot!==app.current.style);if(invalid){const name=invalid?.name||"A selected character";if(!invalid?.reference_path)return {ready:false,message:`${name} needs a generated or uploaded reference before this shot can be generated.`};if(!invalid.locked)return {ready:false,message:`Lock the ${name} reference before generating this shot.`};return {ready:false,message:`${name} was locked for a different style. Review and lock it again for ${app.current.style}.`}}
  return {ready:true,message:`Ready · ${location.name} · ${shot.aiCharacterIds.length||"no"} character reference${shot.aiCharacterIds.length===1?"":"s"} · ${app.current.style}`}
}
function captureShotEditorDraft(){
  const shot=currentShot();if(!shot)return null;
  // A tap that closes the mobile keyboard can reach Generate before the
  // textarea's change event. Read the live controls synchronously so the
  // request always contains what the user can currently see on screen.
  for(const id of SHOT_FIELDS){const field=$(id);if(field&&id!=="shotNo")shot[id]=field.value}
  const location=$("aiLocationId");if(location)shot.aiLocationId=location.value||"";
  const characterInputs=[...document.querySelectorAll('#shotCharacterPicker input[type="checkbox"]')];
  if(characterInputs.length)shot.aiCharacterIds=characterInputs.filter(input=>input.checked).map(input=>input.value);
  return shot
}
function announceAiShotStatus(message,kind="error"){
  const status=$("aiGenerationStatus");if(!status)return;
  status.textContent=uiText(message);status.className=`ai-generation-status ${kind} attention`;status.setAttribute("role","status");
  setTimeout(()=>status.classList.remove("attention"),900)
}
async function generateShotImage(){
  const shot=captureShotEditorDraft(),scene=currentScene(),readiness=aiShotReady();
  if(app.ai.generating)return;
  if(!readiness.ready||!shot||!scene){renderShot();applyPermissionLocks();announceAiShotStatus(readiness.message||"Choose a shot first.");setMsg("editorNotice",readiness.message||"Choose a shot first.","warning");return}
  let finalStatus="",finalStatusKind="";
  clearTimeout(autosaveTimer);app.suppressRealtime++;beginAiGeneration("shot");renderShot();applyPermissionLocks();setMsg("editorNotice","");announceAiShotStatus("Generating the frame… Keep this tab open.","loading");
  try{
    const projectSaved=await saveCloud("project"),sceneSaved=await saveCloud("scene"),shotSaved=await saveCloud("shot");
    if(!projectSaved||!sceneSaved||!shotSaved)throw new Error("Could not save the latest shot settings before generation.");
    const result=await requestAiImage({mode:"shot",project_id:app.current.id,scene_id:scene.id,shot_id:shot.id,shot_data:shotDbData(shot)});
    const optimized=await optimizeImageBlob(result.blob,1024,.82),format=optimizedImageFormat(optimized),path=`${app.current.id}/${shot.id}/${Date.now()}-ai.${format.extension}`,oldPath=shot.imagePath;
    const {error:uploadError}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
    const {error:updateError}=await sb.from("shots").update({image_path:path}).eq("id",shot.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
    shot.imagePath=path;shot.aiGeneration={provider:"cloudflare-workers-ai",model:result.model,generatedAt:new Date().toISOString(),locationId:shot.aiLocationId,characterIds:[...(shot.aiCharacterIds||[])],promptHash:result.promptHash};
    const {data:signed}=await sb.storage.from("storyboards").createSignedUrl(path,SIGNED_IMAGE_TTL_SECONDS);shot.image=signed?.signedUrl||URL.createObjectURL(optimized);
    await removeMediaPaths([oldPath]);const saved=await saveCloud("shot");if(saved)await recordShotGenerationScore(shot,result.promptHash);renderEditor();finalStatus=`Storyboard image generated and saved.${generationBalanceMessage(result.remaining)}`;finalStatusKind="success";setMsg("editorNotice",finalStatus)
  }catch(err){finalStatus=err.message||"Could not generate this shot.";finalStatusKind="error";setMsg("editorNotice",finalStatus,"warning")}
  finally{finishAiGeneration();app.suppressRealtime=Math.max(0,app.suppressRealtime-1);renderShot();applyPermissionLocks();if(finalStatus)announceAiShotStatus(finalStatus,finalStatusKind);rememberWorkspace();await loadAiUsage()}
}

/* ---------- SHEET TOGGLE ---------- */
function toggleSheet(force){
  app.sheetOpen=typeof force==="boolean"?force:!app.sheetOpen;$("sheetPanel").hidden=!app.sheetOpen;updateSheetButtons();rememberWorkspace();
  if(isMobileEditor()){
    app.mobileScreen=app.sheetOpen?"sheet":"shot";syncMobileEditorUi();closeEditorActions();
    if(app.sheetOpen){renderSheet();requestAnimationFrame(()=>{$("sheetPanel").scrollTop=0})}
  }else if(app.sheetOpen){renderSheet();requestAnimationFrame(()=>$("sheetPanel").scrollIntoView({behavior:"smooth",block:"start"}))}
}
function updateSheetButtons(){
  $("sheetToggleBtn").classList.toggle("sheet-on",app.sheetOpen);$("mobileSheetBtn").classList.toggle("sheet-on",app.sheetOpen);$("sheetPanel").hidden=!app.sheetOpen;syncMobileEditorUi()
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
      const image=shot.image?`<img src="${shot.image}" alt="" loading="lazy" decoding="async">`:`<div class="sheet-placeholder">Storyboard Frame<br>Shot ${shot.shotNo}</div>`;
      card.innerHTML=`<div class="sheet-image" style="aspect-ratio:${ar.w}/${ar.h}">${image}</div><div class="sheet-info"><div class="sheet-scene">Scene ${scene.number} · ${escapeHtml(scene.title||"")}</div><div class="sheet-info-top"><span>SHOT ${shot.shotNo}</span><span>${escapeHtml(shot.duration||"")}</span></div><div class="sheet-meta">${escapeHtml(shortValue(shot.shotSize))} · ${escapeHtml(shot.angle||"")} · ${escapeHtml(shot.lens||"")} · ${escapeHtml(shot.movement||"")}</div><div class="sheet-summary">${escapeHtml(shot.summary||shot.description||"")}</div></div>`;
      const sheetImage=card.querySelector(".sheet-image img");if(sheetImage){sheetImage.tabIndex=0;sheetImage.setAttribute("role","button");sheetImage.setAttribute("aria-label",`Open Shot ${shot.shotNo} image`);sheetImage.onclick=()=>openImageViewer(shotImageTarget(shot));sheetImage.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openImageViewer(shotImageTarget(shot))}}}
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
  app.collabTab=tab;
  const chat=tab==="chat";
  $("collabChatTab").classList.toggle("active",chat);$("collabMembersTab").classList.toggle("active",!chat);
  $("collabChatPane").hidden=!chat;$("collabMembersPane").hidden=chat;
  if(chat){
    renderChatReferenceOptions();
    renderChatMentionOptions();
    renderChatMessages();
    setTimeout(()=>{const box=$("chatMessages");if(box)box.scrollTop=box.scrollHeight},30)
  }else renderMembers();
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
    item.innerHTML=`<div class="chat-meta"><strong>${escapeHtml(name)}</strong><span>${new Date(row.created_at).toLocaleString(uiLocale())}</span></div>${ref}<div class="chat-body">${renderChatBody(row.body)}</div>`;
    item.querySelector(".chat-ref")?.addEventListener("click",e=>jumpToChatReference(e.currentTarget.dataset.type,e.currentTarget.dataset.id));
    box.appendChild(item)
  }
  box.scrollTop=box.scrollHeight;
  if(chatActivelyVisible())await markChatRead(rows)
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
  const pid=app.current.id;app.chatChannel=sb.channel(`project-chat-modal-${pid}`)
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"project_messages",filter:`project_id=eq.${pid}`},()=>renderChatMessages())
    .subscribe()
}
function unsubscribeChatRealtime(){if(sb&&app.chatChannel){sb.removeChannel(app.chatChannel);app.chatChannel=null}}
async function openCollab(){
  if(app.mode!=="cloud"){uiAlert("Collaboration becomes available after Supabase cloud accounts are connected.");return}
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
      row.querySelector(".edit-member").onclick=async()=>{const preset=uiPrompt("Set role: viewer, editor or custom","editor");if(!preset)return;let perms=preset==="viewer"?blankPermissions():preset==="editor"?editorPermissions():m.permissions||editorPermissions();const rpc=adminSupporting()?"storyboard_admin_update_project_member":"update_project_member_access";const {error}=await sb.rpc(rpc,{p_project_id:pid,p_user_id:m.user_id,p_role:preset,p_permissions:perms});if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
      row.querySelector(".remove-member").onclick=async()=>{if(!uiConfirm("Remove this collaborator?"))return;const rpc=adminSupporting()?"storyboard_admin_remove_project_member":"remove_project_member";const {error}=await sb.rpc(rpc,{p_project_id:pid,p_user_id:m.user_id});if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
    }
    wrap.appendChild(row)
  })
}
async function addMemberByUsername(){
  const username=$("inviteUsername").value.trim().toLowerCase();if(!username)return;
  const preset=$("permissionPreset").value,perms=permissionPreset(preset);
  const rpc=adminSupporting()?"storyboard_admin_add_project_member":"add_project_member_by_username";
  const {error:e}=await sb.rpc(rpc,{p_project_id:app.current.id,p_username:username,p_role:preset,p_permissions:perms});
  if(e)setMsg("collabMessage",e.message,"warning");else{setMsg("collabMessage",`@${username} added.`);$("inviteUsername").value="";renderMembers()}
}
async function createShareLink(){
  const preset=$("permissionPreset").value,perms=permissionPreset(preset),email=$("inviteEmail").value.trim()||null;
  const rpc=adminSupporting()?"storyboard_admin_create_project_invite":"create_project_invite";
  const {data,error}=await sb.rpc(rpc,{p_project_id:app.current.id,p_invitee_email:email,p_role:preset,p_permissions:perms});
  if(error){setMsg("collabMessage",error.message,"warning");return}
  const url=`${cfg.SITE_URL||location.origin}/?invite=${data}`;$("shareLinkOutput").value=url;$("shareLinkBox").hidden=false
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
    if(app.mode==="cloud"){uiAlert("Cloud JSON import will be added after the account backend is connected. For now, import is available in Offline mode.");return}
    const p=x.scenes?x:blankProject(x.project?.name||"Imported");if(!x.scenes)p.scenes=[{id:uid(),number:1,title:"Scene 1",description:"",position:1,shots:x.shots.map((s,i)=>({...blankShot(i+1),...s,id:uid()}))}];
    p.id=uid();app.current=p;app.projects.push(p);selectFirst();saveLocal();renderEditor()
  }catch(err){uiAlert("Invalid storyboard JSON.")}};r.readAsText(file);e.target.value=""
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
    const {data:s,error:se}=await sb.from("scenes").insert({project_id:p.id,scene_number:si+1,title:sc.title||`Scene ${si+1}`,description:sc.description||"",story_location:sc.storyLocation||"",story_time:sc.storyTime||"Unspecified",shoot_time:sc.shootTime||"Unspecified",time_strategy:sc.timeStrategy||"natural",position:si+1,collapsed:!!sc.collapsed}).select().single();
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
    const id=await createCloudProjectFromJSON(data);await loadCloudProjects();await openCloudProject(id);uiAlert("Storyboard imported successfully. Images can be added manually to each shot.")
  }else{
    const p={...blankProject(data.name||"Imported Storyboard"),...data,id:uid(),owner_id:null};
    p.tags=normalizeTags(p.tags);p.metadata=projectMeta(p);p.folder=p.folder||"General";p.isFavorite=!!(p.isFavorite??p.is_favorite);
    let scenes=Array.isArray(p.scenes)?p.scenes:[];if(!scenes.length)scenes=[{title:"Scene 1",shots:Array.isArray(data.shots)?data.shots:[]}];
    p.scenes=scenes.map((sc,si)=>({...blankScene(si+1),...sc,id:uid(),number:si+1,position:si+1,collapsed:!!sc.collapsed,shots:(Array.isArray(sc.shots)&&sc.shots.length?sc.shots:[blankShot(1)]).map((sh,i)=>({...blankShot(i+1),...sh,id:uid(),shotNo:i+1,position:i+1}))}));
    app.current=p;app.projects.push(p);selectFirst();saveLocal();renderEditor();uiAlert("Storyboard imported locally.")
  }
}



/* ---------- LIGHTING STUDIO v3.8 ---------- */
const LIGHTING_FIXTURES = {
  "Fresnel":        {icon:"◉", group:"Spot",      beam:28,  shape:"spot",  kelvin:3200, intensity:78, length:360},
  "COB Spot":       {icon:"✦", group:"Spot",      beam:44,  shape:"spot",  kelvin:5600, intensity:82, length:390},
  "PAR":            {icon:"◍", group:"Spot",      beam:18,  shape:"spot",  kelvin:5600, intensity:88, length:430},
  "Projection":     {icon:"▣", group:"Spot",      beam:20,  shape:"spot",  kelvin:5600, intensity:84, length:450},
  "LED Panel":      {icon:"▤", group:"Soft",      beam:100, shape:"panel", kelvin:5600, intensity:68, length:310},
  "Softbox":        {icon:"▱", group:"Soft",      beam:112, shape:"panel", kelvin:5600, intensity:64, length:290},
  "Lantern":        {icon:"○", group:"Soft",      beam:155, shape:"omni",  kelvin:5600, intensity:58, length:220},
  "Tube":           {icon:"┃", group:"Linear",    beam:125, shape:"tube",  kelvin:5600, intensity:58, length:270},
  "Practical Bulb": {icon:"●", group:"Practical", beam:165, shape:"omni",  kelvin:2700, intensity:48, length:190},
  "Window":         {icon:"▥", group:"Practical", beam:95,  shape:"panel", kelvin:5600, intensity:62, length:360},
  "Candle":         {icon:"♢", group:"Practical", beam:165, shape:"omni",  kelvin:2000, intensity:24, length:115}
};

const LIGHTING_MODIFIERS = {
  "None":                  {short:"Open", spread:0,  softness:0.00, transmission:1.00},
  "251 Quarter Diffusion": {short:"¼ Diff",spread:8, softness:0.15, transmission:0.88},
  "250 Half Diffusion":    {short:"½ Diff",spread:16,softness:0.28, transmission:0.76},
  "216 Full Diffusion":    {short:"Full",  spread:26,softness:0.44, transmission:0.61},
  "Opal":                  {short:"Opal",  spread:12,softness:0.23, transmission:0.82},
  "Hampshire Frost":       {short:"Frost", spread:18,softness:0.31, transmission:0.73},
  "Light Grid Cloth":      {short:"Lt Grid",spread:12,softness:0.24,transmission:0.82},
  "Grid Cloth":            {short:"Grid",  spread:28,softness:0.46, transmission:0.58},
  "Magic Cloth":           {short:"Magic", spread:34,softness:0.55, transmission:0.49},
  "Silk":                  {short:"Silk",  spread:22,softness:0.38, transmission:0.68},
  "Muslin Bounce":         {short:"Muslin",spread:40,softness:0.60, transmission:0.46}
};

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

function lightingCanEdit(){return app.mode==="local"||app.isOwner||can("shots")||can("project_settings")}
function lightingLocalKey(projectId=app.current?.id){return `storyboard-v3.8-lighting:${projectId||"none"}`}
function lightingSelected(){return app.lighting.current?.data?.objects?.find(o=>o.id===app.lighting.selectedId)||null}
function lightingCurrentShotLink(){const scene=currentScene(),shot=currentShot();return scene&&shot?{scene,shot}:null}
function lightingLinkedShot(diagram=app.lighting.current){
  if(!diagram||!app.current)return null;
  const scene=app.current.scenes.find(s=>s.id===diagram.scene_id);
  const shot=scene?.shots.find(s=>s.id===diagram.shot_id);
  return shot?{scene,shot}:null
}
function lightingFixtureProps(name){return LIGHTING_FIXTURES[name]||LIGHTING_FIXTURES["COB Spot"]}
function lightingModifierProps(name){return LIGHTING_MODIFIERS[name]||LIGHTING_MODIFIERS.None}
function safeSvgText(v){return escapeHtml(String(v??""))}
function slugName(v){return String(v||"lighting-diagram").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"")||"lighting-diagram"}
function parseLensMm(v){
  const s=String(v||"").toLowerCase();
  if(s==="wide")return 24;if(s==="normal")return 50;if(s==="telephoto")return 100;
  const m=s.match(/([\d.]+)/);return m?Math.max(8,Number(m[1])):50
}
function cameraHorizontalFov(lens){
  const mm=parseLensMm(lens);return Math.max(10,Math.min(125,2*Math.atan(36/(2*mm))*180/Math.PI))
}
function cameraVerticalFov(lens){
  const mm=parseLensMm(lens);return Math.max(8,Math.min(105,2*Math.atan(24/(2*mm))*180/Math.PI))
}

function shotFrameCropMeters(shotSize,subjectHeight=1.75){
  const s=String(shotSize||"").toLowerCase();
  if(s.includes("extreme close"))return 0.16;
  if(s.startsWith("cu"))return 0.28;
  if(s.includes("medium close"))return 0.52;
  if(s.includes("medium shot"))return 0.98;
  if(s.includes("medium long"))return Math.min(subjectHeight*0.92,1.48);
  if(s.includes("wide shot"))return Math.max(subjectHeight*1.10,1.95);
  if(s.includes("extreme wide"))return Math.max(subjectHeight*2.20,4.0);
  if(s.includes("over the shoulder"))return 0.82;
  if(s.includes("point of view"))return 0.90;
  if(s.includes("insert"))return 0.20;
  if(s.includes("top shot"))return Math.max(subjectHeight*1.22,2.0);
  return 0.90
}
function shotFrameTargetRatio(shotSize){
  const s=String(shotSize||"").toLowerCase();
  if(s.includes("extreme close"))return 0.95;
  if(s.startsWith("cu"))return 0.92;
  if(s.includes("medium close"))return 0.88;
  if(s.includes("medium shot"))return 0.80;
  if(s.includes("medium long"))return 0.72;
  if(s.includes("wide shot"))return 0.58;
  if(s.includes("extreme wide"))return 0.38;
  if(s.includes("over the shoulder"))return 0.78;
  return 0.75
}
function findLightingSubject(camObj=null){
  const subs=(app.lighting.current?.data?.objects||[]).filter(o=>o.type==="subject");
  if(!subs.length)return null;
  if(!camObj)return subs[0];
  let best=subs[0],bestDist=Infinity;
  for(const s of subs){
    const dx=Number(s.x||0)-Number(camObj.x||0),dy=Number(s.y||0)-Number(camObj.y||0),d=Math.hypot(dx,dy);
    if(d<bestDist){best=s;bestDist=d}
  }
  return best
}
function subjectFaceTargetY(subject,shotSize){
  const h=Number(subject?.height3d||1.75)*(Number(subject?.scale||100)/100);
  const s=String(shotSize||"").toLowerCase();
  if(s.includes("extreme close")||s.startsWith("cu"))return h*0.92;
  if(s.includes("medium close"))return h*0.78;
  if(s.includes("medium shot"))return h*0.62;
  if(s.includes("medium long"))return h*0.52;
  if(s.includes("wide")||s.includes("top shot"))return h*0.5;
  return h*0.7
}
function subjectScaledHeight(subject){
  return Number(subject?.height3d||1.75)*(Number(subject?.scale||100)/100)
}
function subjectEyeHeight(subject){
  return subjectScaledHeight(subject)*0.93
}
function subjectChestHeight(subject){
  return subjectScaledHeight(subject)*0.72
}
function subjectWaistHeight(subject){
  return subjectScaledHeight(subject)*0.52
}
function cameraHeightMeters(label,subject=null){
  const h=subjectScaledHeight(subject),eye=subjectEyeHeight(subject);
  const map={
    "Eye Level":eye,
    "Chest Level":subjectChestHeight(subject),
    "Waist Level":subjectWaistHeight(subject),
    "Table Level":Math.max(.65,h*.42),
    "Ground Level":.15,
    "Overhead":Math.min(6,h+1.25),
    "Custom":null
  };
  const v=map[label];
  return v==null?1.65:v
}
function cameraAnglePitch(label){
  const map={
    "Eye Level":0,
    "High Angle":-24,
    "Low Angle":18,
    "Top / Bird's Eye":-76,
    "Dutch Angle":0,
    "Ground Level":14,
    "Overhead":-52,
    "Custom":null
  };
  return map[label]??0
}
function cameraAngleRoll(label){
  return label==="Dutch Angle"?15:0
}
function cameraFramingDistanceMeters(camera,subject){
  if(!camera||!subject)return 3;
  const subjectHeight=subjectScaledHeight(subject);
  const cropH=shotFrameCropMeters(camera.shotSize,subjectHeight);
  const occupy=shotFrameTargetRatio(camera.shotSize);
  const visibleH=Math.max(.12,cropH/Math.max(.1,occupy));
  const vfov=Math.max(8,cameraVerticalFov(camera.lens));
  return Math.max(.22,(visibleH/2)/Math.tan(vfov*Math.PI/360))
}
function cameraAimHeight(camera,subject){
  const h=subjectScaledHeight(subject),s=String(camera?.shotSize||"").toLowerCase();
  if(s.includes("extreme close")||s.startsWith("cu"))return subjectEyeHeight(subject);
  if(s.includes("medium close"))return h*.80;
  if(s.includes("medium shot"))return h*.65;
  if(s.includes("medium long"))return h*.55;
  if(s.includes("wide")||s.includes("top shot"))return h*.50;
  return h*.70
}
function cameraTargetHeight(camera,subject){
  if(camera?.angle==="Eye Level")return subjectEyeHeight(subject);
  return cameraAimHeight(camera,subject)
}
function cameraGroundDistanceForFrame(camera,subject){
  const total=cameraFramingDistanceMeters(camera,subject);
  const targetY=cameraTargetHeight(camera,subject);
  const vertical=targetY-Number(camera?.height3d||1.65);
  const sq=total*total-vertical*vertical;
  return Math.max(.18,Math.sqrt(Math.max(.035,sq)))
}
function pointCameraTowardSubject(camera,subject){
  if(!camera||!subject)return;
  const horizontal=cameraGroundDistanceForFrame(camera,subject);
  const targetY=cameraTargetHeight(camera,subject);
  camera.tilt=Math.atan2(targetY-Number(camera.height3d||1.65),horizontal)*180/Math.PI
}
function reframeCameraDistance(camera,{force=true}={}){
  const subject=findLightingSubject(camera);
  if(!camera||!subject)return;
  if(!force&&camera.autoFrame===false)return;
  const distance=cameraGroundDistanceForFrame(camera,subject);
  const yaw=Number(camera.rotation||0)*Math.PI/180;
  camera.x=Number(subject.x||600)-Math.cos(yaw)*distance*100;
  camera.y=Number(subject.y||400)-Math.sin(yaw)*distance*100;
  camera.x=Math.max(20,Math.min(1180,camera.x));
  camera.y=Math.max(20,Math.min(780,camera.y));
  camera.autoFrame=true
}
function applyCameraHeightPreset(camera,label){
  const subject=findLightingSubject(camera);if(!camera||!subject)return;
  if(label==="Custom")return;
  camera.cameraHeight=label;
  camera.height3d=cameraHeightMeters(label,subject);
  reframeCameraDistance(camera,{force:true});
  pointCameraTowardSubject(camera,subject)
}
function applyCameraAnglePreset(camera,label){
  const subject=findLightingSubject(camera);if(!camera||!subject)return;
  camera.angle=label;
  camera.roll=cameraAngleRoll(label);
  if(label==="Custom")return;

  const total=cameraFramingDistanceMeters(camera,subject);
  const targetY=(label==="Eye Level")?subjectEyeHeight(subject):cameraAimHeight(camera,subject);
  const pitch=cameraAnglePitch(label);
  const absPitch=Math.abs(pitch)*Math.PI/180;

  if(label==="Eye Level"){
    camera.cameraHeight="Eye Level";
    camera.height3d=subjectEyeHeight(subject);
    camera.tilt=0;
  }else if(label==="Ground Level"){
    camera.cameraHeight="Ground Level";
    camera.height3d=.15;
  }else{
    const sign=pitch<0?1:-1;
    const vertical=Math.min(total*.92,Math.sin(absPitch)*total);
    camera.height3d=Math.max(.1,Math.min(6,targetY+sign*vertical));
    camera.cameraHeight="Custom";
  }
  reframeCameraDistance(camera,{force:true});
  pointCameraTowardSubject(camera,subject)
}
function kelvinToRgb(kelvin){
  let t=Math.max(1000,Math.min(40000,Number(kelvin)||5600))/100,r,g,b;
  if(t<=66){r=255;g=99.4708025861*Math.log(t)-161.1195681661;b=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307}
  else{r=329.698727446*Math.pow(t-60,-.1332047592);g=288.1221695283*Math.pow(t-60,-.0755148492);b=255}
  const c=v=>Math.max(0,Math.min(255,Math.round(v)));return {r:c(r),g:c(g),b:c(b)}
}
function kelvinCss(k){const c=kelvinToRgb(k);return `rgb(${c.r},${c.g},${c.b})`}
function polarPoint(x,y,len,deg){const a=deg*Math.PI/180;return {x:x+Math.cos(a)*len,y:y+Math.sin(a)*len}}

function normalizeLightingObject(o){
  if(o.type==="camera"){
    if(o.height3d==null)o.height3d=1.65;
    if(o.tilt==null)o.tilt=0;
    if(o.roll==null)o.roll=cameraAngleRoll(o.angle);
    if(o.autoFrame==null)o.autoFrame=true;
  }else if(o.type==="light"){
    if(o.height3d==null)o.height3d=2.2;
    if(o.tilt==null)o.tilt=-15;
    if(!o.diffusion)o.diffusion="None";
  }else if(o.type==="subject"){
    if(o.height3d==null)o.height3d=1.75;
    if(o.scale==null)o.scale=100;
    if(!o.gender)o.gender="female";
  }
  if(o.rotation==null)o.rotation=0;
  return o
}
function defaultLightingCamera(){
  const s=currentShot();
  return normalizeLightingObject({
    id:uid(),type:"camera",label:"Camera",x:175,y:400,rotation:0,
    lens:s?.lens||"50mm",shotSize:s?.shotSize||"CU · Close Up",
    angle:s?.angle||"Eye Level",cameraHeight:s?.cameraHeight||"Eye Level",
    movement:s?.movement||"Static",focus:s?.focus||"Shallow Focus"
  })
}
function defaultLightingSubject(){
  return normalizeLightingObject({id:uid(),type:"subject",label:"Subject",gender:"female",x:650,y:400,rotation:180})
}
function defaultLightingLight(fixture="COB Spot",opts={}){
  const p=lightingFixtureProps(fixture);
  return normalizeLightingObject({
    id:uid(),type:"light",label:fixture,fixture,x:390,y:245,rotation:28,
    kelvin:p.kelvin,intensity:p.intensity,beam:p.beam,diffusion:"None",...opts
  })
}
function shotLightPreset(s=currentShot()){
  const source=s?.lightSource||"Off-camera Artificial Light",quality=s?.lightQuality||"";
  const map={
    "Candle":["Candle",2000],"Window Light":["Window",5600],"Moonlight":["COB Spot",7000],
    "Sunlight":["PAR",5600],"Torch":["Practical Bulb",2200],"Practical Light":["Practical Bulb",3000],
    "Off-camera Artificial Light":["LED Panel",5600],"Mixed":["LED Panel",4300],"Unspecified":["COB Spot",5600]
  };
  const [fixture,kelvin]=map[source]||map["Off-camera Artificial Light"];
  const fp=lightingFixtureProps(fixture);
  let diffusion="None";
  if(/soft|diffus/i.test(quality))diffusion="250 Half Diffusion";
  if(/high key/i.test(quality))diffusion="216 Full Diffusion";
  return {fixture,kelvin,beam:fp.beam,intensity:fp.intensity,diffusion}
}
function newLightingDiagramObject(){
  const link=lightingCurrentShotLink(),sn=link?.scene?.number||1,sh=link?.shot?.shotNo||1;
  return {
    id:uid(),persisted:false,project_id:app.current?.id||null,
    scene_id:link?.scene?.id||null,shot_id:link?.shot?.id||null,
    created_by:app.session?.user?.id||null,
    name:`S${String(sn).padStart(2,"0")} · Shot ${String(sh).padStart(2,"0")} Lighting`,
    updated_at:new Date().toISOString(),
    data:{canvas:{width:1200,height:800,metersPer100px:1},objects:[defaultLightingCamera(),defaultLightingSubject()],notes:""}
  }
}
function normalizeLightingDiagram(row){
  const data=deepClone(row?.data||{});
  if(!Array.isArray(data.objects))data.objects=[];
  data.objects=data.objects.map(normalizeLightingObject);
  if(!data.canvas)data.canvas={width:1200,height:800,metersPer100px:1};
  if(typeof data.notes!=="string")data.notes="";
  return {
    id:row?.id||uid(),persisted:row?.persisted!==false,
    project_id:row?.project_id||app.current?.id||null,
    scene_id:row?.scene_id||null,shot_id:row?.shot_id||null,
    created_by:row?.created_by||null,name:row?.name||"Lighting Diagram",
    updated_at:row?.updated_at||new Date().toISOString(),data
  }
}
function lightingShotLabel(scene,shot){return `Scene ${scene.number} · Shot ${shot.shotNo}${shot.summary?` · ${shot.summary}`:""}`}

function populateLightingCameraSelects(){
  const pairs=[
    ["lightingObjectLens",OPTIONS.lens],["lightingObjectShotSize",OPTIONS.shotSize],
    ["lightingObjectAngle",OPTIONS.angle],["lightingObjectHeight",OPTIONS.cameraHeight],
    ["lightingObjectMovement",OPTIONS.movement],["lightingObjectFocus",OPTIONS.focus]
  ];
  for(const [id,arr] of pairs){
    const el=$(id);if(!el)continue;
    el.innerHTML=arr.map(v=>`<option>${escapeHtml(v)}</option>`).join("")
  }
}
function renderLightingShotOptions(){
  const el=$("lightingLinkedShot");if(!el||!app.current)return;
  el.innerHTML="";
  for(const scene of app.current.scenes){
    for(const shot of scene.shots){
      const o=document.createElement("option");
      o.value=`${scene.id}|${shot.id}`;
      o.textContent=lightingShotLabel(scene,shot);
      el.appendChild(o)
    }
  }
  const d=app.lighting.current;
  if(d?.scene_id&&d?.shot_id)el.value=`${d.scene_id}|${d.shot_id}`
}
function renderLightingCameraSummary(){
  const s=currentShot(),el=$("lightingCameraSummary");if(!el)return;
  if(!s){el.textContent="No active shot.";return}
  el.innerHTML=`<strong>${escapeHtml(s.lens||"—")}</strong><span>${escapeHtml(shortValue(s.shotSize))} · ${escapeHtml(s.angle||"—")}</span>`
}
function renderLightingDiagramList(){
  const sel=$("lightingDiagramSelect");if(!sel)return;
  sel.innerHTML="";
  const list=[...app.lighting.diagrams].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  if(app.lighting.current&&!list.some(d=>d.id===app.lighting.current.id))list.unshift(app.lighting.current);
  for(const d of list){
    const o=document.createElement("option");o.value=d.id;o.textContent=d.name||"Lighting Diagram";sel.appendChild(o)
  }
  if(app.lighting.current)sel.value=app.lighting.current.id
}
function renderLightingObjectList(){
  const el=$("lightingObjectList");if(!el||!app.lighting.current)return;
  const groups=[
    ["CAMERAS","camera","⌁"],["LIGHTS","light","✦"],["SUBJECTS","subject","●"]
  ];
  el.innerHTML=groups.map(([title,type,icon])=>{
    const items=app.lighting.current.data.objects.filter(o=>o.type===type);
    return `<div class="lighting-object-group">
      <div class="lighting-object-group-title">${title}<span>${items.length}</span></div>
      ${items.length?items.map(o=>`
        <button type="button" class="lighting-object-row ${o.id===app.lighting.selectedId?"active":""}" data-lighting-select="${o.id}">
          <span class="lighting-object-row-icon">${type==="light"?(lightingFixtureProps(o.fixture).icon||icon):icon}</span>
          <span><strong>${escapeHtml(o.label||o.fixture||type)}</strong><small>${type==="light"?`${escapeHtml(o.fixture)} · ${o.kelvin}K`:type==="camera"?`${escapeHtml(o.lens||"")} · ${escapeHtml(shortValue(o.shotSize))}`:`${Number(o.height3d||1.75).toFixed(2)} m`}</small></span>
        </button>`).join(""):`<div class="lighting-object-empty">No ${title.toLowerCase()}</div>`}
    </div>`
  }).join("");
  el.querySelectorAll("[data-lighting-select]").forEach(b=>b.onclick=()=>selectLightingObject(b.dataset.lightingSelect,false))
}
function renderFixtureCatalog(){
  const el=$("lightingFixtureCatalog"),o=lightingSelected();if(!el||!o||o.type!=="light")return;
  const groups=["Spot","Soft","Linear","Practical"];
  el.innerHTML=groups.map(group=>`
    <div class="lighting-catalog-group">
      <div class="lighting-catalog-group-title">${group}</div>
      <div class="lighting-catalog-items">
        ${Object.entries(LIGHTING_FIXTURES).filter(([,v])=>v.group===group).map(([name,v])=>`
          <button type="button" class="lighting-catalog-chip ${o.fixture===name?"active":""}" data-fixture="${escapeHtml(name)}">
            <span>${v.icon}</span><small>${escapeHtml(name)}</small>
          </button>`).join("")}
      </div>
    </div>`).join("");
  el.querySelectorAll("[data-fixture]").forEach(b=>b.onclick=()=>{
    const selected=lightingSelected();if(!selected||!lightingCanEdit())return;
    const old=selected.fixture;selected.fixture=b.dataset.fixture;selected.label=selected.label===old?selected.fixture:selected.label;
    const fp=lightingFixtureProps(selected.fixture);selected.beam=fp.beam;
    markLightingDirty();renderLightingInspector();renderLightingCanvas();syncLighting3D()
  })
}
function renderModifierCatalog(){
  const el=$("lightingModifierCatalog"),o=lightingSelected();if(!el||!o||o.type!=="light")return;
  el.innerHTML=Object.entries(LIGHTING_MODIFIERS).map(([name,v])=>`
    <button type="button" class="lighting-modifier-chip ${o.diffusion===name?"active":""}" data-modifier="${escapeHtml(name)}" title="${escapeHtml(name)}">
      ${escapeHtml(v.short)}
    </button>`).join("");
  el.querySelectorAll("[data-modifier]").forEach(b=>b.onclick=()=>{
    const selected=lightingSelected();if(!selected||!lightingCanEdit())return;
    selected.diffusion=b.dataset.modifier;markLightingDirty();renderLightingInspector();renderLightingCanvas();syncLighting3D()
  })
}
function setLightingCurrent(diagram){
  app.lighting.current=normalizeLightingDiagram(diagram);
  for(const cam of app.lighting.current.data.objects.filter(o=>o.type==="camera")){
    if(cam.autoFrame!==false){
      const subject=findLightingSubject(cam);
      if(subject){
        if(cam.cameraHeight!=="Custom")cam.height3d=cameraHeightMeters(cam.cameraHeight,subject);
        reframeCameraDistance(cam,{force:true});
        if(cam.angle!=="Custom")pointCameraTowardSubject(cam,subject)
      }
    }
  }
  const firstCam=app.lighting.current.data.objects.find(o=>o.type==="camera");
  app.lighting.activeCameraId=firstCam?.id||null;
  app.lighting.selectedId=firstCam?.id||app.lighting.current.data.objects[0]?.id||null;
  app.lighting.dirty=false;
  $("lightingDiagramName").value=app.lighting.current.name||"Lighting Diagram";
  $("lightingDiagramNotes").value=app.lighting.current.data.notes||"";
  renderLightingShotOptions();renderLightingDiagramList();renderLightingObjectList();
  renderLightingInspector();renderLightingCanvas();clearLightingDirty()
}
async function loadLightingDiagrams(preferredId=null){
  if(!app.current)return;
  if(app.mode==="local"){
    let list=[];try{list=JSON.parse(localStorage.getItem(lightingLocalKey())||"[]")}catch(e){}
    app.lighting.diagrams=(list||[]).map(normalizeLightingDiagram)
  }else{
    const {data,error}=await sb.from("lighting_diagrams")
      .select("id,project_id,scene_id,shot_id,created_by,name,data,updated_at")
      .eq("project_id",app.current.id).order("updated_at",{ascending:false});
    if(error){
      setMsg("lightingDiagramNotice",`Lighting Diagram database is not ready: ${error.message}`,"warning");
      app.lighting.diagrams=[]
    }else{
      setMsg("lightingDiagramNotice","");
      app.lighting.diagrams=(data||[]).map(normalizeLightingDiagram)
    }
  }
  const d=app.lighting.diagrams.find(x=>x.id===preferredId)
    ||app.lighting.diagrams.find(x=>x.scene_id===app.activeSceneId&&x.shot_id===app.activeShotId)
    ||app.lighting.diagrams[0];
  setLightingCurrent(d||newLightingDiagramObject())
}
async function openLightingWorkspace(options={}){
  if(!app.current)return;
  populateLightingCameraSelects();
  renderLightingCameraSummary();
  await loadLightingDiagrams(options.diagramId||null);
  applyLightingPermissions();
  app.lighting.viewMode="plan";
  renderLightingViewMode();
  $("lightingDiagramModal").showModal();
  subscribeLightingRealtime()
}
function closeLightingWorkspace(){
  if(app.lighting.dirty&&!uiConfirm("Close Lighting Diagram without saving the latest changes?"))return;
  stopLightingPlayback(true);stopLighting3D();unsubscribeLightingRealtime();$("lightingDiagramModal").close()
}
function toggleLightingDrawer(force){
  app.lighting.drawerCollapsed=typeof force==="boolean"?force:!app.lighting.drawerCollapsed;
  $("lightingDrawer").classList.toggle("collapsed",app.lighting.drawerCollapsed);
  $("lightingDrawerBody").hidden=app.lighting.drawerCollapsed;
  $("lightingDrawerArrow").textContent=app.lighting.drawerCollapsed?"▸":"▾"
}
function selectLightingObject(id,openDrawer=false){
  app.lighting.selectedId=id;
  const o=lightingSelected();
  if(o?.type==="camera"&&!app.lighting.activeCameraId)app.lighting.activeCameraId=o.id;
  renderLightingObjectList();renderLightingInspector();renderLightingCanvas();syncLighting3D()
}
function markLightingDirty(){app.lighting.dirty=true;$("saveLightingDiagramBtn").textContent="Save •"}
function clearLightingDirty(){app.lighting.dirty=false;$("saveLightingDiagramBtn").textContent="Save"}
function persistLocalLightingList(){localStorage.setItem(lightingLocalKey(),JSON.stringify(app.lighting.diagrams))}
async function saveLightingDiagram(){
  const d=app.lighting.current;if(!d||!lightingCanEdit())return;
  d.name=$("lightingDiagramName").value.trim()||"Lighting Diagram";
  d.data.notes=$("lightingDiagramNotes").value||"";
  d.updated_at=new Date().toISOString();
  if(app.mode==="local"){
    d.persisted=true;
    const i=app.lighting.diagrams.findIndex(x=>x.id===d.id);
    if(i>=0)app.lighting.diagrams[i]=deepClone(d);else app.lighting.diagrams.unshift(deepClone(d));
    persistLocalLightingList();clearLightingDirty();renderLightingDiagramList();return
  }
  const result=d.persisted
    ?await sb.from("lighting_diagrams").update({scene_id:d.scene_id,shot_id:d.shot_id,name:d.name,data:d.data,updated_at:d.updated_at}).eq("id",d.id).select().single()
    :await sb.from("lighting_diagrams").insert({id:d.id,project_id:app.current.id,scene_id:d.scene_id,shot_id:d.shot_id,created_by:app.session.user.id,name:d.name,data:d.data}).select().single();
  if(result.error){setMsg("lightingDiagramNotice",result.error.message,"warning");return}
  const saved=normalizeLightingDiagram(result.data);saved.persisted=true;
  const i=app.lighting.diagrams.findIndex(x=>x.id===saved.id);
  if(i>=0)app.lighting.diagrams[i]=saved;else app.lighting.diagrams.unshift(saved);
  app.lighting.current=saved;clearLightingDirty();renderLightingDiagramList();
  setMsg("lightingDiagramNotice","Saved.");setTimeout(()=>setMsg("lightingDiagramNotice",""),1200)
}
async function createNewLightingDiagram(){
  if(app.lighting.dirty&&!uiConfirm("Create a new diagram without saving the latest changes?"))return;
  setLightingCurrent(newLightingDiagramObject());applyLightingPermissions()
}
async function deleteLightingDiagram(){
  const d=app.lighting.current;if(!d||!lightingCanEdit()||!uiConfirm(`Delete "${d.name}"?`))return;
  if(app.mode==="cloud"&&d.persisted){
    const {error}=await sb.from("lighting_diagrams").delete().eq("id",d.id);
    if(error){setMsg("lightingDiagramNotice",error.message,"warning");return}
  }
  app.lighting.diagrams=app.lighting.diagrams.filter(x=>x.id!==d.id);
  if(app.mode==="local")persistLocalLightingList();
  setLightingCurrent(app.lighting.diagrams[0]||newLightingDiagramObject())
}
function applyLightingPermissions(){
  const edit=lightingCanEdit();
  [
    "lightingDiagramName","lightingLinkedShot","newLightingDiagramBtn","saveLightingDiagramBtn","deleteLightingDiagramBtn",
    "addLightingCameraBtn","addLightingSubjectBtn","addLightingFixtureBtn","addShotLightingBtn","lightingObjectLabel",
    "lightingObjectKelvin","lightingObjectIntensity","lightingObjectBeam","lightingObjectHeight3d","lightingObjectTilt",
    "lightingObjectLens","lightingObjectShotSize","lightingObjectAngle","lightingObjectHeight","lightingObjectMovement",
    "lightingObjectFocus","lightingCameraHeight3d","lightingCameraTilt","lightingSubjectHeight3d","lightingSubjectScale",
    "lightingSubjectGender","lightingObjectRotation","deleteLightingObjectBtn","lightingDiagramNotes"
  ].forEach(id=>{if($(id))$(id).disabled=!edit})
}
function addLightingObject(o){
  const d=app.lighting.current;if(!d||!lightingCanEdit())return;
  d.data.objects.push(normalizeLightingObject(o));app.lighting.selectedId=o.id;
  if(o.type==="camera"){
    app.lighting.activeCameraId=o.id;
    const subject=findLightingSubject(o);
    if(subject){
      if(o.cameraHeight!=="Custom")o.height3d=cameraHeightMeters(o.cameraHeight,subject);
      applyCameraAnglePreset(o,o.angle||"Eye Level")
    }
  }
  markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();syncLighting3D()
}
function addLightingFixture(){
  const n=app.lighting.current?.data?.objects?.filter(o=>o.type==="light").length||0;
  addLightingObject(defaultLightingLight("COB Spot",{x:370+(n%4)*60,y:230+(n%3)*80,rotation:25+n*22}))
}
function addLightFromCurrentShot(){
  const s=currentShot();if(!s)return;
  const p=shotLightPreset(s),subject=app.lighting.current?.data?.objects?.find(o=>o.type==="subject")||{x:650,y:400};
  let x=350,y=400,rotation=0,dir=s.lightDirection||"";
  if(/right/i.test(dir)){x=950;rotation=180}
  else if(/back|top/i.test(dir)){x=650;y=170;rotation=90}
  else if(/front|bottom/i.test(dir)){x=650;y=650;rotation=-90}
  else if(!/left/i.test(dir)){x=subject.x-300;y=subject.y-160;rotation=28}
  addLightingObject(defaultLightingLight(p.fixture,{
    label:`${p.fixture} · ${shortValue(dir)||"Shot Light"}`,x,y,rotation,
    kelvin:p.kelvin,beam:p.beam,intensity:p.intensity,diffusion:p.diffusion
  }))
}
function applyCurrentShotToCamera(){
  const s=currentShot();if(!s)return;
  let c=lightingSelected()?.type==="camera"?lightingSelected():app.lighting.current?.data?.objects?.find(o=>o.type==="camera");
  if(!c){c=defaultLightingCamera();app.lighting.current.data.objects.unshift(c)}
  Object.assign(c,{
    lens:s.lens||"50mm",shotSize:s.shotSize||"CU · Close Up",angle:s.angle||"Eye Level",
    cameraHeight:s.cameraHeight||"Eye Level",movement:s.movement||"Static",focus:s.focus||"Shallow Focus",
    label:`Camera · ${shortValue(s.shotSize)} · ${s.lens||"50mm"}`,autoFrame:true
  });
  const subject=findLightingSubject(c);
  if(subject){
    if(c.cameraHeight!=="Custom")c.height3d=cameraHeightMeters(c.cameraHeight,subject);
    applyCameraAnglePreset(c,c.angle||"Eye Level");
    reframeCameraDistance(c,{force:true})
  }
  app.lighting.selectedId=c.id;app.lighting.activeCameraId=c.id;
  markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();syncLighting3D()
}
function useSelectedCameraView(){
  const o=lightingSelected();if(!o||o.type!=="camera")return;
  o.autoFrame=true;app.lighting.activeCameraId=o.id;setLightingViewMode("camera")
}
function updateLightingLinkedShot(){
  const d=app.lighting.current;if(!d)return;
  const [sceneId,shotId]=String($("lightingLinkedShot").value||"").split("|");
  d.scene_id=sceneId||null;d.shot_id=shotId||null;markLightingDirty()
}
function selectedLightingChange(sourceId=""){
  const o=lightingSelected();if(!o||!lightingCanEdit())return;
  o.label=$("lightingObjectLabel").value.trim()||o.type;
  o.rotation=Number($("lightingObjectRotation").value)||0;

  if(o.type==="light"){
    o.kelvin=Number($("lightingObjectKelvin").value)||5600;
    o.intensity=Number($("lightingObjectIntensity").value)||70;
    o.beam=Number($("lightingObjectBeam").value)||45;
    o.height3d=Number($("lightingObjectHeight3d").value)||2.2;
    o.tilt=Number($("lightingObjectTilt").value)||0
  }else if(o.type==="camera"){
    o.lens=$("lightingObjectLens").value;
    o.shotSize=$("lightingObjectShotSize").value;
    o.angle=$("lightingObjectAngle").value;
    o.cameraHeight=$("lightingObjectHeight").value;
    o.movement=$("lightingObjectMovement").value;
    o.focus=$("lightingObjectFocus").value;

    if(sourceId==="lightingCameraHeight3d"){
      o.height3d=Number($("lightingCameraHeight3d").value)||1.65;
      o.cameraHeight="Custom";
      o.autoFrame=true;
      reframeCameraDistance(o,{force:true})
    }else if(sourceId==="lightingCameraTilt"){
      o.tilt=Number($("lightingCameraTilt").value)||0;
      o.angle="Custom";
      o.roll=0;
      o.autoFrame=false
    }else if(sourceId==="lightingObjectAngle"){
      applyCameraAnglePreset(o,o.angle)
    }else if(sourceId==="lightingObjectHeight"){
      applyCameraHeightPreset(o,o.cameraHeight)
    }else if(sourceId==="lightingObjectLens"||sourceId==="lightingObjectShotSize"){
      o.autoFrame=true;
      reframeCameraDistance(o,{force:true});
      const subject=findLightingSubject(o);
      if(subject&&o.angle!=="Custom")pointCameraTowardSubject(o,subject)
    }else{
      o.height3d=Number($("lightingCameraHeight3d").value)||Number(o.height3d)||1.65;
      o.tilt=Number($("lightingCameraTilt").value)||Number(o.tilt)||0
    }
  }else if(o.type==="subject"){
    o.height3d=Number($("lightingSubjectHeight3d").value)||1.75;
    o.scale=Number($("lightingSubjectScale").value)||100;
    o.gender=$("lightingSubjectGender").value||"female";
    for(const cam of app.lighting.current.data.objects.filter(x=>x.type==="camera"&&x.autoFrame!==false)){
      if(cam.cameraHeight!=="Custom")cam.height3d=cameraHeightMeters(cam.cameraHeight,o);
      reframeCameraDistance(cam,{force:true});
      if(cam.angle!=="Custom")pointCameraTowardSubject(cam,o)
    }
  }

  markLightingDirty();renderLightingObjectList();renderLightingInspector(false);renderLightingCanvas();syncLighting3D()
}
function renderLightingInspector(updateInputs=true){
  const o=lightingSelected();
  $("lightingInspectorEmpty").hidden=!!o;$("lightingInspector").hidden=!o;
  if(!o)return;
  $("lightingLightFields").hidden=o.type!=="light";
  $("lightingCameraFields").hidden=o.type!=="camera";
  $("lightingSubjectFields").hidden=o.type!=="subject";
  if(updateInputs){
    $("lightingObjectLabel").value=o.label||o.type;
    $("lightingObjectRotation").value=Number(o.rotation||0);
    if(o.type==="light"){
      $("lightingObjectKelvin").value=Number(o.kelvin||5600);
      $("lightingObjectIntensity").value=Number(o.intensity||70);
      $("lightingObjectBeam").value=Number(o.beam||45);
      $("lightingObjectHeight3d").value=Number(o.height3d||2.2);
      $("lightingObjectTilt").value=Number(o.tilt||-15);
      renderFixtureCatalog();renderModifierCatalog()
    }else if(o.type==="camera"){
      $("lightingObjectLens").value=o.lens||"50mm";$("lightingObjectShotSize").value=o.shotSize||"CU · Close Up";
      $("lightingObjectAngle").value=o.angle||"Eye Level";$("lightingObjectHeight").value=o.cameraHeight||"Eye Level";
      $("lightingObjectMovement").value=o.movement||"Static";$("lightingObjectFocus").value=o.focus||"Shallow Focus";
      $("lightingCameraHeight3d").value=Number(o.height3d||1.65);$("lightingCameraTilt").value=Number(o.tilt||0);
      renderLightingCameraSummary()
    }else if(o.type==="subject"){
      $("lightingSubjectHeight3d").value=Number(o.height3d||1.75);
      $("lightingSubjectScale").value=Number(o.scale||100);
      $("lightingSubjectGender").value=o.gender||"female"
    }
  }
  $("lightingRotationValue").textContent=`${Math.round(Number(o.rotation||0))}°`;
  if(o.type==="light"){
    $("lightingKelvinValue").textContent=`${Math.round(Number(o.kelvin||5600))} K`;
    $("lightingIntensityValue").textContent=`${Math.round(Number(o.intensity||70))}%`;
    $("lightingBeamValue").textContent=`${Math.round(Number(o.beam||45))}°`;
    $("lightingHeightValue").textContent=`${Number(o.height3d||2.2).toFixed(1)} m`;
    $("lightingTiltValue").textContent=`${Math.round(Number(o.tilt||0))}°`
  }else if(o.type==="camera"){
    $("lightingCameraHeightValue").textContent=`${Number(o.height3d||1.65).toFixed(2)} m`;
    $("lightingCameraTiltValue").textContent=`${Math.round(Number(o.tilt||0))}°`
  }else if(o.type==="subject"){
    $("lightingSubjectHeightValue").textContent=`${Number(o.height3d||1.75).toFixed(2)} m`;
    $("lightingSubjectScaleValue").textContent=`${Math.round(Number(o.scale||100))}%`
  }
}
function deleteSelectedLightingObject(){
  const d=app.lighting.current,o=lightingSelected();if(!d||!o||!lightingCanEdit())return;
  d.data.objects=d.data.objects.filter(x=>x.id!==o.id);
  if(app.lighting.activeCameraId===o.id)app.lighting.activeCameraId=d.data.objects.find(x=>x.type==="camera")?.id||null;
  app.lighting.selectedId=d.data.objects[0]?.id||null;
  markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();syncLighting3D()
}


function lightingObjectSvg(o,selected){
  const stroke=selected?"#30d7ff":"#edf3f6";
  const rotateHandle=(cx,cy)=>`
    <g data-lighting-rotate-handle="${o.id}" class="lighting-rotate-handle">
      <circle cx="${cx+28}" cy="${cy-30}" r="13" fill="#0b0d10" stroke="#5b6c75" stroke-width="1.4"/>
      <text x="${cx+28}" y="${cy-25}" fill="#d9e6ec" font-size="13" text-anchor="middle">⟳</text>
    </g>`;
  if(o.type==="camera"){
    const fov=cameraHorizontalFov(o.lens),len=285;
    const p1=polarPoint(o.x,o.y,len,o.rotation-fov/2),p2=polarPoint(o.x,o.y,len,o.rotation+fov/2);
    return `<g>
      <g data-lighting-id="${o.id}">
        <path d="M ${o.x} ${o.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z" fill="rgba(48,215,255,.07)" stroke="rgba(48,215,255,.33)" stroke-width="2"/>
        <g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})">
          <rect x="-27" y="-18" width="43" height="36" rx="7" fill="#090c0e" stroke="${stroke}" stroke-width="${selected?4:2}"/>
          <path d="M 16 -11 L 38 -21 L 38 21 L 16 11 Z" fill="#090c0e" stroke="${stroke}" stroke-width="2"/>
        </g>
        <text x="${o.x+45}" y="${o.y-5}" fill="#f4f7f8" font-size="15" font-weight="700">${safeSvgText(o.label||"Camera")}</text>
        <text x="${o.x+45}" y="${o.y+15}" fill="#80909a" font-size="12">${safeSvgText(o.lens||"")} · ${Math.round(fov)}°</text>
      </g>
      ${rotateHandle(o.x,o.y)}
    </g>`
  }
  if(o.type==="subject"){
    const bodyRx=o.gender==="male"?18:21,bodyRy=30,noseX=bodyRx+6;
    return `<g>
      <g data-lighting-id="${o.id}">
        <g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})">
          <ellipse cx="0" cy="10" rx="${bodyRx}" ry="${bodyRy}" fill="#13181b" stroke="${stroke}" stroke-width="${selected?4:2}"/>
          <circle cx="0" cy="-26" r="11" fill="#13181b" stroke="${stroke}" stroke-width="${selected?3:1.6}"/>
          <text x="${noseX}" y="-21" fill="#eef5f8" font-size="12" transform="rotate(90 ${noseX} -21)">∞</text>
        </g>
        <text x="${o.x+35}" y="${o.y+3}" fill="#f4f7f8" font-size="15" font-weight="700">${safeSvgText(o.label||"Subject")}</text>
      </g>
      ${rotateHandle(o.x,o.y)}
    </g>`
  }
  if(o.type==="light"){
    const fp=lightingFixtureProps(o.fixture),mp=lightingModifierProps(o.diffusion);
    const beam=Math.min(175,Math.max(5,Number(o.beam||fp.beam)+mp.spread));
    const effective=(Number(o.intensity||70)/100)*mp.transmission;
    const color=kelvinCss(o.kelvin||5600),len=fp.length||330;
    let beamSvg="";
    if(fp.shape==="omni"){
      const rad=Math.max(75,len*(.55+effective*.65));
      beamSvg=`<circle cx="${o.x}" cy="${o.y}" r="${rad}" fill="${color}" opacity="${(.06+effective*.10).toFixed(2)}"/>`
    }else{
      const p1=polarPoint(o.x,o.y,len,o.rotation-beam/2),p2=polarPoint(o.x,o.y,len,o.rotation+beam/2);
      beamSvg=`<path d="M ${o.x} ${o.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z" fill="${color}" opacity="${(.07+effective*.12).toFixed(2)}"/>`
    }
    return `<g>
      <g data-lighting-id="${o.id}">
        ${beamSvg}
        <g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})">
          <rect x="-21" y="-16" width="42" height="32" rx="7" fill="#0b0d0f" stroke="${stroke}" stroke-width="${selected?4:2}"/>
          <circle cx="15" cy="0" r="8" fill="${color}"/>
        </g>
        <text x="${o.x+34}" y="${o.y-7}" fill="#f4f7f8" font-size="15" font-weight="700">${safeSvgText(o.label||o.fixture)}</text>
        <text x="${o.x+34}" y="${o.y+13}" fill="#8c9aa2" font-size="11">${safeSvgText(o.fixture)} · ${Number(o.kelvin||5600)}K</text>
      </g>
      ${rotateHandle(o.x,o.y)}
    </g>`
  }
  return ""
}

function renderLightingCanvas(){
  const svg=$("lightingCanvas"),d=app.lighting.current;if(!svg||!d)return;
  let content=`<defs>
    <pattern id="lightingMinorGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#20272d" stroke-width="1"/></pattern>
    <pattern id="lightingMajorGrid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#lightingMinorGrid)"/><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#313b43" stroke-width="1.2"/></pattern>
  </defs>
  <rect class="lighting-bg" x="0" y="0" width="1200" height="800" fill="#080a0c"/>
  <rect class="lighting-bg" x="0" y="0" width="1200" height="800" fill="url(#lightingMajorGrid)"/>
  <text x="20" y="30" fill="#5f6d75" font-size="13">12 m × 8 m</text>`;
  content+=(d.data.objects||[]).map(o=>lightingObjectSvg(o,o.id===app.lighting.selectedId)).join("");
  svg.innerHTML=content;
  svg.querySelectorAll("[data-lighting-id]").forEach(node=>{
    node.style.cursor=lightingCanEdit()?"grab":"pointer";
    node.addEventListener("pointerdown",e=>startLightingDrag(e,node.dataset.lightingId))
  });
  svg.querySelectorAll("[data-lighting-rotate-handle]").forEach(node=>{
    node.style.cursor=lightingCanEdit()?"grab":"default";
    node.addEventListener("pointerdown",e=>startLightingRotateHandle(e,node.dataset.lightingRotateHandle))
  })
}
function lightingSvgPoint(e){
  const r=$("lightingCanvas").getBoundingClientRect();
  return {x:(e.clientX-r.left)*1200/r.width,y:(e.clientY-r.top)*800/r.height}
}
function normalizeDegrees(v){return ((Number(v||0)%360)+360)%360}
function angleBetween2d(a,b){return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}
function startLightingRotateHandle(e,id){
  selectLightingObject(id,false);
  if(!lightingCanEdit())return;
  const o=lightingSelected();if(!o)return;
  e.preventDefault();e.stopPropagation();
  const p=lightingSvgPoint(e);
  app.lighting.pointers[e.pointerId]=p;
  app.lighting.dragging={
    id,mode:"rotate",pointerId:e.pointerId,
    startRotation:Number(o.rotation||0),
    startPointerAngle:angleBetween2d({x:o.x,y:o.y},p)
  };
  $("lightingCanvas").setPointerCapture?.(e.pointerId)
}
function startLightingDrag(e,id){
  selectLightingObject(id,false);
  if(!lightingCanEdit())return;
  const o=lightingSelected();if(!o)return;
  e.preventDefault();
  const p=lightingSvgPoint(e);
  app.lighting.pointers[e.pointerId]=p;
  const pts=Object.values(app.lighting.pointers);
  if(pts.length>=2){
    app.lighting.dragging={id,mode:"multirotate",startRotation:Number(o.rotation||0),startTwoFingerAngle:angleBetween2d(pts[0],pts[1])}
  }else{
    app.lighting.dragging={id,mode:"move",pointerId:e.pointerId,startX:p.x,startY:p.y,objectX:o.x,objectY:o.y}
  }
  $("lightingCanvas").setPointerCapture?.(e.pointerId)
}
function moveLightingDrag(e){
  if(!lightingCanEdit())return;
  const p=lightingSvgPoint(e);
  app.lighting.pointers[e.pointerId]=p;
  const d=app.lighting.dragging;if(!d)return;
  const o=app.lighting.current?.data?.objects?.find(x=>x.id===d.id);if(!o)return;
  const pts=Object.values(app.lighting.pointers);

  if(pts.length>=2){
    if(d.mode!=="multirotate"){
      app.lighting.dragging={id:d.id,mode:"multirotate",startRotation:Number(o.rotation||0),startTwoFingerAngle:angleBetween2d(pts[0],pts[1])};
      return
    }
    const currentAngle=angleBetween2d(pts[0],pts[1]);
    o.rotation=normalizeDegrees(d.startRotation+(currentAngle-d.startTwoFingerAngle));
    if(o.type==="camera")o.autoFrame=false;
    markLightingDirty();renderLightingInspector(false);renderLightingCanvas();syncLighting3D();return
  }

  if(d.mode==="rotate"){
    const a=angleBetween2d({x:o.x,y:o.y},p);
    o.rotation=normalizeDegrees(d.startRotation+(a-d.startPointerAngle));
    if(o.type==="camera")o.autoFrame=false;
    markLightingDirty();renderLightingInspector(false);renderLightingCanvas();syncLighting3D();return
  }

  if(d.pointerId!==e.pointerId)return;
  o.x=Math.max(25,Math.min(1175,d.objectX+p.x-d.startX));
  o.y=Math.max(25,Math.min(775,d.objectY+p.y-d.startY));
  if(o.type==="camera")o.autoFrame=false;
  markLightingDirty();renderLightingCanvas();syncLighting3D()
}
function endLightingDrag(e){
  if(e?.pointerId!=null)delete app.lighting.pointers[e.pointerId];
  if(!Object.keys(app.lighting.pointers).length)app.lighting.dragging=null
}


function linkedLightingShot(){
  const d=app.lighting.current;
  if(d?.scene_id&&d?.shot_id){
    const sc=app.current?.scenes?.find(s=>s.id===d.scene_id);
    const sh=sc?.shots?.find(x=>x.id===d.shot_id);
    if(sh)return sh
  }
  return currentShot()
}
function parseDurationSeconds(v){
  const s=String(v||"").trim().toLowerCase();
  if(!s)return 4;
  if(/^\d{1,2}:\d{1,2}(?::\d{1,2})?$/.test(s)){
    const parts=s.split(":").map(Number);
    if(parts.length===2)return parts[0]*60+parts[1];
    if(parts.length===3)return parts[0]*3600+parts[1]*60+parts[2]
  }
  const m=s.match(/\d+(?:\.\d+)?/),n=m?parseFloat(m[0]):NaN;
  if(!isFinite(n)||n<=0)return 4;
  if(s.includes("frame"))return Math.max(.1,n/24);
  if(s.includes("ms"))return n/1000;
  return n
}
function lightingPlaybackConfig(camObj){
  const sh=linkedLightingShot();
  return {duration:Math.max(.25,parseDurationSeconds(sh?.duration||"4")),movement:camObj?.movement||sh?.movement||"Static"}
}
function updateLightingPlaybackStatus(msg=""){
  const el=$("lightingPlaybackStatus");if(!el)return;
  const pb=app.lighting.playback,cam=activeLightingCameraObject(),cfg=lightingPlaybackConfig(cam);
  if(msg){el.textContent=msg;return}
  const duration=pb.duration||cfg.duration||4,movement=pb.movement||cfg.movement||"Static";
  if(pb.playing)el.textContent=`Playing ${movement} · ${Math.min(pb.elapsed,duration).toFixed(1)} / ${duration.toFixed(1)}s`;
  else if(pb.baseCamera&&pb.elapsed>0)el.textContent=`Paused ${movement} · ${Math.min(pb.elapsed,duration).toFixed(1)} / ${duration.toFixed(1)}s`;
  else el.textContent=`Movement preview ready · ${cfg.movement} · ${cfg.duration.toFixed(1)}s`
}
function showLightingGodToast(){
  const el=$("lightingGodToast");if(!el)return;
  if(app.lighting.godToastTimer)clearTimeout(app.lighting.godToastTimer);
  el.hidden=false;
  app.lighting.godToastTimer=setTimeout(()=>{el.hidden=true;app.lighting.godToastTimer=null},3000)
}
function pauseLightingPlayback(){
  app.lighting.playback.playing=false;
  updateLightingPlaybackStatus()
}
function stopLightingPlayback(resetCamera=true){
  const pb=app.lighting.playback,cam=activeLightingCameraObject();
  if(resetCamera&&cam&&pb.baseCamera){
    Object.assign(cam,deepClone(pb.baseCamera));
    renderLightingCanvas();renderLightingInspector(false);renderLightingObjectList();syncLighting3D()
  }
  pb.playing=false;pb.elapsed=0;pb.baseCamera=null;
  updateLightingPlaybackStatus()
}
function playLightingPlayback(){
  const cam=activeLightingCameraObject();if(!cam)return;
  const cfg=lightingPlaybackConfig(cam),pb=app.lighting.playback;
  if(!pb.baseCamera||pb.elapsed<=0){
    pb.baseCamera=deepClone(cam);pb.duration=cfg.duration;pb.movement=cfg.movement;pb.elapsed=0
  }
  pb.playing=true;updateLightingPlaybackStatus()
}
function movementPreviewSample(base,movement,t,duration,subject){
  const cam=deepClone(base),rot=Number(base.rotation||0)*Math.PI/180;
  const fx=Math.cos(rot),fz=Math.sin(rot),rx=-Math.sin(rot),rz=Math.cos(rot);
  const ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const travel=170,side=140;
  switch(String(movement||"Static")){
    case "Pan Left": cam.rotation=Number(base.rotation||0)-32*ease;break;
    case "Pan Right": cam.rotation=Number(base.rotation||0)+32*ease;break;
    case "Tilt Up": cam.tilt=Number(base.tilt||0)+18*ease;break;
    case "Tilt Down": cam.tilt=Number(base.tilt||0)-18*ease;break;
    case "Dolly In":
    case "Push In": cam.x=Number(base.x||600)+fx*travel*ease;cam.y=Number(base.y||400)+fz*travel*ease;break;
    case "Dolly Out":
    case "Pull Out": cam.x=Number(base.x||600)-fx*travel*ease;cam.y=Number(base.y||400)-fz*travel*ease;break;
    case "Tracking Left": cam.x=Number(base.x||600)-rx*side*ease;cam.y=Number(base.y||400)-rz*side*ease;break;
    case "Tracking Right": cam.x=Number(base.x||600)+rx*side*ease;cam.y=Number(base.y||400)+rz*side*ease;break;
    case "Crane / Jib": cam.height3d=Number(base.height3d||1.65)+1.2*ease;cam.tilt=Number(base.tilt||0)-8*ease;break;
    case "Zoom In":{
      const mm0=parseLensMm(base.lens),mm1=Math.min(135,mm0*1.8);
      cam.lens=`${Math.round(mm0+(mm1-mm0)*ease)}mm`;break}
    case "Zoom Out":{
      const mm0=parseLensMm(base.lens),mm1=Math.max(18,mm0*.55);
      cam.lens=`${Math.round(mm0+(mm1-mm0)*ease)}mm`;break}
    case "Orbit":
      if(subject){
        const sp=planToWorld(subject),bp=planToWorld(base),dx=bp.x-sp.x,dz=bp.z-sp.z,r=Math.max(.8,Math.hypot(dx,dz)),a0=Math.atan2(dz,dx),a=a0+(Math.PI/4)*ease;
        cam.x=600+(sp.x+Math.cos(a)*r)*100;cam.y=400+(sp.z+Math.sin(a)*r)*100;
        cam.rotation=normalizeDegrees(Math.atan2(sp.z-((cam.y-400)/100),sp.x-((cam.x-600)/100))*180/Math.PI)
      }
      break;
    case "Whip Pan": cam.rotation=Number(base.rotation||0)+95*ease;break;
    case "Handheld":
      cam.x=Number(base.x||600)+Math.sin(t*duration*12)*8;
      cam.y=Number(base.y||400)+Math.cos(t*duration*9)*7;
      cam.rotation=Number(base.rotation||0)+Math.sin(t*duration*7)*2.2;
      cam.tilt=Number(base.tilt||0)+Math.cos(t*duration*8)*1.7;
      break;
    default:break
  }
  cam.autoFrame=false;
  return cam
}
function updateLightingPlayback(dt){
  const pb=app.lighting.playback,cam=activeLightingCameraObject();
  if(!pb.playing||!cam||!pb.baseCamera)return;
  pb.elapsed=Math.min(pb.elapsed+dt,pb.duration);
  const t=Math.max(0,Math.min(1,pb.elapsed/Math.max(.001,pb.duration)));
  const subject=findLightingSubject(pb.baseCamera);
  Object.assign(cam,movementPreviewSample(pb.baseCamera,pb.movement,t,pb.duration,subject));
  updateLightingPlaybackStatus();
  renderLightingCanvas();renderLightingInspector(false);renderLightingObjectList();updateThreeCameraFromObject();
  if(t>=1){pb.playing=false;updateLightingPlaybackStatus(`Complete · ${pb.movement} · ${pb.duration.toFixed(1)}s`)}
}

function setLightingViewMode(mode){
  app.lighting.viewMode=mode;
  renderLightingViewMode()
}
async function renderLightingViewMode(){
  const cameraMode=app.lighting.viewMode==="camera";
  $("lightingPlanModeBtn").classList.toggle("active",!cameraMode);
  $("lightingCameraModeBtn").classList.toggle("active",cameraMode);
  $("lightingPlanView").hidden=cameraMode;
  $("lightingCameraView").hidden=!cameraMode;
  if(cameraMode){updateLightingPlaybackStatus();await startLighting3D()}
  else{pauseLightingPlayback();stopLighting3D(false)}
}

/* ----- 3D CAMERA VIEW ----- */
async function loadThree(){
  if(app.lighting.three?.THREE)return app.lighting.three.THREE;
  $("lighting3dLoading").hidden=false;$("lighting3dError").hidden=true;
  try{
    const THREE=await import(THREE_CDN);
    app.lighting.three={THREE,renderer:null,scene:null,camera:null,raf:0,keys:new Set(),drag:null,last:0};
    return THREE
  }catch(err){
    $("lighting3dError").hidden=false;
    $("lighting3dError").textContent="3D Camera View could not load. The 2D diagram is still available.";
    console.error(err);return null
  }finally{$("lighting3dLoading").hidden=true}
}
function activeLightingCameraObject(){
  const objs=app.lighting.current?.data?.objects||[];
  return objs.find(o=>o.id===app.lighting.activeCameraId&&o.type==="camera")||objs.find(o=>o.type==="camera")||null
}
function planToWorld(o){
  return {x:(Number(o.x||600)-600)/100,z:(Number(o.y||400)-400)/100}
}

function makeMannequin(THREE,o){
  const scale=(Number(o.scale||100)/100),gender=(o.gender||"female").toLowerCase(),h=Number(o.height3d||1.75)*scale;
  const g=new THREE.Group();
  const skin=new THREE.MeshStandardMaterial({color:0xe2b28f,roughness:.86,metalness:.02});
  const feature=new THREE.MeshStandardMaterial({color:0x2d2522,roughness:.95});
  const dark=new THREE.MeshStandardMaterial({color:0x8a5d48,roughness:.92});
  const shoulderScale=gender==="male"?1.18:0.94;
  const hipScale=gender==="female"?1.18:0.92;
  const chestScale=gender==="male"?0.95:1.05;
  const torsoH=h*0.35,legH=h*0.46,headR=h*0.095;

  const pelvis=new THREE.Mesh(new THREE.SphereGeometry(h*0.12,22,18),skin);
  pelvis.scale.set(hipScale,0.88,0.95);pelvis.position.y=h*0.43;g.add(pelvis);

  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(h*0.085,torsoH,8,16),skin);
  torso.scale.set(chestScale*shoulderScale,1,0.86);torso.position.y=h*0.61;g.add(torso);

  if(gender==="female"){
    const breastGeo=new THREE.SphereGeometry(h*0.05,16,14);
    const b1=new THREE.Mesh(breastGeo,skin),b2=new THREE.Mesh(breastGeo,skin);
    b1.position.set(-h*0.05,h*0.67,h*0.07);b2.position.set(h*0.05,h*0.67,h*0.07);
    b1.scale.set(1,0.86,0.72);b2.scale.set(1,0.86,0.72);g.add(b1,b2)
  }

  const neck=new THREE.Mesh(new THREE.CylinderGeometry(h*0.03,h*0.035,h*0.06,12),skin);
  neck.position.y=h*0.82;g.add(neck);

  const head=new THREE.Mesh(new THREE.SphereGeometry(headR,28,20),skin);
  head.scale.set(0.96,1.06,0.94);head.position.y=h*0.91;g.add(head);

  const nose=new THREE.Mesh(new THREE.ConeGeometry(headR*0.16,headR*0.22,10),skin);
  nose.rotation.x=Math.PI/2;nose.position.set(0,h*0.90,headR*0.82);g.add(nose);

  const earGeo=new THREE.SphereGeometry(headR*0.18,10,10);
  const earL=new THREE.Mesh(earGeo,skin), earR=new THREE.Mesh(earGeo,skin);
  earL.position.set(-headR*0.96,h*0.91,0);earR.position.set(headR*0.96,h*0.91,0);
  earL.scale.set(0.6,1,0.3);earR.scale.set(0.6,1,0.3);g.add(earL,earR);

  const eyeGeo=new THREE.SphereGeometry(headR*0.07,8,8);
  const eyeL=new THREE.Mesh(eyeGeo,feature), eyeR=new THREE.Mesh(eyeGeo,feature);
  eyeL.position.set(-headR*0.28,h*0.93,headR*0.72);eyeR.position.set(headR*0.28,h*0.93,headR*0.72);g.add(eyeL,eyeR);

  const mouth=new THREE.Mesh(new THREE.TorusGeometry(headR*0.15,headR*0.02,6,14,Math.PI),dark);
  mouth.position.set(0,h*0.865,headR*0.68);mouth.rotation.z=Math.PI;g.add(mouth);

  const armGeo=new THREE.CapsuleGeometry(h*0.032,h*0.26,6,10);
  const forearmGeo=new THREE.CapsuleGeometry(h*0.028,h*0.22,6,10);
  for(const sx of [-1,1]){
    const upper=new THREE.Mesh(armGeo,skin);
    upper.position.set(sx*h*0.125,h*0.67,0);upper.rotation.z=sx*(Math.PI/14);
    const lower=new THREE.Mesh(forearmGeo,skin);
    lower.position.set(sx*h*0.145,h*0.49,0);lower.rotation.z=sx*(Math.PI/20);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(h*0.03,12,10),skin);
    hand.position.set(sx*h*0.15,h*0.35,0);hand.scale.set(0.8,1.2,0.45);
    g.add(upper,lower,hand)
  }

  const thighGeo=new THREE.CapsuleGeometry(h*0.045,h*0.28,7,10);
  const calfGeo=new THREE.CapsuleGeometry(h*0.037,h*0.26,7,10);
  for(const sx of [-1,1]){
    const thigh=new THREE.Mesh(thighGeo,skin);
    thigh.position.set(sx*h*0.052,h*0.25,0);thigh.rotation.z=sx*(Math.PI/42);
    const calf=new THREE.Mesh(calfGeo,skin);
    calf.position.set(sx*h*0.052,h*0.07,0);
    const foot=new THREE.Mesh(new THREE.BoxGeometry(h*0.06,h*0.025,h*0.13),skin);
    foot.position.set(sx*h*0.052,h*0.005,h*0.04);
    g.add(thigh,calf,foot)
  }

  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
  return g
}

function createThreeScene(THREE){
  const state=app.lighting.three,host=$("lighting3dViewport");
  if(!state.renderer){
    state.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    state.renderer.shadowMap.enabled=true;
    state.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.innerHTML="";host.appendChild(state.renderer.domElement);
    bindThreeControls(state.renderer.domElement)
  }
  state.scene=new THREE.Scene();
  state.scene.background=new THREE.Color(0x090b0d);
  state.scene.add(new THREE.HemisphereLight(0x8da1b0,0x111111,.42));
  const floor=new THREE.Mesh(
    new THREE.PlaneGeometry(12,8),
    new THREE.MeshStandardMaterial({color:0x20252a,roughness:.93,metalness:.02})
  );
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;state.scene.add(floor);
  const grid=new THREE.GridHelper(12,24,0x52606a,0x30383e);
  grid.position.y=.002;state.scene.add(grid);

  const objects=app.lighting.current?.data?.objects||[];
  let shadowLights=0;
  for(const o of objects){
    const p=planToWorld(o);
    if(o.type==="subject"){
      const g=makeMannequin(THREE,o);g.position.set(p.x,0,p.z);g.rotation.y=-Number(o.rotation||0)*Math.PI/180;state.scene.add(g)
    }else if(o.type==="light"){
      const fp=lightingFixtureProps(o.fixture),mp=lightingModifierProps(o.diffusion),rgb=kelvinToRgb(o.kelvin);
      const color=new THREE.Color(rgb.r/255,rgb.g/255,rgb.b/255),height=Number(o.height3d||2.2);
      const marker=new THREE.Mesh(
        fp.shape==="tube"?new THREE.CylinderGeometry(.035,.035,.65,12):new THREE.BoxGeometry(.22,.16,.18),
        new THREE.MeshStandardMaterial({color:0x202428,emissive:color,emissiveIntensity:.55})
      );
      marker.position.set(p.x,height,p.z);marker.rotation.y=-Number(o.rotation||0)*Math.PI/180;state.scene.add(marker);
      const strength=Math.max(.08,(Number(o.intensity||70)/100)*mp.transmission);
      if(fp.shape==="omni"){
        const l=new THREE.PointLight(color,45*strength,7,2);l.position.set(p.x,height,p.z);
        if(shadowLights<3){l.castShadow=true;l.shadow.mapSize.set(512,512);shadowLights++}state.scene.add(l)
      }else{
        const l=new THREE.SpotLight(color,80*strength,10,THREE.MathUtils.degToRad(Math.min(85,(Number(o.beam||fp.beam)+mp.spread)/2)),Math.min(.95,.15+mp.softness),1.6);
        l.position.set(p.x,height,p.z);
        const yaw=Number(o.rotation||0)*Math.PI/180,tilt=Number(o.tilt||-15)*Math.PI/180;
        const target=new THREE.Object3D();
        target.position.set(p.x+Math.cos(yaw)*4,p.z===undefined?0:height+Math.sin(tilt)*4,p.z+Math.sin(yaw)*4);
        l.target=target;state.scene.add(target);
        if(shadowLights<4){l.castShadow=true;l.shadow.mapSize.set(768,768);shadowLights++}state.scene.add(l)
      }
    }
  }

  const camObj=activeLightingCameraObject();
  if(!camObj){
    $("lighting3dError").hidden=false;$("lighting3dError").textContent="Add a camera to use Camera View.";
    return
  }
  $("lighting3dError").hidden=true;
  const rect=host.getBoundingClientRect(),aspect=Math.max(.2,rect.width/Math.max(1,rect.height));
  state.camera=new THREE.PerspectiveCamera(cameraVerticalFov(camObj.lens),aspect,.03,100);
  updateThreeCameraFromObject();
  resizeThreeRenderer()
}

function updateThreeCameraFromObject(){
  const state=app.lighting.three,camObj=activeLightingCameraObject();
  if(!state?.camera||!camObj)return;
  const THREE=state.THREE;
  const p=planToWorld(camObj);
  const cameraPos=new THREE.Vector3(p.x,Number(camObj.height3d||1.65),p.z);

  state.camera.position.copy(cameraPos);
  state.camera.fov=cameraVerticalFov(camObj.lens);

  const yaw=Number(camObj.rotation||0)*Math.PI/180;
  const pitch=Number(camObj.tilt||0)*Math.PI/180;
  const dir=state.threeDir||(state.threeDir=new THREE.Vector3());
  dir.set(
    Math.cos(yaw)*Math.cos(pitch),
    Math.sin(pitch),
    Math.sin(yaw)*Math.cos(pitch)
  ).normalize();

  state.camera.up.set(0,1,0);
  state.camera.lookAt(cameraPos.clone().add(dir));

  if(Number(camObj.roll||0)){
    state.camera.rotateZ(THREE.MathUtils.degToRad(Number(camObj.roll||0)))
  }

  state.camera.updateProjectionMatrix();
  $("lightingCameraHudTitle").textContent=camObj.label||"Camera View";
  $("lightingCameraHudMeta").textContent=
    `${camObj.lens||"50mm"} · ${camObj.angle||"Custom"} · ${shortValue(camObj.shotSize||"")} · ${Number(camObj.height3d||1.65).toFixed(2)} m`
}

function resizeThreeRenderer(){
  const state=app.lighting.three,host=$("lighting3dViewport");if(!state?.renderer||!state.camera||!host)return;
  const r=host.getBoundingClientRect(),w=Math.max(2,Math.floor(r.width)),h=Math.max(2,Math.floor(r.height));
  state.renderer.setSize(w,h,false);state.camera.aspect=w/h;state.camera.updateProjectionMatrix()
}
function rebuildLighting3D(){
  const state=app.lighting.three;if(!state?.THREE||app.lighting.viewMode!=="camera")return;
  createThreeScene(state.THREE)
}
function syncLighting3D(){
  if(app.lighting.viewMode==="camera"&&app.lighting.three?.THREE)rebuildLighting3D()
}
async function startLighting3D(){
  const THREE=await loadThree();if(!THREE)return;
  createThreeScene(THREE);
  const state=app.lighting.three;
  if(state.raf)cancelAnimationFrame(state.raf);
  state.last=performance.now();
  const frame=t=>{
    if(app.lighting.viewMode!=="camera"||!$("lightingDiagramModal").open)return;
    const dt=Math.min(.05,(t-state.last)/1000);state.last=t;
    updateLightingPlayback(dt);
    moveThreeCameraByKeys(dt);
    if(state.renderer&&state.scene&&state.camera)state.renderer.render(state.scene,state.camera);
    state.raf=requestAnimationFrame(frame)
  };
  state.raf=requestAnimationFrame(frame)
}
function stopLighting3D(clear=false){
  const state=app.lighting.three;if(!state)return;
  if(state.raf){cancelAnimationFrame(state.raf);state.raf=0}
  if(clear&&state.renderer){state.renderer.dispose();$("lighting3dViewport").innerHTML="";app.lighting.three=null}
}
function bindThreeControls(canvas){
  canvas.tabIndex=0;
  canvas.addEventListener("pointerdown",e=>{
    if(!lightingCanEdit())return;
    canvas.focus();app.lighting.three.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)
  });
  canvas.addEventListener("pointermove",e=>{
    const state=app.lighting.three,drag=state?.drag,camObj=activeLightingCameraObject();
    if(!drag||!camObj||!lightingCanEdit())return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    camObj.rotation=(Number(camObj.rotation||0)+dx*.22);
    camObj.tilt=Math.max(-89,Math.min(89,Number(camObj.tilt||0)-dy*.18));
    camObj.angle="Custom";
    camObj.roll=0;
    camObj.autoFrame=false;
    markLightingDirty();updateThreeCameraFromObject();renderLightingInspector();renderLightingCanvas()
  });
  canvas.addEventListener("pointerup",()=>{if(app.lighting.three)app.lighting.three.drag=null});
  canvas.addEventListener("pointercancel",()=>{if(app.lighting.three)app.lighting.three.drag=null});
  canvas.addEventListener("keydown",e=>{if(["w","a","s","d","q","e"].includes(e.key.toLowerCase())){e.preventDefault();app.lighting.three.keys.add(e.key.toLowerCase())}});
  canvas.addEventListener("keyup",e=>app.lighting.three?.keys?.delete(e.key.toLowerCase()));
  canvas.addEventListener("blur",()=>app.lighting.three?.keys?.clear())
}
function moveThreeCameraByKeys(dt){
  const state=app.lighting.three,camObj=activeLightingCameraObject();if(!state?.keys?.size||!camObj||!lightingCanEdit())return;
  const speed=2.4,rot=Number(camObj.rotation||0)*Math.PI/180;
  let fx=Math.cos(rot),fz=Math.sin(rot),rx=-Math.sin(rot),rz=Math.cos(rot),dx=0,dz=0,dy=0;
  if(state.keys.has("w")){dx+=fx;dz+=fz}if(state.keys.has("s")){dx-=fx;dz-=fz}
  if(state.keys.has("d")){dx+=rx;dz+=rz}if(state.keys.has("a")){dx-=rx;dz-=rz}
  if(state.keys.has("e"))dy+=1;if(state.keys.has("q"))dy-=1;
  const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
  camObj.autoFrame=false;
  camObj.x=Math.max(0,Math.min(1200,Number(camObj.x||600)+dx*speed*dt*100));
  camObj.y=Math.max(0,Math.min(800,Number(camObj.y||400)+dz*speed*dt*100));
  camObj.height3d=Math.max(.1,Math.min(6,Number(camObj.height3d||1.65)+dy*speed*dt));
  markLightingDirty();updateThreeCameraFromObject();
  renderLightingInspector();renderLightingCanvas();renderLightingObjectList()
}

/* ----- export / share ----- */
function lightingDownload(blob,name){
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)
}
function lightingExportSvgString(){
  const svg=$("lightingCanvas").cloneNode(true);svg.setAttribute("xmlns","http://www.w3.org/2000/svg");svg.setAttribute("width","1200");svg.setAttribute("height","800");
  return new XMLSerializer().serializeToString(svg)
}
function exportLightingSvg(){lightingDownload(new Blob([lightingExportSvgString()],{type:"image/svg+xml;charset=utf-8"}),`${slugName(app.lighting.current?.name)}.svg`)}
function exportLightingJson(){const d=deepClone(app.lighting.current);delete d.persisted;lightingDownload(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),`${slugName(d.name)}.json`)}
function exportLightingPng(){
  const blob=new Blob([lightingExportSvgString()],{type:"image/svg+xml;charset=utf-8"}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const c=document.createElement("canvas");c.width=2400;c.height=1600;const ctx=c.getContext("2d");ctx.fillStyle="#080a0c";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(p=>lightingDownload(p,`${slugName(app.lighting.current?.name)}.png`),"image/png")};
  img.onerror=()=>{URL.revokeObjectURL(url);uiAlert("Could not export PNG. Try SVG instead.")};img.src=url
}
async function copyLightingShareLink(){
  if(!app.lighting.current)return;
  if(!app.lighting.current.persisted&&lightingCanEdit())await saveLightingDiagram();
  if(!app.lighting.current.persisted&&app.mode==="cloud"){setMsg("lightingDiagramNotice","Save before sharing.","warning");return}
  const u=new URL(location.href);u.search="";u.searchParams.set("project",app.current.id);u.searchParams.set("diagram",app.lighting.current.id);
  try{await navigator.clipboard.writeText(u.toString());setMsg("lightingDiagramNotice","Share link copied.")}
  catch(e){uiPrompt("Copy this diagram link:",u.toString())}
}
function subscribeLightingRealtime(){
  unsubscribeLightingRealtime();if(!sb||app.mode!=="cloud"||!app.current)return;
  const pid=app.current.id;
  app.lighting.channel=sb.channel(`lighting-diagrams-${pid}`).on("postgres_changes",{event:"*",schema:"public",table:"lighting_diagrams",filter:`project_id=eq.${pid}`},async()=>{
    if(!$("lightingDiagramModal")?.open||app.lighting.dragging||app.lighting.dirty)return;
    const id=app.lighting.current?.id;await loadLightingDiagrams(id)
  }).subscribe()
}
function unsubscribeLightingRealtime(){if(sb&&app.lighting.channel){sb.removeChannel(app.lighting.channel);app.lighting.channel=null}}
async function openPendingLightingLink(){
  if(!app.pendingLightingProject)return false;
  const pid=app.pendingLightingProject,did=app.pendingLightingDiagram;
  if(!app.projects.some(p=>p.id===pid)){uiAlert("You do not have access to this lighting diagram project.");return false}
  await openCloudProject(pid,{preserveSelection:true});await openLightingWorkspace({diagramId:did});
  app.pendingLightingProject=null;app.pendingLightingDiagram=null;history.replaceState({},document.title,location.pathname);return true
}


/* ---------- PROJECT MANAGEMENT ---------- */
function cleanFolderName(value){return String(value||"").trim().replace(/\s+/g," ").slice(0,60)}
function folderOptionMarkup(selectedId=null){
  const folders=[...(app.projectFolders||[])].sort((a,b)=>a.name.localeCompare(b.name));
  return `<option value=""${selectedId?"":" selected"}>General</option>`+folders.map(folder=>`<option value="${escapeHtml(folder.id)}"${folder.id===selectedId?" selected":""}>${escapeHtml(folder.name)}</option>`).join("")
}
function renderProjectFolderList(){
  const wrap=$("projectFolderList");if(!wrap)return;wrap.innerHTML="";
  const folders=[...(app.projectFolders||[])].sort((a,b)=>a.name.localeCompare(b.name));
  if(!folders.length){wrap.innerHTML='<div class="admin-empty">No folders yet. Projects without a folder stay in General.</div>';return}
  for(const folder of folders){
    const count=(app.projects||[]).filter(project=>project.folderId===folder.id).length,row=document.createElement("div");row.className="folder-row";
    row.innerHTML=`<div><strong>${escapeHtml(folder.name)}</strong><small>${count} project${count===1?"":"s"}</small></div><span class="folder-row-actions"><button type="button" class="btn ghost rename-folder">Rename</button><button type="button" class="btn ghost danger-text delete-folder">Delete</button></span>`;
    row.querySelector(".rename-folder").onclick=()=>renameProjectFolder(folder.id);row.querySelector(".delete-folder").onclick=()=>deleteProjectFolder(folder.id);wrap.appendChild(row)
  }
}
function openProjectFolders(){
  setMsg("projectFolderNotice",app.mode==="cloud"&&!app.foldersReady?app.folderMigrationMessage:"");
  $("newProjectFolderName").disabled=app.mode==="cloud"&&!app.foldersReady;$("createProjectFolderForm").querySelector("button").disabled=app.mode==="cloud"&&!app.foldersReady;renderProjectFolderList();$("projectFoldersModal").showModal()
}
async function createProjectFolder(event){
  event.preventDefault();const name=cleanFolderName($("newProjectFolderName").value);if(!name)return setMsg("projectFolderNotice","Enter a folder name.","warning");
  if((app.projectFolders||[]).some(folder=>folder.name.toLocaleLowerCase()===name.toLocaleLowerCase()))return setMsg("projectFolderNotice","A folder with this name already exists.","warning");
  if(app.mode==="local")app.projectFolders.push({id:uid(),owner_id:null,name,created_at:new Date().toISOString()});
  else{const {data,error}=await sb.from("project_folders").insert({owner_id:app.session.user.id,name}).select().single();if(error)return setMsg("projectFolderNotice",error.message||"Could not create folder.","warning");app.projectFolders.push(data)}
  $("newProjectFolderName").value="";if(app.mode==="local")saveLocal();setMsg("projectFolderNotice",`Folder “${name}” created.`);renderProjectFolderList();renderProjects()
}
async function renameProjectFolder(id){
  const folder=app.projectFolders.find(item=>item.id===id);if(!folder)return;const next=cleanFolderName(uiPrompt("Folder name:",folder.name));if(!next||next===folder.name)return;
  if((app.projectFolders||[]).some(item=>item.id!==id&&item.name.toLocaleLowerCase()===next.toLocaleLowerCase()))return setMsg("projectFolderNotice","A folder with this name already exists.","warning");
  if(app.mode==="cloud"){const {error}=await sb.from("project_folders").update({name:next,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",app.session.user.id);if(error)return setMsg("projectFolderNotice",error.message||"Could not rename folder.","warning")}
  folder.name=next;(app.projects||[]).filter(project=>project.folderId===id).forEach(project=>project.folder=next);if(app.current?.folderId===id)app.current.folder=next;if(app.mode==="local")saveLocal();renderProjectFolderList();renderProjects();renderEditor()
}
async function deleteProjectFolder(id){
  const folder=app.projectFolders.find(item=>item.id===id);if(!folder||!uiConfirm(`Delete folder “${folder.name}”? Projects will move to General.`))return;
  if(app.mode==="cloud"){const {error}=await sb.from("project_folders").delete().eq("id",id).eq("owner_id",app.session.user.id);if(error)return setMsg("projectFolderNotice",error.message||"Could not delete folder.","warning")}
  app.projectFolders=app.projectFolders.filter(item=>item.id!==id);(app.projects||[]).filter(project=>project.folderId===id).forEach(project=>{project.folderId=null;project.folder="General"});if(app.current?.folderId===id){app.current.folderId=null;app.current.folder="General"}if(app.projectFolder===id)app.projectFolder="all";if(app.mode==="local")saveLocal();renderProjectFolderList();renderProjects();renderEditor()
}
function openMoveProjectFolder(projectId){
  const project=app.projects.find(item=>item.id===projectId);if(!project)return;if(app.mode==="cloud"&&!app.foldersReady)return uiAlert(app.folderMigrationMessage);
  app.moveProjectId=projectId;$("moveProjectFolderTitle").textContent=`Move “${project.name}”`;$("moveProjectFolderSelect").innerHTML=folderOptionMarkup(project.folderId||null);setMsg("moveProjectFolderNotice","");$("moveProjectFolderModal").showModal()
}
async function assignProjectFolder(project,folderId){
  const folder=app.projectFolders.find(item=>item.id===folderId)||null;
  if(app.mode==="cloud"){
    if(folderId){const {error}=await sb.from("project_folder_assignments").upsert({user_id:app.session.user.id,project_id:project.id,folder_id:folderId,updated_at:new Date().toISOString()},{onConflict:"user_id,project_id"});if(error)throw error}
    else{const {error}=await sb.from("project_folder_assignments").delete().eq("user_id",app.session.user.id).eq("project_id",project.id);if(error)throw error}
  }
  project.folderId=folder?.id||null;project.folder=folder?.name||"General";if(app.current?.id===project.id){app.current.folderId=project.folderId;app.current.folder=project.folder}if(app.mode==="local")saveLocal()
}
async function moveProjectToSelectedFolder(){
  const project=app.projects.find(item=>item.id===app.moveProjectId);if(!project)return;const folderId=$("moveProjectFolderSelect").value||null;
  $("saveMoveProjectFolderBtn").disabled=true;setMsg("moveProjectFolderNotice","Moving project…");
  try{
    await assignProjectFolder(project,folderId);$("moveProjectFolderModal").close();app.moveProjectId=null;renderProjects();renderEditor()
  }catch(error){setMsg("moveProjectFolderNotice",error.message||"Could not move project.","warning")}
  finally{$("saveMoveProjectFolderBtn").disabled=false}
}
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
  const p=app.projects.find(x=>x.id===id);if(!p||!projectCanEdit(p))return;const name=uiPrompt("New project name:",p.name);if(!name?.trim())return;
  const clean=name.trim();
  if(app.mode==="cloud"){const {error}=await sb.from("projects").update({name:clean,updated_at:new Date().toISOString()}).eq("id",id);if(error)return uiAlert(error.message)}
  p.name=clean;if(app.current?.id===id)app.current.name=clean;if(app.mode==="local")saveLocal();renderProjects()
}
async function deleteProject(id){
  const p=app.projects.find(x=>x.id===id);if(!p||!projectIsOwner(p)||!uiConfirm(`Delete "${p.name}"? This cannot be undone.`))return;
  if(app.mode==="cloud"){
    app.suppressRealtime++;
    try{
      const [{data:paths},{data:characters},{data:locations}]=await Promise.all([
        sb.from("shots").select("image_path").eq("project_id",id),
        sb.from("project_ai_characters").select("reference_path,source_path").eq("project_id",id),
        sb.from("project_ai_locations").select("reference_path,source_path").eq("project_id",id)
      ]);
      await removeMediaPaths([...(paths||[]).map(x=>x.image_path),...(characters||[]).flatMap(x=>[x.reference_path,x.source_path]),...(locations||[]).flatMap(x=>[x.reference_path,x.source_path])]);
      const rpc=await sb.rpc("delete_own_project",{p_project_id:id});
      if(rpc.error){
        const {data:deleted,error}=await sb.from("projects").delete().eq("id",id).eq("owner_id",app.session.user.id).select("id");
        if(error)throw error;if(!deleted?.length)throw new Error("Project was not deleted. Run the v3.5 Supabase migration and try again.")
      }
    }catch(err){uiAlert(`Could not delete project: ${err.message}`);app.suppressRealtime--;return}
    app.suppressRealtime--
  }
  app.projects=app.projects.filter(x=>x.id!==id);if(app.current?.id===id)app.current=null;
  if(app.mode==="local"){localStorage.setItem("storyboard-v3-projects",JSON.stringify(app.projects))}else await persistProjectPositions();
  renderProjects()
}
async function toggleFavorite(id){
  const p=app.projects.find(x=>x.id===id);if(!p||!projectCanEdit(p))return;const old=p.isFavorite;p.isFavorite=!old;
  if(app.mode==="cloud"){const {error}=await sb.from("projects").update({is_favorite:p.isFavorite,updated_at:new Date().toISOString()}).eq("id",id);if(error){p.isFavorite=old;return uiAlert(error.message)}}
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
    const characterResult=await sb.from("project_ai_characters").select("*").eq("project_id",id).order("created_at");if(characterResult.error&&!String(characterResult.error.message||"").includes("project_ai_characters"))throw characterResult.error;const characters=characterResult.data||[];
    const locationResult=await sb.from("project_ai_locations").select("*").eq("project_id",id).order("created_at");if(locationResult.error&&!String(locationResult.error.message||"").includes("project_ai_locations"))throw locationResult.error;const locations=locationResult.data||[];
    const position=Math.max(0,...app.projects.filter(x=>projectIsOwner(x)).map(x=>Number(x.position||0)))+1;
    const {data:newP,error:pe}=await sb.from("projects").insert({owner_id:app.session.user.id,name:`${p.name} Copy`,aspect:p.aspect,aspect_width:p.aspect_width,aspect_height:p.aspect_height,style:p.style,position,is_favorite:false,folder:p.folder||"General",tags:normalizeTags(p.tags),metadata:p.metadata||{}}).select().single();if(pe)throw pe;
    if(source.folderId&&app.foldersReady){const {error:folderError}=await sb.from("project_folder_assignments").upsert({user_id:app.session.user.id,project_id:newP.id,folder_id:source.folderId,updated_at:new Date().toISOString()},{onConflict:"user_id,project_id"});if(folderError)throw folderError}
    const characterMap=new Map(),locationMap=new Map();
    for(const sourceAsset of characters||[]){
      const {data:newAsset,error:assetError}=await sb.from("project_ai_characters").insert({project_id:newP.id,name:sourceAsset.name,description:sourceAsset.description||"",locked:false,created_by:app.session.user.id}).select().single();if(assetError)throw assetError;
      characterMap.set(sourceAsset.id,newAsset.id);const copied=await copyAiReferencePath(sourceAsset.reference_path,newP.id,"character",newAsset.id,"reference"),copiedSource=await copyAiReferencePath(sourceAsset.source_path,newP.id,"character",newAsset.id,"source");
      if(copied||copiedSource){const {error:updateError}=await sb.from("project_ai_characters").update({reference_path:copied||null,source_path:copiedSource||null,style_snapshot:copied?(sourceAsset.style_snapshot||p.style):null,locked:!!(copied&&sourceAsset.locked)}).eq("id",newAsset.id);if(updateError)throw updateError}
    }
    for(const sourceAsset of locations||[]){
      const {data:newAsset,error:assetError}=await sb.from("project_ai_locations").insert({project_id:newP.id,name:sourceAsset.name,description:sourceAsset.description||"",locked:false,created_by:app.session.user.id}).select().single();if(assetError)throw assetError;
      locationMap.set(sourceAsset.id,newAsset.id);const copied=await copyAiReferencePath(sourceAsset.reference_path,newP.id,"location",newAsset.id,"reference"),copiedSource=await copyAiReferencePath(sourceAsset.source_path,newP.id,"location",newAsset.id,"source");
      if(copied||copiedSource){const {error:updateError}=await sb.from("project_ai_locations").update({reference_path:copied||null,source_path:copiedSource||null,style_snapshot:copied?(sourceAsset.style_snapshot||p.style):null,locked:!!(copied&&sourceAsset.locked)}).eq("id",newAsset.id);if(updateError)throw updateError}
    }
    for(const [si,sc] of (scenes||[]).entries()){
      const {data:newSc,error:sce}=await sb.from("scenes").insert({project_id:newP.id,scene_number:si+1,title:sc.title,description:sc.description||"",story_location:sc.story_location||"",story_time:sc.story_time||"Unspecified",shoot_time:sc.shoot_time||"Unspecified",time_strategy:sc.time_strategy||"natural",ai_location_id:locationMap.get(sc.ai_location_id)||null,ai_character_ids:(sc.ai_character_ids||[]).map(id=>characterMap.get(id)).filter(Boolean),position:si+1,collapsed:false}).select().single();if(sce)throw sce;
      const rows=(shots||[]).filter(r=>r.scene_id===sc.id).sort((a,b)=>a.position-b.position);
      for(const [ri,row] of rows.entries()){
        const shotData=deepClone(row.data||{});shotData.aiCharacterIds=(shotData.aiCharacterIds||[]).map(x=>characterMap.get(x)).filter(Boolean);shotData.aiLocationId=locationMap.get(shotData.aiLocationId)||"";
        const {data:newRow,error:e}=await sb.from("shots").insert({project_id:newP.id,scene_id:newSc.id,shot_number:ri+1,position:ri+1,image_path:null,data:shotData}).select().single();if(e)throw e;
        const copied=await copyMediaPath(row.image_path,newP.id,newRow.id);if(copied){const {error:u}=await sb.from("shots").update({image_path:copied}).eq("id",newRow.id);if(u)throw u}
      }
    }
    await loadCloudProjects();await openCloudProject(newP.id)
  }catch(err){uiAlert(`Could not duplicate project: ${err.message}`)}finally{app.suppressRealtime--}
}
function openProjectDetails(id){
  const p=(app.current?.id===id?app.current:app.projects.find(x=>x.id===id));if(!p)return;app.detailsProjectId=id;const m=projectMeta(p);
  $("detailProjectName").value=p.name||"";$("detailProjectFolder").innerHTML=folderOptionMarkup(p.folderId||null);$("detailProjectTags").value=(p.tags||[]).join(", ");
  $("detailDirector").value=m.director||"";$("detailCinematographer").value=m.cinematographer||"";$("detailWriter").value=m.writer||"";$("detailProduction").value=m.production||"";$("detailStatus").value=m.status||"Planning";$("detailNotes").value=m.notes||"";$("detailFavorite").checked=!!p.isFavorite;
  const editable=projectCanEdit(p)||(app.current?.id===id&&can("project_settings"));
  ["detailProjectName","detailProjectFolder","detailProjectTags","detailDirector","detailCinematographer","detailWriter","detailProduction","detailStatus","detailNotes","detailFavorite"].forEach(x=>$(x).disabled=!editable);
  $("saveProjectDetailsBtn").hidden=!editable;$("projectDetailsModal").showModal()
}
async function saveProjectDetails(){
  const id=app.detailsProjectId,p=(app.current?.id===id?app.current:app.projects.find(x=>x.id===id));if(!p)return;
  const folderId=$("detailProjectFolder").value||null;p.name=$("detailProjectName").value.trim()||p.name;p.tags=normalizeTags($("detailProjectTags").value);p.isFavorite=$("detailFavorite").checked;
  p.metadata={director:$("detailDirector").value.trim(),cinematographer:$("detailCinematographer").value.trim(),writer:$("detailWriter").value.trim(),production:$("detailProduction").value.trim(),status:$("detailStatus").value,notes:$("detailNotes").value.trim()};
  if(app.mode==="cloud"){
    const {error}=await sb.from("projects").update({name:p.name,tags:p.tags,is_favorite:p.isFavorite,metadata:p.metadata,updated_at:new Date().toISOString()}).eq("id",id);if(error)return uiAlert(error.message)
  }else saveLocal();
  try{await assignProjectFolder(p,folderId)}catch(error){return uiAlert(error.message||"Could not move project.")}
  if(app.current?.id===id){app.current={...app.current,...p};$("projectName").value=p.name;if($("projectFolderBadge"))$("projectFolderBadge").textContent=p.folder}
  p.updated_at=new Date().toISOString();const listP=app.projects.find(x=>x.id===id);if(listP)Object.assign(listP,p);$("projectDetailsModal").close();renderProjects()
}

/* ---------- EVENTS ---------- */
function bind(){
  $("cancelAiGenerationBtn").onclick=cancelAiGeneration;
  $("aiGenerationLock").addEventListener("cancel",event=>{event.preventDefault();cancelAiGeneration()});
  $("mobileMoreBtn").onclick=toggleEditorActions;
  $("mobileScenesBtn").onclick=()=>setMobileEditorScreen("scenes");
  $("mobileShotBtn").onclick=()=>setMobileEditorScreen("shot");
  $("loginTabBtn").onclick=()=>toggleAuthTab("login");$("signupTabBtn").onclick=()=>toggleAuthTab("signup");$("loginEmailMode").onclick=()=>setLoginKind("email");$("loginUsernameMode").onclick=()=>setLoginKind("username");
  $("loginForm").onsubmit=doLogin;$("signupForm").onsubmit=doSignup;$("passwordRecoveryForm").onsubmit=updateRecoveredPassword;$("cancelPasswordRecoveryBtn").onclick=cancelPasswordRecovery;$("forgotPasswordBtn").onclick=forgotPassword;$("continueOfflineBtn").onclick=continueOffline;
  ["signupPassword","recoveryPassword","recoveryPasswordConfirm"].forEach(id=>{const field=$(id);field.addEventListener("input",()=>updatePasswordFieldValidity(field));field.addEventListener("invalid",()=>updatePasswordFieldValidity(field,true))});
  $("logoutBtn").onclick=logout;$("newCloudProjectBtn").onclick=createCloudProject;$("emptyNewProjectBtn").onclick=createCloudProject;
  $("manageProjectFoldersBtn").onclick=openProjectFolders;$("closeProjectFoldersBtn").onclick=()=>$("projectFoldersModal").close();$("createProjectFolderForm").onsubmit=createProjectFolder;$("closeMoveProjectFolderBtn").onclick=()=>$("moveProjectFolderModal").close();$("cancelMoveProjectFolderBtn").onclick=()=>$("moveProjectFolderModal").close();$("saveMoveProjectFolderBtn").onclick=moveProjectToSelectedFolder;
  $("accountBtn").onclick=openAccount;$("closeAccountBtn").onclick=()=>$("accountModal").close();$("accountProfileForm").onsubmit=saveAccountProfile;$("accountLanguageSelect").onchange=e=>window.storyboardI18n?.setLanguage(e.target.value);$("accountLayoutSelect").onchange=e=>applyLayoutPreference(e.target.value);
  $("adminCenterBtn").onclick=openAdminCenter;$("backFromAdminBtn").onclick=async()=>{rememberProjectsView();await loadCloudProjects();showProjects()};
  $("adminAccountBtn").onclick=openAccount;$("adminLogoutBtn").onclick=logout;
  $("adminUserSearchForm").onsubmit=searchAdminUsers;$("adminShowAllUsersBtn").onclick=showAllAdminUsers;$("adminLoadMoreUsersBtn").onclick=()=>loadAdminUsers(false);$("clearAdminUserBtn").onclick=clearAdminUser;$("adminAddForm").onsubmit=addAdmin;$("exitAdminSupportBtn").onclick=()=>closeAdminSupport(true);
  $("backProjectsBtn").onclick=returnToProjects;$("editorProjectsBtn").onclick=returnToProjects;$("editorAccountBtn").onclick=()=>{closeEditorActions();openAccount()};$("editorLogoutBtn").onclick=()=>{closeEditorActions();logout()};$("headerBibleBtn").onclick=()=>{closeEditorActions();openAiVisualBible()};$("headerProjectSettingsBtn").onclick=()=>{closeEditorActions();openProjectDetails(app.current.id)};
  $("projectSearch").oninput=e=>{app.projectSearch=e.target.value;renderProjects()};
  $("projectFilter").onchange=e=>{app.projectFilter=e.target.value;renderProjects()};
  $("projectFolderFilter").onchange=e=>{app.projectFolder=e.target.value;renderProjects()};
  $("closeProjectDetailsBtn").onclick=()=>$("projectDetailsModal").close();$("saveProjectDetailsBtn").onclick=saveProjectDetails;$("projectDetailsBtn").onclick=()=>openProjectDetails(app.current.id);
  $("aiBibleBtn").onclick=openAiVisualBible;$("manageAiCharactersBtn").onclick=openAiVisualBible;$("closeAiBibleBtn").onclick=()=>$("aiBibleModal").close();$("doneAiBibleBtn").onclick=()=>$("aiBibleModal").close();
  $("addAiCharacterBtn").onclick=()=>addAiAsset("character");$("addAiLocationBtn").onclick=()=>addAiAsset("location");$("aiLocationId").onchange=onAiShotLinksChange;$("generateShotImageBtn").onclick=generateShotImage;
  $("scriptFileInput").onchange=loadScriptFile;$("saveScriptBtn").onclick=()=>saveProjectScript();$("analyzeScriptBtn").onclick=analyzeProjectScript;$("applyScriptBreakdownBtn").onclick=applyScriptBreakdown;$("linkScriptSelectionBtn").onclick=linkScriptSelectionToShot;$("createShotFromScriptBtn").onclick=createShotFromScriptSelection;
  ["click","keyup","mouseup","focus"].forEach(eventName=>$("scriptTextEditor").addEventListener(eventName,()=>{updateScriptSelection();updateScriptBoldState()}));$("scriptTextEditor").addEventListener("input",()=>{updateScriptSelection();updateScriptBoldState();$("applyScriptBreakdownBtn").disabled=true;clearTimeout(scriptRenderTimer);scriptRenderTimer=setTimeout(renderScriptLineMap,220)});$("scriptTextEditor").addEventListener("beforeinput",event=>{if(event.inputType==="insertParagraph"){event.preventDefault();document.execCommand("insertLineBreak",false)}});$("scriptTextEditor").addEventListener("paste",event=>{event.preventDefault();document.execCommand("insertText",false,event.clipboardData?.getData("text/plain")||"")});$("scriptDirectionSelect").onchange=event=>setScriptDirection(event.target.value);$("scriptBoldBtn").addEventListener("pointerdown",event=>event.preventDefault());$("scriptBoldBtn").onclick=toggleScriptBold;document.addEventListener("selectionchange",()=>{if(scriptSelectionRange()){updateScriptSelection();updateScriptBoldState()}});$("scriptLinkSceneSelect").onchange=()=>{renderScriptLinkSelectors();updateScriptSelection()};$("scriptLinkShotSelect").onchange=updateScriptSelection;
  ["projectName","projectAspect","projectStyle","aspectWidth","aspectHeight"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onProjectChange))});
  ["sceneTitle","sceneDescription","sceneStoryLocation","sceneStoryTime","sceneShootTime","sceneTimeStrategy","sceneAiLocationId"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onSceneChange))});$("syncSceneBibleBtn").onclick=syncSceneBibleToShots;
  SHOT_FIELDS.filter(id=>id!=="shotNo").forEach(id=>{if($(id))["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>onShotChange(id)))});
  $("addSceneBtn").onclick=addScene;$("deleteSceneBtn").onclick=()=>deleteScene();$("collapseAllScenesBtn").onclick=()=>deleteScene();$("expandAllScenesBtn").onclick=toggleAllScenes;
  $("addShotBtn").onclick=async()=>{await addShot();if(isMobileEditor())setMobileEditorScreen("shot")};$("duplicateShotBtn").onclick=duplicateShot;$("copyShotBtn").onclick=copyShot;$("pasteShotBtn").onclick=pasteShot;$("deleteShotBtn").onclick=deleteShot;
  $("prevShotBtn").onclick=()=>adjacentShot(-1);$("nextShotBtn").onclick=()=>adjacentShot(1);
  $("frameImageInput").onchange=loadImage;$("removeImageBtn").onclick=removeImage;
  $("frameImage").onclick=openCurrentShotImage;$("frameImage").onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openCurrentShotImage()}};
  $("closeImageViewerBtn").onclick=closeImageViewer;$("doneImageViewerBtn").onclick=closeImageViewer;$("imageViewerModal").addEventListener("cancel",event=>{event.preventDefault();if(cropState.active)closeCropEditor();else closeImageViewer()});
  $("imageViewerImage").onload=updateImageViewerAspect;
  $("openCropFromViewerBtn").onclick=()=>{const target=imageViewerTarget;if(target)openCropEditor(target)};
  $("cancelCropBtn").onclick=closeCropEditor;$("resetCropBtn").onclick=resetCrop;$("saveCropBtn").onclick=saveCrop;$("cropZoom").oninput=updateCropZoom;
  $("cropCanvas").addEventListener("pointerdown",cropPointerDown);$("cropCanvas").addEventListener("pointermove",cropPointerMove);$("cropCanvas").addEventListener("pointerup",cropPointerEnd);$("cropCanvas").addEventListener("pointercancel",cropPointerEnd);
  $("cropCanvas").addEventListener("wheel",event=>{if(!cropState.drawable||cropState.saving)return;event.preventDefault();const zoom=$("cropZoom"),next=Math.max(Number(zoom.min),Math.min(Number(zoom.max),Number(zoom.value)+(event.deltaY<0?5:-5)));zoom.value=String(next);updateCropZoom()},{passive:false});
  $("imageViewerModal").addEventListener("close",()=>{clearCropDrawable();cropState.active=false;cropState.target=null;cropState.saving=false;$("cropCanvas").hidden=true;$("cropLoading").hidden=true;setMsg("cropNotice","")});

  // Lighting Studio v3.8
  $("openLightingDiagramBtn").onclick=()=>openLightingWorkspace();
  $("closeLightingDiagramBtn").onclick=closeLightingWorkspace;
  $("lightingDiagramModal").addEventListener("cancel",e=>{e.preventDefault();closeLightingWorkspace()});
  $("lightingDiagramModal").addEventListener("close",()=>{stopLighting3D();unsubscribeLightingRealtime()});

  $("lightingPlanModeBtn").onclick=()=>setLightingViewMode("plan");
  $("lightingCameraModeBtn").onclick=()=>setLightingViewMode("camera");
  $("lightingGodViewBtn").onclick=showLightingGodToast;
  $("lightingDrawerHeader").onclick=()=>toggleLightingDrawer();

  $("newLightingDiagramBtn").onclick=createNewLightingDiagram;
  $("saveLightingDiagramBtn").onclick=saveLightingDiagram;
  $("deleteLightingDiagramBtn").onclick=deleteLightingDiagram;
  $("lightingDiagramSelect").onchange=e=>{
    if(app.lighting.dirty&&!uiConfirm("Switch diagrams without saving the latest changes?")){renderLightingDiagramList();return}
    const d=app.lighting.diagrams.find(x=>x.id===e.target.value);if(d)setLightingCurrent(d)
  };
  $("lightingDiagramName").oninput=e=>{if(!app.lighting.current)return;app.lighting.current.name=e.target.value;markLightingDirty()};
  $("lightingDiagramNotes").oninput=e=>{if(!app.lighting.current)return;app.lighting.current.data.notes=e.target.value;markLightingDirty()};
  $("lightingLinkedShot").onchange=updateLightingLinkedShot;

  $("addLightingCameraBtn").onclick=()=>addLightingObject(defaultLightingCamera());
  $("addLightingSubjectBtn").onclick=()=>addLightingObject(defaultLightingSubject());
  $("addLightingFixtureBtn").onclick=addLightingFixture;
  $("addShotLightingBtn").onclick=addLightFromCurrentShot;
  $("applyShotCameraBtn").onclick=applyCurrentShotToCamera;
  $("useSelectedCameraViewBtn").onclick=useSelectedCameraView;

  [
    "lightingObjectLabel","lightingObjectKelvin","lightingObjectIntensity","lightingObjectBeam",
    "lightingObjectHeight3d","lightingObjectTilt","lightingObjectLens","lightingObjectShotSize",
    "lightingObjectAngle","lightingObjectHeight","lightingObjectMovement","lightingObjectFocus",
    "lightingCameraHeight3d","lightingCameraTilt","lightingSubjectHeight3d","lightingSubjectScale",
    "lightingSubjectGender","lightingObjectRotation"
  ].forEach(id=>["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>selectedLightingChange(id))));

  $("deleteLightingObjectBtn").onclick=deleteSelectedLightingObject;
  $("lightingCanvas").addEventListener("pointermove",moveLightingDrag);
  $("lightingCanvas").addEventListener("pointerup",endLightingDrag);
  $("lightingCanvas").addEventListener("pointercancel",endLightingDrag);
  $("lightingCanvas").addEventListener("pointerdown",e=>{
    if(e.target.classList?.contains("lighting-bg")){
      app.lighting.selectedId=null;renderLightingObjectList();renderLightingInspector();renderLightingCanvas()
    }
  });

  $("lightingPlaybackPlayBtn").onclick=playLightingPlayback;
  $("lightingPlaybackPauseBtn").onclick=pauseLightingPlayback;
  $("lightingPlaybackStopBtn").onclick=()=>stopLightingPlayback(true);
  $("exportLightingPngBtn").onclick=exportLightingPng;
  $("exportLightingSvgBtn").onclick=exportLightingSvg;
  $("exportLightingJsonBtn").onclick=exportLightingJson;
  $("shareLightingDiagramBtn").onclick=copyLightingShareLink;

  $("sheetToggleBtn").onclick=()=>{if(isMobileEditor())setMobileEditorScreen("sheet");else{toggleSheet();closeEditorActions()}};$("mobileSheetBtn").onclick=()=>setMobileEditorScreen("sheet");$("closeSheetBtn").onclick=()=>isMobileEditor()?setMobileEditorScreen("shot"):toggleSheet(false);$("shotsPerPage").onchange=renderSheet;$("printSheetBtn").onclick=()=>window.print();
  $("exportBtn").onclick=exportJSON;$("importInput").onchange=e=>{const f=e.target.files[0];if(f)importJSONOnline(f).catch(err=>uiAlert(err.message||"Import failed."));e.target.value="";};
  document.querySelectorAll("[data-focus]").forEach(button=>button.onclick=()=>openPrimarySetting(button.dataset.focus));
  $("collaborateBtn").onclick=()=>{closeEditorActions();openCollab()};$("addMemberBtn").onclick=addMemberByUsername;$("createShareLinkBtn").onclick=createShareLink;$("copyShareLinkBtn").onclick=async()=>{await navigator.clipboard.writeText($("shareLinkOutput").value);setMsg("collabMessage","Invite link copied.")};
  $("permissionPreset").onchange=e=>{if(e.target.value!=="custom")setPermissionPreset(e.target.value)};
  $("collabMembersTab").onclick=()=>setCollabTab("members");$("collabChatTab").onclick=()=>setCollabTab("chat");$("sendChatMessageBtn").onclick=sendChatMessage;
  $("chatMentionSelect").onchange=e=>{if(e.target.value)insertChatMention(e.target.value);e.target.value=""};
  $("chatMessageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendChatMessage()}});
  $("closeCollabBtn").onclick=()=>{$("collabModal").close();unsubscribeChatRealtime()};$("collabModal").addEventListener("close",unsubscribeChatRealtime);
  document.querySelectorAll(".accordion details").forEach(d=>d.addEventListener("toggle",()=>rememberWorkspace()));
  window.addEventListener("scroll",queueWorkspaceScrollSave,{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)rememberWorkspace();
    else if(app.mode==="cloud"&&app.current){
      loadAiUsage();
      if(chatActivelyVisible())renderChatMessages();
      else refreshChatNotificationBadge()
    }
  });
  window.addEventListener("storage",e=>{
    if(app.current&&e.key===chatReadKey(app.current.id))refreshChatNotificationBadge()
  });
  window.addEventListener("resize",()=>{if(!isMobileEditor())closeEditorActions();syncMobileEditorUi()});
  window.addEventListener("storyboard:languagechange",()=>{
    if(app.current)renderEditor();
    if($("aiBibleModal")?.open)renderAiVisualBible();
    if(!$("projectsView").hidden)renderProjects();
    if(!$("adminView").hidden&&app.admin.isAdmin){renderAdminUserResults(app.admin.users);loadAdminTeam();loadAdminActivity()}
    if(app.profile)renderAccountProfile();if($("accountModal")?.open)renderCreatorScore();renderAiUsage();window.storyboardI18n?.translateTree(document.body)
  });
  document.addEventListener("click",e=>{
    if(!$("editorView")?.classList.contains("editor-actions-open"))return;
    if(e.target.closest(".editor-actions,.mobile-more-btn"))return;
    closeEditorActions()
  });
  window.addEventListener("pagehide",()=>rememberWorkspace())
}

start();
