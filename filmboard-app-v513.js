// FilmBoard v5.13.0 — Structured Screenplay Format
const FILMBOARD_BUILD = "v5.13.0-structured-screenplay";
document.documentElement.dataset.filmboardBuild=FILMBOARD_BUILD;
const OPTIONS = {
  shotSize:["ECU · Extreme Close Up","CU · Close Up","MCU · Medium Close Up","MS · Medium Shot","MLS · Medium Long Shot","WS · Wide Shot","EWS · Extreme Wide Shot","OTS · Over The Shoulder","POV · Point of View","Insert","Top Shot"],
  angle:["Eye Level","High Angle","Low Angle","Top / Bird's Eye","Dutch Angle","Ground Level","Overhead","Custom"],
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
const SHOT_FIELDS = ["shotNo","duration","shotSize","angle","lens","focus","movement","startEnd","composition","summary","subject","description","performance","subjectMovement","costume","timeOfDay","location","lightSource","lightDirection","lightQuality","lighting","props","dialogue","voiceOver","sfx","music","transitionIn","transitionOut","notes"];
const SCENE_TIME_OPTIONS = ["Unspecified","Dawn","Morning","Day","Sunset","Twilight","Night"];
const SCENE_TIME_STRATEGIES = [
  ["natural","Natural / Same as Story"],
  ["day_for_night","Day for Night"],
  ["night_for_day","Night for Day"]
];
const SCRIPT_MAX_ANALYSIS_CHARS = 180000;
const SCRIPT_LEGACY_FONT_LEVEL_PX = Object.freeze({1:10,2:12,3:14,4:16,5:18,6:24,7:32});
const SCRIPT_FONT_MIN_PX = 8;
const SCRIPT_FONT_MAX_PX = 72;
const SCRIPT_FONT_DEFAULT_PX = 14;
const PRODUCTION_ROLE_LABELS = Object.freeze({
  general:"General Production",
  assistant_director:"Assistant Director",
  production_manager:"Production Manager",
  producer:"Producer",
  director:"Director",
  art_props:"Art & Props",
  costume_makeup:"Costume & Makeup",
  locations:"Locations",
  sfx_vfx:"SFX / VFX",
  camera:"Camera Department",
  sound:"Sound Department"
});
const PRODUCTION_ELEMENT_FIELDS = Object.freeze([
  ["extras","Extras / Background"],
  ["props","Props"],
  ["set_dressing","Set Dressing"],
  ["wardrobe","Wardrobe"],
  ["makeup_hair","Makeup / Hair"],
  ["vehicles","Vehicles"],
  ["animals","Animals"],
  ["stunts","Stunts"],
  ["special_effects","Special Effects"],
  ["visual_effects","Visual Effects"],
  ["sound_music","Sound / Music"],
  ["special_equipment","Special Equipment"],
  ["location_requirements","Location Requirements"],
  ["safety_security","Safety / Security"],
  ["production_notes","Production Notes"],
  ["risk_flags","Production Flags"]
]);
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
  productionDashboardProjectId: null,
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
    spatialReady: false,
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
    selectionCache: null,
    savedRange: null,
    fontSizePx: SCRIPT_FONT_DEFAULT_PX,
    fontSizeApplying: false,
    migrationMessage: "Run the saved v4.5 Bible Script SQL query, then reload this project."
  },
  lighting: {
    diagrams: [],
    current: null,
    selectedId: null,
    inspectorOpen: true,
    dragging: null,
    pointers: {},
    playback: {playing:false,elapsed:0,duration:4,baseCamera:null,baseSubjects:null,movement:"Static",selectedKeyframeId:null,selectedCharacterKeyframeId:null,activeCharacterId:null,selectedTrack:"camera",exporting:false,exportResolve:null},
    godToastTimer: null,
    channel: null,
    dirty: false,
    drawerCollapsed: false,
    viewMode: "plan",
    activeCameraId: null,
    three: null,
    virtualLocations: [],
    virtualLocationsReady: true,
    virtualLocationMigrationMessage: "Run supabase-v5.0-virtual-locations.sql, then reload this project.",
    locationModelCache: new Map(),
    faceModelCache: new Map(),
    upload: null,
    faceUpload: null,
    pipDrag: null,
    panDrag: null,
    mobileSplit: 55,
    planPane: "top",
    planView: {zoom:1,centerX:600,centerY:400},
    elevationView: {zoom:1,centerX:600,centerY:250},
    sheetLinks: [],
    sheetLinksProjectId: null,
    animatic: {rendering:false,cancel:false,resultUrl:null,resultBlob:null,outputCanvas:null,previousCanvas:null,audioFile:null,startedAt:0},
    video: {provider:"runway",jobId:null,status:"idle",controlUrl:null,resultUrl:null,resultPath:null,pollTimer:null,controller:null},
    explorer: {
      active: false,
      pose: null,
      startPose: null,
      motionEnabled: false,
      motionBase: null,
      motionStart: null,
      motionQuaternion: null,
      motionListener: null
    }
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
const THEME_STORAGE_KEY = "filmboard-theme-preference";
let systemThemeMedia=null;
let imageViewerTarget=null;
let cropState={active:false,target:null,drawable:null,cleanup:null,width:0,height:0,zoom:1,offsetX:0,offsetY:0,dragging:false,pointerId:null,startX:0,startY:0,startOffsetX:0,startOffsetY:0,saving:false};

function uid(){return (crypto.randomUUID ? crypto.randomUUID() : "id-"+Date.now()+"-"+Math.random().toString(16).slice(2))}
function fullPermissions(){return {project_settings:true,scenes:true,shots:true,media:true,members:true}}
function blankPermissions(){return {project_settings:false,scenes:false,shots:false,media:false,members:false}}
function editorPermissions(){return {project_settings:false,scenes:true,shots:true,media:true,members:false}}
function normalizeProductionRole(value){return Object.hasOwn(PRODUCTION_ROLE_LABELS,value)?value:"general"}
function inviteProductionRole(){return normalizeProductionRole($("inviteProductionRole")?.value||"general")}
function permissionPreset(name){const base=name==="viewer"?blankPermissions():name==="editor"?editorPermissions():readPermissionUI();return {...base,production_role:inviteProductionRole()}}
function blankShot(no=1){return {id:uid(),shotNo:no,duration:"",shotSize:"CU · Close Up",angle:"Eye Level",lens:"50mm",focus:"Shallow Focus",movement:"Static",startEnd:"",composition:"Centered / Symmetrical",summary:"",subject:"",description:"",performance:"",subjectMovement:"",costume:"",timeOfDay:"Unspecified",location:"",lightSource:"Unspecified",lightDirection:"Unspecified",lightQuality:"Unspecified",lighting:"",props:"",dialogue:"",voiceOver:"",sfx:"",music:"",transitionIn:"Cut",transitionOut:"Cut",notes:"",aiCharacterIds:[],aiLocationId:"",aiGeneration:null,image:null,imagePath:null,originalImage:null,originalImagePath:null,position:no}}
function blankScene(no=1){return {id:uid(),number:no,title:`Scene ${no}`,description:"",storyLocation:"",storyTime:"Unspecified",shootTime:"Unspecified",timeStrategy:"natural",aiLocationId:"",aiCharacterIds:[],scriptSceneKey:null,position:no,collapsed:false,shots:[blankShot(1)]}}
function blankShotForScene(no,scene){const shot=blankShot(no);if(!scene)return shot;shot.aiLocationId=scene.aiLocationId||"";shot.aiCharacterIds=[...(scene.aiCharacterIds||[])];return shot}
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
function shotDbData(s){const data={...s};delete data.id;delete data.image;delete data.imagePath;delete data.originalImage;delete data.originalImagePath;delete data.cameraHeight;return data}
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
function normalizeThemePreference(value){return ["system","light","dark"].includes(value)?value:"system"}
function resolvedTheme(value=normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY))){
  if(value!=="system")return value;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches?"dark":"light"
}
function applyThemePreference(value,{persist=true}={}){
  const preference=normalizeThemePreference(value),theme=resolvedTheme(preference);
  if(persist)localStorage.setItem(THEME_STORAGE_KEY,preference);
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.dataset.theme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==="light"?"#ffffff":"#050607";
  if($("accountThemeSelect"))$("accountThemeSelect").value=preference;
  return preference
}
function currentThemePreference(){return normalizeThemePreference(document.documentElement.dataset.themePreference||localStorage.getItem(THEME_STORAGE_KEY)||"system")}
function watchSystemTheme(){
  if(systemThemeMedia)return;systemThemeMedia=window.matchMedia?.("(prefers-color-scheme: dark)")||null;if(!systemThemeMedia)return;
  const refresh=()=>{if(currentThemePreference()==="system")applyThemePreference("system",{persist:false})};
  if(systemThemeMedia.addEventListener)systemThemeMedia.addEventListener("change",refresh);else systemThemeMedia.addListener?.(refresh)
}
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
    if(!/styles(?:-v\d+)?\.css(?:$|[?#])/i.test(String(sheet.href||"")))continue;
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
function resetScriptState(){app.script={ready:false,loading:false,saving:false,analyzing:false,applying:false,record:null,links:[],analysis:null,editorHydrated:false,pendingFileName:"",pendingFileType:"",selectedStart:0,selectedEnd:0,selectionCache:null,savedRange:null,fontSizePx:SCRIPT_FONT_DEFAULT_PX,fontSizeApplying:false,migrationMessage:"Run the saved v4.5 Bible Script SQL and v4.6 Project Folders & Rich Script SQL queries, then reload this project."}}
function resetAiState(){app.ai.requestController?.abort();app.ai.ready=false;app.ai.sourceReady=false;app.ai.loading=false;app.ai.generating=false;app.ai.generatingAssetId=null;app.ai.generationMode=null;app.ai.requestController=null;app.ai.cancelRequested=false;app.ai.previousFocus=null;app.ai.characters=[];app.ai.locations=[];app.ai.usage={loaded:false,loading:false,error:"",used:0,remaining:20,dailyLimit:20,personalRemaining:20,globalRemaining:70,unlimited:false,usageDate:""};resetScriptState();syncAiGenerationLock();renderAiUsage()}
function selectFirst(){
  const sc=app.current?.scenes?.[0]; app.activeSceneId=sc?.id||null; app.activeShotId=sc?.shots?.[0]?.id||null
}

/* ---------- AUTH / APP START ---------- */
async function start(){
  applyThemePreference(localStorage.getItem(THEME_STORAGE_KEY)||"system",{persist:false});watchSystemTheme();applyLayoutPreference(localStorage.getItem(LAYOUT_STORAGE_KEY)||"auto",{persist:false});initOptions(); bind();
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
  $("recoveryAccountLabel").textContent=app.session?.user?.email?`Set a new password for ${app.session.user.email}.`:"Enter a new password for this FilmBoard account.";
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
  $("accountLanguageSelect").value=window.storyboardI18n?.language||"en";$("accountLayoutSelect").value=currentLayoutPreference();$("accountThemeSelect").value=currentThemePreference()
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
  const username=$("accountUsernameInput").value.trim().toLowerCase(),displayName=$("accountDisplayNameInput").value.trim(),email=$("accountEmailInput").value.trim(),language=$("accountLanguageSelect").value,layout=normalizeLayoutMode($("accountLayoutSelect").value),theme=normalizeThemePreference($("accountThemeSelect").value);
  if(!/^[a-z0-9_.-]{3,30}$/.test(username))return setMsg("accountProfileNotice","Username may contain only letters, numbers, dot, underscore and hyphen.","warning");
  app.account.profileSaving=true;$("saveAccountProfileBtn").disabled=true;$("saveAccountProfileBtn").textContent="Saving…";setMsg("accountProfileNotice","Saving account changes…");
  try{
    const {data,error}=await sb.rpc("storyboard_update_my_profile",{p_username:username,p_display_name:displayName,p_preferred_language:language,p_preferred_layout:layout});if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(row)app.profile={...app.profile,...row,accountSetupReady:true};
    let emailPending=false;
    if(email&&email.toLowerCase()!==String(app.session.user.email||"").toLowerCase()){
      const {error:emailError}=await sb.auth.updateUser({email});if(emailError)throw emailError;emailPending=true
    }
    window.storyboardI18n?.setLanguage(language);applyLayoutPreference(layout);applyThemePreference(theme);renderAccountProfile();
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
  return (app.projects||[]).filter(p=>{
    if(!projectMatchesActiveView(p))return false;
    if(app.projectFolder==="general" && p.folderId)return false;
    if(app.projectFolder!=="all"&&app.projectFolder!=="general"&&p.folderId!==app.projectFolder)return false;
    return true;
  })
}
function refreshFolderFilter(){
  const valid=app.projectFolder==="all"||app.projectFolder==="general"||(app.projectFolders||[]).some(folder=>folder.id===app.projectFolder);
  if(!valid)app.projectFolder="all";
}
function projectMatchesActiveView(p){
  const now=Date.now(),recentMs=30*24*60*60*1000;
  if(!projectMatchesSearch(p))return false;
  if(app.projectFilter==="favorites"&&!p.isFavorite)return false;
  if(app.projectFilter==="recent"&&now-new Date(p.updated_at||0).getTime()>recentMs)return false;
  if(app.projectFilter==="shared"&&p.owner_id===app.session?.user?.id)return false;
  return true
}
function directoryProjectCount(folderId){return (app.projects||[]).filter(project=>projectMatchesActiveView(project)&&(folderId==="general"?!project.folderId:project.folderId===folderId)).length}
function openProjectDirectory(folderId="all"){
  const valid=folderId==="all"||folderId==="general"||(app.projectFolders||[]).some(folder=>folder.id===folderId);
  app.projectFolder=valid?folderId:"all";renderProjects();$("projectsView")?.scrollTo?.({top:0,behavior:"smooth"})
}
function renderProjectDirectory(){
  const section=$("projectDirectory"),grid=$("projectDirectoryGrid"),back=$("projectDirectoryBackBtn"),actions=$("projectDirectoryActions");if(!section||!grid)return;
  const folders=[...(app.projectFolders||[])].sort((a,b)=>a.name.localeCompare(b.name)),current=folders.find(folder=>folder.id===app.projectFolder)||null,inside=app.projectFolder!=="all";
  back.hidden=!inside;actions.hidden=!current;grid.hidden=inside;grid.innerHTML="";
  $("projectDirectoryTitle").textContent=current?.name||(app.projectFolder==="general"?"General":"All Folders");
  $("projectDirectoryMeta").textContent=inside?`${directoryProjectCount(current?.id||"general")} project${directoryProjectCount(current?.id||"general")===1?"":"s"} in this folder.`:`${folders.length+1} folder${folders.length?"s":""} · Open a folder to browse its projects.`;
  if(inside)return;
  const entries=[{id:"general",name:"General",system:true},...folders];
  for(const folder of entries){
    const count=directoryProjectCount(folder.id),card=document.createElement("article");card.className="project-directory-card";card.dataset.folderId=folder.id;
    card.innerHTML=`<button type="button" class="project-directory-open" aria-label="Open ${escapeHtml(folder.name)} folder"><span class="project-directory-icon" aria-hidden="true">▰</span><span><strong>${escapeHtml(folder.name)}</strong><small>${count} project${count===1?"":"s"}</small></span><b aria-hidden="true">→</b></button>${folder.system?"":'<div class="project-directory-card-actions"><button type="button" class="mini-btn rename-directory">Rename</button><button type="button" class="mini-btn danger-lite delete-directory">Delete</button></div>'}`;
    card.querySelector(".project-directory-open").onclick=()=>openProjectDirectory(folder.id);
    if(!folder.system){card.querySelector(".rename-directory").onclick=()=>renameProjectFolder(folder.id);card.querySelector(".delete-directory").onclick=()=>deleteProjectFolder(folder.id)}
    grid.appendChild(card)
  }
}
let projectOpeningId=null;
function showProjectOpenFeedback(project){
  const panel=$("projectOpenFeedback"),name=$("projectOpenFeedbackName");if(!panel)return;
  projectOpeningId=project?.id||null;document.body.classList.add("project-opening");panel.hidden=false;
  if(name)name.textContent=uiText("Sending project request to the database…")
}
function acknowledgeProjectOpenFeedback(projectId){
  if(projectOpeningId!==projectId)return;if($("projectOpenFeedbackName"))$("projectOpenFeedbackName").textContent=uiText("Database received the project request. Loading…")
}
function hideProjectOpenFeedback(projectId=null){
  if(projectId&&projectOpeningId&&projectId!==projectOpeningId)return;
  projectOpeningId=null;document.body.classList.remove("project-opening");if($("projectOpenFeedback"))$("projectOpenFeedback").hidden=true
}
async function openProjectFromDashboard(project){
  if(!project||projectOpeningId)return;const started=Date.now();showProjectOpenFeedback(project);
  try{await openCloudProject(project.id,{onDatabaseAcknowledged:()=>acknowledgeProjectOpenFeedback(project.id)})}finally{const remaining=Math.max(0,500-(Date.now()-started));if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));hideProjectOpenFeedback(project.id)}
}
function renderProjects(){
  refreshFolderFilter();
  renderProjectDirectory();
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
    card.querySelector(".project-open-area").onclick=()=>openProjectFromDashboard(p);
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
    const [{data:paths},{data:characters},{data:locations},{data:locationScans}]=await Promise.all([
      sb.from("shots").select("image_path,original_image_path").eq("project_id",project.id),
      sb.from("project_ai_characters").select("*").eq("project_id",project.id),
      sb.from("project_ai_locations").select("*").eq("project_id",project.id),
      sb.from("location_scans").select("model_path").eq("project_id",project.id)
    ]);
    await removeMediaPaths([...(paths||[]).flatMap(x=>[x.image_path,x.original_image_path]),...(characters||[]).flatMap(x=>[x.reference_path,x.source_path,x.spatial_reference_path,x.face_scan_path]),...(locations||[]).flatMap(x=>[x.reference_path,x.source_path,x.spatial_reference_path]),...(locationScans||[]).map(x=>x.model_path)]);
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
  const {data:p,error}=await sb.from("projects").select("*").eq("id",id).single();if(error){uiAlert(error.message);return}options.onDatabaseAcknowledged?.();
  const {data:scenes,error:se}=await sb.from("scenes").select("*").eq("project_id",id).order("position");if(se){uiAlert(se.message);return}
  const {data:shots,error:sh}=await sb.from("shots").select("*").eq("project_id",id).order("position");if(sh){uiAlert(sh.message);return}
  const signed=await Promise.all((shots||[]).map(async row=>{
    let image=null;if(row.image_path){const {data}=await sb.storage.from("storyboards").createSignedUrl(row.image_path,SIGNED_IMAGE_TTL_SECONDS);image=data?.signedUrl||null}
    const shotData={...blankShot(row.shot_number),...(row.data||{})};
    shotData.aiCharacterIds=Array.isArray(shotData.aiCharacterIds)?shotData.aiCharacterIds.filter(Boolean):[];
    shotData.aiLocationId=String(shotData.aiLocationId||"");
    return {...shotData,id:row.id,shotNo:row.shot_number,position:row.position,version:Number(row.version||1),imagePath:row.image_path,originalImagePath:row.original_image_path||null,originalImage:null,image}
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
      if(asset.reference_path||asset.source_path||asset.spatial_reference_path||asset.face_scan_path)jobs.push(signAiAsset(asset))
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
  $("editorProjectTitle").textContent=app.current.name||"Untitled Project";
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
function syncLightingLauncher(){
  const button=$("openLightingDiagramBtn");if(!button)return;const enabled=!!app.current;
  button.disabled=!enabled;button.setAttribute("aria-disabled",String(!enabled));button.classList.toggle("permission-locked",!enabled);
  if(enabled)button.removeAttribute("disabled")
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
  // Lighting Studio is always launchable for an active project. Edit controls
  // inside the workspace still honor project permissions.
  syncLightingLauncher();
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
  $("editorProjectTitle").textContent=app.current.name||"Untitled Project";$("customAspectFields").hidden=app.current.aspect!=="Custom";renderShot();renderSheet();queueSave("project");rememberWorkspace()
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
    clone.shots=source.shots.map((s,i)=>({...deepClone(s),id:uid(),shotNo:i+1,position:i+1,originalImage:null,originalImagePath:null}));
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
    await removeMediaPaths(s.shots.flatMap(x=>[x.imagePath,x.originalImagePath]));
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
  const copy=deepClone(source);copy.id=uid();copy.position=ordered.length+1;copy.shotNo=ordered.length+1;copy.originalImage=null;copy.originalImagePath=null;
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
    await removeMediaPaths([s.imagePath,s.originalImagePath]);
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
    const r=new FileReader();r.onload=()=>{s.image=r.result;s.imagePath=null;s.originalImage=null;s.originalImagePath=null;s.aiGeneration=null;saveLocal();renderEditor()};r.readAsDataURL(file);e.target.value="";return
  }
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024){e.target.value="";return uiAlert("Use a JPEG, PNG or WebP image up to 12 MB.")}
  try{
    const optimized=await optimizeImageBlob(file,1024,.82),format=optimizedImageFormat(optimized),path=`${app.current.id}/${s.id}/${Date.now()}-manual.${format.extension}`,oldPaths=[s.imagePath,s.originalImagePath];s.aiGeneration=null;
    const {error}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(error)throw error;
    const {error:u}=await sb.from("shots").update({image_path:path,original_image_path:null}).eq("id",s.id);if(u){await removeMediaPaths([path]);throw u}
    s.imagePath=path;s.originalImagePath=null;s.originalImage=null;const {data}=await sb.storage.from("storyboards").createSignedUrl(path,SIGNED_IMAGE_TTL_SECONDS);s.image=data?.signedUrl||URL.createObjectURL(optimized);await removeMediaPaths(oldPaths);await saveCloud("shot");renderEditor()
  }catch(err){uiAlert(err.message||"Could not save image.")}finally{e.target.value=""}
}
async function removeImage(){
  if(!can("media"))return;const s=currentShot();
  if(app.mode==="cloud"){const {error}=await sb.from("shots").update({image_path:null,original_image_path:null}).eq("id",s.id);if(error)return uiAlert(error.message);await removeMediaPaths([s.imagePath,s.originalImagePath])}
  s.image=null;s.imagePath=null;s.originalImage=null;s.originalImagePath=null;s.aiGeneration=null;if(app.mode==="local")saveLocal();else await saveCloud("shot");renderEditor();rememberWorkspace()
}

function shotById(id){return allShots().find(item=>item.shot.id===id)?.shot||null}
function shotImageTarget(shot){
  if(!shot?.image)return null;const scene=app.current?.scenes.find(item=>item.shots.some(candidate=>candidate.id===shot.id));
  return {kind:"shot",id:shot.id,url:shot.image,title:`Shot ${shot.shotNo}`,caption:`${scene?.title||`Scene ${scene?.number||""}`} · ${projectAspectText(app.current)}`,maxDimension:1024,hasOriginal:!!(shot.originalImagePath||shot.originalImage)}
}
function aiAssetImageTarget(asset,type,role="reference"){
  const source=role==="source",spatial=role==="spatial",url=source?asset?.sourceUrl:spatial?asset?.spatialReferenceUrl:asset?.referenceUrl;if(!url)return null;
  return {kind:source?"asset-source":spatial?"asset-spatial":"asset-reference",id:asset.id,type,url,title:asset.name||uiText(type),caption:source?`${asset.name} · Source image used to guide AI generation`:spatial?`${asset.name} · Spatial scan view used to guide AI generation`:`${asset.name} · ${type} reference`,maxDimension:496,aspect:type==="character"?{w:3,h:4}:{w:4,h:3}}
}
function canCropImageTarget(target){return !!(target?.url&&can("media")&&!app.ai.generating&&(target.kind==="shot"||target.kind==="asset-reference"||target.kind==="asset-source"))}
function canRestoreOriginalImageTarget(target){const shot=target?.kind==="shot"?shotById(target.id):null;return !!(shot&&can("media")&&!app.ai.generating&&(shot.originalImagePath||shot.originalImage))}
function syncImageViewerActions(target=imageViewerTarget){$("openCropFromViewerBtn").hidden=!canCropImageTarget(target);$("restoreOriginalImageBtn").hidden=!canRestoreOriginalImageTarget(target)}
function openImageViewer(target){
  if(!target?.url)return;exitCropMode();imageViewerTarget=target;$("imageViewerTitle").textContent=target.title||"Image Preview";$("imageViewerCaption").dataset.baseCaption=target.caption||"";$("imageViewerCaption").textContent=target.caption||"";const stage=$("imageViewerStage"),fallback=target.aspect||aspectNumbers(app.current);stage.style.setProperty("--viewer-aspect",`${fallback.w}/${fallback.h}`);$("imageViewerImage").src=target.url;
  syncImageViewerActions(target);const dialog=$("imageViewerModal");if(!dialog.open)dialog.showModal()
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
  if(app.mode==="local"){if(!shot.originalImage)shot.originalImage=shot.image;shot.image=await blobToDataUrl(blob);saveLocal();renderEditor();return}
  const format=optimizedImageFormat(blob),path=`${app.current.id}/${shot.id}/${Date.now()}-crop.${format.extension}`,oldPath=shot.imagePath,originalPath=shot.originalImagePath||oldPath;
  const {error:uploadError}=await sb.storage.from("storyboards").upload(path,blob,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
  const {error:updateError}=await sb.from("shots").update({image_path:path,original_image_path:originalPath}).eq("id",shot.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
  shot.imagePath=path;shot.originalImagePath=originalPath;const {data:signed}=await sb.storage.from("storyboards").createSignedUrl(path,SIGNED_IMAGE_TTL_SECONDS);shot.image=signed?.signedUrl||URL.createObjectURL(blob);if(oldPath&&oldPath!==originalPath)await removeMediaPaths([oldPath]);renderEditor();rememberWorkspace()
}
async function restoreOriginalShotImage(){
  const target=imageViewerTarget,shot=target?.kind==="shot"?shotById(target.id):null;if(!shot||(app.mode==="local"?!shot.originalImage:!shot.originalImagePath)||!can("media"))return;
  if(!uiConfirm("Restore the original image from before the first crop? The current cropped version will be removed."))return;
  const button=$("restoreOriginalImageBtn");button.disabled=true;setMsg("cropNotice","Restoring original image…");
  try{
    if(app.mode==="local"){shot.image=shot.originalImage;shot.originalImage=null;shot.originalImagePath=null;saveLocal()}
    else{
      const croppedPath=shot.imagePath,originalPath=shot.originalImagePath,{data:signed,error:signError}=await sb.storage.from("storyboards").createSignedUrl(originalPath,SIGNED_IMAGE_TTL_SECONDS);if(signError||!signed?.signedUrl)throw signError||new Error("Could not open the original image.");
      const {error:updateError}=await sb.from("shots").update({image_path:originalPath,original_image_path:null}).eq("id",shot.id).eq("project_id",app.current.id);if(updateError)throw updateError;
      shot.imagePath=originalPath;shot.originalImagePath=null;shot.originalImage=null;shot.image=signed.signedUrl;if(croppedPath&&croppedPath!==originalPath)await removeMediaPaths([croppedPath])
    }
    renderEditor();const refreshed=shotImageTarget(shot);imageViewerTarget=refreshed;$("imageViewerTitle").textContent=refreshed.title;$("imageViewerCaption").dataset.baseCaption=refreshed.caption||"";$("imageViewerImage").src=refreshed.url;syncImageViewerActions(refreshed);setMsg("cropNotice","");setMsg("editorNotice","Original image restored.");rememberWorkspace()
  }catch(error){setMsg("cropNotice",error.message||"Could not restore the original image.","warning")}
  finally{button.disabled=false}
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
  try{const blob=await cropCanvasBlob(),target=cropState.target;if(target.kind==="shot")await saveCroppedShot(target,blob);else await saveCroppedAiAsset(target,blob);const refreshed=target.kind==="shot"?shotImageTarget(shotById(target.id)):aiAssetImageTarget(aiCollection(target.type).find(item=>item.id===target.id),target.type,target.kind==="asset-source"?"source":"reference");cropState.saving=false;exitCropMode();if(refreshed){imageViewerTarget=refreshed;$("imageViewerTitle").textContent=refreshed.title||"Image Preview";$("imageViewerCaption").dataset.baseCaption=refreshed.caption||"";$("imageViewerImage").src=refreshed.url;syncImageViewerActions(refreshed)}setMsg("editorNotice","Image cropped and saved.")}
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
  const sameSpatial=!!(previous&&previous.spatial_reference_path===row.spatial_reference_path),sameFace=!!(previous&&previous.face_scan_path===row.face_scan_path);
  return {...row,source_path:row.source_path||null,spatial_reference_path:row.spatial_reference_path||null,location_scan_id:row.location_scan_id||null,face_scan_path:row.face_scan_path||null,face_scan_format:row.face_scan_format||null,face_scan_metadata:row.face_scan_metadata&&typeof row.face_scan_metadata==="object"?row.face_scan_metadata:{},type,locked:!!row.locked,referenceUrl:sameReference?previous.referenceUrl:null,sourceUrl:sameSource?previous.sourceUrl:null,spatialReferenceUrl:sameSpatial?previous.spatialReferenceUrl:null,faceModelUrl:sameFace?previous.faceModelUrl:null,generationStatus:previous?.generationStatus||"",generationStatusKind:previous?.generationStatusKind||""}
}
async function signAiAsset(asset){
  if(!asset)return asset;
  const jobs=[];
  if(asset.reference_path)jobs.push((async()=>{const previous=asset.referenceUrl,{data,error}=await sb.storage.from("storyboards").createSignedUrl(asset.reference_path,SIGNED_IMAGE_TTL_SECONDS);asset.referenceUrl=!error&&data?.signedUrl?data.signedUrl:previous||null})());
  else asset.referenceUrl=null;
  if(asset.source_path)jobs.push((async()=>{const previous=asset.sourceUrl,{data,error}=await sb.storage.from("storyboards").createSignedUrl(asset.source_path,SIGNED_IMAGE_TTL_SECONDS);asset.sourceUrl=!error&&data?.signedUrl?data.signedUrl:previous||null})());
  else asset.sourceUrl=null;
  if(asset.spatial_reference_path)jobs.push((async()=>{const previous=asset.spatialReferenceUrl,{data,error}=await sb.storage.from("storyboards").createSignedUrl(asset.spatial_reference_path,SIGNED_IMAGE_TTL_SECONDS);asset.spatialReferenceUrl=!error&&data?.signedUrl?data.signedUrl:previous||null})());
  else asset.spatialReferenceUrl=null;
  if(asset.face_scan_path)jobs.push((async()=>{const previous=asset.faceModelUrl,{data,error}=await sb.storage.from("storyboards").createSignedUrl(asset.face_scan_path,VIRTUAL_LOCATION_SIGNED_URL_SECONDS);asset.faceModelUrl=!error&&data?.signedUrl?data.signedUrl:previous||null})());
  else asset.faceModelUrl=null;
  await Promise.all(jobs);
  return asset
}
async function loadAiVisualBible(projectId=app.current?.id){
  const previousAssets=new Map([...app.ai.characters,...app.ai.locations].map(asset=>[asset.id,asset]));
  app.ai.characters=[];app.ai.locations=[];app.ai.ready=false;
  if(app.mode!=="cloud"||!sb||!projectId)return;
  app.ai.loading=true;
  const modernColumns="id,project_id,name,description,reference_path,source_path,style_snapshot,locked,created_at,updated_at",legacyColumns="id,project_id,name,description,reference_path,style_snapshot,locked,created_at,updated_at";
  const characterSpatialColumns=`${modernColumns},face_scan_path,face_scan_format,face_scan_metadata,spatial_reference_path`,locationSpatialColumns=`${modernColumns},location_scan_id,spatial_reference_path`;
  let [characters,locations]=await Promise.all([
    sb.from("project_ai_characters").select(characterSpatialColumns).eq("project_id",projectId).order("created_at"),
    sb.from("project_ai_locations").select(locationSpatialColumns).eq("project_id",projectId).order("created_at")
  ]);
  const spatialColumnMissing=[characters.error,locations.error].some(error=>/face_scan_path|face_scan_format|face_scan_metadata|spatial_reference_path|location_scan_id/i.test(String(error?.message||"")));
  if(spatialColumnMissing){
    [characters,locations]=await Promise.all([
      sb.from("project_ai_characters").select(modernColumns).eq("project_id",projectId).order("created_at"),
      sb.from("project_ai_locations").select(modernColumns).eq("project_id",projectId).order("created_at")
    ]);app.ai.spatialReady=false
  }else app.ai.spatialReady=true;
  const sourceColumnMissing=[characters.error,locations.error].some(error=>/source_path/i.test(String(error?.message||"")));
  if(sourceColumnMissing){
    [characters,locations]=await Promise.all([
      sb.from("project_ai_characters").select(legacyColumns).eq("project_id",projectId).order("created_at"),
      sb.from("project_ai_locations").select(legacyColumns).eq("project_id",projectId).order("created_at")
    ]);app.ai.sourceReady=false;app.ai.spatialReady=false
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
  renderVirtualLocationBibleControls();
  // A Realtime refresh can happen while the Bible dialog is open.
  // Restore any missing signed previews before that dialog is rendered again.
  if($("aiBibleModal")?.open)await Promise.all([...app.ai.characters,...app.ai.locations].filter(x=>(x.reference_path&&!x.referenceUrl)||(x.source_path&&!x.sourceUrl)||(x.spatial_reference_path&&!x.spatialReferenceUrl)||(x.face_scan_path&&!x.faceModelUrl)).map(signAiAsset))
}

/* ---------- BIBLE SCRIPT + SHOT REFERENCES ---------- */
function scriptCanEdit(){return app.mode==="cloud"&&(can("project_settings")||can("scenes")||can("shots"))}
function scriptCanApply(){return scriptCanEdit()&&can("media")&&can("scenes")&&can("shots")}
function cleanScriptName(value,fallback="Untitled"){return String(value||fallback).replace(/\s+/g," ").trim().slice(0,160)||fallback}
function cleanScriptText(value,max=1200,fallback=""){return String(value||fallback).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g," ").replace(/\s+/g," ").trim().slice(0,max)||fallback}
function normalizeScriptAnalysis(value){
  const input=value&&typeof value==="object"?value:{},characters=Array.isArray(input.characters)?input.characters:[],locations=Array.isArray(input.locations)?input.locations:[],scenes=Array.isArray(input.scenes)?input.scenes:[];
  const uniqueItems=(items,descriptionFallback)=>[...new Map(items.map(item=>{const row=typeof item==="string"?{name:item}:item||{},name=cleanScriptName(row.name,"");return [name.toLocaleLowerCase(),{name,description:cleanScriptText(row.description,1400,descriptionFallback)}]}).filter(([key])=>key)).values()];
  const cleanList=(items,max=80)=>[...new Set((Array.isArray(items)?items:[]).map(item=>cleanScriptText(item,240,"")).filter(Boolean))].slice(0,max);
  const validTime=value=>SCENE_TIME_OPTIONS.includes(value)?value:"Unspecified";
  const sceneKeys=new Set();
  return {
    language:cleanScriptName(input.language,"Unknown"),
    title:cleanScriptName(input.title,"Imported Script"),
    characters:uniqueItems(characters,"Recurring character detected in the script; add stable appearance and costume details before generation."),
    locations:uniqueItems(locations,"Recurring location detected in the script; add stable architecture, layout and palette details before generation."),
    scenes:scenes.slice(0,500).map((scene,index)=>{
      const row=scene&&typeof scene==="object"?scene:{},fallback=`scene-${String(index+1).padStart(3,"0")}`,baseKey=cleanScriptName(row.key,fallback).toLowerCase().replace(/[^a-z0-9_-]+/g,"-").slice(0,80)||fallback;
      let key=baseKey,suffix=2;while(sceneKeys.has(key)){key=`${baseKey.slice(0,Math.max(1,76-String(suffix).length))}-${suffix}`;suffix++}sceneKeys.add(key);
      const normalized={
        key,
        title:cleanScriptName(row.title,`Scene ${index+1}`),
        description:cleanScriptText(row.description,1200,"Script scene"),
        location:cleanScriptName(row.location,""),
        interior_exterior:["INT","EXT","INT/EXT","Unspecified"].includes(row.interior_exterior)?row.interior_exterior:"Unspecified",
        story_time:validTime(cleanScriptName(row.story_time,"Unspecified")),
        shoot_time:validTime(cleanScriptName(row.shoot_time,row.story_time||"Unspecified")),
        time_strategy:["natural","day_for_night","night_for_day"].includes(row.time_strategy)?row.time_strategy:"natural",
        script_day:cleanScriptName(row.script_day,"Unspecified"),
        unit:cleanScriptName(row.unit,"Unspecified"),
        special_location:!!row.special_location,
        characters:[...new Set((Array.isArray(row.characters)?row.characters:[]).map(name=>cleanScriptName(name,"")).filter(Boolean))].slice(0,40),
        start_line:Math.max(1,Number(row.start_line)||1),
        end_line:Math.max(1,Number(row.end_line)||Number(row.start_line)||1)
      };
      for(const [field] of PRODUCTION_ELEMENT_FIELDS)normalized[field]=cleanList(row[field]);
      return normalized
    })
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
function scriptCharacterLength(value){return [...String(value||"")].length}
function normalizeImportedScriptText(value){return String(value||"").replace(/\r\n?/g,"\n").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\u00a0/g," ").replace(/[ \t]+(?=\n)/g,"").replace(/\n{5,}/g,"\n\n\n\n")}
function removeInvisibleScriptCharacters(){const editor=$("scriptTextEditor"),walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node,removed=0;while((node=walker.nextNode())){const before=node.nodeValue||"",after=before.replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\u00a0/g," ");removed+=before.length-after.length;if(after!==before)node.nodeValue=after}return removed}
function updateScriptCharacterCount(){const count=scriptCharacterLength(scriptEditorText()),percent=Math.min(999,Math.round(count/SCRIPT_MAX_ANALYSIS_CHARS*100));if($("scriptCharacterCount"))$("scriptCharacterCount").textContent=`${count.toLocaleString()} characters`;if($("scriptAnalysisLimit"))$("scriptAnalysisLimit").textContent=`${percent}% of ${SCRIPT_MAX_ANALYSIS_CHARS.toLocaleString()} AI limit`;$("scriptAnalysisLimit")?.classList.toggle("over-limit",count>SCRIPT_MAX_ANALYSIS_CHARS)}
function setScriptEditorText(value){
  const editor=$("scriptTextEditor"),text=String(value||"").replace(/\r\n?/g,"\n"),fragment=document.createDocumentFragment(),lines=text.split("\n");editor.replaceChildren();lines.forEach((line,index)=>{if(line)fragment.appendChild(document.createTextNode(line));if(index<lines.length-1)fragment.appendChild(document.createElement("br"))});editor.appendChild(fragment);app.script.selectionCache=null;app.script.savedRange=null;app.script.fontSizePx=SCRIPT_FONT_DEFAULT_PX
}
function setScriptEditorHtml(value,fallback=""){
  if(!value){setScriptEditorText(fallback);return}const editor=$("scriptTextEditor"),doc=new DOMParser().parseFromString(`<div>${String(value)}</div>`,"text/html"),source=doc.body.firstElementChild,fragment=document.createDocumentFragment();
  const append=(node,parent)=>{if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.nodeValue||""));return}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=node.tagName;if(tag==="BR"){parent.appendChild(document.createElement("br"));return}if(tag==="B"||tag==="STRONG"||tag==="U"||tag==="FONT"||tag==="SPAN"){let safe;if(tag==="B"||tag==="STRONG")safe=document.createElement("strong");else if(tag==="U")safe=document.createElement("u");else if(node.hasAttribute("data-script-type")){const kind=node.getAttribute("data-script-type");if(!["scene-heading","character-cue","dialogue","action"].includes(kind)){[...node.childNodes].forEach(child=>append(child,parent));return}safe=document.createElement("span");safe.dataset.scriptType=kind;if(node.hasAttribute("data-script-label"))safe.dataset.scriptLabel=node.getAttribute("data-script-label").slice(0,240)}else{const legacy=tag==="FONT"?SCRIPT_LEGACY_FONT_LEVEL_PX[Number(node.getAttribute("size"))]:null,declared=tag==="SPAN"?Number(node.getAttribute("data-script-font-size")||String(node.getAttribute("style")||"").match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i)?.[1]):legacy;if(!Number.isFinite(declared)){[...node.childNodes].forEach(child=>append(child,parent));return}const px=clampScriptFontPx(declared);safe=document.createElement("span");safe.dataset.scriptFontSize=String(px);safe.style.fontSize=`${px}px`}[...node.childNodes].forEach(child=>append(child,safe));parent.appendChild(safe);return}const block=["DIV","P","LI","H1","H2","H3","BLOCKQUOTE"].includes(tag);if(block&&parent.childNodes.length&&parent.lastChild?.nodeName!=="BR")parent.appendChild(document.createElement("br"));[...node.childNodes].forEach(child=>append(child,parent));if(block&&node!==source&&parent.lastChild?.nodeName!=="BR")parent.appendChild(document.createElement("br"))};
  [...(source?.childNodes||[])].forEach(child=>append(child,fragment));while(fragment.lastChild?.nodeName==="BR")fragment.removeChild(fragment.lastChild);editor.replaceChildren(fragment);if(scriptEditorText()!==String(fallback||"").replace(/\r\n?/g,"\n"))setScriptEditorText(fallback);app.script.selectionCache=null;app.script.savedRange=null
}
function scriptEditorHtml(){
  const encode=node=>{if(node.nodeType===Node.TEXT_NODE)return escapeHtml(node.nodeValue||"").replace(/\n/g,"<br>");if(node.nodeType!==Node.ELEMENT_NODE)return "";if(node.tagName==="BR")return "<br>";const content=[...node.childNodes].map(encode).join("");if(node.tagName==="B"||node.tagName==="STRONG")return `<strong>${content}</strong>`;if(node.tagName==="U")return `<u>${content}</u>`;if(node.tagName==="SPAN"&&node.hasAttribute("data-script-type")){const kind=node.getAttribute("data-script-type"),label=node.getAttribute("data-script-label")||"";return `<span data-script-type="${escapeHtml(kind)}"${label?` data-script-label="${escapeHtml(label)}"`:""}>${content}</span>`}if(node.tagName==="SPAN"&&node.hasAttribute("data-script-font-size")){const px=clampScriptFontPx(node.getAttribute("data-script-font-size"));return `<span data-script-font-size="${px}" style="font-size:${px}px">${content}</span>`}if(node.tagName==="FONT"){const px=SCRIPT_LEGACY_FONT_LEVEL_PX[Number(node.getAttribute("size"))];return px?`<span data-script-font-size="${px}" style="font-size:${px}px">${content}</span>`:content}return content};return [...$("scriptTextEditor").childNodes].map(encode).join("")
}
function scriptSelectionRange(){const editor=$("scriptTextEditor"),selection=window.getSelection();if(!selection?.rangeCount)return null;const range=selection.getRangeAt(0);return editor.contains(range.commonAncestorContainer)?range:null}
function currentScriptSelection(){
  const editor=$("scriptTextEditor"),range=scriptSelectionRange();if(!range)return app.script.selectionCache||{start:0,end:0,dbStart:0,dbEnd:0,text:""};
  const before=document.createRange();before.selectNodeContents(editor);before.setEnd(range.startContainer,range.startOffset);const through=document.createRange();through.selectNodeContents(editor);through.setEnd(range.endContainer,range.endOffset),start=scriptTextFromNode(before.cloneContents()).length,end=scriptTextFromNode(through.cloneContents()).length,text=scriptEditorText().slice(start,end),result={start,end,dbStart:[...scriptEditorText().slice(0,start)].length,dbEnd:[...scriptEditorText().slice(0,end)].length,text};app.script.selectionCache=result;app.script.savedRange=range.cloneRange();return result
}
function restoreScriptSelection(){const range=app.script.savedRange,editor=$("scriptTextEditor");if(!range||!editor.contains(range.commonAncestorContainer))return false;const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return true}
function setScriptDirection(value){const direction=value==="rtl"?"rtl":"ltr",editor=$("scriptTextEditor");editor.dir=direction;$("scriptDirectionSelect").value=direction}
function applyScriptFormat(command,value=null){
  const editor=$("scriptTextEditor");if(editor.getAttribute("contenteditable")!=="true")return;editor.focus();restoreScriptSelection();if(!scriptSelectionRange())return;document.execCommand(command,false,value);app.script.savedRange=scriptSelectionRange()?.cloneRange()||null;editor.dispatchEvent(new Event("input",{bubbles:true}));updateScriptFormatState()
}
function toggleScriptBold(){applyScriptFormat("bold")}
function toggleScriptUnderline(){applyScriptFormat("underline")}
function clampScriptFontPx(value){return Math.max(SCRIPT_FONT_MIN_PX,Math.min(SCRIPT_FONT_MAX_PX,Math.round(Number(value)||SCRIPT_FONT_DEFAULT_PX)))}
function scriptSelectionFontPx(){
  const editor=$("scriptTextEditor"),range=scriptSelectionRange()||app.script.savedRange;let node=range?.startContainer;if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;
  while(node&&node!==editor){const declared=Number(node.dataset?.scriptFontSize);if(Number.isFinite(declared)&&declared>0)return clampScriptFontPx(declared);if(node.tagName==="FONT"&&SCRIPT_LEGACY_FONT_LEVEL_PX[Number(node.getAttribute("size"))])return SCRIPT_LEGACY_FONT_LEVEL_PX[Number(node.getAttribute("size"))];node=node.parentElement}
  return clampScriptFontPx(app.script.fontSizePx||SCRIPT_FONT_DEFAULT_PX)
}
function syncScriptFontSizeValue(){const output=$("scriptFontSizeValue"),px=clampScriptFontPx(app.script.fontSizePx);if(output){output.value=String(px);output.textContent=String(px);output.title=`${px} px`}}
function changeScriptFontSize(delta){
  if(!scriptSelectionRange()&&!restoreScriptSelection())return;const range=scriptSelectionRange();if(!range||range.collapsed)return;
  const current=scriptSelectionFontPx(),next=clampScriptFontPx(current+Number(delta||0));
  if(next===current){syncScriptFontSizeValue();return}
  app.script.fontSizePx=next;app.script.fontSizeApplying=true;syncScriptFontSizeValue();
  try{
    const fragment=range.extractContents();
    [...fragment.querySelectorAll('span[data-script-font-size],font[size]')].reverse().forEach(element=>element.replaceWith(...element.childNodes));
    const span=document.createElement("span");span.dataset.scriptFontSize=String(next);span.style.fontSize=`${next}px`;span.appendChild(fragment);range.insertNode(span);
    const selected=document.createRange();selected.selectNodeContents(span);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(selected);app.script.savedRange=selected.cloneRange();
    $("scriptTextEditor").dispatchEvent(new Event("input",{bubbles:true}))
  }finally{app.script.fontSizeApplying=false;app.script.fontSizePx=next;syncScriptFontSizeValue()}
}
function updateScriptFormatState(){
  const range=scriptSelectionRange();
  for(const [id,command] of [["scriptBoldBtn","bold"],["scriptUnderlineBtn","underline"]]){const button=$(id),active=!!range&&!!document.queryCommandState?.(command);button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))}
  if(range&&!app.script.fontSizeApplying)app.script.fontSizePx=scriptSelectionFontPx();
  syncScriptFontSizeValue()
}
function scriptCharacterRows(value=$("scriptCharactersInput")?.value||""){return String(value).split(/\n+/).map(line=>{const [name,...rest]=line.split(/\s+[—–-]\s+/);return {name:cleanScriptName(name,""),description:cleanScriptText(rest.join(" — "),500,"")}}).filter(row=>row.name)}
function screenplaySceneLabel(scene){const rtl=$("scriptDirectionSelect")?.value==="rtl",place=scene.interior_exterior==="EXT"?(rtl?"خارجی":"EXT."):scene.interior_exterior==="INT/EXT"?(rtl?"داخلی/خارجی":"INT./EXT."):(rtl?"داخلی":"INT."),time=scene.story_time==="Night"?(rtl?"شب":"NIGHT"):scene.story_time==="Dawn"?(rtl?"سحر":"DAWN"):scene.story_time==="Sunset"?(rtl?"غروب":"SUNSET"):(rtl?"روز":"DAY");return `${place} · ${time} — ${scene.title||scene.location||"Scene"}`}
function syncDetectedCharacters(analysis){if(!analysis?.characters?.length)return;const field=$("scriptCharactersInput"),existing=scriptCharacterRows(field.value),known=new Set(existing.map(row=>row.name.toLocaleLowerCase()));for(const item of analysis.characters){if(!known.has(item.name.toLocaleLowerCase()))existing.push({name:item.name,description:item.description||""})}field.value=existing.map(row=>`${row.name}${row.description?` — ${row.description}`:""}`).join("\n")}
function applyScreenplayFormatting(analysis=app.script.analysis){
  const editor=$("scriptTextEditor"),text=scriptEditorText(),lines=text.split("\n");if(!text.trim())return;const characters=new Set([...(analysis?.characters||[]).map(item=>item.name),...scriptCharacterRows().map(item=>item.name)].map(name=>name.trim().replace(/[:：]$/,"").toLocaleLowerCase()).filter(Boolean)),sceneByLine=new Map((analysis?.scenes||[]).map(scene=>[Math.max(0,Number(scene.start_line||1)-1),scene]));let dialogue=false;const fragment=document.createDocumentFragment();
  lines.forEach((line,index)=>{const trimmed=line.trim(),normalized=trimmed.replace(/[:：]$/,"").toLocaleLowerCase(),scene=sceneByLine.get(index),cue=!scene&&characters.has(normalized)&&trimmed.length<=80;let kind="action",label="";if(scene){kind="scene-heading";label=screenplaySceneLabel(scene);dialogue=false}else if(cue){kind="character-cue";dialogue=true}else if(!trimmed){dialogue=false}else if(dialogue)kind="dialogue";const span=document.createElement("span");span.dataset.scriptType=kind;if(label)span.dataset.scriptLabel=label;span.textContent=line;fragment.appendChild(span);if(index<lines.length-1)fragment.appendChild(document.createElement("br"))});editor.replaceChildren(fragment);app.script.selectionCache=null;app.script.savedRange=null;updateScriptCharacterCount();updateScriptFormatState()
}
function insertScriptSceneHeading(){
  const editor=$("scriptTextEditor");if(editor.getAttribute("contenteditable")!=="true")return;const place=$("scriptSceneInteriorExterior").value,time=$("scriptSceneTime").value,name=$("scriptSceneName").value.trim()||"UNTITLED LOCATION",rtl=$("scriptDirectionSelect").value==="rtl",placeText=rtl?({INT:"داخلی",EXT:"خارجی","INT/EXT":"داخلی/خارجی"}[place]||place):place==="INT/EXT"?"INT./EXT.":`${place}.`,timeText=rtl?({Day:"روز",Night:"شب",Dawn:"سحر",Sunset:"غروب",Twilight:"گرگ‌ومیش"}[time]||time):time.toUpperCase(),heading=`${placeText} ${name} — ${timeText}`;editor.focus();document.execCommand("insertText",false,`${scriptEditorText()&&!scriptEditorText().endsWith("\n")?"\n":""}${heading}\n`);$("scriptSceneName").value="";updateScriptCharacterCount()
}
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
function productionTimeBucket(value){return value==="Night"?"night":value&&value!=="Unspecified"?"day":"unspecified"}
function productionElementOccurrences(scenes,field){
  const entries=new Map();
  scenes.forEach((scene,index)=>{for(const value of Array.isArray(scene[field])?scene[field]:[]){const name=cleanScriptText(value,240,"");if(!name)continue;const key=name.toLocaleLowerCase(),entry=entries.get(key)||{name,count:0,scenes:[]};entry.count++;entry.scenes.push(index+1);entries.set(key,entry)}});
  return [...entries.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))
}
function productionSummary(analysis){
  const scenes=analysis?.scenes||[],count=predicate=>scenes.filter(predicate).length,unique=field=>productionElementOccurrences(scenes,field).length,shotCount=scene=>app.current?.scenes?.find(projectScene=>projectScene.scriptSceneKey===scene.key)?.shots?.length||0,sumShots=predicate=>scenes.filter(predicate).reduce((sum,scene)=>sum+shotCount(scene),0);
  return {
    scenes:scenes.length,
    plannedShots:scenes.reduce((sum,scene)=>sum+shotCount(scene),0),
    interiors:count(scene=>scene.interior_exterior==="INT"||scene.interior_exterior==="INT/EXT"),
    exteriors:count(scene=>scene.interior_exterior==="EXT"||scene.interior_exterior==="INT/EXT"),
    interiorShots:sumShots(scene=>scene.interior_exterior==="INT"||scene.interior_exterior==="INT/EXT"),
    exteriorShots:sumShots(scene=>scene.interior_exterior==="EXT"||scene.interior_exterior==="INT/EXT"),
    storyDay:count(scene=>productionTimeBucket(scene.story_time)==="day"),
    storyNight:count(scene=>productionTimeBucket(scene.story_time)==="night"),
    storyDayShots:sumShots(scene=>productionTimeBucket(scene.story_time)==="day"),
    storyNightShots:sumShots(scene=>productionTimeBucket(scene.story_time)==="night"),
    shootDay:count(scene=>productionTimeBucket(scene.shoot_time)==="day"),
    shootNight:count(scene=>productionTimeBucket(scene.shoot_time)==="night"),
    shootDayShots:sumShots(scene=>productionTimeBucket(scene.shoot_time)==="day"),
    shootNightShots:sumShots(scene=>productionTimeBucket(scene.shoot_time)==="night"),
    dayForNight:count(scene=>scene.time_strategy==="day_for_night"),
    nightForDay:count(scene=>scene.time_strategy==="night_for_day"),
    specialScenes:count(scene=>scene.special_location||scene.risk_flags?.length||scene.stunts?.length||scene.special_effects?.length||scene.visual_effects?.length||scene.animals?.length),
    props:unique("props"),
    equipment:unique("special_equipment"),
    hasProductionDetails:scenes.some(scene=>scene.interior_exterior!=="Unspecified"||scene.special_location||PRODUCTION_ELEMENT_FIELDS.some(([field])=>scene[field]?.length))
  }
}
function renderScriptAnalysis(){
  const wrap=$("scriptAnalysisResults"),analysis=app.script.analysis;if(!analysis){wrap.hidden=true;wrap.innerHTML="";return}wrap.hidden=false;
  const totals=productionSummary(analysis),sceneItems=analysis.scenes.slice(0,60).map(scene=>`<div class="script-analysis-item"><strong>${escapeHtml(scene.title)}</strong><small>${escapeHtml(scene.interior_exterior||"Unspecified")} · ${escapeHtml(scene.location||"Location not identified")} · Story ${escapeHtml(scene.story_time)} · Shoot ${escapeHtml(scene.shoot_time||scene.story_time)}${scene.time_strategy!=="natural"?` · ${escapeHtml(scene.time_strategy==="day_for_night"?"Day for Night":"Night for Day")}`:""} · lines ${scene.start_line}–${scene.end_line}</small><small>${escapeHtml(scene.characters.join(", ")||"No recurring characters identified")}</small></div>`).join("");
  const productionNotice=totals.hasProductionDetails?"The complete department breakdown is ready in Collaboration.":"This analysis predates the production chart. Analyze the saved script again to fill department details.";
  wrap.innerHTML=`<div class="script-analysis-summary"><div class="script-analysis-stat"><strong>${analysis.scenes.length}</strong><small>Scenes</small></div><div class="script-analysis-stat"><strong>${analysis.characters.length}</strong><small>Characters</small></div><div class="script-analysis-stat"><strong>${analysis.locations.length}</strong><small>Locations</small></div></div><section class="script-production-summary"><div class="script-production-summary-head"><div><strong>Production Chart Summary</strong><small>${escapeHtml(productionNotice)}</small></div><button type="button" class="btn ghost open-production-dashboard">Open Production Dashboard</button></div><div class="script-production-mini-grid"><span><strong>${totals.plannedShots}</strong><small>Planned shots</small></span><span><strong>${totals.interiors}</strong><small>INT scenes</small></span><span><strong>${totals.exteriors}</strong><small>EXT scenes</small></span><span><strong>${totals.storyNight}</strong><small>Story night</small></span><span><strong>${totals.dayForNight+totals.nightForDay}</strong><small>Time conversions</small></span><span><strong>${totals.props}</strong><small>Unique props</small></span><span><strong>${totals.specialScenes}</strong><small>Special-production scenes</small></span></div></section><div class="script-analysis-list">${sceneItems||'<div class="ai-picker-empty">No scenes were detected. Review the script formatting and analyze again.</div>'}</div>`;
  wrap.querySelector(".open-production-dashboard")?.addEventListener("click",()=>{if($("aiBibleModal")?.open)$("aiBibleModal").close();openCollab("production")})
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
  if(!app.script.editorHydrated||editor.dataset.projectId!==projectId){setScriptEditorHtml(app.script.record?.content_html||"",app.script.record?.content||"");setScriptDirection(app.script.record?.text_direction||"ltr");$("scriptTitleInput").value=app.script.record?.screenplay_title||app.script.analysis?.title||"";$("scriptCharactersInput").value=Array.isArray(app.script.record?.character_list)?app.script.record.character_list.map(row=>`${row.name||row}${row.description?` — ${row.description}`:""}`).join("\n"):"";editor.dataset.projectId=projectId;app.script.editorHydrated=true}
  const content=scriptEditorText(),busy=app.script.analyzing||app.script.applying,fileName=app.script.pendingFileName||app.script.record?.file_name||"No script",analysisMatches=!!app.script.record&&content===app.script.record.content;$("scriptFileBadge").textContent=fileName;$("scriptFileInput").disabled=!editable||busy;editor.setAttribute("contenteditable",String(editable&&!busy));$("scriptDirectionSelect").disabled=!editable||busy;["scriptBoldBtn","scriptUnderlineBtn","scriptFontDecreaseBtn","scriptFontIncreaseBtn"].forEach(id=>$(id).disabled=!editable||busy);$("saveScriptBtn").disabled=!editable||app.script.saving||busy;$("analyzeScriptBtn").disabled=!editable||busy||!content.trim();$("analyzeScriptBtn").textContent=app.script.analyzing?"Analyzing Script…":"✦ Analyze with AI";$("analyzeScriptBtn").classList.toggle("script-analysis-btn-busy",app.script.analyzing);$("applyScriptBreakdownBtn").disabled=!scriptCanApply()||!app.script.analysis||!analysisMatches||busy;$("applyScriptBreakdownBtn").textContent=app.script.applying?"Applying Breakdown…":"Apply Breakdown to Project";
  ["scriptTitleInput","scriptCharactersInput","scriptSceneInteriorExterior","scriptSceneTime","scriptSceneName","insertScriptSceneHeadingBtn","formatScreenplayBtn"].forEach(id=>$(id).disabled=!editable||busy);if(!ready)setMsg("scriptNotice",app.script.migrationMessage,"warning");renderScriptLinkSelectors();renderScriptAnalysis();renderScriptLinks();renderScriptLineMap();updateScriptSelection();updateScriptFormatState();updateScriptCharacterCount()
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
  try{if(file.size>900000)throw new Error("Script files must be smaller than 900 KB.");const content=normalizeImportedScriptText(screenplayMarkupToText(await file.text(),file.type||"",file.name));if(!content.trim())throw new Error("This script file contains no readable text.");setScriptEditorText(content);app.script.pendingFileName=file.name.slice(0,240);app.script.pendingFileType=file.type||"text/plain";app.script.analysis=null;setMsg("scriptNotice",`${file.name} loaded. Review the text, then save or analyze it.`);renderScriptBible();$("scriptTextEditor").focus()}
  catch(error){setMsg("scriptNotice",error.message||"Could not read this script file.","warning")}
}
async function saveProjectScript({silent=false}={}){
  if(!app.script.ready||!scriptCanEdit())return null;const content=scriptEditorText(),contentHtml=scriptEditorHtml(),textDirection=$("scriptDirectionSelect").value==="rtl"?"rtl":"ltr",existing=app.script.record,changed=content!==(existing?.content||"");if(!content.trim()){setMsg("scriptNotice","Add or import script text first.","warning");return null}
  if(changed&&app.script.links.length&&!uiConfirm("Saving changed script text will remove existing shot links because their exact text offsets would no longer be reliable. Continue?"))return null;
  app.script.saving=true;app.ignoreRealtimeUntil=Date.now()+1800;renderScriptBible();const payload={project_id:app.current.id,file_name:app.script.pendingFileName||existing?.file_name||"script.txt",file_type:app.script.pendingFileType||existing?.file_type||"text/plain",screenplay_title:$("scriptTitleInput").value.trim().slice(0,240),character_list:scriptCharacterRows(),content,content_html:contentHtml,text_direction:textDirection,analysis:changed?null:(app.script.analysis||null),analysis_model:changed?null:(existing?.analysis_model||null),analyzed_at:changed?null:(existing?.analyzed_at||null),applied_at:changed?null:(existing?.applied_at||null)};
  let result;if(existing)result=await sb.from("project_scripts").update(payload).eq("id",existing.id).eq("project_id",app.current.id).select().single();else result=await sb.from("project_scripts").insert({...payload,created_by:app.session.user.id}).select().single();
  app.script.saving=false;if(result.error){const message=/screenplay_title|character_list|schema cache/i.test(String(result.error.message||""))?"Run supabase-v5.13-screenplay-format.sql in Supabase, then reload FilmBoard.":result.error.message||"Could not save the script.";setMsg("scriptNotice",message,"warning");renderScriptBible();return null}
  if(changed&&app.script.links.length){const {error}=await sb.from("script_shot_links").delete().eq("script_id",result.data.id);if(!error)app.script.links=[]}
  app.script.record=result.data;app.script.analysis=result.data.analysis?normalizeScriptAnalysis(result.data.analysis):null;app.script.pendingFileName="";app.script.pendingFileType="";if(!silent)setMsg("scriptNotice","Script saved.");renderScriptBible();return result.data
}
async function analyzeProjectScript(){
  if(!app.script.ready||!scriptCanEdit()||app.script.analyzing)return;const removed=removeInvisibleScriptCharacters(),text=scriptEditorText(),characterCount=scriptCharacterLength(text);updateScriptCharacterCount();if(text.trim().length<20)return setMsg("scriptNotice","Add more screenplay text before analysis.","warning");if(characterCount>SCRIPT_MAX_ANALYSIS_CHARS)return setMsg("scriptNotice",`This script has ${characterCount.toLocaleString()} visible characters. AI analysis currently accepts up to ${SCRIPT_MAX_ANALYSIS_CHARS.toLocaleString()} characters at once.${removed?` ${removed.toLocaleString()} hidden copy/paste characters were removed first.`:""}`,"warning");
  const record=await saveProjectScript({silent:true});if(!record)return;app.script.analyzing=true;setMsg("scriptNotice","AI is identifying scenes, cast, locations, schedule conditions and production elements…");renderScriptBible();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),240000);
  try{const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error("Your session expired. Sign in again.");const response=await fetch("/api/script/analyze",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify({project_id:app.current.id,script_id:record.id,script_text:text,screenplay_title:$("scriptTitleInput").value.trim(),character_list:scriptCharacterRows()}),signal:controller.signal});const body=await response.json().catch(()=>({}));if(!response.ok){const supportCode=body.request_id?` Support code: ${String(body.request_id).slice(0,8)}.`:"";throw new Error(`${body.error||`Script analysis failed (${response.status}).`}${supportCode}`)}const analysis=normalizeScriptAnalysis(body.analysis);if(!analysis.scenes.length)throw new Error("AI could not identify any scenes. Check screenplay headings and try again.");app.ignoreRealtimeUntil=Date.now()+1800;const analyzedAt=new Date().toISOString(),modelBase=body.model||"glm-4.7-flash",analysisModel=body.analysis_mode&&body.analysis_mode!=="ai_prompt"?`${modelBase}:${body.analysis_mode}`:modelBase,{data,error}=await sb.from("project_scripts").update({analysis,analysis_model:analysisModel,analyzed_at:analyzedAt,applied_at:null,screenplay_title:$("scriptTitleInput").value.trim().slice(0,240),character_list:scriptCharacterRows()}).eq("id",record.id).select().single();if(error)throw error;app.script.record=data;app.script.analysis=analysis;if(!$("scriptTitleInput").value.trim())$("scriptTitleInput").value=analysis.title||"";syncDetectedCharacters(analysis);applyScreenplayFormatting(analysis);if(body.warning){const supportCode=body.request_id?` Support code: ${String(body.request_id).slice(0,8)}.`:"";setMsg("scriptNotice",`${body.warning}${supportCode}`,"warning")}else setMsg("scriptNotice",`Analysis ready: ${analysis.scenes.length} scenes, ${analysis.characters.length} characters, ${analysis.locations.length} locations and screenplay formatting applied. Review it, then apply the breakdown.`)}
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
    const appliedAt=new Date().toISOString(),{error}=await sb.from("project_scripts").update({applied_at:appliedAt}).eq("id",record.id);if(error)throw error;await openCloudProject(app.current.id,{sceneId:firstSceneId,preserveSelection:true});setMsg("aiBibleNotice","Script breakdown applied. Add Source Images where needed, then generate, review and lock each new Bible reference. Scene references are already assigned to their shots.");setMsg("scriptNotice","Breakdown applied to the project.");renderAiVisualBible()
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

function setBibleSection(section="visual",{focusProject=false}={}){
  const selected=section==="script"?"script":"visual",visual=selected==="visual";
  $("bibleVisualPanel").hidden=!visual;$("bibleScriptPanel").hidden=visual;
  for(const [id,active] of [["bibleVisualTabBtn",visual],["bibleScriptTabBtn",!visual]]){const button=$(id);button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1}
  if(focusProject&&visual)requestAnimationFrame(()=>$("bibleProjectSection")?.scrollIntoView({block:"start",behavior:"smooth"}))
}
async function openAiVisualBible(options={}){
  if(app.mode!=="cloud")return uiAlert("Bible and AI generation are available for signed-in cloud projects.");
  if(app.ai.ready&&!app.ai.generating)setMsg("aiBibleNotice","");
  const settings=options&&typeof options==="object"&&!options.currentTarget?options:{},dialog=$("aiBibleModal");setBibleSection(settings.section||"visual",{focusProject:false});renderAiVisualBible();if(!dialog.open)dialog.showModal();
  if(settings.focusProject)setBibleSection("visual",{focusProject:true});
  await Promise.all([...app.ai.characters,...app.ai.locations].filter(x=>(x.reference_path&&!x.referenceUrl)||(x.source_path&&!x.sourceUrl)||(x.spatial_reference_path&&!x.spatialReferenceUrl)||(x.face_scan_path&&!x.faceModelUrl)).map(signAiAsset));renderAiVisualBible()
}
function aiAssetCard(asset,type){
  const editable=can("media"),locked=!!asset.locked,styleMatches=!locked||asset.style_snapshot===app.current.style,hasReference=!!asset.reference_path,hasSource=!!asset.source_path,hasSpatial=!!asset.spatial_reference_path,hasFace=type==="character"&&!!asset.face_scan_path,generatingThis=app.ai.generating&&app.ai.generatingAssetId===asset.id;
  const linkedScan=type==="location"?(app.lighting.virtualLocations||[]).find(scan=>scan.id===asset.location_scan_id):null,hasGenerationGuide=hasSource||hasSpatial;
  const generateLabel=generatingThis?"Generating…":hasGenerationGuide?(hasReference?"Regenerate from References":"Generate from References"):(hasReference?"Regenerate":"Generate Reference");
  const spatialPanel=type==="character"?`
      <div class="ai-spatial-panel${hasFace||hasSpatial?" has-spatial":""}">
        ${hasSpatial&&asset.spatialReferenceUrl?`<button type="button" class="ai-spatial-preview has-image"><img src="${escapeHtml(asset.spatialReferenceUrl)}" alt="${escapeHtml(asset.name)} spatial face reference" loading="lazy"></button>`:`<span class="ai-spatial-preview" aria-hidden="true">◎</span>`}
        <div class="ai-spatial-copy"><strong>3D Face Scan</strong><small>${app.ai.spatialReady?"Attach a GLB/USDZ face scan. A rendered scan view is passed to AI; the model can also replace the mannequin head in Camera View.":"Run Spatial Bible & Lighting Studio v5.1 SQL to enable 3D face scans."}</small>
          <div class="ai-spatial-meta">${hasFace?`<span>${escapeHtml(String(asset.face_scan_format||"3D").toUpperCase())}</span><span>Mannequin ready</span>`:"<span>No scan attached</span>"}${hasSpatial?"<span>AI view ready</span>":""}</div>
          <div class="ai-spatial-actions"><label class="ai-upload-label ${!editable||!app.ai.spatialReady||app.ai.generating?"disabled":""}">${hasFace?"Replace 3D Face":"Add 3D Face"}<input class="ai-face-scan-input" type="file" accept=".glb,.usdz,model/gltf-binary,model/vnd.usdz+zip" hidden ${!editable||!app.ai.spatialReady||app.ai.generating?"disabled":""}></label>${hasFace?`<button type="button" class="refresh-spatial" ${!editable||app.ai.generating?"disabled":""}>Refresh AI View</button><button type="button" class="remove-spatial" ${!editable||app.ai.generating?"disabled":""}>Remove</button>`:""}</div>
        </div>
      </div>`:`
      <div class="ai-spatial-panel${asset.location_scan_id||hasSpatial?" has-spatial":""}">
        ${hasSpatial&&asset.spatialReferenceUrl?`<button type="button" class="ai-spatial-preview has-image"><img src="${escapeHtml(asset.spatialReferenceUrl)}" alt="${escapeHtml(asset.name)} spatial location reference" loading="lazy"></button>`:`<span class="ai-spatial-preview" aria-hidden="true">⌂</span>`}
        <div class="ai-spatial-copy"><strong>Linked 3D Location</strong><small>${app.ai.spatialReady?"Link a Virtual Location in Lighting Diagram and capture its Camera View for AI generation.":"Run Spatial Bible & Lighting Studio v5.1 SQL to enable scan links."}</small>
          <div class="ai-spatial-meta">${asset.location_scan_id?`<span>${escapeHtml(linkedScan?.name||"3D scan linked")}</span>`:"<span>No scan linked</span>"}${hasSpatial?"<span>AI view ready</span>":""}</div>
          <div class="ai-spatial-actions"><button type="button" class="open-lighting-spatial" ${!app.ai.spatialReady?"disabled":""}>Open Lighting Diagram</button>${hasSpatial?`<button type="button" class="remove-spatial" ${!editable||app.ai.generating?"disabled":""}>Remove AI View</button>`:""}</div>
        </div>
      </div>`;
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
        <button type="button" class="lock" ${!editable||(!hasReference&&!locked)?"disabled":""}>${locked?"Unlock":"Lock"}</button>
        <button type="button" class="delete" ${!editable?"disabled":""}>Delete</button>
      </div>
      <div class="ai-source-panel${hasSource?" has-source":""}">
        ${hasSource&&asset.sourceUrl?`<button type="button" class="ai-source-preview has-image" aria-label="Open ${escapeHtml(asset.name)} source image"><img src="${escapeHtml(asset.sourceUrl)}" alt="${escapeHtml(asset.name)} source" loading="lazy"></button>`:`<span class="ai-source-preview" aria-hidden="true">＋</span>`}
        <div class="ai-source-copy">
          <strong>Source Image</strong>
          <small>${app.ai.sourceReady?"Optional identity or location image used to guide Generate. The generated result remains the final Bible reference.":"Run the v4.4 SQL once to enable Source Image."}</small>
          <div class="ai-source-actions">
            <label class="ai-upload-label ${!editable||!app.ai.sourceReady||app.ai.generating?"disabled":""}">${hasSource?"Replace Source":"Add Source"}<input class="ai-source-input" type="file" accept="image/jpeg,image/png,image/webp" hidden ${!editable||!app.ai.sourceReady||app.ai.generating?"disabled":""}></label>
            ${hasSource?`<button type="button" class="remove-source" ${!editable||app.ai.generating?"disabled":""}>Remove Source</button>`:""}
          </div>
        </div>
      </div>
      ${spatialPanel}
      <div class="ai-asset-status${asset.generationStatusKind?` ${escapeHtml(asset.generationStatusKind)}`:""}" role="status" aria-live="polite" ${asset.generationStatus?"":"hidden"}>${escapeHtml(asset.generationStatus||"")}</div>
    </div>`;
  const name=card.querySelector(".ai-asset-name"),description=card.querySelector(".ai-asset-description");
  [name,description].forEach(el=>el.addEventListener("change",()=>updateAiAssetText(type,asset.id,name.value,description.value)));
  card.querySelector(".generate").onclick=()=>generateAiReference(type,asset.id);
  card.querySelector(".ai-source-input").onchange=e=>uploadAiSource(type,asset.id,e);
  card.querySelector(".ai-asset-image-open")?.addEventListener("click",()=>openImageViewer(aiAssetImageTarget(asset,type,"reference")));
  card.querySelector(".ai-source-preview.has-image")?.addEventListener("click",()=>openImageViewer(aiAssetImageTarget(asset,type,"source")));
  card.querySelector(".remove-source")?.addEventListener("click",()=>removeAiSource(type,asset.id));
  card.querySelector(".ai-spatial-preview.has-image")?.addEventListener("click",()=>openImageViewer(aiAssetImageTarget(asset,type,"spatial")));
  card.querySelector(".ai-face-scan-input")?.addEventListener("change",event=>uploadAiFaceScan(asset.id,event));
  card.querySelector(".refresh-spatial")?.addEventListener("click",()=>refreshAiFaceSpatialReference(asset.id));
  card.querySelector(".remove-spatial")?.addEventListener("click",()=>type==="character"?removeAiFaceScan(asset.id):removeAiSpatialReference(type,asset.id));
  card.querySelector(".open-lighting-spatial")?.addEventListener("click",async()=>{if($("aiBibleModal").open)$("aiBibleModal").close();await openLightingWorkspace();focusVirtualLocationSection()});
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
  aiCollection(type).push(normalizeAiAsset(data,type));nameEl.value="";descriptionEl.value="";setMsg("aiBibleNotice",`${name} added. Add a Source Image if needed, generate the reference, review it, then lock it.`);renderAiVisualBible();renderShot()
}
async function updateAiAssetText(type,id,name,description){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||asset.locked||!can("media"))return;
  name=name.trim();description=description.trim();if(!name||!description){renderAiVisualBible();return setMsg("aiBibleNotice","Name and stable description cannot be empty.","warning")}
  const {error}=await sb.from(aiTable(type)).update({name,description,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",app.current.id);
  if(error)return setMsg("aiBibleNotice",error.message,"warning");asset.name=name;asset.description=description;renderShot()
}
async function toggleAiAssetLock(type,id){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||!can("media"))return;
  if(!asset.locked&&!asset.reference_path)return setMsg("aiBibleNotice","Generate a reference before locking this item.","warning");
  const locked=!asset.locked,style_snapshot=locked?app.current.style:asset.style_snapshot;
  const {error}=await sb.from(aiTable(type)).update({locked,style_snapshot,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",app.current.id);
  if(error)return setMsg("aiBibleNotice",error.message,"warning");asset.locked=locked;asset.style_snapshot=style_snapshot;setMsg("aiBibleNotice",`${asset.name} ${locked?`locked for ${app.current.style}`:"unlocked for editing"}.`);renderAiVisualBible();renderShot();applyPermissionLocks()
}
async function deleteAiAsset(type,id){
  const asset=aiCollection(type).find(x=>x.id===id);if(!asset||!can("media")||!uiConfirm(`Delete ${asset.name} from the Bible?`))return;
  const {error}=await sb.from(aiTable(type)).delete().eq("id",id).eq("project_id",app.current.id);if(error)return setMsg("aiBibleNotice",error.message,"warning");
  await removeMediaPaths([asset.reference_path,asset.source_path,asset.spatial_reference_path,asset.face_scan_path]);if(type==="character")clearFaceModelCache(id);app.ai[type==="character"?"characters":"locations"]=aiCollection(type).filter(x=>x.id!==id);
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
async function loadSpatialModelRoot(sourceUrl,format,THREE){
  if(format==="usdz"){const {USDZLoader}=await import(USDZ_LOADER_CDN);return await new USDZLoader().loadAsync(sourceUrl)}
  const [{GLTFLoader},{DRACOLoader}]=await Promise.all([import(GLTF_LOADER_CDN),import(DRACO_LOADER_CDN)]),loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath(DRACO_DECODER_PATH);loader.setDRACOLoader(draco);
  try{const gltf=await loader.loadAsync(sourceUrl);return gltf.scene||gltf.scenes?.[0]}finally{draco.dispose()}
}
async function renderFaceScanSpatialBlob(sourceUrl,format){
  const THREE=await import(THREE_CDN),root=await loadSpatialModelRoot(sourceUrl,format,THREE);if(!root)throw new Error("The face scan has no readable 3D geometry.");
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x15191c);const wrapper=new THREE.Group();wrapper.add(root);scene.add(wrapper);
  root.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}});
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());if(box.isEmpty()||!Number.isFinite(size.x+size.y+size.z))throw new Error("The face scan geometry is invalid.");
  const largest=Math.max(size.x,size.y,size.z,.001),scale=2/largest;root.scale.setScalar(scale);root.position.set(-center.x*scale,-center.y*scale,-center.z*scale);wrapper.rotation.y=0;
  scene.add(new THREE.HemisphereLight(0xe5f1ff,0x16110f,1.6));const key=new THREE.DirectionalLight(0xffead8,3.4);key.position.set(2.5,3,4);scene.add(key);const fill=new THREE.DirectionalLight(0x87bfff,1.8);fill.position.set(-3,1.5,2);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(32,3/4,.01,50);camera.position.set(0,.05,4.2);camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});renderer.setPixelRatio(1);renderer.setSize(768,1024,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.render(scene,camera);
  const blob=await new Promise((resolve,reject)=>renderer.domElement.toBlob(value=>value?resolve(value):reject(new Error("Could not render the face scan.")),"image/jpeg",.88));renderer.dispose();disposeVirtualLocationObject(root);
  return {blob,metadata:{bounds:{x:size.x,y:size.y,z:size.z},previewGeneratedAt:new Date().toISOString()}}
}
async function storeAiSpatialReference(type,asset,sourceBlob){
  const optimized=await optimizeImageBlob(sourceBlob,496,.86),format=optimizedImageFormat(optimized),path=`${app.current.id}/ai/${aiFolder(type)}/${asset.id}/${Date.now()}-spatial.${format.extension}`,oldPath=asset.spatial_reference_path,oldUrl=asset.spatialReferenceUrl;
  const {error:uploadError}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
  const {error:updateError}=await sb.from(aiTable(type)).update({spatial_reference_path:path,locked:false,style_snapshot:null,updated_at:new Date().toISOString()}).eq("id",asset.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
  asset.spatial_reference_path=path;asset.spatialReferenceUrl=null;asset.locked=false;asset.style_snapshot=null;await signAiAsset(asset);if(!asset.spatialReferenceUrl)asset.spatialReferenceUrl=URL.createObjectURL(optimized);if(String(oldUrl||"").startsWith("blob:"))URL.revokeObjectURL(oldUrl);await removeMediaPaths([oldPath]);return asset
}
async function uploadAiFaceScan(id,event){
  const input=event.currentTarget,file=input.files?.[0],asset=app.ai.characters.find(item=>item.id===id);input.value="";if(!file||!asset||!app.ai.spatialReady||!can("media")||app.ai.generating)return;
  const format=virtualLocationFormat(file.name,file.type);if(!format||file.size>VIRTUAL_LOCATION_MAX_BYTES)return setMsg("aiBibleNotice","Use one self-contained GLB or USDZ face scan up to 250 MB.","warning");
  const oldModel=asset.face_scan_path,oldSpatial=asset.spatial_reference_path,path=`${app.current.id}/ai/characters/${asset.id}/faces/${Date.now()}-${safeVirtualLocationFileName(file.name)}`;let objectUrl=null;
  try{
    setMsg("aiBibleNotice",`Uploading 3D face scan for ${asset.name}…`);await uploadLargeModelResumable(file,path,null,"face-scan");
    const {error}=await sb.from("project_ai_characters").update({face_scan_path:path,face_scan_format:format,face_scan_metadata:{file_name:file.name,size_bytes:file.size,captured_with:"iphone-or-import"},spatial_reference_path:null,locked:false,style_snapshot:null,updated_at:new Date().toISOString()}).eq("id",asset.id).eq("project_id",app.current.id);if(error){await removeMediaPaths([path]);throw error}
    asset.face_scan_path=path;asset.face_scan_format=format;asset.face_scan_metadata={file_name:file.name,size_bytes:file.size,captured_with:"iphone-or-import"};asset.spatial_reference_path=null;asset.spatialReferenceUrl=null;asset.locked=false;asset.style_snapshot=null;clearFaceModelCache(asset.id);await signAiAsset(asset);await removeMediaPaths([oldModel,oldSpatial]);
    objectUrl=URL.createObjectURL(file);const rendered=await renderFaceScanSpatialBlob(objectUrl,format);asset.face_scan_metadata={...asset.face_scan_metadata,...rendered.metadata};await sb.from("project_ai_characters").update({face_scan_metadata:asset.face_scan_metadata}).eq("id",asset.id).eq("project_id",app.current.id);await storeAiSpatialReference("character",asset,rendered.blob);
    setMsg("aiBibleNotice",`${asset.name} now has a 3D face scan and an AI-ready rendered view.`);renderAiVisualBible();renderLightingInspector();syncLighting3D()
  }catch(error){console.error(error);setMsg("aiBibleNotice",error.message||"Could not save the 3D face scan.","warning");await loadAiVisualBible();renderAiVisualBible()}
  finally{if(objectUrl)URL.revokeObjectURL(objectUrl);app.lighting.faceUpload=null}
}
async function refreshAiFaceSpatialReference(id){
  const asset=app.ai.characters.find(item=>item.id===id);if(!asset?.face_scan_path||!app.ai.spatialReady||!can("media"))return;
  try{setMsg("aiBibleNotice",`Rendering ${asset.name}'s 3D face for AI…`);if(!asset.faceModelUrl)await signAiAsset(asset);const rendered=await renderFaceScanSpatialBlob(asset.faceModelUrl,asset.face_scan_format||"glb");asset.face_scan_metadata={...(asset.face_scan_metadata||{}),...rendered.metadata};await sb.from("project_ai_characters").update({face_scan_metadata:asset.face_scan_metadata}).eq("id",asset.id).eq("project_id",app.current.id);await storeAiSpatialReference("character",asset,rendered.blob);setMsg("aiBibleNotice",`${asset.name}'s AI face view was refreshed.`);renderAiVisualBible()}
  catch(error){setMsg("aiBibleNotice",error.message||"Could not render this face scan.","warning")}
}
async function removeAiSpatialReference(type,id){
  const asset=aiCollection(type).find(item=>item.id===id);if(!asset?.spatial_reference_path||!app.ai.spatialReady||!can("media"))return;if(!uiConfirm(`Remove the spatial AI view for ${asset.name}?`))return;
  const oldPath=asset.spatial_reference_path,oldUrl=asset.spatialReferenceUrl,{error}=await sb.from(aiTable(type)).update({spatial_reference_path:null,locked:false,style_snapshot:null,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",app.current.id);if(error)return setMsg("aiBibleNotice",error.message,"warning");asset.spatial_reference_path=null;asset.spatialReferenceUrl=null;asset.locked=false;asset.style_snapshot=null;if(String(oldUrl||"").startsWith("blob:"))URL.revokeObjectURL(oldUrl);await removeMediaPaths([oldPath]);renderAiVisualBible();renderShot()
}
async function removeAiFaceScan(id){
  const asset=app.ai.characters.find(item=>item.id===id);if(!asset?.face_scan_path||!app.ai.spatialReady||!can("media")||!uiConfirm(`Remove the 3D face scan for ${asset.name}?`))return;
  const paths=[asset.face_scan_path,asset.spatial_reference_path],urls=[asset.faceModelUrl,asset.spatialReferenceUrl],{error}=await sb.from("project_ai_characters").update({face_scan_path:null,face_scan_format:null,face_scan_metadata:{},spatial_reference_path:null,locked:false,style_snapshot:null,updated_at:new Date().toISOString()}).eq("id",id).eq("project_id",app.current.id);if(error)return setMsg("aiBibleNotice",error.message,"warning");
  Object.assign(asset,{face_scan_path:null,face_scan_format:null,face_scan_metadata:{},faceModelUrl:null,spatial_reference_path:null,spatialReferenceUrl:null,locked:false,style_snapshot:null});urls.filter(url=>String(url||"").startsWith("blob:")).forEach(url=>URL.revokeObjectURL(url));clearFaceModelCache(id);await removeMediaPaths(paths);setMsg("aiBibleNotice",`${asset.name}'s 3D face scan was removed.`);renderAiVisualBible();renderLightingInspector();syncLighting3D()
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
  if(!String(shot.summary||shot.notes||shot.description||shot.subject||"").trim())return {ready:false,message:"Add a shot summary or NOTE first."};
  const location=app.ai.locations.find(x=>x.id===shot.aiLocationId);if(!location)return {ready:false,message:"Choose a project location for this shot."};
  if(!location.reference_path)return {ready:false,message:`${location.name} needs a generated reference before this shot can be generated.`};
  if(!location.locked)return {ready:false,message:`Lock the ${location.name} reference before generating this shot.`};
  if(location.style_snapshot!==app.current.style)return {ready:false,message:`${location.name} was locked for a different style. Review and lock it again for ${app.current.style}.`};
  if((shot.aiCharacterIds||[]).length>3)return {ready:false,message:"Choose no more than 3 recurring characters for one generated shot."};
  const invalid=(shot.aiCharacterIds||[]).map(id=>app.ai.characters.find(c=>c.id===id)).find(x=>!x||!x.reference_path||!x.locked||x.style_snapshot!==app.current.style);if(invalid){const name=invalid?.name||"A selected character";if(!invalid?.reference_path)return {ready:false,message:`${name} needs a generated reference before this shot can be generated.`};if(!invalid.locked)return {ready:false,message:`Lock the ${name} reference before generating this shot.`};return {ready:false,message:`${name} was locked for a different style. Review and lock it again for ${app.current.style}.`}}
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
    const optimized=await optimizeImageBlob(result.blob,1024,.82),format=optimizedImageFormat(optimized),path=`${app.current.id}/${shot.id}/${Date.now()}-ai.${format.extension}`,oldPaths=[shot.imagePath,shot.originalImagePath];
    const {error:uploadError}=await sb.storage.from("storyboards").upload(path,optimized,{upsert:false,contentType:format.type,cacheControl:"31536000"});if(uploadError)throw uploadError;
    const {error:updateError}=await sb.from("shots").update({image_path:path,original_image_path:null}).eq("id",shot.id).eq("project_id",app.current.id);if(updateError){await removeMediaPaths([path]);throw updateError}
    shot.imagePath=path;shot.originalImagePath=null;shot.originalImage=null;shot.aiGeneration={provider:"cloudflare-workers-ai",model:result.model,generatedAt:new Date().toISOString(),locationId:shot.aiLocationId,characterIds:[...(shot.aiCharacterIds||[])],promptHash:result.promptHash};
    const {data:signed}=await sb.storage.from("storyboards").createSignedUrl(path,SIGNED_IMAGE_TTL_SECONDS);shot.image=signed?.signedUrl||URL.createObjectURL(optimized);
    await removeMediaPaths(oldPaths);const saved=await saveCloud("shot");if(saved)await recordShotGenerationScore(shot,result.promptHash);renderEditor();finalStatus=`Storyboard image generated and saved.${generationBalanceMessage(result.remaining)}`;finalStatusKind="success";setMsg("editorNotice",finalStatus)
  }catch(err){finalStatus=err.message||"Could not generate this shot.";finalStatusKind="error";setMsg("editorNotice",finalStatus,"warning")}
  finally{finishAiGeneration();app.suppressRealtime=Math.max(0,app.suppressRealtime-1);renderShot();applyPermissionLocks();if(finalStatus)announceAiShotStatus(finalStatus,finalStatusKind);rememberWorkspace();await loadAiUsage()}
}

/* ---------- SHEET TOGGLE ---------- */
function toggleSheet(force){
  app.sheetOpen=typeof force==="boolean"?force:!app.sheetOpen;$("sheetPanel").hidden=!app.sheetOpen;updateSheetButtons();rememberWorkspace();
  if(app.sheetOpen)loadLightingSheetLinks().catch(()=>{});
  if(isMobileEditor()){
    app.mobileScreen=app.sheetOpen?"sheet":"shot";syncMobileEditorUi();closeEditorActions();
    if(app.sheetOpen){renderSheet();requestAnimationFrame(()=>{$("sheetPanel").scrollTop=0})}
  }else if(app.sheetOpen){renderSheet();requestAnimationFrame(()=>$("sheetPanel").scrollIntoView({behavior:"smooth",block:"start"}))}
}
function updateSheetButtons(){
  $("sheetToggleBtn").classList.toggle("sheet-on",app.sheetOpen);$("mobileSheetBtn").classList.toggle("sheet-on",app.sheetOpen);$("sheetPanel").hidden=!app.sheetOpen;syncMobileEditorUi()
}
function sheetCols(per){return per>=8?"cols-3":"cols-2"}
async function loadLightingSheetLinks(){
  const projectId=app.current?.id;if(!projectId||app.lighting.sheetLinksProjectId===projectId)return;
  if(app.mode==="local"){
    let rows=[];try{rows=JSON.parse(localStorage.getItem(lightingLocalKey())||"[]")}catch(error){}app.lighting.sheetLinks=(rows||[]).map(row=>({id:row.id,scene_id:row.scene_id,shot_id:row.shot_id,name:row.name||"Lighting Diagram"}))
  }else{
    const {data,error}=await sb.from("lighting_diagrams").select("id,scene_id,shot_id,name,updated_at").eq("project_id",projectId).order("updated_at",{ascending:false});if(error)return;app.lighting.sheetLinks=data||[]
  }
  app.lighting.sheetLinksProjectId=projectId;if(app.sheetOpen)renderSheet()
}
function lightingSheetLinkForShot(shotId){return (app.lighting.sheetLinks||[]).find(row=>row.shot_id===shotId)||app.lighting.diagrams.find(row=>row.shot_id===shotId)}
function renderSheet(){
  if(!app.current)return;$("sheetProjectTitle").textContent=`${app.current.name} · Storyboard Sheet`;
  const per=Number($("shotsPerPage").value||6),pages=$("sheetPages");pages.innerHTML="";const flat=allShots();const ar=aspectNumbers(app.current);
  for(let i=0;i<flat.length;i+=per){
    const page=document.createElement("article");page.className="sheet-page";const chunk=flat.slice(i,i+per);
    page.innerHTML=`<div class="sheet-page-head"><h3>${escapeHtml(app.current.name)}</h3><span>Page ${Math.floor(i/per)+1} · ${escapeHtml(projectAspectText(app.current))}</span></div>`;
    const grid=document.createElement("div");grid.className=`sheet-grid ${sheetCols(per)}`;
    chunk.forEach(({scene,shot},chunkIndex)=>{
      const globalIndex=i+chunkIndex,previous=flat[globalIndex-1];
      if(globalIndex>0&&previous?.scene?.id!==scene.id){
        const divider=document.createElement("div");divider.className="sheet-scene-divider";divider.innerHTML=`<span>Scene ${scene.number}</span><strong>${escapeHtml(scene.title||"")}</strong>`;grid.appendChild(divider)
      }
      const card=document.createElement("div");card.className="sheet-shot";
      const image=shot.image?`<img src="${shot.image}" alt="" loading="lazy" decoding="async">`:`<div class="sheet-placeholder">Storyboard Frame<br>Shot ${shot.shotNo}</div>`;
      const lightingLink=lightingSheetLinkForShot(shot.id);
      card.innerHTML=`<div class="sheet-image" style="aspect-ratio:${ar.w}/${ar.h}">${image}</div><div class="sheet-info"><div class="sheet-scene">Scene ${scene.number} · ${escapeHtml(scene.title||"")}</div><div class="sheet-info-top"><span>SHOT ${shot.shotNo}</span><span>${escapeHtml(shot.duration||"")}</span></div><div class="sheet-meta">${escapeHtml(shortValue(shot.shotSize))} · ${escapeHtml(shot.angle||"")} · ${escapeHtml(shot.lens||"")} · ${escapeHtml(shot.movement||"")}</div><div class="sheet-summary">${escapeHtml(shot.summary||shot.description||"")}</div>${lightingLink?`<button type="button" class="sheet-lighting-shortcut" data-lighting-diagram="${escapeHtml(lightingLink.id)}">⌁ Open Lighting Diagram</button>`:""}</div>`;
      const sheetImage=card.querySelector(".sheet-image img");if(sheetImage){sheetImage.tabIndex=0;sheetImage.setAttribute("role","button");sheetImage.setAttribute("aria-label",`Open Shot ${shot.shotNo} image`);sheetImage.onclick=()=>openImageViewer(shotImageTarget(shot));sheetImage.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openImageViewer(shotImageTarget(shot))}}}
      card.querySelector(".sheet-lighting-shortcut")?.addEventListener("click",async event=>{event.stopPropagation();toggleSheet(false);await openLightingWorkspace({diagramId:lightingLink.id})});
      grid.appendChild(card)
    });
    page.appendChild(grid);pages.appendChild(page)
  }
}

/* ---------- COLLABORATION ---------- */
function readPermissionUI(){return {project_settings:$("permProject").checked,scenes:$("permScenes").checked,shots:$("permShots").checked,media:$("permMedia").checked,members:$("permMembers").checked,production_role:inviteProductionRole()}}
function writePermissionUI(p){$("permProject").checked=!!p.project_settings;$("permScenes").checked=!!p.scenes;$("permShots").checked=!!p.shots;$("permMedia").checked=!!p.media;$("permMembers").checked=!!p.members}
function setPermissionPreset(name){if(name==="viewer")writePermissionUI(blankPermissions());else if(name==="editor")writePermissionUI(editorPermissions())}

function productionRoleOptions(selected="general"){
  return Object.entries(PRODUCTION_ROLE_LABELS).map(([value,label])=>`<option value="${value}" ${value===normalizeProductionRole(selected)?"selected":""}>${escapeHtml(label)}</option>`).join("")
}
function productionDashboardViewForRole(role){
  return ({assistant_director:"assistant_director",production_manager:"production_manager",art_props:"art_props",costume_makeup:"costume_makeup",locations:"locations",sfx_vfx:"sfx_vfx"})[normalizeProductionRole(role)]||"all"
}
function productionMetric(label,value,detail=""){
  return `<div class="production-metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span>${detail?`<small>${escapeHtml(detail)}</small>`:""}</div>`
}
function productionBarChart(rows,empty="No breakdown data identified"){
  const safeRows=rows.filter(row=>Number(row.value)>0),max=Math.max(1,...safeRows.map(row=>Number(row.value)||0));
  if(!safeRows.length)return `<div class="production-empty-inline">${escapeHtml(empty)}</div>`;
  return `<div class="production-bars">${safeRows.map(row=>`<div class="production-bar-row"><span>${escapeHtml(row.label)}</span><div><i style="width:${Math.max(4,Math.round(Number(row.value)/max*100))}%"></i></div><strong>${Number(row.value)||0}</strong></div>`).join("")}</div>`
}
function productionElementCard(analysis,field,label){
  const items=productionElementOccurrences(analysis.scenes,field),preview=items.slice(0,18);
  return `<section class="production-element-card"><header><strong>${escapeHtml(label)}</strong><span>${items.length} unique</span></header>${preview.length?`<div class="production-element-list">${preview.map(item=>`<div><span>${escapeHtml(item.name)}</span><small>${item.count} scene${item.count===1?"":"s"} · ${item.scenes.map(number=>`S${number}`).join(", ")}</small></div>`).join("")}</div>`:'<div class="production-empty-inline">None identified</div>'}</section>`
}
function productionSceneFlags(scene){
  const flags=[];
  if(scene.special_location)flags.push("Special location");
  if(scene.extras?.length)flags.push("Background");
  if(scene.stunts?.length)flags.push("Stunts");
  if(scene.animals?.length)flags.push("Animals");
  if(scene.vehicles?.length)flags.push("Vehicles");
  if(scene.special_effects?.length)flags.push("SFX");
  if(scene.visual_effects?.length)flags.push("VFX");
  flags.push(...(scene.risk_flags||[]));
  return [...new Set(flags)].slice(0,8)
}
function productionSceneTable(analysis){
  const cards=analysis.scenes.map((scene,index)=>{const conversion=scene.time_strategy==="day_for_night"?"Day for Night":scene.time_strategy==="night_for_day"?"Night for Day":"Natural",flags=productionSceneFlags(scene),shots=app.current?.scenes?.find(projectScene=>projectScene.scriptSceneKey===scene.key)?.shots?.length||0;return `<article class="production-scene-card"><header><div><span>Scene</span><strong>S${index+1} · ${escapeHtml(scene.title)}</strong></div><div class="production-scene-shot-count"><strong>${shots}</strong><span>Shots</span></div></header><dl><div><dt>INT / EXT</dt><dd>${escapeHtml(scene.interior_exterior||"Unspecified")}</dd></div><div><dt>Location</dt><dd>${escapeHtml(scene.location||"—")}</dd></div><div><dt>Story Time</dt><dd>${escapeHtml(scene.story_time)}</dd></div><div><dt>Shoot Time</dt><dd>${escapeHtml(scene.shoot_time)}</dd></div><div><dt>Conversion</dt><dd>${escapeHtml(conversion)}</dd></div><div class="production-scene-wide"><dt>Cast</dt><dd>${escapeHtml(scene.characters.join(", ")||"—")}</dd></div><div class="production-scene-wide"><dt>Production Flags</dt><dd>${escapeHtml(flags.join(", ")||"—")}</dd></div></dl></article>`}).join("");
  return `<div class="production-scene-grid">${cards}</div>`
}
function renderProductionDashboard(){
  const wrap=$("productionDashboard"),select=$("productionDashboardRole");if(!wrap||!select||!app.current)return;
  if(app.productionDashboardProjectId!==app.current.id){select.value=productionDashboardViewForRole(app.permissions?.production_role);app.productionDashboardProjectId=app.current.id}
  const analysis=app.script.analysis,view=select.value||"all";
  if(!analysis){wrap.innerHTML='<div class="production-dashboard-empty"><strong>No analyzed script yet</strong><p>Open Bible → Script, save the screenplay and run Analyze with AI. The production chart will appear here automatically.</p><button type="button" class="btn open-script-analysis">Open Bible · Script</button></div>';wrap.querySelector(".open-script-analysis")?.addEventListener("click",()=>{$("collabModal").close();unsubscribeChatRealtime();openAiVisualBible({section:"script"})});return}
  const totals=productionSummary(analysis),cast=productionElementOccurrences(analysis.scenes,"characters"),scheduleRows=[{label:"Story · Day scenes",value:totals.storyDay},{label:"Story · Night scenes",value:totals.storyNight},{label:"Shoot · Day scenes",value:totals.shootDay},{label:"Shoot · Night scenes",value:totals.shootNight},{label:"Day for Night",value:totals.dayForNight},{label:"Night for Day",value:totals.nightForDay}],shotScheduleRows=[{label:"Story · Day shots",value:totals.storyDayShots},{label:"Story · Night shots",value:totals.storyNightShots},{label:"Shoot · Day shots",value:totals.shootDayShots},{label:"Shoot · Night shots",value:totals.shootNightShots}],spaceRows=[{label:"Interior scenes",value:totals.interiors},{label:"Exterior scenes",value:totals.exteriors},{label:"Special production",value:totals.specialScenes}],shotSpaceRows=[{label:"Interior shots",value:totals.interiorShots},{label:"Exterior shots",value:totals.exteriorShots},{label:"All planned shots",value:totals.plannedShots}],assignmentRows=[{label:"Cast occurrences",value:analysis.scenes.reduce((sum,scene)=>sum+scene.characters.length,0)},{label:"Background scenes",value:analysis.scenes.filter(scene=>scene.extras?.length).length},{label:"Stunt scenes",value:analysis.scenes.filter(scene=>scene.stunts?.length).length},{label:"Vehicle scenes",value:analysis.scenes.filter(scene=>scene.vehicles?.length).length},{label:"Animal scenes",value:analysis.scenes.filter(scene=>scene.animals?.length).length}];
  const allFields=PRODUCTION_ELEMENT_FIELDS.filter(([field])=>field!=="production_notes"),roleFields={art_props:["props","set_dressing","special_equipment","production_notes"],costume_makeup:["wardrobe","makeup_hair","production_notes"],locations:["location_requirements","safety_security","production_notes","risk_flags"],sfx_vfx:["stunts","special_effects","visual_effects","special_equipment","risk_flags"]},selectedFields=roleFields[view]?PRODUCTION_ELEMENT_FIELDS.filter(([field])=>roleFields[view].includes(field)):allFields;
  const showAd=view==="all"||view==="assistant_director",showManager=view==="all"||view==="production_manager",showElements=!showAd||showManager||view==="all";
  const legacyNote=!totals.hasProductionDetails?'<div class="notice warning production-analysis-warning">This saved analysis does not contain the new department fields. Re-analyze the script in Bible to complete this dashboard.</div>':"";
  wrap.innerHTML=`${legacyNote}<div class="production-metric-grid">${productionMetric("Scenes",totals.scenes)}${productionMetric("Planned Shots",totals.plannedShots)}${productionMetric("INT",totals.interiors,`${totals.interiorShots} shots`)}${productionMetric("EXT",totals.exteriors,`${totals.exteriorShots} shots`)}${productionMetric("Story Night",totals.storyNight,`${totals.storyNightShots} shots`)}${productionMetric("Time Conversions",totals.dayForNight+totals.nightForDay)}${productionMetric("Unique Props",totals.props)}${productionMetric("Special Scenes",totals.specialScenes)}${productionMetric("Locations",analysis.locations.length)}</div>${showAd?`<section class="production-dashboard-section"><div class="production-section-head"><div><strong>Assistant Director · Schedule & Continuity</strong><small>Scene and planned-shot totals for environment, story/shoot time, conversions and performers.</small></div></div><div class="production-chart-grid"><div><h4>Day / Night · Scenes</h4>${productionBarChart(scheduleRows)}</div><div><h4>Day / Night · Planned Shots</h4>${productionBarChart(shotScheduleRows,"Apply the breakdown and create shots to populate this chart")}</div><div><h4>INT / EXT · Scenes</h4>${productionBarChart(spaceRows)}</div><div><h4>INT / EXT · Planned Shots</h4>${productionBarChart(shotSpaceRows,"Apply the breakdown and create shots to populate this chart")}</div><div><h4>Scene Requirements</h4>${productionBarChart(assignmentRows)}</div><div><h4>Cast by Scene Occurrence</h4>${productionBarChart(cast.slice(0,12).map(item=>({label:item.name,value:item.count})),"No recurring cast identified")}</div></div></section>`:""}${showManager?`<section class="production-dashboard-section"><div class="production-section-head"><div><strong>Production Manager · Resources & Logistics</strong><small>Unique elements to source, coordinate, permit, schedule or protect.</small></div></div><div class="production-elements-grid">${allFields.map(([field,label])=>productionElementCard(analysis,field,label)).join("")}</div></section>`:""}${showElements&&!showManager?`<section class="production-dashboard-section"><div class="production-section-head"><div><strong>${escapeHtml($("productionDashboardRole").options[$("productionDashboardRole").selectedIndex]?.textContent||"Department")} · Department Elements</strong><small>Items and scene occurrences relevant to this department.</small></div></div><div class="production-elements-grid">${selectedFields.map(([field,label])=>productionElementCard(analysis,field,label)).join("")}</div></section>`:""}<section class="production-dashboard-section"><div class="production-section-head"><div><strong>Scene Breakdown Chart</strong><small>Use scene rows to coordinate schedule, shot plans, cast, locations and department flags.</small></div></div>${productionSceneTable(analysis)}</section>`
}

function setCollabTab(tab){
  app.collabTab=["chat","members","production"].includes(tab)?tab:"chat";
  const chat=app.collabTab==="chat",members=app.collabTab==="members",production=app.collabTab==="production";
  $("collabModal").classList.toggle("production-mode",production);
  $("collabChatTab").classList.toggle("active",chat);$("collabMembersTab").classList.toggle("active",members);$("collabProductionTab").classList.toggle("active",production);
  $("collabChatPane").hidden=!chat;$("collabMembersPane").hidden=!members;$("collabProductionPane").hidden=!production;
  if(chat){
    renderChatReferenceOptions();
    renderChatMentionOptions();
    renderChatMessages();
    setTimeout(()=>{const box=$("chatMessages");if(box)box.scrollTop=box.scrollHeight},30)
  }else if(members)renderMembers();else renderProductionDashboard();
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
    const sections=[["shot_frame","Frame"],["shot_light","Light"],["shot_props","Props"],["shot_audio","Audio"],["shot_notes","Note"]];
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
  const sectionMap={shot_frame:"frameSection",shot_subject:"shotNoteCard",shot_light:"lightSection",shot_props:"propsSection",shot_audio:"audioSection",shot_edit:"shotNoteCard",shot_notes:"shotNoteCard"};
  const sectionId=sectionMap[type];if(sectionId){const d=$(sectionId);if(d){if(d.tagName==="DETAILS")d.open=true;setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),30)}}
}
function subscribeChatRealtime(){
  unsubscribeChatRealtime();if(!sb||app.mode!=="cloud"||!app.current)return;
  const pid=app.current.id;app.chatChannel=sb.channel(`project-chat-modal-${pid}`)
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"project_messages",filter:`project_id=eq.${pid}`},()=>renderChatMessages())
    .subscribe()
}
function unsubscribeChatRealtime(){if(sb&&app.chatChannel){sb.removeChannel(app.chatChannel);app.chatChannel=null}}
async function openCollab(initialTab="chat"){
  if(app.mode!=="cloud"){uiAlert("Collaboration becomes available after Supabase cloud accounts are connected.");return}
  $("collabModal").showModal();setMsg("collabMessage","");$("shareLinkBox").hidden=true;
  $("collabOwnerTools").hidden=!(app.isOwner||can("members"));
  setCollabTab(initialTab);subscribeChatRealtime()
}
async function renderMembers(){
  const wrap=$("membersList");wrap.innerHTML="";const pid=app.current.id;
  const {data:members,error}=await sb.from("project_members").select("user_id,role,permissions,joined_at").eq("project_id",pid);if(error){setMsg("collabMessage",error.message,"warning");return}
  const ids=(members||[]).map(x=>x.user_id);let profiles=[];
  if(ids.length){const {data}=await sb.from("profiles").select("id,username,display_name").in("id",ids);profiles=data||[]}
  const owner=document.createElement("div");owner.className="member-row";owner.innerHTML=`<span><strong>Project owner</strong><small>Full access</small></span><span class="member-specialty-badge">Owner · All Departments</span>`;wrap.appendChild(owner);
  (members||[]).forEach(m=>{
    const pr=profiles.find(p=>p.id===m.user_id)||{};const row=document.createElement("div");row.className="member-row";
    const manage=app.isOwner||can("members"),specialty=normalizeProductionRole(m.permissions?.production_role);
    row.innerHTML=`<span class="member-identity"><strong>${escapeHtml(pr.display_name||pr.username||"Member")}</strong><small>${pr.username?"@"+escapeHtml(pr.username):""}</small><em>${escapeHtml(m.role||"member")}</em></span>${manage?`<span class="member-management"><label>Production Specialty<select class="member-specialty-select">${productionRoleOptions(specialty)}</select></label><span class="member-actions"><button type="button" class="btn ghost edit-member">Access</button><button type="button" class="btn ghost remove-member">Remove</button></span></span>`:`<span class="member-specialty-badge">${escapeHtml(PRODUCTION_ROLE_LABELS[specialty])}</span>`}`;
    if(manage){
      row.querySelector(".member-specialty-select").onchange=async event=>{const select=event.currentTarget,next=normalizeProductionRole(select.value),previous=specialty;select.disabled=true;const permissions={...(m.permissions||blankPermissions()),production_role:next},rpc=adminSupporting()?"storyboard_admin_update_project_member":"update_project_member_access",{error}=await sb.rpc(rpc,{p_project_id:pid,p_user_id:m.user_id,p_role:m.role||"member",p_permissions:permissions});select.disabled=false;if(error){select.value=previous;setMsg("collabMessage",error.message,"warning")}else{m.permissions=permissions;setMsg("collabMessage",`${pr.display_name||pr.username||"Member"} now opens the ${PRODUCTION_ROLE_LABELS[next]} dashboard.`)}};
      row.querySelector(".edit-member").onclick=async()=>{const preset=uiPrompt("Set role: viewer, editor or custom","editor");if(!preset)return;const specialtyNow=normalizeProductionRole(m.permissions?.production_role),base=preset==="viewer"?blankPermissions():preset==="editor"?editorPermissions():m.permissions||editorPermissions(),perms={...base,production_role:specialtyNow};const rpc=adminSupporting()?"storyboard_admin_update_project_member":"update_project_member_access";const {error}=await sb.rpc(rpc,{p_project_id:pid,p_user_id:m.user_id,p_role:preset,p_permissions:perms});if(error)setMsg("collabMessage",error.message,"warning");else renderMembers()};
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
      const shot={...blankShot(i+1),...shots[i],shotNo:i+1,position:i+1};delete shot.id;delete shot.image;delete shot.imagePath;delete shot.originalImage;delete shot.originalImagePath;
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



/* ---------- LIGHTING STUDIO v5.8 ---------- */
/* Manufacturer-published sensor and recording-area data. Dimensions are millimetres. */
const CINEMA_CAMERAS = Object.freeze({
  "ARRI ALEXA XT":{brand:"ARRI",model:"ALEXA XT",sensorWidth:28.25,sensorHeight:18.17,activeWidth:28.25,activeHeight:18.17,resolution:"3424 × 2202",format:"ALEV III Open Gate",hud:"arri",display:"EVF-1 / MON OUT",bitDepth:"12-bit ARRIRAW",dynamicRange:"14.5 stops",source:"https://www.arri.com/resource/blob/279392/13ef3e45b45c888c6f7eeb0b7a4825c4/alexa-xt-user-manual-sup-9-1-data.pdf"},
  "ARRI ALEXA Classic":{brand:"ARRI",model:"ALEXA Classic",sensorWidth:28.25,sensorHeight:18.17,activeWidth:23.76,activeHeight:17.82,resolution:"2880 × 2160",format:"ALEV III 4:3",hud:"arri",display:"EVF-1",bitDepth:"12-bit ARRIRAW (external)",dynamicRange:"14.5 stops",source:"https://www.arri.com/en/learn-help/learn-help-camera-system/image-science/image-quality"},
  "ARRI ALEXA LF":{brand:"ARRI",model:"ALEXA LF",sensorWidth:36.70,sensorHeight:25.54,activeWidth:36.70,activeHeight:25.54,resolution:"4448 × 3096",format:"ALEV III LF Open Gate",hud:"arri",display:"MVF-2",bitDepth:"12-bit ARRIRAW",dynamicRange:"14.5 stops",source:"https://www.arri.com/resource/blob/31900/0e7ebc9a3ed67d6f2be7d3ad263f5b5e/alexa-lf-user-manual-data.pdf"},
  "ARRI ALEXA Mini":{brand:"ARRI",model:"ALEXA Mini",sensorWidth:28.25,sensorHeight:18.17,activeWidth:28.25,activeHeight:18.17,resolution:"3424 × 2202",format:"ALEV III Open Gate",hud:"arri",display:"MVF-1",bitDepth:"12-bit ARRIRAW",dynamicRange:"14.5+ stops",source:"https://www.arri.com/resource/blob/279366/17ee4ee06ab474988cf09f42ee574a9f/alexa-mini-user-manual-sup-6-1-data.pdf"},
  "RED EPIC DRAGON":{brand:"RED",model:"EPIC DRAGON",sensorWidth:30.70,sensorHeight:15.80,activeWidth:30.70,activeHeight:15.80,resolution:"6144 × 3160",format:"DRAGON 6K",hud:"red",display:"DSMC Touch",bitDepth:"16-bit REDCODE RAW",dynamicRange:"16.5+ stops",source:"https://docs.red.com/955-0153/EPICSCARLET_Operation_Guide/Content/1_Intro/Tech_Specs_EPIC_DRAGON.htm"},
  "RED KOMODO 6K":{brand:"RED",model:"KOMODO 6K",sensorWidth:27.03,sensorHeight:14.26,activeWidth:27.03,activeHeight:14.26,resolution:"6144 × 3240",format:"S35 Global Shutter",hud:"red",display:"KOMODO LCD",bitDepth:"16-bit REDCODE RAW",dynamicRange:"16+ stops",source:"https://docs.red.com/955-0190/955-0190_V1.7%20Rev-B%20RED%20PS%2C%20KOMODO%206K%20Operation%20Guide/Content/1_Intro/Tech_Specs.htm"},
  "Sony BURANO":{brand:"Sony",model:"BURANO",sensorWidth:35.90,sensorHeight:24.00,activeWidth:35.90,activeHeight:20.20,resolution:"8632 × 4856",format:"FF 8.6K 16:9",hud:"sony",display:"3.5-inch LCD",bitDepth:"16-bit X-OCN LT (internal)",dynamicRange:"16 stops",source:"https://pro.sony/ue_US/products/digital-cinema-cameras/burano"},
  "Sony PXW-FX9":{brand:"Sony",model:"PXW-FX9",sensorWidth:35.70,sensorHeight:18.80,activeWidth:35.70,activeHeight:18.80,resolution:"6K Full Frame",format:"FF 6K",hud:"sony",display:"3.5-inch LCD",bitDepth:"16-bit RAW out · 10-bit internal",dynamicRange:"15+ stops",source:"https://pro.sony/ue_US/products/handheld-camcorders/pxw-fx9"},
  "Sony FX6":{brand:"Sony",model:"FX6",sensorWidth:35.60,sensorHeight:23.80,activeWidth:35.60,activeHeight:20.03,resolution:"4240 × 2385",format:"FF 4.2K 16:9",hud:"sony",display:"3.5-inch LCD",bitDepth:"16-bit RAW out · 10-bit internal",dynamicRange:"15+ stops",source:"https://pro.sony/en_MM/pdf/ilme-fx6"},
  "Sony FX3":{brand:"Sony",model:"FX3",sensorWidth:35.60,sensorHeight:23.80,activeWidth:35.60,activeHeight:20.03,resolution:"4264 × 2408",format:"FF 4.2K 16:9",hud:"sony",display:"3.0-inch LCD",bitDepth:"16-bit RAW out · 10-bit internal",dynamicRange:"15+ stops",source:"https://www.sony.com/electronics/support/camcorders-and-video-cameras-interchangeable-lens-camcorders/ilme-fx3/specifications"},
  "Canon EOS C500":{brand:"Canon",model:"EOS C500",sensorWidth:26.20,sensorHeight:13.80,activeWidth:26.20,activeHeight:13.80,resolution:"4206 × 2340",format:"Super 35",hud:"canon",display:"4-inch LCD",bitDepth:"12-bit 4K RAW ≤60p · 10-bit ≤120p",dynamicRange:"12 stops (Canon Log)",source:"https://downloads.canon.com/cinemaeos/EOS_C500_C500PL_White_Paper.pdf"},
  "Canon EOS C500 Mark II":{brand:"Canon",model:"EOS C500 Mark II",sensorWidth:38.10,sensorHeight:20.10,activeWidth:38.10,activeHeight:20.10,resolution:"5952 × 3140",format:"5.9K Full Frame",hud:"canon",display:"LM-V2 LCD",bitDepth:"12-bit Cinema RAW Light",dynamicRange:"15+ stops",source:"https://www.canon-europe.com/video-cameras/eos-c500-mark-ii/specifications/"}
});

const LIGHTING_FIXTURES = {
  "ARRI Orbiter":            {brand:"ARRI",model:"Orbiter",iconType:"orbiter",group:"ARRI",mount:"arri-qli",beam:80,beamMin:4,beamMax:80,shape:"spot",kelvin:5600,kelvinMin:2000,kelvinMax:20000,intensity:82,length:430,watts:500,engine:"RGBACL",output:1.18},
  "ARRI L7-C Plus":          {brand:"ARRI",model:"L7-C Plus",iconType:"fresnel",group:"ARRI",mount:"arri-l7",beam:30,beamMin:12,beamMax:45,shape:"spot",kelvin:5600,kelvinMin:2800,kelvinMax:10000,intensity:78,length:380,watts:220,engine:"RGBW",output:1.02},
  "ARRI SkyPanel X21":       {brand:"ARRI",model:"SkyPanel X21",iconType:"panel",group:"ARRI",mount:"arri-x21",beam:107,beamMin:11,beamMax:121,shape:"panel",kelvin:5600,kelvinMin:1500,kelvinMax:20000,intensity:74,length:335,engine:"RGBACL",output:1.08},
  "Nanlite Forza 60C":       {brand:"Nanlite",model:"Forza 60C",iconType:"cob",group:"NANLITE",mount:"fm",beam:45,beamMin:19,beamMax:120,shape:"spot",kelvin:5600,kelvinMin:1800,kelvinMax:20000,intensity:76,length:330,watts:88,engine:"RGBLAC",output:.76},
  "Nanlite Forza 300B II":   {brand:"Nanlite",model:"Forza 300B II",iconType:"cob",group:"NANLITE",mount:"bowens",beam:55,beamMin:10,beamMax:120,shape:"spot",kelvin:5600,kelvinMin:2700,kelvinMax:6500,intensity:88,length:450,watts:350,engine:"Bi-color",output:1.12},
  "Nanlite PavoSlim 60C":    {brand:"Nanlite",model:"PavoSlim 60C",iconType:"slim-panel",group:"NANLITE",mount:"pavoslim",beam:60,beamMin:40,beamMax:100,shape:"panel",kelvin:5600,kelvinMin:2700,kelvinMax:7500,intensity:68,length:310,engine:"RGBWW",output:.72},
  "Nanlite PavoTube II 30C": {brand:"Nanlite",model:"PavoTube II 30C",iconType:"tube",group:"NANLITE",mount:"tube",beam:125,beamMin:90,beamMax:165,shape:"tube",kelvin:5600,kelvinMin:2700,kelvinMax:7500,intensity:62,length:270,watts:60,engine:"RGBWW",output:.63},
  "Practical Bulb":          {brand:"Practical",model:"Bulb",iconType:"bulb",group:"PRACTICAL",mount:"practical",beam:165,beamMin:120,beamMax:175,shape:"omni",kelvin:2700,kelvinMin:1800,kelvinMax:6500,intensity:48,length:190,output:.32},
  "Window":                  {brand:"Natural",model:"Window",iconType:"window",group:"PRACTICAL",mount:"window",beam:95,beamMin:45,beamMax:140,shape:"panel",kelvin:5600,kelvinMin:3000,kelvinMax:12000,intensity:62,length:360,output:.88},
  "Candle":                  {brand:"Practical",model:"Candle",iconType:"candle",group:"PRACTICAL",mount:"practical",beam:165,beamMin:120,beamMax:175,shape:"omni",kelvin:2000,kelvinMin:1800,kelvinMax:3200,intensity:24,length:115,output:.16},

  /* Backward-compatible definitions for diagrams saved before v5.1. */
  "Fresnel":        {brand:"Legacy",model:"Fresnel",iconType:"fresnel",group:"LEGACY",catalog:false,mount:"generic",beam:28,beamMin:8,beamMax:65,shape:"spot",kelvin:3200,kelvinMin:1800,kelvinMax:12000,intensity:78,length:360,output:.9},
  "COB Spot":       {brand:"Legacy",model:"COB Spot",iconType:"cob",group:"LEGACY",catalog:false,mount:"bowens",beam:44,beamMin:10,beamMax:120,shape:"spot",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:82,length:390,output:1},
  "PAR":            {brand:"Legacy",model:"PAR",iconType:"par",group:"LEGACY",catalog:false,mount:"generic",beam:18,beamMin:8,beamMax:60,shape:"spot",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:88,length:430,output:1},
  "Projection":     {brand:"Legacy",model:"Projection",iconType:"projection",group:"LEGACY",catalog:false,mount:"bowens",beam:20,beamMin:8,beamMax:60,shape:"spot",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:84,length:450,output:.9},
  "LED Panel":      {brand:"Legacy",model:"LED Panel",iconType:"panel",group:"LEGACY",catalog:false,mount:"panel",beam:100,beamMin:30,beamMax:140,shape:"panel",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:68,length:310,output:.7},
  "Softbox":        {brand:"Legacy",model:"Softbox",iconType:"softbox",group:"LEGACY",catalog:false,mount:"soft",beam:112,beamMin:60,beamMax:150,shape:"panel",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:64,length:290,output:.55},
  "Lantern":        {brand:"Legacy",model:"Lantern",iconType:"lantern",group:"LEGACY",catalog:false,mount:"soft",beam:155,beamMin:120,beamMax:175,shape:"omni",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:58,length:220,output:.48},
  "Tube":           {brand:"Legacy",model:"Tube",iconType:"tube",group:"LEGACY",catalog:false,mount:"tube",beam:125,beamMin:90,beamMax:165,shape:"tube",kelvin:5600,kelvinMin:1800,kelvinMax:12000,intensity:58,length:270,output:.52}
};

const LIGHTING_MODIFIERS = {
  "None":                         {short:"Open / Native",mounts:["all"],softness:0,transmission:1,attachment:"none",description:"Fixture native beam"},
  "ARRI Orbiter Beam 4°":         {short:"Beam 4°",mounts:["arri-qli"],beam:4,beamMin:4,beamMax:4,softness:.02,transmission:.82,attachment:"projection",description:"Orbiter Beam optic"},
  "ARRI Orbiter Projection 25°":  {short:"Projection 25°",mounts:["arri-qli"],beam:25,beamMin:25,beamMax:25,softness:.03,transmission:.78,attachment:"projection",description:"Orbiter projection optic"},
  "ARRI Orbiter Projection 35°":  {short:"Projection 35°",mounts:["arri-qli"],beam:35,beamMin:35,beamMax:35,softness:.04,transmission:.78,attachment:"projection",description:"Orbiter projection optic"},
  "ARRI Orbiter Fresnel 15–65°":  {short:"Fresnel 15–65°",mounts:["arri-qli"],beam:32,beamMin:15,beamMax:65,softness:.1,transmission:.86,attachment:"fresnel",description:"Orbiter motorized Fresnel lens"},
  "ARRI Orbiter Open Face 15°":   {short:"Open Face 15°",mounts:["arri-qli"],beam:15,beamMin:15,beamMax:15,softness:.05,transmission:.96,attachment:"reflector",description:"Orbiter Open Face optic"},
  "ARRI Orbiter Open Face 30°":   {short:"Open Face 30°",mounts:["arri-qli"],beam:30,beamMin:30,beamMax:30,softness:.06,transmission:.96,attachment:"reflector",description:"Orbiter Open Face optic"},
  "ARRI Orbiter Open Face 60°":   {short:"Open Face 60°",mounts:["arri-qli"],beam:60,beamMin:60,beamMax:60,softness:.08,transmission:.95,attachment:"reflector",description:"Orbiter Open Face optic"},
  "ARRI Orbiter Softbox":         {short:"Orbiter Softbox",mounts:["arri-qli"],beam:105,beamMin:85,beamMax:125,softness:.72,transmission:.62,attachment:"softbox",description:"Large soft source"},
  "ARRI SkyPanel X21 HyPer 11°":  {short:"HyPer 11°",mounts:["arri-x21"],beam:11,beamMin:11,beamMax:11,softness:.04,transmission:.92,attachment:"panel-lens",description:"Hard parallel beam"},
  "ARRI SkyPanel X21 Dome 107°":  {short:"Dome 107°",mounts:["arri-x21"],beam:107,beamMin:107,beamMax:107,softness:.84,transmission:.7,attachment:"dome",description:"Soft omnidirectional dome"},
  "ARRI SkyPanel X21 Open 121°":  {short:"Open Face 121°",mounts:["arri-x21"],beam:121,beamMin:121,beamMax:121,softness:.5,transmission:.95,attachment:"panel-lens",description:"Wide open-face panel"},
  "Nanlite FL-20G Fresnel 10–45°":{short:"FL-20G 10–45°",mounts:["bowens"],beam:25,beamMin:10,beamMax:45,softness:.09,transmission:.84,attachment:"fresnel",description:"Bowens Fresnel lens"},
  "Nanlite PJ-BM Projection 19°": {short:"PJ-BM 19°",mounts:["bowens"],beam:19,beamMin:19,beamMax:19,softness:.02,transmission:.72,attachment:"projection",description:"Bowens projection attachment"},
  "Nanlite PJ-BM Zoom 25–45°":   {short:"PJ-BM 25–45°",mounts:["bowens"],beam:35,beamMin:25,beamMax:45,softness:.03,transmission:.7,attachment:"projection",description:"Bowens zoom projection"},
  "Nanlite Rapid 90 Parabolic":   {short:"Rapid 90",mounts:["bowens","fm"],beam:90,beamMin:70,beamMax:105,softness:.74,transmission:.68,attachment:"parabolic",description:"90 cm parabolic softbox"},
  "Nanlite Rapid 120 Parabolic":  {short:"Rapid 120",mounts:["bowens","fm"],beam:90,beamMin:60,beamMax:100,softness:.84,transmission:.62,attachment:"parabolic",description:"120 cm parabolic softbox"},
  "Nanlite Rapid 120 + Eggcrate": {short:"Rapid 120 Grid",mounts:["bowens","fm"],beam:55,beamMin:50,beamMax:60,softness:.8,transmission:.52,attachment:"parabolic-grid",description:"Parabolic softbox with grid"},
  "Nanlite Lantern":              {short:"Lantern",mounts:["bowens","fm"],beam:160,beamMin:140,beamMax:175,softness:.92,transmission:.58,attachment:"lantern",description:"Near-omnidirectional soft source"},
  "Nanlite Strip Softbox":        {short:"Stripbox",mounts:["bowens","fm"],beam:82,beamMin:55,beamMax:105,softness:.72,transmission:.64,attachment:"stripbox",description:"Narrow rectangular soft source"},
  "PavoSlim Softbox + Grid":      {short:"Softbox + Grid",mounts:["pavoslim"],beam:50,beamMin:40,beamMax:70,softness:.72,transmission:.58,attachment:"panel-softbox",description:"Panel softbox with eggcrate"},
  "PavoTube Grid":                {short:"Tube Grid",mounts:["tube"],beam:70,beamMin:55,beamMax:90,softness:.28,transmission:.78,attachment:"tube-grid",description:"Controls tube spill"},
  "251 Quarter Diffusion":        {short:"251 ¼ Diff",mounts:["all"],spread:8,softness:.15,transmission:.88,attachment:"frame",description:"Light diffusion frame"},
  "250 Half Diffusion":           {short:"250 ½ Diff",mounts:["all"],spread:16,softness:.28,transmission:.76,attachment:"frame",description:"Medium diffusion frame"},
  "216 Full Diffusion":           {short:"216 Full",mounts:["all"],spread:26,softness:.44,transmission:.61,attachment:"frame",description:"Heavy diffusion frame"},
  "Opal":                         {short:"Opal",mounts:["all"],spread:12,softness:.23,transmission:.82,attachment:"frame",description:"Opal diffusion"},
  "Hampshire Frost":              {short:"Hampshire",mounts:["all"],spread:18,softness:.31,transmission:.73,attachment:"frame",description:"Frost diffusion"},
  "Light Grid Cloth":             {short:"Light Grid",mounts:["all"],spread:12,softness:.24,transmission:.82,attachment:"frame",description:"Light grid cloth"},
  "Grid Cloth":                   {short:"Grid Cloth",mounts:["all"],spread:28,softness:.46,transmission:.58,attachment:"frame",description:"Full grid cloth"},
  "Magic Cloth":                  {short:"Magic Cloth",mounts:["all"],spread:34,softness:.55,transmission:.49,attachment:"frame",description:"Dense diffusion"},
  "Silk":                         {short:"Silk",mounts:["all"],spread:22,softness:.38,transmission:.68,attachment:"frame",description:"Silk diffusion"},
  "Muslin Bounce":                {short:"Muslin",mounts:["all"],beam:120,beamMin:90,beamMax:150,softness:.8,transmission:.46,attachment:"bounce",description:"Warm bounce source"}
};

// Use the same jsDelivr ESM identity imported internally by the addon loaders.
// Keeping one Three.js module instance avoids cross-module scene graph issues.
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.185.1/+esm";
const GLTF_LOADER_CDN = "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/loaders/GLTFLoader.js/+esm";
const USDZ_LOADER_CDN = "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/loaders/USDZLoader.js/+esm";
const DRACO_LOADER_CDN = "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/loaders/DRACOLoader.js/+esm";
const DRACO_DECODER_PATH = "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/draco/";
const TUS_CLIENT_CDN = "https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/+esm";
const VIRTUAL_LOCATION_MAX_BYTES = 250 * 1024 * 1024;
const VIRTUAL_LOCATION_SIGNED_URL_SECONDS = 60 * 60;

function defaultVirtualLocationSettings(){
  return {scanId:null,transform:{scale:1,rotationY:0,x:0,y:0,z:0}}
}
function normalizeVirtualLocationSettings(value){
  const input=value&&typeof value==="object"?value:{},transform=input.transform&&typeof input.transform==="object"?input.transform:{};
  return {
    scanId:String(input.scanId||"")||null,
    transform:{
      scale:Math.max(.1,Math.min(5,Number(transform.scale)||1)),
      rotationY:Math.max(-180,Math.min(180,Number(transform.rotationY)||0)),
      x:Math.max(-20,Math.min(20,Number(transform.x)||0)),
      y:Math.max(-5,Math.min(5,Number(transform.y)||0)),
      z:Math.max(-20,Math.min(20,Number(transform.z)||0))
    }
  }
}
function virtualLocationSettings(){
  const d=app.lighting.current;if(!d)return defaultVirtualLocationSettings();
  d.data.virtualLocation=normalizeVirtualLocationSettings(d.data.virtualLocation);
  if(d.location_scan_id&&!d.data.virtualLocation.scanId)d.data.virtualLocation.scanId=d.location_scan_id;
  if(d.data.virtualLocation.scanId&&!d.location_scan_id)d.location_scan_id=d.data.virtualLocation.scanId;
  return d.data.virtualLocation
}
function virtualLocationLocalKey(projectId=app.current?.id){return `storyboard-v5-virtual-locations:${projectId||"none"}`}
function linkedVirtualLocation(){
  const scanId=app.lighting.current?.location_scan_id||app.lighting.current?.data?.virtualLocation?.scanId;
  return app.lighting.virtualLocations.find(scan=>scan.id===scanId)||null
}
function virtualLocationFormat(fileName="",mime=""){
  const ext=String(fileName).split(".").pop().toLowerCase();
  if(ext==="glb"||mime==="model/gltf-binary")return "glb";
  if(ext==="usdz"||mime==="model/vnd.usdz+zip")return "usdz";
  return ""
}
function virtualLocationContentType(format){return format==="usdz"?"model/vnd.usdz+zip":"model/gltf-binary"}
function virtualLocationFileSize(bytes){
  const n=Math.max(0,Number(bytes)||0);if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(n<10*1024*1024?1:0)} MB`
}
function safeVirtualLocationFileName(name){return String(name||"location").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"location"}
function setVirtualLocationNotice(message="",kind=""){
  const el=$("virtualLocationNotice");if(!el)return;el.textContent=uiText(message);el.hidden=!message;el.className=`virtual-location-notice${kind?` ${kind}`:""}`
}
function setVirtualLocationProgress(percent=0,label="Uploading scan…",visible=true){
  const wrap=$("virtualLocationProgress");if(!wrap)return;const value=Math.max(0,Math.min(100,Number(percent)||0));wrap.hidden=!visible;$("virtualLocationProgressBar").value=value;$("virtualLocationProgressValue").textContent=`${Math.round(value)}%`;$("virtualLocationProgressLabel").textContent=uiText(label)
}

let virtualLocationDbPromise=null;
function openVirtualLocationDb(){
  if(virtualLocationDbPromise)return virtualLocationDbPromise;
  virtualLocationDbPromise=new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("This browser cannot store 3D scans offline."));return}
    const request=indexedDB.open("storyboard-virtual-locations",1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("models"))db.createObjectStore("models",{keyPath:"id"})};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("Could not open offline scan storage."))
  });
  return virtualLocationDbPromise
}
async function putLocalVirtualLocationBlob(id,file){
  const db=await openVirtualLocationDb();return new Promise((resolve,reject)=>{const tx=db.transaction("models","readwrite");tx.objectStore("models").put({id,blob:file,updatedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("Could not store this scan offline."))})
}
async function getLocalVirtualLocationBlob(id){
  const db=await openVirtualLocationDb();return new Promise((resolve,reject)=>{const tx=db.transaction("models","readonly"),request=tx.objectStore("models").get(id);request.onsuccess=()=>resolve(request.result?.blob||null);request.onerror=()=>reject(request.error||new Error("Could not open this offline scan."))})
}
async function deleteLocalVirtualLocationBlob(id){
  try{const db=await openVirtualLocationDb();await new Promise((resolve,reject)=>{const tx=db.transaction("models","readwrite");tx.objectStore("models").delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}catch(error){console.warn("Could not remove offline virtual location",error)}
}
function persistLocalVirtualLocations(){localStorage.setItem(virtualLocationLocalKey(),JSON.stringify(app.lighting.virtualLocations.map(({objectUrl,...scan})=>scan)))}

function normalizeVirtualLocation(row){
  return {
    id:String(row?.id||uid()),project_id:row?.project_id||app.current?.id||null,created_by:row?.created_by||null,
    name:String(row?.name||"Virtual Location"),model_path:row?.model_path||null,file_name:String(row?.file_name||"location.glb"),
    format:virtualLocationFormat(row?.file_name,row?.format)||String(row?.format||"glb").toLowerCase(),size_bytes:Number(row?.size_bytes)||0,
    captured_with:String(row?.captured_with||"import"),metadata:row?.metadata&&typeof row.metadata==="object"?row.metadata:{},
    created_at:row?.created_at||new Date().toISOString(),updated_at:row?.updated_at||new Date().toISOString(),objectUrl:row?.objectUrl||null
  }
}
async function loadVirtualLocations(){
  clearVirtualLocationModelCache();
  if(!app.current){app.lighting.virtualLocations=[];return}
  if(app.mode==="local"){
    let list=[];try{list=JSON.parse(localStorage.getItem(virtualLocationLocalKey())||"[]")}catch(error){}
    app.lighting.virtualLocations=(list||[]).map(normalizeVirtualLocation);app.lighting.virtualLocationsReady=true;renderVirtualLocationControls();return
  }
  const {data,error}=await sb.from("location_scans").select("id,project_id,created_by,name,model_path,file_name,format,size_bytes,captured_with,metadata,created_at,updated_at").eq("project_id",app.current.id).order("updated_at",{ascending:false});
  if(error){
    app.lighting.virtualLocations=[];app.lighting.virtualLocationsReady=false;
    setVirtualLocationNotice(`${app.lighting.virtualLocationMigrationMessage} ${error.message||""}`,"warning")
  }else{
    app.lighting.virtualLocations=(data||[]).map(normalizeVirtualLocation);app.lighting.virtualLocationsReady=true;setVirtualLocationNotice("")
  }
  renderVirtualLocationControls()
}
async function deleteLocalProjectVirtualLocations(projectId){
  let list=[];try{list=JSON.parse(localStorage.getItem(virtualLocationLocalKey(projectId))||"[]")}catch(error){}
  await Promise.all((list||[]).map(scan=>deleteLocalVirtualLocationBlob(scan.id)));localStorage.removeItem(virtualLocationLocalKey(projectId))
}

function renderVirtualLocationControls(){
  const select=$("virtualLocationSelect");if(!select)return;
  const currentId=app.lighting.current?.location_scan_id||app.lighting.current?.data?.virtualLocation?.scanId||"";
  select.innerHTML=`<option value="">${escapeHtml(uiText("No virtual location"))}</option>`+app.lighting.virtualLocations.map(scan=>`<option value="${escapeHtml(scan.id)}">${escapeHtml(scan.name)} · ${escapeHtml(scan.format.toUpperCase())} · ${escapeHtml(virtualLocationFileSize(scan.size_bytes))}</option>`).join("");
  select.value=app.lighting.virtualLocations.some(scan=>scan.id===currentId)?currentId:"";
  const linked=linkedVirtualLocation(),settings=virtualLocationSettings(),transform=settings.transform;
  $("virtualLocationTransform").hidden=!linked;
  $("detachVirtualLocationBtn").disabled=!linked||!lightingCanEdit();
  $("deleteVirtualLocationBtn").disabled=!linked||!lightingCanEdit();
  $("importVirtualLocationBtn").disabled=!lightingCanEdit()||!!app.lighting.upload||(app.mode==="cloud"&&!app.lighting.virtualLocationsReady);
  // Native RoomPlan capture is intentionally unavailable until FilmBoard's
  // signed iOS/Android companion ships. Users can import a GLB from Scaniverse.
  $("scanVirtualLocationBtn").disabled=true;$("scanVirtualLocationBtn").setAttribute("aria-disabled","true");
  select.disabled=!lightingCanEdit()||(app.mode==="cloud"&&!app.lighting.virtualLocationsReady);
  if(linked){
    $("virtualLocationScale").value=String(Math.round(transform.scale*100));$("virtualLocationRotation").value=String(transform.rotationY);
    $("virtualLocationOffsetX").value=String(transform.x);$("virtualLocationOffsetY").value=String(transform.y);$("virtualLocationOffsetZ").value=String(transform.z);
    $("virtualLocationScaleValue").textContent=`${Math.round(transform.scale*100)}%`;$("virtualLocationRotationValue").textContent=`${Math.round(transform.rotationY)}°`;
    $("virtualLocationOffsetXValue").textContent=`${transform.x.toFixed(1)} m`;$("virtualLocationOffsetYValue").textContent=`${transform.y.toFixed(1)} m`;$("virtualLocationOffsetZValue").textContent=`${transform.z.toFixed(1)} m`
  }
  renderVirtualLocationBadge();renderVirtualExploreUi();renderVirtualLocationBibleControls()
}
function renderVirtualLocationBadge(){
  const scan=linkedVirtualLocation(),badge=$("virtualLocationBadge");if(!badge)return;badge.hidden=!scan;if(!scan)return;
  $("virtualLocationBadgeName").textContent=scan.name;$("virtualLocationBadgeMeta").textContent=`${scan.format.toUpperCase()} · ${virtualLocationFileSize(scan.size_bytes)}`
}
function renderVirtualLocationBibleControls(){
  const wrap=$("virtualLocationBibleLink"),select=$("virtualLocationBibleSelect");if(!wrap||!select)return;const scan=linkedVirtualLocation(),cloud=app.mode==="cloud";
  wrap.hidden=!cloud||!scan;if(!cloud||!scan)return;const locations=app.ai.locations||[],current=locations.find(asset=>asset.location_scan_id===scan.id),preserved=select.value;
  select.innerHTML='<option value="">Choose a Bible location…</option>'+locations.map(asset=>`<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.name)}${asset.location_scan_id===scan.id?" · linked":""}</option>`).join("");select.value=locations.some(asset=>asset.id===preserved)?preserved:(current?.id||"");
  const asset=locations.find(item=>item.id===select.value),ready=app.ai.spatialReady&&!!asset&&lightingCanEdit()&&can("media");select.disabled=!app.ai.spatialReady||!locations.length||!can("media");$("linkVirtualLocationBibleBtn").disabled=!ready;$("captureVirtualLocationBibleBtn").disabled=!ready;
  $("virtualLocationBibleStatus").textContent=!app.ai.spatialReady?"Run the saved SQL query “Spatial Bible & Lighting Studio v5.1”, then reload.":!locations.length?"Create a location in Bible first.":current?.spatial_reference_path?`${scan.name} is linked to ${current.name}; its AI camera view is ready.`:current?`${scan.name} is linked to ${current.name}. Capture a Camera View for AI.`:"Choose a Bible location, link the scan, then capture its AI view."
}
async function linkVirtualLocationToBible(){
  const scan=linkedVirtualLocation(),asset=app.ai.locations.find(item=>item.id===$("virtualLocationBibleSelect").value);if(!scan||!asset||!app.ai.spatialReady||!lightingCanEdit()||!can("media"))return;const changed=asset.location_scan_id!==scan.id,oldSpatial=changed?asset.spatial_reference_path:null;
  const changes={location_scan_id:scan.id,updated_at:new Date().toISOString()};if(changed)Object.assign(changes,{spatial_reference_path:null,locked:false,style_snapshot:null});const {error}=await sb.from("project_ai_locations").update(changes).eq("id",asset.id).eq("project_id",app.current.id);if(error){setVirtualLocationNotice(error.message||"Could not link this scan to Bible.","warning");return}
  asset.location_scan_id=scan.id;if(changed){asset.spatial_reference_path=null;asset.spatialReferenceUrl=null;asset.locked=false;asset.style_snapshot=null;await removeMediaPaths([oldSpatial])}setVirtualLocationNotice(`${scan.name} is linked to Bible location ${asset.name}.`);renderVirtualLocationBibleControls();renderAiVisualBible()
}
function canvasToBlob(canvas,type="image/jpeg",quality=.9){return new Promise((resolve,reject)=>canvas?.toBlob?.(blob=>blob?resolve(blob):reject(new Error("Could not capture Camera View.")),type,quality))}
async function captureVirtualLocationForBible(){
  const scan=linkedVirtualLocation(),asset=app.ai.locations.find(item=>item.id===$("virtualLocationBibleSelect").value);if(!scan||!asset||!app.ai.spatialReady||!lightingCanEdit()||!can("media"))return;
  try{
    if(asset.location_scan_id!==scan.id)await linkVirtualLocationToBible();if(asset.location_scan_id!==scan.id)throw new Error("Link the scan to this Bible location before capturing.");setVirtualLocationNotice("Preparing spatial Camera View for AI…");app.lighting.viewMode="camera";await renderLightingViewMode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const state=app.lighting.three;if(!state?.renderer||!state.scene||!state.camera)throw new Error("Camera View is not ready.");state.renderer.render(state.scene,state.camera);const blob=await canvasToBlob(state.renderer.domElement);await storeAiSpatialReference("location",asset,blob);setVirtualLocationNotice(`${asset.name} now has a spatial AI reference from this exact Camera View.`);renderVirtualLocationBibleControls();renderAiVisualBible();renderShot()
  }catch(error){console.error(error);setVirtualLocationNotice(error.message||"Could not capture this Camera View.","warning")}
}
function disposeVirtualLocationObject(object){
  object?.traverse?.(node=>{if(node.geometry?.dispose)node.geometry.dispose();const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials.filter(Boolean)){for(const value of Object.values(material)){if(value?.isTexture&&value.dispose)value.dispose()}material.dispose?.()}})
}
function clearVirtualLocationModelCache(scanId=null){
  for(const [id,entry] of app.lighting.locationModelCache){
    if(scanId&&id!==scanId)continue;disposeVirtualLocationObject(entry.root);if(entry.objectUrl)URL.revokeObjectURL(entry.objectUrl);app.lighting.locationModelCache.delete(id)
  }
}
async function uploadLargeModelResumable(file,path,onProgress,feature="virtual-location"){
  const [{data:{session}},tus]=await Promise.all([sb.auth.getSession(),import(TUS_CLIENT_CDN)]);if(!session?.access_token)throw new Error("Your session expired. Sign in again before uploading the scan.");
  const host=new URL(cfg.SUPABASE_URL).hostname,projectRef=host.split(".")[0];if(!projectRef)throw new Error("Storage is not configured.");
  return new Promise((resolve,reject)=>{
    const upload=new tus.Upload(file,{
      endpoint:`https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${session.access_token}`},
      uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,
      metadata:{bucketName:"storyboards",objectName:path,contentType:virtualLocationContentType(virtualLocationFormat(file.name,file.type)),cacheControl:"31536000",metadata:JSON.stringify({feature,projectId:app.current.id})},
      onError:error=>reject(error),onProgress:(uploaded,total)=>onProgress?.(total?uploaded/total*100:0),onSuccess:()=>resolve(upload.url)
    });
    if(feature==="face-scan")app.lighting.faceUpload=upload;else app.lighting.upload=upload;
    upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start()}).catch(reject)
  })
}
function uploadVirtualLocationResumable(file,path,onProgress){return uploadLargeModelResumable(file,path,onProgress,"virtual-location")}
async function importVirtualLocationFile(file,capturedWith="import"){
  if(!file||!lightingCanEdit())return;const format=virtualLocationFormat(file.name,file.type);
  if(!format)throw new Error("Choose one self-contained GLB or USDZ file.");
  if(file.size>VIRTUAL_LOCATION_MAX_BYTES)throw new Error("This scan is larger than 250 MB. Optimize it before importing.");
  const baseName=String(file.name||"Virtual Location").replace(/\.(glb|usdz)$/i,"").replace(/[-_]+/g," ").trim()||"Virtual Location";
  const requested=uiPrompt("Location name:",baseName);if(requested===null)return;const name=requested.trim()||baseName,id=uid(),now=new Date().toISOString();
  setVirtualLocationNotice("");setVirtualLocationProgress(0,app.mode==="cloud"?"Uploading scan…":"Saving scan…",true);renderVirtualLocationControls();
  try{
    let record;
    if(app.mode==="local"){
      await putLocalVirtualLocationBlob(id,file);setVirtualLocationProgress(92,"Saving scan…",true);
      record=normalizeVirtualLocation({id,project_id:app.current.id,name,file_name:file.name,format,size_bytes:file.size,captured_with:capturedWith,metadata:{},created_at:now,updated_at:now})
    }else{
      if(!app.lighting.virtualLocationsReady)throw new Error(app.lighting.virtualLocationMigrationMessage);
      const path=`${app.current.id}/virtual-locations/${id}/${Date.now()}-${safeVirtualLocationFileName(file.name)}`;
      await uploadVirtualLocationResumable(file,path,percent=>setVirtualLocationProgress(percent,"Uploading scan…",true));
      const {data,error}=await sb.from("location_scans").insert({id,project_id:app.current.id,created_by:app.session.user.id,name,model_path:path,file_name:file.name,format,size_bytes:file.size,captured_with:capturedWith,metadata:{}}).select().single();
      if(error){await removeMediaPaths([path]);throw error}record=normalizeVirtualLocation(data)
    }
    app.lighting.virtualLocations=[record,...app.lighting.virtualLocations.filter(scan=>scan.id!==record.id)];if(app.mode==="local")persistLocalVirtualLocations();
    app.lighting.current.location_scan_id=record.id;virtualLocationSettings().scanId=record.id;markLightingDirty();setVirtualLocationProgress(100,"Scan ready",true);renderVirtualLocationControls();renderLightingCanvas();
    setVirtualLocationNotice("Scan attached. Open Camera View, then choose Explore Location.");
    if(app.lighting.viewMode==="camera")await rebuildLighting3D();setTimeout(()=>setVirtualLocationProgress(0,"",false),900)
  }finally{app.lighting.upload=null;renderVirtualLocationControls()}
}
async function handleVirtualLocationFileInput(event){
  const input=event.currentTarget,file=input.files?.[0],capturedWith=input.dataset.captureSource||"import";input.value="";delete input.dataset.captureSource;if(!file)return;
  try{await importVirtualLocationFile(file,capturedWith)}catch(error){console.error(error);setVirtualLocationProgress(0,"",false);setVirtualLocationNotice(error.message||"Could not import this 3D scan.","error")}
}
function chooseVirtualLocationFile(source="import"){$("virtualLocationFileInput").dataset.captureSource=source;$("virtualLocationFileInput").click()}
function startIPhoneLocationScan(){
  if(!lightingCanEdit())return;const bridge=window.webkit?.messageHandlers?.storyboardLocationScanner;
  if(bridge?.postMessage){
    bridge.postMessage({action:"scan",projectId:app.current.id,diagramId:app.lighting.current?.id||null,formats:["glb","usdz"]});
    setVirtualLocationNotice("iPhone scanner opened. Keep this project open while the scan is prepared.");return
  }
  setVirtualLocationNotice("In the web version, scan with an iPhone LiDAR app and export one GLB or USDZ file. The native Storyboard scanner uses this same button when installed.","warning");chooseVirtualLocationFile("iphone-import")
}
async function completeNativeVirtualLocationScan(payload={}){
  if(!payload.scanId)return;await loadVirtualLocations();const scan=app.lighting.virtualLocations.find(item=>item.id===payload.scanId);if(!scan)return setVirtualLocationNotice("The iPhone scan uploaded, but it is not available to this project yet.","warning");
  app.lighting.current.location_scan_id=scan.id;virtualLocationSettings().scanId=scan.id;markLightingDirty();renderVirtualLocationControls();renderLightingCanvas();if(app.lighting.viewMode==="camera")await rebuildLighting3D()
}
window.storyboardVirtualLocationScanCompleted=completeNativeVirtualLocationScan;
async function selectVirtualLocation(scanId){
  if(!app.lighting.current||!lightingCanEdit())return;stopVirtualExplore();app.lighting.current.location_scan_id=scanId||null;app.lighting.current.data.virtualLocation=defaultVirtualLocationSettings();app.lighting.current.data.virtualLocation.scanId=scanId||null;markLightingDirty();renderVirtualLocationControls();renderLightingCanvas();if(app.lighting.viewMode==="camera")await rebuildLighting3D()
}
function detachVirtualLocation(){if(!linkedVirtualLocation()||!lightingCanEdit())return;selectVirtualLocation("")}
async function deleteVirtualLocation(){
  const scan=linkedVirtualLocation();if(!scan||!lightingCanEdit()||!uiConfirm(`Delete the 3D scan “${scan.name}”? Lighting objects and cameras will remain.`))return;
  try{
    stopVirtualExplore();
    if(app.mode==="cloud"){
      const {error}=await sb.from("location_scans").delete().eq("id",scan.id).eq("project_id",app.current.id);if(error)throw error;await removeMediaPaths([scan.model_path])
    }else{await deleteLocalVirtualLocationBlob(scan.id)}
    clearVirtualLocationModelCache(scan.id);app.lighting.virtualLocations=app.lighting.virtualLocations.filter(item=>item.id!==scan.id);
    for(const diagram of [app.lighting.current,...app.lighting.diagrams]){if(diagram?.location_scan_id===scan.id){diagram.location_scan_id=null;if(diagram.data?.virtualLocation)diagram.data.virtualLocation.scanId=null}}
    if(app.mode==="local")persistLocalVirtualLocations();markLightingDirty();renderVirtualLocationControls();renderLightingCanvas();if(app.lighting.viewMode==="camera")await rebuildLighting3D();setVirtualLocationNotice("3D scan deleted.")
  }catch(error){setVirtualLocationNotice(error.message||"Could not delete this 3D scan.","error")}
}
function updateVirtualLocationTransform(){
  if(!linkedVirtualLocation()||!lightingCanEdit())return;const settings=virtualLocationSettings(),transform=settings.transform;
  transform.scale=Math.max(.1,Math.min(5,Number($("virtualLocationScale").value)/100||1));transform.rotationY=Number($("virtualLocationRotation").value)||0;
  transform.x=Number($("virtualLocationOffsetX").value)||0;transform.y=Number($("virtualLocationOffsetY").value)||0;transform.z=Number($("virtualLocationOffsetZ").value)||0;
  markLightingDirty();renderVirtualLocationControls();renderLightingCanvas();syncVirtualLocationTransform3D()
}
function resetVirtualLocationTransform(){
  if(!linkedVirtualLocation()||!lightingCanEdit())return;const scanId=virtualLocationSettings().scanId;app.lighting.current.data.virtualLocation=defaultVirtualLocationSettings();app.lighting.current.data.virtualLocation.scanId=scanId;markLightingDirty();renderVirtualLocationControls();renderLightingCanvas();syncVirtualLocationTransform3D()
}
function focusVirtualLocationSection(){
  toggleLightingDrawer(false);const section=$("virtualLocationSection");section.scrollIntoView({block:"nearest",behavior:"smooth"});section.classList.remove("focus-pulse");requestAnimationFrame(()=>section.classList.add("focus-pulse"));setTimeout(()=>section.classList.remove("focus-pulse"),900)
}

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
function lightingFixtureProps(name){return LIGHTING_FIXTURES[name]||LIGHTING_FIXTURES["ARRI Orbiter"]}
function lightingModifierProps(name){return LIGHTING_MODIFIERS[name]||LIGHTING_MODIFIERS.None}
function lightingModifierCompatible(fixtureName,modifierName){
  const fixture=lightingFixtureProps(fixtureName),modifier=lightingModifierProps(modifierName),mounts=modifier.mounts||["all"];
  return mounts.includes("all")||mounts.includes(fixture.mount)
}
function lightingEffectiveBeam(object){
  const fixture=lightingFixtureProps(object?.fixture),modifier=lightingModifierProps(object?.diffusion);
  const min=Number(modifier.beamMin??fixture.beamMin??5),max=Number(modifier.beamMax??fixture.beamMax??175);
  const requested=modifier.beam!=null?Number(object?.beam??modifier.beam):Number(object?.beam??fixture.beam)+(Number(modifier.spread)||0);
  return Math.max(Math.min(min,max),Math.min(Math.max(min,max),requested))
}
function lightingFixtureIcon(type="cob"){
  const paths={
    orbiter:'<path d="M5 8h11l3 4-3 4H5z"/><circle cx="7" cy="12" r="3"/><path d="M19 10h2v4h-2M11 8V5m-3 0h6M10 16v3m-3 0h6"/>',
    fresnel:'<path d="M5 7h10l4 5-4 5H5z"/><circle cx="7" cy="12" r="3.2"/><path d="M15 8V5m-3 0h6M10 17v3m-3 0h6"/>',
    panel:'<rect x="4" y="4" width="16" height="15" rx="2"/><path d="M8 4v15m4-15v15m4-15v15M4 9h16m-16 5h16M12 19v3m-4 0h8"/>',
    "slim-panel":'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v12m5-12v12m5-12v12M3 12h18M12 18v3"/>',
    cob:'<path d="M4 8h12l4 4-4 4H4z"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 8V5m-3 0h6M10 16v4m-3 0h6"/>',
    par:'<path d="M4 7h10l6 5-6 5H4z"/><path d="M8 7c4 3 4 7 0 10M10 17v3m-3 0h6"/>',
    projection:'<path d="M3 8h10l3 2h5v4h-5l-3 2H3z"/><circle cx="6" cy="12" r="2.5"/><path d="M10 16v4m-3 0h6"/>',
    tube:'<rect x="9" y="2" width="6" height="18" rx="3"/><path d="M7 4h2m6 0h2M12 20v2"/>',
    bulb:'<path d="M8 10a4 4 0 1 1 8 0c0 2-1.4 3-2.2 4H10.2C9.4 13 8 12 8 10Z"/><path d="M10 17h4m-3 3h2"/>',
    window:'<rect x="3" y="3" width="18" height="18"/><path d="M12 3v18M3 12h18"/>',
    candle:'<path d="M9 10h6v11H9zM12 9c-3-3 1-5 0-7 3 2 3 5 0 7Z"/>',
    softbox:'<path d="M5 5h14l3 14H2z"/><path d="M12 19v3"/>',
    lantern:'<ellipse cx="12" cy="10" rx="7" ry="8"/><path d="M8 18h8M12 18v4"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type]||paths.cob}</svg>`
}
function lightingEntityIcon(type){
  if(type==="camera")return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="12" height="10" rx="2"></rect><path d="m15 10 6-3v10l-6-3z"></path></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="3"></circle><path d="M7 21v-5l2-5h6l2 5v5M9 14l-4 3M15 14l4 3"></path></svg>'
}
function safeSvgText(v){return escapeHtml(String(v??""))}
function slugName(v){return String(v||"lighting-diagram").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"")||"lighting-diagram"}
function parseLensMm(v){
  const s=String(v||"").toLowerCase();
  if(s==="wide")return 24;if(s==="normal")return 50;if(s==="telephoto")return 100;
  const m=s.match(/([\d.]+)/);return m?Math.max(8,Number(m[1])):50
}
function cinemaCameraSpec(cameraOrName){
  const name=typeof cameraOrName==="string"?cameraOrName:cameraOrName?.cameraModel;
  return CINEMA_CAMERAS[name]||CINEMA_CAMERAS["ARRI ALEXA Mini"]
}
function projectFrameAspect(){
  const ar=aspectNumbers(app.current||{});return Math.max(.3,Number(ar?.w||16)/Math.max(.3,Number(ar?.h||9)))
}
function cameraActiveSensor(cameraOrName){
  const spec=cinemaCameraSpec(cameraOrName),frameAspect=projectFrameAspect();
  let width=Number(spec.activeWidth||spec.sensorWidth),height=Number(spec.activeHeight||spec.sensorHeight);
  const nativeAspect=width/Math.max(.01,height);
  if(frameAspect>nativeAspect)height=width/frameAspect;
  else width=height*frameAspect;
  return {width,height,spec,frameAspect}
}
function cameraHorizontalFov(lens,cameraOrName=null){
  const mm=parseLensMm(lens),sensor=cameraActiveSensor(cameraOrName);return Math.max(6,Math.min(150,2*Math.atan(sensor.width/(2*mm))*180/Math.PI))
}
function cameraVerticalFov(lens,cameraOrName=null){
  const mm=parseLensMm(lens),sensor=cameraActiveSensor(cameraOrName);return Math.max(5,Math.min(130,2*Math.atan(sensor.height/(2*mm))*180/Math.PI))
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
  const vfov=Math.max(8,cameraVerticalFov(camera.lens,camera));
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
    if(!CINEMA_CAMERAS[o.cameraModel])o.cameraModel="ARRI ALEXA Mini";
    if(o.height3d==null)o.height3d=1.65;
    if(o.tilt==null)o.tilt=0;
    if(o.roll==null)o.roll=cameraAngleRoll(o.angle);
    if(o.autoFrame==null)o.autoFrame=true;
  }else if(o.type==="light"){
    if(!LIGHTING_FIXTURES[o.fixture])o.fixture="ARRI Orbiter";
    if(o.height3d==null)o.height3d=2.2;
    if(o.tilt==null)o.tilt=-15;
    if(!o.diffusion)o.diffusion="None";
    if(!lightingModifierCompatible(o.fixture,o.diffusion))o.diffusion="None";
    const fp=lightingFixtureProps(o.fixture);o.kelvin=Math.max(fp.kelvinMin||1800,Math.min(fp.kelvinMax||20000,Number(o.kelvin)||fp.kelvin));
    o.beam=Math.max(1,Math.min(175,Number(o.beam)||fp.beam));
  }else if(o.type==="subject"){
    if(o.height3d==null)o.height3d=1.75;
    if(o.scale==null)o.scale=100;
    if(!o.gender)o.gender="female";
    if(o.characterId==null)o.characterId="";
    if(o.faceScale==null)o.faceScale=100;
    if(o.faceYaw==null)o.faceYaw=0;
    if(o.faceOffset==null)o.faceOffset=0;
  }
  if(o.rotation==null)o.rotation=0;
  return o
}
function defaultLightingCamera(){
  const s=currentShot();
  return normalizeLightingObject({
    id:uid(),type:"camera",label:"Camera",x:175,y:400,rotation:0,
    cameraModel:"ARRI ALEXA Mini",
    lens:s?.lens||"50mm",shotSize:s?.shotSize||"CU · Close Up",
    angle:s?.angle||"Eye Level",cameraHeight:s?.cameraHeight||"Eye Level",
    movement:s?.movement||"Static",focus:s?.focus||"Shallow Focus"
  })
}
function defaultLightingSubject(){
  return normalizeLightingObject({id:uid(),type:"subject",label:"Subject",gender:"female",x:650,y:400,rotation:180})
}
function defaultLightingLight(fixture="Nanlite Forza 300B II",opts={}){
  const p=lightingFixtureProps(fixture);
  return normalizeLightingObject({
    id:uid(),type:"light",label:fixture,fixture,x:390,y:245,rotation:28,
    kelvin:p.kelvin,intensity:p.intensity,beam:p.beam,diffusion:"None",...opts
  })
}
function shotLightPreset(s=currentShot()){
  const source=s?.lightSource||"Off-camera Artificial Light",quality=s?.lightQuality||"";
  const map={
    "Candle":["Candle",2000],"Window Light":["Window",5600],"Moonlight":["ARRI Orbiter",7000],
    "Sunlight":["Nanlite Forza 300B II",5600],"Torch":["Practical Bulb",2200],"Practical Light":["Practical Bulb",3000],
    "Off-camera Artificial Light":["ARRI SkyPanel X21",5600],"Mixed":["Nanlite PavoSlim 60C",4300],"Unspecified":["ARRI Orbiter",5600]
  };
  const [fixture,kelvin]=map[source]||map["Off-camera Artificial Light"];
  const fp=lightingFixtureProps(fixture);
  let diffusion="None";
  if(/soft|diffus/i.test(quality))diffusion="250 Half Diffusion";
  if(/high key/i.test(quality))diffusion="216 Full Diffusion";
  return {fixture,kelvin,beam:fp.beam,intensity:fp.intensity,diffusion}
}
function defaultLightingTimeline(){
  const duration=Math.max(.25,Math.min(120,parseDurationSeconds(currentShot()?.duration||"4")));
  return {duration,keyframes:[],characterKeyframes:[]}
}
function normalizeCameraKeyframe(frame,duration){
  const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  return {
    id:frame?.id||uid(),objectId:String(frame?.objectId||frame?.cameraId||""),time:Math.max(0,Math.min(duration,finite(frame?.time,0))),
    x:Math.max(0,Math.min(1200,finite(frame?.x,600))),y:Math.max(0,Math.min(800,finite(frame?.y,400))),
    height3d:Math.max(.1,Math.min(6,finite(frame?.height3d,1.65))),rotation:finite(frame?.rotation,0),
    tilt:Math.max(-89,Math.min(89,finite(frame?.tilt,0))),roll:finite(frame?.roll,0),
    lens:frame?.lens||"50mm",cameraModel:CINEMA_CAMERAS[frame?.cameraModel]?frame.cameraModel:"ARRI ALEXA Mini",
    shotSize:frame?.shotSize||"CU · Close Up",angle:frame?.angle||"Eye Level",movement:frame?.movement||"Static",
    focus:frame?.focus||"Shallow Focus",cameraHeight:frame?.cameraHeight||"Custom",
    easing:frame?.easing||"smooth"
  }
}
function normalizeCharacterKeyframe(frame,duration){
  const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  return {
    id:frame?.id||uid(),objectId:String(frame?.objectId||frame?.subjectId||""),time:Math.max(0,Math.min(duration,finite(frame?.time,0))),
    x:Math.max(0,Math.min(1200,finite(frame?.x,600))),y:Math.max(0,Math.min(800,finite(frame?.y,400))),
    height3d:Math.max(.1,Math.min(2.5,finite(frame?.height3d,1.75))),rotation:finite(frame?.rotation,0),
    scale:Math.max(40,Math.min(180,finite(frame?.scale,100))),gender:frame?.gender||"female",characterId:String(frame?.characterId||""),
    faceScale:Math.max(50,Math.min(180,finite(frame?.faceScale,100))),faceYaw:finite(frame?.faceYaw,0),faceOffset:finite(frame?.faceOffset,0),
    easing:frame?.easing||"smooth"
  }
}
function normalizeLightingTimeline(value){
  const fallback=defaultLightingTimeline(),duration=Math.max(.25,Math.min(120,Number(value?.duration)||fallback.duration));
  const uniqueIds=frames=>{const seen=new Set();return frames.map(frame=>{if(seen.has(frame.id))frame.id=uid();seen.add(frame.id);return frame})};
  const keyframes=uniqueIds((Array.isArray(value?.keyframes)?value.keyframes:[]).map(frame=>normalizeCameraKeyframe(frame,duration))).sort((a,b)=>a.time-b.time);
  const characterKeyframes=uniqueIds((Array.isArray(value?.characterKeyframes)?value.characterKeyframes:[]).map(frame=>normalizeCharacterKeyframe(frame,duration)).filter(frame=>frame.objectId)).sort((a,b)=>a.time-b.time);
  return {duration,keyframes,characterKeyframes}
}
function newLightingDiagramObject(){
  const link=lightingCurrentShotLink(),sn=link?.scene?.number||1,sh=link?.shot?.shotNo||1;
  return {
    id:uid(),persisted:false,project_id:app.current?.id||null,
    scene_id:link?.scene?.id||null,shot_id:link?.shot?.id||null,
    location_scan_id:null,
    created_by:app.session?.user?.id||null,
    name:`S${String(sn).padStart(2,"0")} · Shot ${String(sh).padStart(2,"0")} Lighting`,
    updated_at:new Date().toISOString(),
    data:{canvas:{width:1200,height:800,metersPer100px:1},objects:[defaultLightingCamera(),defaultLightingSubject()],notes:"",virtualLocation:defaultVirtualLocationSettings(),timeline:defaultLightingTimeline()}
  }
}
function normalizeLightingDiagram(row){
  const data=deepClone(row?.data||{});
  if(!Array.isArray(data.objects))data.objects=[];
  data.objects=data.objects.map(normalizeLightingObject);
  if(!data.canvas)data.canvas={width:1200,height:800,metersPer100px:1};
  if(typeof data.notes!=="string")data.notes="";
  data.virtualLocation=normalizeVirtualLocationSettings(data.virtualLocation);
  data.timeline=normalizeLightingTimeline(data.timeline);
  const locationScanId=row?.location_scan_id||data.virtualLocation.scanId||null;
  data.virtualLocation.scanId=locationScanId;
  return {
    id:row?.id||uid(),persisted:row?.persisted!==false,
    project_id:row?.project_id||app.current?.id||null,
    scene_id:row?.scene_id||null,shot_id:row?.shot_id||null,
    location_scan_id:locationScanId,
    created_by:row?.created_by||null,name:row?.name||"Lighting Diagram",
    updated_at:row?.updated_at||new Date().toISOString(),data
  }
}
function lightingShotLabel(scene,shot){return `Scene ${scene.number} · Shot ${shot.shotNo}${shot.summary?` · ${shot.summary}`:""}`}

function populateLightingCameraSelects(){
  const pairs=[
    ["lightingObjectLens",OPTIONS.lens],["lightingObjectShotSize",OPTIONS.shotSize],
    ["lightingObjectAngle",OPTIONS.angle],
    ["lightingObjectMovement",OPTIONS.movement],["lightingObjectFocus",OPTIONS.focus]
  ];
  for(const [id,arr] of pairs){
    const el=$(id);if(!el)continue;
    el.innerHTML=arr.map(v=>`<option>${escapeHtml(v)}</option>`).join("")
  }
  const cameraModel=$("lightingCameraModel");
  if(cameraModel)cameraModel.innerHTML=Object.keys(CINEMA_CAMERAS).map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
}
function renderLightingShotOptions(){
  /* Diagrams are linked automatically to the shot that opened them. */
}
function renderLightingCameraSummary(){
  const s=currentShot(),el=$("lightingCameraSummary");if(!el)return;
  if(!s){el.textContent="No active shot.";return}
  el.innerHTML=`<strong>${escapeHtml(s.lens||"—")}</strong><span>${escapeHtml(shortValue(s.shotSize))} · ${escapeHtml(s.angle||"—")}</span>`
}
function renderLightingDiagramList(){
  /* The current shot owns the visible diagram; the former diagram switcher was removed. */
}
function parkLightingInspector(){
  const section=$("lightingPropertiesSection"),parking=$("lightingInspectorParking");
  if(section&&parking&&section.parentElement!==parking)parking.append(section)
}
function lightingFolderForType(type){
  return type==="camera"?$("lightingCamerasSection"):type==="light"?$("lightingLightsSection"):type==="subject"?$("lightingCharactersSection"):null
}
function mountLightingInspector(){
  const section=$("lightingPropertiesSection"),o=lightingSelected();if(!section)return;
  if(!o||!app.lighting.inspectorOpen){parkLightingInspector();section.hidden=true;return}
  const attribute=o.type==="camera"?"lightingCameraSelect":"lightingSelect";
  const row=[...document.querySelectorAll("[data-lighting-select],[data-lighting-camera-select]")].find(node=>node.dataset[attribute]===o.id);
  const folder=lightingFolderForType(o.type);if(folder)folder.open=true;
  section.hidden=false;
  if(row)row.insertAdjacentElement("afterend",section);
  const title=$("lightingInspectorTitle");
  if(title)title.textContent=o.type==="camera"?"CAMERA SETTINGS":o.type==="light"?"LIGHT SETTINGS":"CHARACTER SETTINGS"
}
function renderLightingObjectList(){
  if(!app.lighting.current)return;
  parkLightingInspector();
  const renderType=(targetId,type,title)=>{
    const el=$(targetId);if(!el)return;const items=app.lighting.current.data.objects.filter(o=>o.type===type);
    el.innerHTML=`<div class="lighting-object-group">
      <div class="lighting-object-group-title">${title}<span>${items.length}</span></div>
      ${items.length?items.map(o=>`
        <button type="button" class="lighting-object-row ${o.id===app.lighting.selectedId?"active":""}" data-lighting-select="${o.id}" aria-expanded="${o.id===app.lighting.selectedId&&app.lighting.inspectorOpen?"true":"false"}">
          <span class="lighting-object-row-icon">${type==="light"?lightingFixtureIcon(lightingFixtureProps(o.fixture).iconType):lightingEntityIcon(type)}</span>
          <span><strong>${escapeHtml(o.label||o.fixture||type)}</strong><small>${type==="light"?`${escapeHtml(lightingFixtureProps(o.fixture).brand)} · ${Math.round(lightingEffectiveBeam(o))}° · ${o.kelvin}K`:`${Number(o.height3d||1.75).toFixed(2)} m${o.characterId?" · Bible face":" · mannequin"}`}</small></span>
        </button>`).join(""):`<div class="lighting-object-empty">No ${title.toLowerCase()}</div>`}
    </div>`;
    el.querySelectorAll("[data-lighting-select]").forEach(b=>b.onclick=()=>selectLightingObject(b.dataset.lightingSelect,false,true))
  };
  renderType("lightingLightList","light","LIGHTS");renderType("lightingCharacterList","subject","CHARACTERS");renderLightingCameraList();mountLightingInspector()
}
function renderLightingCameraList(){
  const el=$("lightingCameraList");if(!el||!app.lighting.current)return;const items=app.lighting.current.data.objects.filter(o=>o.type==="camera");
  el.innerHTML=items.length?items.map(o=>`
    <button type="button" class="lighting-object-row ${o.id===app.lighting.selectedId?"active":""}" data-lighting-camera-select="${o.id}" aria-expanded="${o.id===app.lighting.selectedId&&app.lighting.inspectorOpen?"true":"false"}">
      <span class="lighting-object-row-icon">${lightingEntityIcon("camera")}</span>
      <span><strong>${escapeHtml(o.label||"Camera")}</strong><small>${escapeHtml(cinemaCameraSpec(o).model)} · ${escapeHtml(o.lens||"")} · ${escapeHtml(shortValue(o.shotSize))}</small></span>
      <span class="lighting-camera-live" ${o.id===app.lighting.activeCameraId?"":"hidden"}>LIVE</span>
    </button>`).join(""):'<div class="lighting-object-empty">No cameras</div>';
  el.querySelectorAll("[data-lighting-camera-select]").forEach(button=>button.onclick=()=>selectLightingObject(button.dataset.lightingCameraSelect,false,true))
}
function renderFixtureCatalog(){
  const el=$("lightingFixtureCatalog"),o=lightingSelected();if(!el||!o||o.type!=="light")return;
  const groups=["ARRI","NANLITE","PRACTICAL"];
  el.innerHTML=groups.map(group=>`
    <div class="lighting-catalog-group">
      <div class="lighting-catalog-group-title">${group}</div>
      <div class="lighting-catalog-items">
        ${Object.entries(LIGHTING_FIXTURES).filter(([,v])=>v.group===group&&v.catalog!==false).map(([name,v])=>`
          <button type="button" class="lighting-catalog-chip ${o.fixture===name?"active":""}" data-fixture="${escapeHtml(name)}">
            <span class="fixture-icon">${lightingFixtureIcon(v.iconType)}</span><span class="fixture-copy"><strong>${escapeHtml(v.model)}</strong><small>${escapeHtml(v.brand)} · ${v.beamMin}–${v.beamMax}°</small></span>
          </button>`).join("")}
      </div>
    </div>`).join("");
  el.querySelectorAll("[data-fixture]").forEach(b=>b.onclick=()=>{
    const selected=lightingSelected();if(!selected||!lightingCanEdit())return;
    const pose={x:selected.x,y:selected.y,height3d:selected.height3d,rotation:selected.rotation,tilt:selected.tilt};
    const old=selected.fixture;selected.fixture=b.dataset.fixture;selected.label=selected.label===old?selected.fixture:selected.label;
    const fp=lightingFixtureProps(selected.fixture);selected.beam=fp.beam;selected.kelvin=Math.max(fp.kelvinMin,Math.min(fp.kelvinMax,Number(selected.kelvin)||fp.kelvin));
    if(!lightingModifierCompatible(selected.fixture,selected.diffusion))selected.diffusion="None";
    Object.assign(selected,pose);
    markLightingDirty();renderLightingInspector();renderLightingCanvas();syncLighting3D()
  })
}
function renderModifierCatalog(){
  const el=$("lightingModifierCatalog"),o=lightingSelected();if(!el||!o||o.type!=="light")return;
  el.innerHTML=Object.entries(LIGHTING_MODIFIERS).filter(([name])=>lightingModifierCompatible(o.fixture,name)).map(([name,v])=>`
    <button type="button" class="lighting-modifier-chip ${o.diffusion===name?"active":""}" data-modifier="${escapeHtml(name)}" title="${escapeHtml(name)}">
      <strong>${escapeHtml(v.short)}</strong><small>${escapeHtml(v.description||name)}</small>
    </button>`).join("");
  el.querySelectorAll("[data-modifier]").forEach(b=>b.onclick=()=>{
    const selected=lightingSelected();if(!selected||!lightingCanEdit())return;
    const pose={x:selected.x,y:selected.y,height3d:selected.height3d,rotation:selected.rotation,tilt:selected.tilt};
    selected.diffusion=b.dataset.modifier;const modifier=lightingModifierProps(selected.diffusion);if(modifier.beam!=null)selected.beam=modifier.beam;
    Object.assign(selected,pose);
    markLightingDirty();renderLightingInspector();renderLightingCanvas();syncLighting3D()
  })
}
function setLightingCurrent(diagram){
  stopVirtualExplore();
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
  const firstCharacter=app.lighting.current.data.objects.find(o=>o.type==="subject");
  app.lighting.activeCameraId=firstCam?.id||null;
  app.lighting.selectedId=firstCam?.id||app.lighting.current.data.objects[0]?.id||null;
  app.lighting.inspectorOpen=true;
  app.lighting.playback.selectedKeyframeId=activeCameraTimelineFrames(app.lighting.current.data.timeline,firstCam)[0]?.id||null;
  app.lighting.playback.activeCharacterId=firstCharacter?.id||null;
  app.lighting.playback.selectedCharacterKeyframeId=app.lighting.current.data.timeline.characterKeyframes.find(frame=>frame.objectId===firstCharacter?.id)?.id||null;
  app.lighting.playback.selectedTrack="camera";
  app.lighting.playback.elapsed=0;app.lighting.playback.baseCamera=null;app.lighting.playback.baseSubjects=null;app.lighting.playback.playing=false;
  app.lighting.panDrag=null;app.lighting.planPane="top";
  app.lighting.planView={zoom:1,centerX:600,centerY:400};
  app.lighting.elevationView={zoom:1,centerX:600,centerY:250};
  app.lighting.dirty=false;
  $("lightingDiagramName").value=app.lighting.current.name||"Lighting Diagram";
  $("lightingDiagramNotes").value=app.lighting.current.data.notes||"";
  renderLightingShotOptions();renderLightingDiagramList();renderLightingObjectList();
  renderLightingInspector();renderLightingCanvas();renderLightingTimeline();renderVirtualLocationControls();renderLightingVideoControls();clearLightingDirty()
}
async function loadLightingDiagrams(preferredId=null){
  if(!app.current)return;
  if(app.mode==="local"){
    let list=[];try{list=JSON.parse(localStorage.getItem(lightingLocalKey())||"[]")}catch(e){}
    app.lighting.diagrams=(list||[]).map(normalizeLightingDiagram)
  }else{
    let {data,error}=await sb.from("lighting_diagrams")
      .select("id,project_id,scene_id,shot_id,location_scan_id,created_by,name,data,updated_at")
      .eq("project_id",app.current.id).order("updated_at",{ascending:false});
    if(error&&/location_scan_id/i.test(String(error.message||""))){
      const fallback=await sb.from("lighting_diagrams")
        .select("id,project_id,scene_id,shot_id,created_by,name,data,updated_at")
        .eq("project_id",app.current.id).order("updated_at",{ascending:false});
      data=fallback.data;error=fallback.error;app.lighting.virtualLocationsReady=false
    }
    if(error){
      setMsg("lightingDiagramNotice",`Lighting Diagram setup is not active. Run the saved SQL query “Storyboard v4.8 - Lighting Access Repair”, then reload this project. Details: ${error.message}`,"warning");
      app.lighting.diagrams=[]
    }else{
      setMsg("lightingDiagramNotice","");
      app.lighting.diagrams=(data||[]).map(normalizeLightingDiagram)
    }
  }
  const d=app.lighting.diagrams.find(x=>x.id===preferredId)
    ||app.lighting.diagrams.find(x=>x.scene_id===app.activeSceneId&&x.shot_id===app.activeShotId);
  setLightingCurrent(d||newLightingDiagramObject())
}
async function openLightingWorkspace(options={}){
  if(!app.current)return;
  document.documentElement.classList.add("lighting-workspace-open");
  const dialog=$("lightingDiagramModal");if(!dialog.open)dialog.showModal();
  setMsg("lightingDiagramNotice","Loading Lighting Diagram…");
  try{
    populateLightingCameraSelects();renderLightingCameraSummary();
    await loadVirtualLocations();await loadLightingDiagrams(options.diagramId||null);applyLightingPermissions();
    app.lighting.viewMode="plan";renderLightingViewMode();subscribeLightingRealtime()
  }catch(error){console.error("Could not open Lighting Diagram",error);setMsg("lightingDiagramNotice",`Could not open Lighting Diagram. ${error.message||"Reload the project and try again."}`,"warning")}
}
function closeLightingWorkspace(){
  if(app.lighting.upload){setVirtualLocationNotice("Wait for the 3D scan upload to finish before closing Lighting Diagram.","warning");return}
  if(app.lighting.dirty&&!uiConfirm("Close Lighting Diagram without saving the latest changes?"))return;
  cancelLightingAnimatic();stopVirtualExplore();stopLightingPlayback(true);stopLighting3D();stopLightingVideoPolling();unsubscribeLightingRealtime();$("lightingDiagramModal").close();document.documentElement.classList.remove("lighting-workspace-open")
}
function toggleLightingDrawer(force){
  app.lighting.drawerCollapsed=typeof force==="boolean"?force:!app.lighting.drawerCollapsed;
  $("lightingDrawer").classList.toggle("collapsed",app.lighting.drawerCollapsed);
  $("lightingDrawerBody").hidden=app.lighting.drawerCollapsed;
  $("lightingDrawerArrow").textContent=app.lighting.drawerCollapsed?"▸":"▾"
}
function selectLightingObject(id,openDrawer=false,toggleInspector=false){
  const isCurrent=app.lighting.selectedId===id;
  app.lighting.inspectorOpen=toggleInspector?(isCurrent?!app.lighting.inspectorOpen:true):true;
  app.lighting.selectedId=id;
  const o=lightingSelected();
  if(o?.type==="camera"){
    const changedCamera=app.lighting.activeCameraId!==o.id;
    if(changedCamera){
      const previous=activeLightingCameraObject();
      if(previous&&app.lighting.playback.baseCamera)Object.assign(previous,deepClone(app.lighting.playback.baseCamera));
      app.lighting.playback.playing=false;app.lighting.playback.baseCamera=null
    }
    app.lighting.activeCameraId=o.id;
    app.lighting.playback.selectedKeyframeId=activeCameraTimelineFrames(currentLightingTimeline(),o)[0]?.id||null
  }
  if(o?.type==="subject")app.lighting.playback.activeCharacterId=o.id;
  const folder=lightingFolderForType(o?.type);if(folder)folder.open=true;
  if(openDrawer&&app.lighting.drawerCollapsed)toggleLightingDrawer(false);
  renderLightingObjectList();renderLightingInspector();renderLightingCanvas();renderLightingTimeline();syncLighting3D()
}
function markLightingDirty(){app.lighting.dirty=true;$("saveLightingDiagramBtn").textContent="Save •"}
function clearLightingDirty(){app.lighting.dirty=false;$("saveLightingDiagramBtn").textContent="Save"}
function persistLocalLightingList(){localStorage.setItem(lightingLocalKey(),JSON.stringify(app.lighting.diagrams))}
async function saveLightingDiagram(){
  const d=app.lighting.current;if(!d||!lightingCanEdit())return;
  if(app.lighting.playback.baseCamera||app.lighting.playback.baseSubjects)stopLightingPlayback(true);
  d.name=$("lightingDiagramName").value.trim()||"Lighting Diagram";
  d.data.notes=$("lightingDiagramNotes").value||"";
  d.data.virtualLocation=virtualLocationSettings();d.data.virtualLocation.scanId=d.location_scan_id||null;
  await syncTimelineDurationToShot(currentLightingTimeline().duration);
  d.updated_at=new Date().toISOString();
  if(app.mode==="local"){
    d.persisted=true;
    const i=app.lighting.diagrams.findIndex(x=>x.id===d.id);
    if(i>=0)app.lighting.diagrams[i]=deepClone(d);else app.lighting.diagrams.unshift(deepClone(d));
    persistLocalLightingList();app.lighting.sheetLinks=app.lighting.diagrams.map(row=>({id:row.id,scene_id:row.scene_id,shot_id:row.shot_id,name:row.name}));app.lighting.sheetLinksProjectId=app.current.id;clearLightingDirty();renderLightingDiagramList();return
  }
  const payload={scene_id:d.scene_id,shot_id:d.shot_id,name:d.name,data:d.data,updated_at:d.updated_at};
  if(app.lighting.virtualLocationsReady)payload.location_scan_id=d.location_scan_id||null;
  const result=d.persisted
    ?await sb.from("lighting_diagrams").update(payload).eq("id",d.id).select().single()
    :await sb.from("lighting_diagrams").insert({id:d.id,project_id:app.current.id,created_by:app.session.user.id,...payload}).select().single();
  if(result.error){setMsg("lightingDiagramNotice",result.error.message,"warning");return}
  const saved=normalizeLightingDiagram(result.data);saved.persisted=true;
  const i=app.lighting.diagrams.findIndex(x=>x.id===saved.id);
  if(i>=0)app.lighting.diagrams[i]=saved;else app.lighting.diagrams.unshift(saved);
  app.lighting.current=saved;app.lighting.sheetLinks=app.lighting.diagrams.map(row=>({id:row.id,scene_id:row.scene_id,shot_id:row.shot_id,name:row.name}));app.lighting.sheetLinksProjectId=app.current.id;clearLightingDirty();renderLightingDiagramList();
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
function restartLightingDiagram(){
  const d=app.lighting.current;if(!d||!lightingCanEdit())return;
  if(!uiConfirm("Restart this diagram? All lights, camera points and unsaved layout work in this diagram will be cleared."))return;
  stopVirtualExplore();stopLightingPlayback(false);
  d.data.objects=[defaultLightingCamera(),defaultLightingSubject()];d.data.notes="";d.data.timeline=defaultLightingTimeline();
  app.lighting.activeCameraId=d.data.objects[0].id;app.lighting.selectedId=d.data.objects[0].id;app.lighting.inspectorOpen=true;app.lighting.playback.selectedKeyframeId=null;app.lighting.playback.activeCharacterId=d.data.objects.find(o=>o.type==="subject")?.id||null;app.lighting.playback.selectedCharacterKeyframeId=null;app.lighting.playback.baseSubjects=null;app.lighting.panDrag=null;app.lighting.planPane="top";app.lighting.planView={zoom:1,centerX:600,centerY:400};app.lighting.elevationView={zoom:1,centerX:600,centerY:250};
  $("lightingDiagramNotes").value="";markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();renderLightingTimeline();syncLighting3D();setMsg("lightingDiagramNotice","Diagram restarted. Save when ready.","warning")
}
function applyLightingPermissions(){
  const edit=lightingCanEdit();
  [
    "lightingDiagramName","saveLightingDiagramBtn","restartLightingDiagramBtn",
    "addLightingCameraBtn","addLightingCharacterBtn","addLightingFixtureBtn","addShotLightingBtn","lightingObjectLabel",
    "lightingObjectKelvin","lightingObjectIntensity","lightingObjectBeam","lightingObjectHeight3d","lightingObjectTilt",
    "lightingObjectLens","lightingObjectShotSize","lightingObjectAngle","lightingObjectMovement","lightingCameraModel",
    "lightingObjectFocus","lightingCameraHeight3d","lightingCameraTilt","lightingSubjectHeight3d","lightingSubjectScale",
    "lightingSubjectGender","lightingSubjectCharacter","lightingSubjectFaceScale","lightingSubjectFaceYaw","lightingSubjectFaceOffset","lightingObjectRotation","deleteLightingObjectBtn","lightingDiagramNotes","virtualLocationSelect",
    "importVirtualLocationBtn","detachVirtualLocationBtn","deleteVirtualLocationBtn",
    "virtualLocationScale","virtualLocationRotation","virtualLocationOffsetX","virtualLocationOffsetY","virtualLocationOffsetZ",
    "resetVirtualLocationTransformBtn","placeCameraFromExplorerBtn","drawerAddLightingCameraBtn","drawerAddLightingFixtureBtn","drawerAddLightingCharacterBtn","linkVirtualLocationBibleBtn","captureVirtualLocationBibleBtn",
    "lightingTimelineDuration","lightingTimelineTime","lightingTimelineCharacter","lightingAddKeyframeBtn","lightingDeleteKeyframeBtn","lightingAddCharacterKeyframeBtn","lightingDeleteCharacterKeyframeBtn","lightingDeleteSelectedKeyframeBtn"
  ].forEach(id=>{if($(id))$(id).disabled=!edit})
  if($("scanVirtualLocationBtn"))$("scanVirtualLocationBtn").disabled=true;
  renderVirtualLocationControls()
}
function addLightingObject(o){
  const d=app.lighting.current;if(!d||!lightingCanEdit())return;
  d.data.objects.push(normalizeLightingObject(o));app.lighting.selectedId=o.id;app.lighting.inspectorOpen=true;
  if(o.type==="camera"){
    app.lighting.activeCameraId=o.id;
    const subject=findLightingSubject(o);
    if(subject){
      if(o.cameraHeight!=="Custom")o.height3d=cameraHeightMeters(o.cameraHeight,subject);
      applyCameraAnglePreset(o,o.angle||"Eye Level")
    }
  }else if(o.type==="subject"){
    app.lighting.playback.activeCharacterId=o.id
  }
  markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();renderLightingTimeline();syncLighting3D()
}
function addLightingFixture(){
  const n=app.lighting.current?.data?.objects?.filter(o=>o.type==="light").length||0;
  addLightingObject(defaultLightingLight("Nanlite Forza 300B II",{x:370+(n%4)*60,y:230+(n%3)*80,rotation:25+n*22}))
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
  app.lighting.selectedId=c.id;app.lighting.inspectorOpen=true;app.lighting.activeCameraId=c.id;
  markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();syncLighting3D()
}
function useSelectedCameraView(){
  const o=lightingSelected();if(!o||o.type!=="camera")return;
  o.autoFrame=true;app.lighting.activeCameraId=o.id;setLightingViewMode("camera")
}
function updateLightingLinkedShot(){
  /* Shot links are set when a diagram is created or opened from Storyboard Sheet. */
}
function selectedLightingChange(sourceId=""){
  const o=lightingSelected();if(!o||!lightingCanEdit())return;
  const inputNumber=(id,fallback)=>{const value=Number.parseFloat($(id)?.value);return Number.isFinite(value)?value:fallback};
  if(sourceId==="lightingObjectLabel")o.label=$("lightingObjectLabel").value.trim()||o.type;
  if(sourceId==="lightingObjectRotation")o.rotation=inputNumber("lightingObjectRotation",Number(o.rotation??0));

  if(o.type==="light"){
    const fixture=lightingFixtureProps(o.fixture),modifier=lightingModifierProps(o.diffusion),beamMin=Number(modifier.beamMin??fixture.beamMin??5),beamMax=Number(modifier.beamMax??fixture.beamMax??175);
    if(sourceId==="lightingObjectKelvin")o.kelvin=Math.max(fixture.kelvinMin||1800,Math.min(fixture.kelvinMax||20000,inputNumber("lightingObjectKelvin",Number(o.kelvin??fixture.kelvin))));
    else if(sourceId==="lightingObjectIntensity")o.intensity=Math.max(0,Math.min(100,inputNumber("lightingObjectIntensity",Number(o.intensity??70))));
    else if(sourceId==="lightingObjectBeam")o.beam=Math.max(Math.min(beamMin,beamMax),Math.min(Math.max(beamMin,beamMax),inputNumber("lightingObjectBeam",Number(o.beam??fixture.beam))));
    else if(sourceId==="lightingObjectHeight3d")o.height3d=Math.max(.1,inputNumber("lightingObjectHeight3d",Number(o.height3d??2.2)));
    else if(sourceId==="lightingObjectTilt")o.tilt=inputNumber("lightingObjectTilt",Number(o.tilt??-15))
  }else if(o.type==="camera"){
    o.cameraModel=$("lightingCameraModel").value;
    o.lens=$("lightingObjectLens").value;
    o.shotSize=$("lightingObjectShotSize").value;
    o.angle=$("lightingObjectAngle").value;
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
    }else if(sourceId==="lightingObjectLens"||sourceId==="lightingObjectShotSize"||sourceId==="lightingCameraModel"){
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
    o.characterId=$("lightingSubjectCharacter").value||"";
    o.faceScale=Number($("lightingSubjectFaceScale").value)||100;
    o.faceYaw=Number($("lightingSubjectFaceYaw").value)||0;
    o.faceOffset=Number($("lightingSubjectFaceOffset").value)||0;
    for(const cam of app.lighting.current.data.objects.filter(x=>x.type==="camera"&&x.autoFrame!==false)){
      if(cam.cameraHeight!=="Custom")cam.height3d=cameraHeightMeters(cam.cameraHeight,o);
      reframeCameraDistance(cam,{force:true});
      if(cam.angle!=="Custom")pointCameraTowardSubject(cam,o)
    }
  }

  syncCurrentObjectToTimelineKeyframe(o);
  if(o.type==="subject")syncCurrentObjectToTimelineKeyframe(activeLightingCameraObject());
  markLightingDirty();renderLightingObjectList();renderLightingInspector(false);renderLightingCanvas();syncLighting3D()
}
function renderLightingInspector(updateInputs=true){
  const o=lightingSelected();
  mountLightingInspector();
  const show=!!o&&app.lighting.inspectorOpen;
  $("lightingInspectorEmpty").hidden=!!o;$("lightingInspector").hidden=!show;
  if(!show)return;
  $("lightingLightFields").hidden=o.type!=="light";
  $("lightingCameraFields").hidden=o.type!=="camera";
  $("lightingSubjectFields").hidden=o.type!=="subject";
  if(updateInputs){
    $("lightingObjectLabel").value=o.label||o.type;
    $("lightingObjectRotation").value=Number(o.rotation||0);
    if(o.type==="light"){
      const fixture=lightingFixtureProps(o.fixture),modifier=lightingModifierProps(o.diffusion),beamMin=Number(modifier.beamMin??fixture.beamMin??5),beamMax=Number(modifier.beamMax??fixture.beamMax??175);
      $("lightingObjectKelvin").min=String(fixture.kelvinMin||1800);$("lightingObjectKelvin").max=String(fixture.kelvinMax||20000);
      $("lightingObjectBeam").min=String(Math.min(beamMin,beamMax));$("lightingObjectBeam").max=String(Math.max(beamMin,beamMax));$("lightingObjectBeam").disabled=!lightingCanEdit()||beamMin===beamMax;
      $("lightingObjectKelvin").value=Number(o.kelvin??5600);
      $("lightingObjectIntensity").value=Number(o.intensity??70);
      $("lightingObjectBeam").value=Number(o.beam??45);
      $("lightingObjectHeight3d").value=Number(o.height3d??2.2);
      $("lightingObjectTilt").value=Number(o.tilt??-15);
      renderFixtureCatalog();renderModifierCatalog()
    }else if(o.type==="camera"){
      $("lightingCameraModel").value=o.cameraModel||"ARRI ALEXA Mini";
      $("lightingObjectLens").value=o.lens||"50mm";$("lightingObjectShotSize").value=o.shotSize||"CU · Close Up";
      $("lightingObjectAngle").value=o.angle||"Eye Level";
      $("lightingObjectMovement").value=o.movement||"Static";$("lightingObjectFocus").value=o.focus||"Shallow Focus";
      $("lightingCameraHeight3d").value=Number(o.height3d||1.65);$("lightingCameraTilt").value=Number(o.tilt||0);
      renderLightingCameraSummary()
    }else if(o.type==="subject"){
      const select=$("lightingSubjectCharacter"),available=app.ai.characters||[];select.innerHTML=`<option value="">Generic mannequin</option>`+available.map(asset=>`<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.name)}${asset.face_scan_path?" · 3D face":" · no 3D face"}</option>`).join("");select.value=available.some(asset=>asset.id===o.characterId)?o.characterId:"";
      $("lightingSubjectHeight3d").value=Number(o.height3d||1.75);
      $("lightingSubjectScale").value=Number(o.scale||100);
      $("lightingSubjectGender").value=o.gender||"female";
      $("lightingSubjectFaceScale").value=Number(o.faceScale||100);$("lightingSubjectFaceYaw").value=Number(o.faceYaw||0);$("lightingSubjectFaceOffset").value=Number(o.faceOffset||0)
    }
  }
  $("lightingRotationValue").textContent=`${Math.round(Number(o.rotation||0))}°`;
  if(o.type==="light"){
    const fixture=lightingFixtureProps(o.fixture),modifier=lightingModifierProps(o.diffusion),specs=$("lightingFixtureSpecs"),modifierSpecs=$("lightingModifierSpecs");
    specs.innerHTML=`<span><strong>${escapeHtml(fixture.brand)}</strong> ${escapeHtml(fixture.model)}</span>${fixture.watts?`<span><strong>${fixture.watts} W</strong></span>`:""}<span>${fixture.kelvinMin}–${fixture.kelvinMax} K</span><span>${fixture.beamMin}–${fixture.beamMax}° native</span><span>${escapeHtml(fixture.engine||fixture.shape)}</span>`;
    modifierSpecs.innerHTML=`<span><strong>${escapeHtml(modifier.short)}</strong></span><span>${Math.round(lightingEffectiveBeam(o))}° effective</span><span>${Math.round((modifier.transmission??1)*100)}% transmission</span><span>${Math.round((modifier.softness||0)*100)}% softness</span>`;
    $("lightingKelvinValue").textContent=`${Math.round(Number(o.kelvin??5600))} K`;
    $("lightingIntensityValue").textContent=`${Math.round(Number(o.intensity??70))}%`;
    $("lightingBeamValue").textContent=`${Math.round(lightingEffectiveBeam(o))}°`;
    $("lightingHeightValue").textContent=`${Number(o.height3d??2.2).toFixed(1)} m`;
    $("lightingTiltValue").textContent=`${Math.round(Number(o.tilt??0))}°`
  }else if(o.type==="camera"){
    const cameraSpec=cinemaCameraSpec(o),active=cameraActiveSensor(o);
    $("lightingCameraModelSpecs").innerHTML=`
      <div class="lighting-camera-spec-card lighting-camera-spec-primary"><small>SENSOR</small><strong>${cameraSpec.sensorWidth.toFixed(2)} × ${cameraSpec.sensorHeight.toFixed(2)} mm</strong><em>${active.width.toFixed(2)} × ${active.height.toFixed(2)} mm active</em></div>
      <div class="lighting-camera-spec-card"><small>DYNAMIC RANGE</small><strong>${escapeHtml(cameraSpec.dynamicRange||"Not published")}</strong></div>
      <div class="lighting-camera-spec-card"><small>BIT DEPTH</small><strong>${escapeHtml(cameraSpec.bitDepth||"Not published")}</strong></div>
      <div class="lighting-camera-spec-card"><small>RECORDING FORMAT</small><strong>${escapeHtml(cameraSpec.format)}</strong><em>${escapeHtml(cameraSpec.resolution)}</em></div>
      <div class="lighting-camera-spec-card"><small>VIEWFINDER</small><strong>${escapeHtml(cameraSpec.display)}</strong></div>
      ${cameraSpec.source?`<a class="lighting-camera-spec-source" href="${escapeHtml(cameraSpec.source)}" target="_blank" rel="noopener noreferrer">↗ Official manufacturer specification</a>`:""}`;
    $("lightingCameraHeightValue").textContent=`${Number(o.height3d||1.65).toFixed(2)} m`;
    $("lightingCameraTiltValue").textContent=`${Math.round(Number(o.tilt||0))}°`
  }else if(o.type==="subject"){
    const faceAsset=(app.ai.characters||[]).find(asset=>asset.id===o.characterId),hasFace=!!faceAsset?.face_scan_path;$("lightingSubjectFaceControls").hidden=!hasFace;
    if(hasFace)$("lightingSubjectFaceName").textContent=faceAsset.name;
    $("lightingSubjectHeightValue").textContent=`${Number(o.height3d||1.75).toFixed(2)} m`;
    $("lightingSubjectScaleValue").textContent=`${Math.round(Number(o.scale||100))}%`;
    $("lightingSubjectFaceScaleValue").textContent=`${Math.round(Number(o.faceScale||100))}%`;$("lightingSubjectFaceYawValue").textContent=`${Math.round(Number(o.faceYaw||0))}°`;$("lightingSubjectFaceOffsetValue").textContent=`${Math.round(Number(o.faceOffset||0))} cm`
  }
}
function deleteSelectedLightingObject(){
  const d=app.lighting.current,o=lightingSelected();if(!d||!o||!lightingCanEdit())return;
  d.data.objects=d.data.objects.filter(x=>x.id!==o.id);
  if(app.lighting.activeCameraId===o.id)app.lighting.activeCameraId=d.data.objects.find(x=>x.type==="camera")?.id||null;
  if(o.type==="subject"){
    d.data.timeline=normalizeLightingTimeline(d.data.timeline);
    d.data.timeline.characterKeyframes=d.data.timeline.characterKeyframes.filter(frame=>frame.objectId!==o.id);
    if(app.lighting.playback.activeCharacterId===o.id)app.lighting.playback.activeCharacterId=d.data.objects.find(x=>x.type==="subject")?.id||null;
    app.lighting.playback.selectedCharacterKeyframeId=null
  }
  app.lighting.selectedId=d.data.objects[0]?.id||null;app.lighting.inspectorOpen=!!app.lighting.selectedId;
  markLightingDirty();renderLightingObjectList();renderLightingInspector();renderLightingCanvas();renderLightingTimeline();syncLighting3D()
}

function lightingFixturePlanSvg(fixture,stroke,color,selected){
  const width=selected?2.8:1.7,type=fixture.iconType||"cob",common=`fill="#0b0d0f" stroke="${stroke}" stroke-width="${width}" vector-effect="non-scaling-stroke"`;
  if(type==="panel"||type==="slim-panel")return `<rect x="-20" y="-15" width="40" height="30" rx="3" ${common}/><path d="M-10-15v30M0-15v30M10-15v30M-20-5h40M-20 5h40" fill="none" stroke="${color}" stroke-width="1" opacity=".7"/><path d="M-6 16v8h12v-8" fill="none" stroke="${stroke}" stroke-width="2"/>`;
  if(type==="tube")return `<rect x="-22" y="-6" width="44" height="12" rx="6" ${common}/><path d="M-15 0h30" stroke="${color}" stroke-width="5" opacity=".85"/>`;
  if(type==="window")return `<rect x="-20" y="-18" width="40" height="36" ${common}/><path d="M0-18v36M-20 0h40" stroke="${color}" stroke-width="2"/>`;
  if(type==="candle")return `<path d="M-7-5h14v22H-7zM0-7c-7-7 3-12 0-18 8 6 8 13 0 18Z" ${common}/>`;
  if(type==="bulb")return `<path d="M-11-5a11 11 0 1 1 22 0c0 7-5 9-7 14H-4c-2-5-7-7-7-14ZM-5 14h10M-3 19h6" ${common}/>`;
  const front=type==="fresnel"?`<circle cx="15" cy="0" r="9" fill="${color}" stroke="${stroke}" stroke-width="1.5"/><path d="M10-6c5 3 5 9 0 12" fill="none" stroke="#071014" stroke-width="1.5"/>`:`<circle cx="15" cy="0" r="8" fill="${color}" stroke="${stroke}" stroke-width="1.2"/>`;
  return `<path d="M-22-14H9l13 14L9 14h-31z" ${common}/>${front}<path d="M-7 15v9h14v-9" fill="none" stroke="${stroke}" stroke-width="2"/>`
}

function lightingObjectSvg(o,selected){
  const stroke=selected?"#30d7ff":"#edf3f6";
  const rotateHandle=(cx,cy)=>`
    <g data-lighting-rotate-handle="${o.id}" class="lighting-rotate-handle">
      <circle cx="${cx+28}" cy="${cy-30}" r="13" fill="#0b0d10" stroke="#5b6c75" stroke-width="1.4"/>
      <text x="${cx+28}" y="${cy-25}" fill="#d9e6ec" font-size="13" text-anchor="middle">⟳</text>
    </g>`;
  if(o.type==="camera"){
    const fov=cameraHorizontalFov(o.lens,o),len=285;
    const p1=polarPoint(o.x,o.y,len,o.rotation-fov/2),p2=polarPoint(o.x,o.y,len,o.rotation+fov/2);
    return `<g>
      <g data-lighting-id="${o.id}">
        <path class="lighting-fov" d="M ${o.x} ${o.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z" fill="rgba(48,215,255,.07)" stroke="rgba(48,215,255,.33)" stroke-width="2"/>
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
    const beam=lightingEffectiveBeam(o);
    const effective=(Number(o.intensity||70)/100)*(mp.transmission??1)*(fp.output??1);
    const color=kelvinCss(o.kelvin||5600),len=fp.length||330;
    let beamSvg="";
    if(fp.shape==="omni"){
      const rad=Math.max(75,len*(.55+effective*.65));
      beamSvg=`<circle class="lighting-beam" cx="${o.x}" cy="${o.y}" r="${rad}" fill="${color}" opacity="${(.06+effective*.10).toFixed(2)}"/>`
    }else{
      const p1=polarPoint(o.x,o.y,len,o.rotation-beam/2),p2=polarPoint(o.x,o.y,len,o.rotation+beam/2);
      beamSvg=`<path class="lighting-beam" d="M ${o.x} ${o.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z" fill="${color}" opacity="${(.07+effective*.12).toFixed(2)}"/>`
    }
    return `<g>
      <g data-lighting-id="${o.id}">
        ${beamSvg}
        <g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})">
          ${lightingFixturePlanSvg(fp,stroke,color,selected)}
        </g>
        <text x="${o.x+34}" y="${o.y-7}" fill="#f4f7f8" font-size="15" font-weight="700">${safeSvgText(o.label||o.fixture)}</text>
        <text x="${o.x+34}" y="${o.y+13}" fill="#8c9aa2" font-size="11">${safeSvgText(o.fixture)} · ${Math.round(beam)}° · ${Number(o.kelvin||5600)}K</text>
      </g>
      ${rotateHandle(o.x,o.y)}
    </g>`
  }
  return ""
}

function lightingViewState(pane=app.lighting.planPane||"top"){
  if(pane==="elevation")return app.lighting.elevationView||(app.lighting.elevationView={zoom:1,centerX:600,centerY:250});
  return app.lighting.planView||(app.lighting.planView={zoom:1,centerX:600,centerY:400})
}
function lightingViewBoxFor(pane="top"){
  const elevation=pane==="elevation",worldWidth=1200,worldHeight=elevation?500:800,view=lightingViewState(pane),zoom=Math.max(.45,Math.min(3.5,Number(view.zoom)||1));
  const width=worldWidth/zoom,height=worldHeight/zoom;
  const centerX=width>=worldWidth?worldWidth/2:Math.max(width/2,Math.min(worldWidth-width/2,Number(view.centerX)||worldWidth/2));
  const centerY=height>=worldHeight?worldHeight/2:Math.max(height/2,Math.min(worldHeight-height/2,Number(view.centerY)||worldHeight/2));
  view.zoom=zoom;view.centerX=centerX;view.centerY=centerY;return {x:centerX-width/2,y:centerY-height/2,width,height,zoom}
}
function lightingPlanViewBox(){return lightingViewBoxFor("top")}
function lightingElevationViewBox(){return lightingViewBoxFor("elevation")}
function applyLightingPlanViewBox(){
  const top=$("lightingCanvas"),elevation=$("lightingElevationCanvas"),topBox=lightingPlanViewBox(),elevationBox=lightingElevationViewBox();
  if(top)top.setAttribute("viewBox",`${topBox.x} ${topBox.y} ${topBox.width} ${topBox.height}`);
  if(elevation)elevation.setAttribute("viewBox",`${elevationBox.x} ${elevationBox.y} ${elevationBox.width} ${elevationBox.height}`);
  const pane=app.lighting.planPane==="elevation"?"elevation":"top",active=pane==="elevation"?elevationBox:topBox,zoomValue=$("lightingZoomValue");
  if(zoomValue){zoomValue.textContent=`${Math.round(active.zoom*100)}%`;zoomValue.title=pane==="elevation"?"Side / elevation zoom":"Top view zoom"}
}
function setLightingPlanZoom(value,pane=app.lighting.planPane||"top"){
  app.lighting.planPane=pane;lightingViewState(pane).zoom=Math.max(.45,Math.min(3.5,Number(value)||1));applyLightingPlanViewBox()
}
function lightingPlanWheel(event,pane="top"){
  event.preventDefault();app.lighting.planPane=pane;const factor=event.deltaY<0?1.14:.88;setLightingPlanZoom((lightingViewState(pane).zoom||1)*factor,pane)
}
function fitLightingPlanViews(){
  app.lighting.planView={zoom:1,centerX:600,centerY:400};app.lighting.elevationView={zoom:1,centerX:600,centerY:250};applyLightingPlanViewBox()
}
function lightingCanvasForPane(pane){return pane==="elevation"?$("lightingElevationCanvas"):$("lightingCanvas")}
function startLightingCanvasPan(event,pane="top"){
  if(event.pointerType==="mouse"&&event.button!==0)return;
  const svg=lightingCanvasForPane(pane);if(!svg)return;const box=lightingViewBoxFor(pane),rect=svg.getBoundingClientRect(),view=lightingViewState(pane);
  app.lighting.planPane=pane;app.lighting.panDrag={pane,pointerId:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,startCenterX:view.centerX,startCenterY:view.centerY,worldPerPixelX:box.width/Math.max(1,rect.width),worldPerPixelY:box.height/Math.max(1,rect.height)};
  svg.classList.add("is-panning");svg.setPointerCapture?.(event.pointerId);event.preventDefault();applyLightingPlanViewBox()
}
function moveLightingCanvasPan(event){
  const drag=app.lighting.panDrag;if(!drag||drag.pointerId!==event.pointerId)return;const view=lightingViewState(drag.pane);
  view.centerX=drag.startCenterX-(event.clientX-drag.startClientX)*drag.worldPerPixelX;
  view.centerY=drag.startCenterY-(event.clientY-drag.startClientY)*drag.worldPerPixelY;
  applyLightingPlanViewBox();event.preventDefault()
}
function endLightingCanvasPan(event){
  const drag=app.lighting.panDrag;if(!drag||drag.pointerId!==event.pointerId)return;
  lightingCanvasForPane(drag.pane)?.classList.remove("is-panning");app.lighting.panDrag=null
}
function lightingElevationObjectSvg(o,selected){
  const x=55+Number(o.x||0)*.9,floor=440,height=Math.max(.1,Number(o.height3d||(o.type==="subject"?1.75:1.65))),y=floor-height*62,stroke=selected?"#4ee2ff":"#e7eff2",label=safeSvgText(o.label||o.fixture||o.type);
  if(o.type==="subject"){
    const scaled=Math.max(.5,subjectScaledHeight(o))*62,headY=floor-scaled+13;
    return `<g data-lighting-elevation-id="${o.id}"><line x1="${x}" y1="${floor}" x2="${x}" y2="${headY+13}" stroke="${stroke}" stroke-width="5"/><circle cx="${x}" cy="${headY}" r="12" fill="#11171a" stroke="${stroke}" stroke-width="${selected?3:1.5}"/><path d="M${x} ${headY+26}l-18 38m18-38l18 38m-18-7l-14 44m14-44l14 44" fill="none" stroke="${stroke}" stroke-width="4"/><text x="${x+22}" y="${headY}" fill="#dce8ec" font-size="14">${label}</text></g>`
  }
  if(o.type==="camera"){
    const pitch=Number(o.tilt||0),rayY=y-Math.tan(pitch*Math.PI/180)*230;
    return `<g><path class="lighting-elevation-ray" d="M${x} ${y}L${x+230} ${rayY}" stroke="rgba(70,218,250,.35)" stroke-width="2" stroke-dasharray="7 7"/><g data-lighting-elevation-id="${o.id}"><rect x="${x-23}" y="${y-15}" width="38" height="30" rx="5" fill="#0b1013" stroke="${stroke}" stroke-width="${selected?3:1.6}"/><path d="M${x+15} ${y-9}l22-8v34l-22-8z" fill="#0b1013" stroke="${stroke}" stroke-width="2"/><line x1="${x}" y1="${y+16}" x2="${x}" y2="${floor}" stroke="#59666c"/><text x="${x+42}" y="${y+4}" fill="#dce8ec" font-size="14">${label} · ${height.toFixed(2)} m</text></g></g>`
  }
  const color=kelvinCss(o.kelvin||5600),tilt=Number(o.tilt||0),rayY=y-Math.tan(tilt*Math.PI/180)*210;
  return `<g><path class="lighting-elevation-ray" d="M${x} ${y}L${x+210} ${rayY}" stroke="${color}" stroke-width="10" opacity=".12"/><g data-lighting-elevation-id="${o.id}"><rect x="${x-20}" y="${y-13}" width="40" height="26" rx="5" fill="#0b1013" stroke="${stroke}" stroke-width="${selected?3:1.6}"/><circle cx="${x+20}" cy="${y}" r="7" fill="${color}"/><line x1="${x}" y1="${y+14}" x2="${x}" y2="${floor}" stroke="#59666c"/><text x="${x+33}" y="${y+4}" fill="#dce8ec" font-size="14">${label} · ${height.toFixed(2)} m</text></g></g>`
}
function lightingCameraPathPlanSvg(){
  const frames=activeCameraTimelineFrames();if(!frames.length)return "";const points=frames.map(frame=>`${frame.x},${frame.y}`).join(" ");return `<g class="lighting-camera-path" pointer-events="none">${frames.length>1?`<polyline points="${points}" fill="none" stroke="#ffbd59" stroke-width="3" stroke-dasharray="9 7" vector-effect="non-scaling-stroke"/>`:""}${frames.map((frame,index)=>`<circle cx="${frame.x}" cy="${frame.y}" r="12" fill="#19130a" stroke="#ffbd59" stroke-width="3" vector-effect="non-scaling-stroke"/><text x="${frame.x}" y="${frame.y+4}" text-anchor="middle" fill="#ffe0a5" font-size="11" font-weight="900">${index+1}</text>`).join("")}</g>`
}
function lightingCameraPathElevationSvg(){
  const frames=activeCameraTimelineFrames();if(!frames.length)return "";const points=frames.map(frame=>`${55+Number(frame.x||0)*.9},${440-Number(frame.height3d||1.65)*62}`).join(" ");return `<g class="lighting-camera-path" pointer-events="none">${frames.length>1?`<polyline points="${points}" fill="none" stroke="#ffbd59" stroke-width="3" stroke-dasharray="9 7"/>`:""}${frames.map((frame,index)=>{const x=55+Number(frame.x||0)*.9,y=440-Number(frame.height3d||1.65)*62;return `<circle cx="${x}" cy="${y}" r="11" fill="#19130a" stroke="#ffbd59" stroke-width="3"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#ffe0a5" font-size="10" font-weight="900">${index+1}</text>`}).join("")}</g>`
}
function lightingCharacterPathPlanSvg(){
  const timeline=app.lighting.current?.data?.timeline,frames=timeline?.characterKeyframes||[];if(!frames.length)return "";
  const groups=[...new Set(frames.map(frame=>frame.objectId))];
  return groups.map(objectId=>{const path=frames.filter(frame=>frame.objectId===objectId).sort((a,b)=>a.time-b.time),points=path.map(frame=>`${frame.x},${frame.y}`).join(" ");return `<g class="lighting-character-path" pointer-events="none">${path.length>1?`<polyline points="${points}" fill="none" stroke="#d982ff" stroke-width="3" stroke-dasharray="7 7" vector-effect="non-scaling-stroke"/>`:""}${path.map((frame,index)=>`<circle cx="${frame.x}" cy="${frame.y}" r="10" fill="#1c1021" stroke="#d982ff" stroke-width="3" vector-effect="non-scaling-stroke"/><text x="${frame.x}" y="${frame.y+4}" text-anchor="middle" fill="#f1c6ff" font-size="10" font-weight="900">${index+1}</text>`).join("")}</g>`}).join("")
}
function lightingCharacterPathElevationSvg(){
  const timeline=app.lighting.current?.data?.timeline,frames=timeline?.characterKeyframes||[];if(!frames.length)return "";
  const groups=[...new Set(frames.map(frame=>frame.objectId))];
  return groups.map(objectId=>{const path=frames.filter(frame=>frame.objectId===objectId).sort((a,b)=>a.time-b.time),points=path.map(frame=>`${55+Number(frame.x||0)*.9},${440-Number(frame.height3d||1.75)*62}`).join(" ");return `<g class="lighting-character-path" pointer-events="none">${path.length>1?`<polyline points="${points}" fill="none" stroke="#d982ff" stroke-width="3" stroke-dasharray="7 7"/>`:""}${path.map((frame,index)=>{const x=55+Number(frame.x||0)*.9,y=440-Number(frame.height3d||1.75)*62;return `<circle cx="${x}" cy="${y}" r="10" fill="#1c1021" stroke="#d982ff" stroke-width="3"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#f1c6ff" font-size="9" font-weight="900">${index+1}</text>`}).join("")}</g>`}).join("")
}
function renderLightingElevationCanvas(){
  const svg=$("lightingElevationCanvas"),d=app.lighting.current;if(!svg||!d)return;
  let content=`<defs><pattern id="elevationGrid" width="90" height="62" patternUnits="userSpaceOnUse"><path d="M90 0H0V62" fill="none" stroke="#222b30" stroke-width="1"/></pattern></defs><rect class="lighting-elevation-bg" width="1200" height="500" fill="#080a0c"/><rect class="lighting-elevation-bg" x="55" y="68" width="1080" height="372" fill="url(#elevationGrid)"/><line x1="45" y1="440" x2="1160" y2="440" stroke="#829097" stroke-width="2"/><text x="18" y="82" fill="#64747c" font-size="12">6 m</text><text x="21" y="444" fill="#64747c" font-size="12">0 m</text><text x="1060" y="475" fill="#64747c" font-size="12">Side elevation · drag vertically to set height</text>`;
  content+=lightingCameraPathElevationSvg();content+=lightingCharacterPathElevationSvg();content+=(d.data.objects||[]).map(o=>lightingElevationObjectSvg(o,o.id===app.lighting.selectedId)).join("");svg.innerHTML=content;
  applyLightingPlanViewBox();
  svg.querySelectorAll("[data-lighting-elevation-id]").forEach(node=>{node.style.cursor=lightingCanEdit()?"ns-resize":"pointer";node.addEventListener("pointerdown",event=>startLightingElevationDrag(event,node.dataset.lightingElevationId))})
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
  content+=virtualLocationFootprintSvg();
  content+=lightingCameraPathPlanSvg();
  content+=lightingCharacterPathPlanSvg();
  content+=(d.data.objects||[]).map(o=>lightingObjectSvg(o,o.id===app.lighting.selectedId)).join("");
  svg.innerHTML=content;
  applyLightingPlanViewBox();
  svg.querySelectorAll("[data-lighting-id]").forEach(node=>{
    node.style.cursor=lightingCanEdit()?"grab":"pointer";
    node.addEventListener("pointerdown",e=>startLightingDrag(e,node.dataset.lightingId))
  });
  svg.querySelectorAll("[data-lighting-rotate-handle]").forEach(node=>{
    node.style.cursor=lightingCanEdit()?"grab":"default";
    node.addEventListener("pointerdown",e=>startLightingRotateHandle(e,node.dataset.lightingRotateHandle))
  });renderLightingElevationCanvas()
}
function virtualLocationFootprintSvg(){
  const scan=linkedVirtualLocation();if(!scan)return "";const settings=virtualLocationSettings(),transform=settings.transform,cached=app.lighting.locationModelCache.get(scan.id),bounds=cached?.bounds||scan.metadata?.bounds;
  if(!bounds?.size)return `<g class="lighting-scan-footprint"><rect x="420" y="300" width="360" height="200" rx="12"/><text x="600" y="390" text-anchor="middle">${safeSvgText(scan.name)}</text><text class="lighting-scan-footprint-meta" x="600" y="414" text-anchor="middle">${safeSvgText("Open Camera View to load scan footprint")}</text></g>`;
  const width=Math.max(12,Number(bounds.size.x||0)*Number(transform.scale||1)*100),height=Math.max(12,Number(bounds.size.z||0)*Number(transform.scale||1)*100),cx=600+Number(transform.x||0)*100,cy=400+Number(transform.z||0)*100;
  return `<g class="lighting-scan-footprint" transform="rotate(${Number(transform.rotationY)||0} ${cx} ${cy})"><rect x="${cx-width/2}" y="${cy-height/2}" width="${width}" height="${height}" rx="12"/><path d="M ${cx-18} ${cy} H ${cx+18} M ${cx} ${cy-18} V ${cy+18}"/><text x="${cx}" y="${cy-26}" text-anchor="middle">${safeSvgText(scan.name)}</text></g>`
}
function lightingSvgPoint(e){
  const svg=$("lightingCanvas"),r=svg.getBoundingClientRect(),box=svg.viewBox.baseVal;
  return {x:box.x+(e.clientX-r.left)*box.width/r.width,y:box.y+(e.clientY-r.top)*box.height/r.height}
}
function normalizeDegrees(v){return ((Number(v||0)%360)+360)%360}
function angleBetween2d(a,b){return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}
function startLightingRotateHandle(e,id){
  app.lighting.planPane="top";
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
  app.lighting.planPane="top";
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
  if(!lightingCanEdit()||!app.lighting.dragging||app.lighting.dragging.mode==="elevation")return;
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
    syncCurrentObjectToTimelineKeyframe(o);markLightingDirty();renderLightingInspector(false);renderLightingCanvas();syncLighting3D();return
  }

  if(d.mode==="rotate"){
    const a=angleBetween2d({x:o.x,y:o.y},p);
    o.rotation=normalizeDegrees(d.startRotation+(a-d.startPointerAngle));
    if(o.type==="camera")o.autoFrame=false;
    syncCurrentObjectToTimelineKeyframe(o);markLightingDirty();renderLightingInspector(false);renderLightingCanvas();syncLighting3D();return
  }

  if(d.pointerId!==e.pointerId)return;
  o.x=Math.max(25,Math.min(1175,d.objectX+p.x-d.startX));
  o.y=Math.max(25,Math.min(775,d.objectY+p.y-d.startY));
  if(o.type==="camera")o.autoFrame=false;
  syncCurrentObjectToTimelineKeyframe(o);markLightingDirty();renderLightingCanvas();syncLighting3D()
}
function endLightingDrag(e){
  if(e?.pointerId!=null)delete app.lighting.pointers[e.pointerId];
  if(!Object.keys(app.lighting.pointers).length)app.lighting.dragging=null
}
function lightingElevationPoint(event){
  const svg=$("lightingElevationCanvas"),r=svg.getBoundingClientRect(),box=svg.viewBox.baseVal;return {x:box.x+(event.clientX-r.left)*box.width/r.width,y:box.y+(event.clientY-r.top)*box.height/r.height}
}
function startLightingElevationDrag(event,id){
  app.lighting.planPane="elevation";applyLightingPlanViewBox();selectLightingObject(id,false);if(!lightingCanEdit())return;const o=lightingSelected();if(!o)return;event.preventDefault();event.stopPropagation();const p=lightingElevationPoint(event);app.lighting.dragging={id,mode:"elevation",pointerId:event.pointerId,startX:p.x,startY:p.y,objectX:Number(o.x||600),height3d:Number(o.height3d||(o.type==="light"?2.2:o.type==="subject"?1.75:1.65))};$("lightingElevationCanvas").setPointerCapture?.(event.pointerId)
}
function moveLightingElevationDrag(event){
  const drag=app.lighting.dragging;if(!drag||drag.mode!=="elevation"||drag.pointerId!==event.pointerId||!lightingCanEdit())return;const o=app.lighting.current?.data?.objects?.find(item=>item.id===drag.id);if(!o)return;const p=lightingElevationPoint(event);o.x=Math.max(0,Math.min(1200,drag.objectX+(p.x-drag.startX)/.9));o.height3d=Math.max(.1,Math.min(o.type==="subject"?2.5:o.type==="camera"?12:8,drag.height3d-(p.y-drag.startY)/62));if(o.type==="camera"){o.cameraHeight="Custom";o.autoFrame=false}syncCurrentObjectToTimelineKeyframe(o);markLightingDirty();renderLightingInspector(false);renderLightingCanvas();syncLighting3D()
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
function currentLightingTimeline(){
  const data=app.lighting.current?.data;if(!data)return defaultLightingTimeline();
  if(!data.timeline||typeof data.timeline!=="object"||!Array.isArray(data.timeline.keyframes)||!Array.isArray(data.timeline.characterKeyframes))data.timeline=normalizeLightingTimeline(data.timeline);
  return data.timeline
}
function lightingTimelineCharacters(){return (app.lighting.current?.data?.objects||[]).filter(object=>object.type==="subject")}
function activeCameraTimelineFrames(timeline=currentLightingTimeline(),camera=activeLightingCameraObject()){
  const cameraId=camera?.id||"";
  return timeline.keyframes.filter(frame=>!frame.objectId||frame.objectId===cameraId).sort((a,b)=>a.time-b.time)
}
function lightingPlayheadTime(timeline=currentLightingTimeline()){
  const input=Number($("lightingTimelineTime")?.value),elapsed=Number(app.lighting.playback.elapsed),value=Number.isFinite(input)?input:Number.isFinite(elapsed)?elapsed:0;
  return Math.max(0,Math.min(timeline.duration,value))
}
function timelineFrameAt(frames,time,tolerance=.035){return frames.find(frame=>Math.abs(Number(frame.time)-time)<tolerance)||null}
function upsertLightingKeyframe(frames,pose,time,objectId){
  const existing=timelineFrameAt(frames.filter(frame=>!frame.objectId||frame.objectId===objectId),time);pose.time=time;pose.objectId=objectId;
  if(existing){pose.id=existing.id;Object.assign(existing,pose);return {frame:existing,created:false}}
  frames.push(pose);frames.sort((a,b)=>a.time-b.time);return {frame:pose,created:true}
}
function verifyLightingKeyframeRecord(frames,result,objectId,time){
  const saved=frames.find(frame=>frame.id===result?.frame?.id&&frame.objectId===objectId&&Math.abs(Number(frame.time)-Number(time))<.001);
  if(!saved)throw new Error("Keyframe could not be recorded on the selected track.");
  return saved
}
function activeLightingTimelineCharacter(){
  const characters=lightingTimelineCharacters(),pb=app.lighting.playback,selected=lightingSelected();
  const character=(selected?.type==="subject"?selected:null)||characters.find(object=>object.id===pb.activeCharacterId)||characters[0]||null;
  if(character)pb.activeCharacterId=character.id;return character
}
function characterPoseFromCurrentSubject(subject=activeLightingTimelineCharacter(),duration=currentLightingTimeline().duration){
  if(!subject)return null;return normalizeCharacterKeyframe({...subject,id:uid(),objectId:subject.id},duration)
}
function lightingTimelineHasMotion(){
  const timeline=currentLightingTimeline();if(activeCameraTimelineFrames(timeline).length>=2)return true;
  const counts=new Map();for(const frame of timeline.characterKeyframes)counts.set(frame.objectId,(counts.get(frame.objectId)||0)+1);
  return [...counts.values()].some(count=>count>=2)
}
function lightingTimelinePlayable(){
  const timeline=currentLightingTimeline();return activeCameraTimelineFrames(timeline).length>0||timeline.characterKeyframes.length>0
}
function formatTimelineShotDuration(duration){return `${Number(Number(duration).toFixed(2))} s`}
async function syncTimelineDurationToShot(duration){
  const shot=linkedLightingShot();if(!shot||!can("shots"))return;
  const value=formatTimelineShotDuration(duration);shot.duration=value;
  if(shot===currentShot()){
    if($("duration"))$("duration").value=value;
    renderShot();renderSceneList();renderSheet();applyPermissionLocks();queueSave("shot");rememberWorkspace();return
  }
  if(app.mode==="local"){saveLocal();return}
  app.ignoreRealtimeUntil=Date.now()+1400;
  const {error}=await sb.from("shots").update({data:shotDbData(shot)}).eq("id",shot.id).eq("project_id",app.current.id);
  if(error)setMsg("lightingDiagramNotice",error.message||"The diagram duration changed, but the linked shot duration could not be saved.","warning")
}
function lightingPlaybackConfig(camObj){
  const sh=linkedLightingShot(),timeline=currentLightingTimeline();
  return {duration:timeline.duration||Math.max(.25,parseDurationSeconds(sh?.duration||"4")),movement:camObj?.movement||sh?.movement||"Static"}
}
function timelinePoseFromCurrentCamera(duration=currentLightingTimeline().duration){
  const cam=activeLightingCameraObject();if(!cam)return null;const pose=app.lighting.explorer.active&&app.lighting.explorer.pose;
  return normalizeCameraKeyframe(pose?{id:uid(),
    x:600+Number(pose.x||0)*100,y:400+Number(pose.z||0)*100,height3d:pose.y,
    rotation:pose.rotation,tilt:pose.tilt,roll:pose.roll,lens:pose.lens||cam.lens,cameraModel:cam.cameraModel,
    shotSize:cam.shotSize,angle:cam.angle,movement:cam.movement,focus:cam.focus,cameraHeight:cam.cameraHeight,objectId:cam.id
  }:{...cam,id:uid(),objectId:cam.id},duration)
}
function syncCurrentObjectToTimelineKeyframe(object=lightingSelected()){
  if(!object||!app.lighting.current)return false;const timeline=currentLightingTimeline(),time=lightingPlayheadTime(timeline),pb=app.lighting.playback;
  if(object.type==="camera"&&object.id===activeLightingCameraObject()?.id){
    const existing=timelineFrameAt(activeCameraTimelineFrames(timeline,object),time);if(!existing)return false;
    const pose=timelinePoseFromCurrentCamera(timeline.duration);if(!pose)return false;
    pose.id=existing.id;pose.time=existing.time;pose.objectId=object.id;Object.assign(existing,pose);pb.selectedTrack="camera";pb.selectedKeyframeId=existing.id;return true
  }
  if(object.type==="subject"){
    const frames=timeline.characterKeyframes.filter(frame=>frame.objectId===object.id),existing=timelineFrameAt(frames,time);if(!existing)return false;
    const pose=characterPoseFromCurrentSubject(object,timeline.duration);if(!pose)return false;
    pose.id=existing.id;pose.time=existing.time;pose.objectId=object.id;Object.assign(existing,pose);pb.selectedTrack="character";pb.activeCharacterId=object.id;pb.selectedCharacterKeyframeId=existing.id;return true
  }
  return false
}
function pulseLightingKeyframeMarker(attribute,id){
  requestAnimationFrame(()=>{const marker=document.querySelector(`[${attribute}="${id}"]`);if(!marker)return;marker.classList.remove("just-saved");requestAnimationFrame(()=>marker.classList.add("just-saved"))})
}
function ensureLightingKeyframeMarker(attribute,id){
  let marker=document.querySelector(`[${attribute}="${id}"]`);
  if(!marker){renderLightingTimeline();marker=document.querySelector(`[${attribute}="${id}"]`)}
  if(marker){marker.scrollIntoView?.({block:"nearest",inline:"nearest"});pulseLightingKeyframeMarker(attribute,id);return true}
  return false
}
function addLightingCameraKeyframe(){
  const d=app.lighting.current,cam=activeLightingCameraObject();if(!d||!cam||!lightingCanEdit())return null;const timeline=currentLightingTimeline(),time=lightingPlayheadTime(timeline),pose=timelinePoseFromCurrentCamera(timeline.duration);if(!pose)return null;
  const result=upsertLightingKeyframe(timeline.keyframes,pose,time,cam.id),saved=verifyLightingKeyframeRecord(timeline.keyframes,result,cam.id,time);app.lighting.playback.selectedKeyframeId=saved.id;
  app.lighting.playback.selectedTrack="camera";
  app.lighting.playback.elapsed=time;markLightingDirty();renderLightingTimeline();renderLightingCanvas();
  const visible=ensureLightingKeyframeMarker("data-keyframe-id",saved.id),count=activeCameraTimelineFrames(timeline,cam).length;
  updateLightingPlaybackStatus(visible?`Camera keyframe ${result.created?"added":"updated"} at ${time.toFixed(2)}s · ${count} saved${lightingTimelineHasMotion()?" · Ready to play":" · Add one more for movement"}`:"Keyframe was recorded, but its timeline marker could not be displayed. Reload this build.");void syncTimelineDurationToShot(timeline.duration);return saved
}
function deleteLightingCameraKeyframe(){
  const timeline=currentLightingTimeline(),id=app.lighting.playback.selectedKeyframeId;if(!id||!lightingCanEdit())return;timeline.keyframes=timeline.keyframes.filter(frame=>frame.id!==id);app.lighting.playback.selectedKeyframeId=null;markLightingDirty();renderLightingTimeline();renderLightingCanvas();updateLightingPlaybackStatus()
}
function addLightingCharacterKeyframe(){
  const d=app.lighting.current,subject=activeLightingTimelineCharacter();if(!d||!subject||!lightingCanEdit())return null;
  const timeline=currentLightingTimeline(),time=lightingPlayheadTime(timeline),pose=characterPoseFromCurrentSubject(subject,timeline.duration);if(!pose)return null;pose.time=time;pose.objectId=subject.id;
  const result=upsertLightingKeyframe(timeline.characterKeyframes,pose,time,subject.id),saved=verifyLightingKeyframeRecord(timeline.characterKeyframes,result,subject.id,time);app.lighting.playback.selectedCharacterKeyframeId=saved.id;
  app.lighting.playback.activeCharacterId=subject.id;app.lighting.playback.selectedTrack="character";app.lighting.playback.elapsed=time;
  markLightingDirty();renderLightingTimeline();renderLightingCanvas();
  const visible=ensureLightingKeyframeMarker("data-character-keyframe-id",saved.id),count=timeline.characterKeyframes.filter(frame=>frame.objectId===subject.id).length;
  updateLightingPlaybackStatus(visible?`${subject.label||"Character"} keyframe ${result.created?"added":"updated"} at ${time.toFixed(2)}s · ${count} saved${lightingTimelineHasMotion()?" · Ready to play":" · Add one more for movement"}`:"Keyframe was recorded, but its timeline marker could not be displayed. Reload this build.");void syncTimelineDurationToShot(timeline.duration);return saved
}
function deleteLightingCharacterKeyframe(){
  const timeline=currentLightingTimeline(),id=app.lighting.playback.selectedCharacterKeyframeId;if(!id||!lightingCanEdit())return;
  timeline.characterKeyframes=timeline.characterKeyframes.filter(frame=>frame.id!==id);
  app.lighting.playback.selectedCharacterKeyframeId=null;
  markLightingDirty();renderLightingTimeline();renderLightingCanvas();updateLightingPlaybackStatus()
}
function selectedLightingKeyframeRecord(){
  const timeline=currentLightingTimeline(),pb=app.lighting.playback;
  if(pb.selectedTrack==="character"){
    const frame=timeline.characterKeyframes.find(item=>item.id===pb.selectedCharacterKeyframeId);return frame?{track:"character",frame}:null
  }
  const frame=timeline.keyframes.find(item=>item.id===pb.selectedKeyframeId);return frame?{track:"camera",frame}:null
}
function deleteSelectedLightingKeyframe(){
  const selected=selectedLightingKeyframeRecord();if(!selected||!lightingCanEdit()){updateLightingPlaybackStatus("Select a keyframe marker first.");return false}
  const label=selected.track==="camera"?"Camera":"Character";
  if(!uiConfirm("Delete the selected keyframe?"))return false;
  if(selected.track==="camera")deleteLightingCameraKeyframe();else deleteLightingCharacterKeyframe();
  app.lighting.playback.selectedTrack=null;updateLightingPlaybackStatus(`${label} keyframe deleted.`);return true
}
async function updateLightingTimelineDuration(){
  if(!lightingCanEdit())return;const timeline=currentLightingTimeline(),duration=Math.max(.25,Math.min(120,Number($("lightingTimelineDuration").value)||timeline.duration||4));timeline.duration=duration;timeline.keyframes.forEach(frame=>frame.time=Math.min(frame.time,duration));timeline.characterKeyframes.forEach(frame=>frame.time=Math.min(frame.time,duration));timeline.keyframes.sort((a,b)=>a.time-b.time);timeline.characterKeyframes.sort((a,b)=>a.time-b.time);app.lighting.playback.duration=duration;app.lighting.playback.elapsed=Math.min(app.lighting.playback.elapsed,duration);markLightingDirty();renderLightingTimeline();updateLightingPlaybackStatus();await syncTimelineDurationToShot(duration)
}
function shortestAngleDelta(a,b){return ((Number(b||0)-Number(a||0)+540)%360)-180}
function easeTimelineValue(t,mode="smooth"){
  const value=Math.max(0,Math.min(1,t));if(mode==="linear")return value;if(mode==="hold")return 0;return value*value*(3-2*value)
}
function cameraTimelineSample(time){
  const frames=activeCameraTimelineFrames();if(!frames.length)return null;if(frames.length===1||time<=frames[0].time)return deepClone(frames[0]);if(time>=frames[frames.length-1].time)return deepClone(frames[frames.length-1]);
  let left=frames[0],right=frames[frames.length-1];for(let i=1;i<frames.length;i++){if(time<=frames[i].time){left=frames[i-1];right=frames[i];break}}
  const raw=(time-left.time)/Math.max(.001,right.time-left.time),t=easeTimelineValue(raw,right.easing||"smooth"),mix=(a,b)=>Number(a||0)+(Number(b||0)-Number(a||0))*t;
  return {...deepClone(left),time,x:mix(left.x,right.x),y:mix(left.y,right.y),height3d:mix(left.height3d,right.height3d),rotation:Number(left.rotation||0)+shortestAngleDelta(left.rotation,right.rotation)*t,tilt:mix(left.tilt,right.tilt),roll:Number(left.roll||0)+shortestAngleDelta(left.roll,right.roll)*t,lens:`${mix(parseLensMm(left.lens),parseLensMm(right.lens)).toFixed(1)}mm`,cameraModel:t<.5?left.cameraModel:right.cameraModel,shotSize:t<.5?left.shotSize:right.shotSize,angle:t<.5?left.angle:right.angle,movement:t<.5?left.movement:right.movement,focus:t<.5?left.focus:right.focus,cameraHeight:t<.5?left.cameraHeight:right.cameraHeight}
}
function characterTimelineSample(objectId,time){
  const frames=currentLightingTimeline().characterKeyframes.filter(frame=>frame.objectId===objectId).sort((a,b)=>a.time-b.time);if(!frames.length)return null;if(frames.length===1||time<=frames[0].time)return deepClone(frames[0]);if(time>=frames[frames.length-1].time)return deepClone(frames[frames.length-1]);
  let left=frames[0],right=frames[frames.length-1];for(let i=1;i<frames.length;i++){if(time<=frames[i].time){left=frames[i-1];right=frames[i];break}}
  const raw=(time-left.time)/Math.max(.001,right.time-left.time),t=easeTimelineValue(raw,right.easing||"smooth"),mix=(a,b)=>Number(a||0)+(Number(b||0)-Number(a||0))*t;
  return {...deepClone(left),time,x:mix(left.x,right.x),y:mix(left.y,right.y),height3d:mix(left.height3d,right.height3d),rotation:Number(left.rotation||0)+shortestAngleDelta(left.rotation,right.rotation)*t,scale:mix(left.scale,right.scale),faceScale:mix(left.faceScale,right.faceScale),faceYaw:mix(left.faceYaw,right.faceYaw),faceOffset:mix(left.faceOffset,right.faceOffset),gender:t<.5?left.gender:right.gender,characterId:t<.5?left.characterId:right.characterId}
}
function applyCameraTimelineSample(camera,sample){
  if(!camera||!sample)return;const identity={id:camera.id,type:camera.type,label:camera.label};
  for(const field of ["x","y","height3d","rotation","tilt","roll","lens","cameraModel","shotSize","angle","movement","focus","cameraHeight"])if(sample[field]!=null)camera[field]=sample[field];
  Object.assign(camera,identity,{autoFrame:false})
}
function captureLightingTimelineSubjects(){return Object.fromEntries(lightingTimelineCharacters().map(subject=>[subject.id,deepClone(subject)]))}
function applyCharacterTimelineTime(time){
  const timeline=currentLightingTimeline(),pb=app.lighting.playback;if(!timeline.characterKeyframes.length)return;
  if(!pb.baseSubjects)pb.baseSubjects=captureLightingTimelineSubjects();
  for(const objectId of new Set(timeline.characterKeyframes.map(frame=>frame.objectId))){
    const subject=lightingTimelineCharacters().find(object=>object.id===objectId),sample=characterTimelineSample(objectId,time);if(!subject||!sample)continue;
    Object.assign(subject,{x:sample.x,y:sample.y,height3d:sample.height3d,rotation:sample.rotation,scale:sample.scale,gender:sample.gender,characterId:sample.characterId,faceScale:sample.faceScale,faceYaw:sample.faceYaw,faceOffset:sample.faceOffset})
  }
}
function applyLightingTimelineTime(time,{preview=true}={}){
  const timeline=currentLightingTimeline(),pb=app.lighting.playback,cam=activeLightingCameraObject(),next=Math.max(0,Math.min(timeline.duration,Number(time)||0));pb.elapsed=next;
  if(preview&&cam&&activeCameraTimelineFrames(timeline,cam).length){if(!pb.baseCamera)pb.baseCamera=deepClone(cam);applyCameraTimelineSample(cam,cameraTimelineSample(next))}
  if(preview)applyCharacterTimelineTime(next);
  if($("lightingTimelineScrubber"))$("lightingTimelineScrubber").value=String(next);if($("lightingTimelineTime"))$("lightingTimelineTime").value=next.toFixed(2);updateThreeCameraFromObject();updateThreeSubjectsFromObjects();renderLightingCanvas();renderLightingInspector(false);renderLightingObjectList();updateCameraViewfinder()
}
function seekLightingTimeline(value){
  pauseLightingPlayback();const next=Math.max(0,Math.min(currentLightingTimeline().duration,Number(value)||0));
  if(app.lighting.explorer.active){
    const timeline=currentLightingTimeline(),pb=app.lighting.playback,cam=activeLightingCameraObject(),sample=cameraTimelineSample(next);pb.elapsed=next;
    if(cam&&sample){if(!pb.baseCamera)pb.baseCamera=deepClone(cam);applyCameraTimelineSample(cam,sample);app.lighting.explorer.pose={...explorerPoseFromCamera(cam)}}
    applyCharacterTimelineTime(next);updateThreeCameraFromObject();updateThreeSubjectsFromObjects();renderLightingCanvas();renderLightingInspector(false);renderLightingObjectList();renderLightingTimeline();updateLightingPlaybackStatus(`Playhead · ${next.toFixed(2)}s · saved poses loaded`);updateCameraViewfinder();return
  }
  applyLightingTimelineTime(next);renderLightingTimeline();updateLightingPlaybackStatus()
}
function lightingTimelinePosition(frame){
  const metersPer100=Math.max(.01,Number(app.lighting.current?.data?.canvas?.metersPer100px)||1);
  return {x:(Number(frame?.x??600)-600)/100*metersPer100,z:(Number(frame?.y??400)-400)/100*metersPer100,height:Number(frame?.height3d??0)}
}
function lightingTimelinePoseText(frame,type){
  const p=lightingTimelinePosition(frame),base=`X ${p.x.toFixed(2)} m · Z ${p.z.toFixed(2)} m · H ${p.height.toFixed(2)} m · ${Math.round(Number(frame?.rotation||0))}°`;
  return type==="camera"?`${base} · Tilt ${Math.round(Number(frame?.tilt||0))}° · ${frame?.lens||"50mm"}`:`${base} · Scale ${Math.round(Number(frame?.scale||100))}%`
}
function renderLightingTimeline(){
  const timeline=currentLightingTimeline(),pb=app.lighting.playback,scrubber=$("lightingTimelineScrubber"),timeInput=$("lightingTimelineTime"),durationInput=$("lightingTimelineDuration"),markers=$("lightingTimelineMarkers"),characterMarkers=$("lightingCharacterTimelineMarkers"),characterSelect=$("lightingTimelineCharacter");if(!scrubber||!markers||!characterMarkers||!characterSelect)return;
  scrubber.max=String(timeline.duration);scrubber.value=String(Math.min(timeline.duration,pb.elapsed||0));timeInput.max=String(timeline.duration);timeInput.value=Number(pb.elapsed||0).toFixed(2);durationInput.value=String(Number(timeline.duration.toFixed(2)));
  const cameraFrames=activeCameraTimelineFrames(timeline),characters=lightingTimelineCharacters(),activeCharacter=activeLightingTimelineCharacter();
  characterSelect.innerHTML=characters.length?characters.map(character=>`<option value="${escapeHtml(character.id)}">${escapeHtml(character.label||"Character")}</option>`).join(""):`<option value="">No characters</option>`;
  characterSelect.value=activeCharacter?.id||"";characterSelect.disabled=!lightingCanEdit()||!characters.length;
  characterSelect.onchange=()=>{pb.activeCharacterId=characterSelect.value||null;pb.selectedCharacterKeyframeId=timeline.characterKeyframes.find(frame=>frame.objectId===pb.activeCharacterId)?.id||null;renderLightingTimeline();renderLightingCanvas()};
  const tickHost=$("lightingTimelineTicks");if(tickHost){const steps=timeline.duration<=5?5:timeline.duration<=20?10:12;tickHost.innerHTML=Array.from({length:steps+1},(_,index)=>{const value=timeline.duration*index/steps;return `<span style="left:${index/steps*100}%">${Number(value.toFixed(1))}</span>`}).join("")}
  const playheadPercent=Math.max(0,Math.min(100,Number(pb.elapsed||0)/timeline.duration*100));
  document.querySelectorAll(".lighting-keyframe-rail").forEach(rail=>rail.style.setProperty("--timeline-playhead",`${playheadPercent}%`));
  markers.innerHTML=cameraFrames.map((frame,index)=>`<button type="button" class="lighting-timeline-marker ${frame.id===pb.selectedKeyframeId?"active":""}" style="left:${Math.max(0,Math.min(100,frame.time/timeline.duration*100))}%" data-keyframe-id="${escapeHtml(frame.id)}" data-keyframe-time="${frame.time.toFixed(2)}" data-pose-x="${Number(frame.x).toFixed(2)}" data-pose-y="${Number(frame.y).toFixed(2)}" data-pose-height="${Number(frame.height3d).toFixed(2)}" data-pose-rotation="${Number(frame.rotation).toFixed(2)}" title="Camera keyframe ${index+1} · ${frame.time.toFixed(2)} s · ${escapeHtml(lightingTimelinePoseText(frame,"camera"))}" aria-label="Camera keyframe ${index+1} at ${frame.time.toFixed(2)} seconds"><span>${index+1}</span><small>${frame.time.toFixed(1)}s</small></button>`).join("");
  const activeCharacterFrames=timeline.characterKeyframes.filter(frame=>frame.objectId===activeCharacter?.id);
  characterMarkers.innerHTML=activeCharacterFrames.map((frame,index)=>`<button type="button" class="lighting-timeline-marker ${frame.id===pb.selectedCharacterKeyframeId?"active":""}" style="left:${Math.max(0,Math.min(100,frame.time/timeline.duration*100))}%" data-character-keyframe-id="${escapeHtml(frame.id)}" data-keyframe-time="${frame.time.toFixed(2)}" data-pose-x="${Number(frame.x).toFixed(2)}" data-pose-y="${Number(frame.y).toFixed(2)}" data-pose-height="${Number(frame.height3d).toFixed(2)}" data-pose-rotation="${Number(frame.rotation).toFixed(2)}" title="${escapeHtml(activeCharacter?.label||"Character")} keyframe ${index+1} · ${frame.time.toFixed(2)} s · ${escapeHtml(lightingTimelinePoseText(frame,"character"))}" aria-label="${escapeHtml(activeCharacter?.label||"Character")} keyframe ${index+1} at ${frame.time.toFixed(2)} seconds"><span>${index+1}</span><small>${frame.time.toFixed(1)}s</small></button>`).join("");
  markers.querySelectorAll("[data-keyframe-id]").forEach(button=>button.onclick=event=>{event.stopPropagation();const frame=cameraFrames.find(item=>item.id===button.dataset.keyframeId);if(!frame)return;pb.selectedTrack="camera";pb.selectedKeyframeId=frame.id;seekLightingTimeline(frame.time)});
  characterMarkers.querySelectorAll("[data-character-keyframe-id]").forEach(button=>button.onclick=event=>{event.stopPropagation();const frame=timeline.characterKeyframes.find(item=>item.id===button.dataset.characterKeyframeId);if(!frame)return;pb.selectedTrack="character";pb.activeCharacterId=frame.objectId;pb.selectedCharacterKeyframeId=frame.id;seekLightingTimeline(frame.time)});
  const time=lightingPlayheadTime(timeline),cameraAtPlayhead=timelineFrameAt(cameraFrames,time),characterAtPlayhead=timelineFrameAt(activeCharacterFrames,time);
  const snapshot=$("lightingKeyframeSnapshot");if(snapshot){
    const cards=[];
    if(cameraAtPlayhead)cards.push(`<div class="lighting-keyframe-pose camera"><strong>CAMERA · KF ${cameraFrames.indexOf(cameraAtPlayhead)+1}</strong><span>${cameraAtPlayhead.time.toFixed(2)} s</span><small>${escapeHtml(lightingTimelinePoseText(cameraAtPlayhead,"camera"))}</small></div>`);
    if(characterAtPlayhead)cards.push(`<div class="lighting-keyframe-pose character"><strong>${escapeHtml(activeCharacter?.label||"CHARACTER")} · KF ${activeCharacterFrames.indexOf(characterAtPlayhead)+1}</strong><span>${characterAtPlayhead.time.toFixed(2)} s</span><small>${escapeHtml(lightingTimelinePoseText(characterAtPlayhead,"character"))}</small></div>`);
    snapshot.innerHTML=cards.join("")||`<span class="lighting-keyframe-pose-empty">No saved pose at ${time.toFixed(2)} s · move the camera or character, then add a keyframe.</span>`
  }
  if($("lightingCameraKeyframeCount"))$("lightingCameraKeyframeCount").textContent=String(cameraFrames.length);if($("lightingCharacterKeyframeCount"))$("lightingCharacterKeyframeCount").textContent=String(activeCharacterFrames.length);
  $("lightingAddKeyframeBtn").textContent=cameraAtPlayhead?"Update Keyframe":"Add Keyframe";$("lightingAddCharacterKeyframeBtn").textContent=characterAtPlayhead?"Update Keyframe":"Add Keyframe";
  $("lightingDeleteKeyframeBtn").disabled=!cameraFrames.some(frame=>frame.id===pb.selectedKeyframeId)||!lightingCanEdit();$("lightingAddKeyframeBtn").disabled=!activeLightingCameraObject()||!lightingCanEdit();
  $("lightingDeleteCharacterKeyframeBtn").disabled=!activeCharacterFrames.some(frame=>frame.id===pb.selectedCharacterKeyframeId)||!lightingCanEdit();$("lightingAddCharacterKeyframeBtn").disabled=!activeCharacter||!lightingCanEdit();
  if($("lightingDeleteSelectedKeyframeBtn"))$("lightingDeleteSelectedKeyframeBtn").disabled=!selectedLightingKeyframeRecord()||!lightingCanEdit();
  $("lightingPlaybackPlayBtn").disabled=!lightingTimelinePlayable();
  $("exportLightingVideoBtn").disabled=!lightingTimelinePlayable()||pb.exporting
}
function updateLightingPlaybackStatus(msg=""){
  const el=$("lightingPlaybackStatus");if(!el)return;
  const pb=app.lighting.playback,cam=activeLightingCameraObject(),cfg=lightingPlaybackConfig(cam);
  if(msg){el.textContent=msg;return}
  const duration=pb.duration||cfg.duration||4,timeline=currentLightingTimeline(),cameraCount=activeCameraTimelineFrames(timeline).length,characterCount=timeline.characterKeyframes.length;
  if(pb.exporting)el.textContent=`Recording Camera View · ${Math.min(pb.elapsed,duration).toFixed(1)} / ${duration.toFixed(1)}s`;
  else if(pb.playing)el.textContent=`Playing ${lightingTimelineHasMotion()?"shot motion":"saved pose"} · ${Math.min(pb.elapsed,duration).toFixed(1)} / ${duration.toFixed(1)}s`;
  else if((pb.baseCamera||pb.baseSubjects)&&pb.elapsed>0)el.textContent=`Paused · ${Math.min(pb.elapsed,duration).toFixed(1)} / ${duration.toFixed(1)}s`;
  else if(!lightingTimelinePlayable())el.textContent="Add a camera or character keyframe to start.";
  else if(!lightingTimelineHasMotion())el.textContent=`${cameraCount+characterCount} keyframe saved · add one more on the same track for movement.`;
  else el.textContent=`${cameraCount} camera · ${characterCount} character keyframes · ${duration.toFixed(1)}s`
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
    Object.assign(cam,deepClone(pb.baseCamera))
  }
  if(resetCamera&&pb.baseSubjects){for(const subject of lightingTimelineCharacters()){const base=pb.baseSubjects[subject.id];if(base)Object.assign(subject,deepClone(base))}}
  if(resetCamera&&(pb.baseCamera||pb.baseSubjects)){renderLightingCanvas();renderLightingInspector(false);renderLightingObjectList();syncLighting3D()}
  pb.playing=false;pb.elapsed=0;pb.baseCamera=null;pb.baseSubjects=null;if(pb.exportResolve){const resolve=pb.exportResolve;pb.exportResolve=null;resolve()}
  renderLightingTimeline();updateLightingPlaybackStatus();updateCameraViewfinder()
}
function playLightingPlayback(fromStart=false){
  const cam=activeLightingCameraObject(),timeline=currentLightingTimeline();if(!cam)return;if(!lightingTimelinePlayable()){updateLightingPlaybackStatus("Add a camera or character keyframe before playing.");return false}
  stopVirtualExplore();const cfg=lightingPlaybackConfig(cam),pb=app.lighting.playback;
  if(activeCameraTimelineFrames(timeline,cam).length&&!pb.baseCamera)pb.baseCamera=deepClone(cam);if(timeline.characterKeyframes.length&&!pb.baseSubjects)pb.baseSubjects=captureLightingTimelineSubjects();pb.duration=timeline.duration||cfg.duration;pb.movement="Keyframes";
  if(fromStart||pb.elapsed>=pb.duration)pb.elapsed=0;pb.playing=true;applyLightingTimelineTime(pb.elapsed);renderLightingTimeline();updateLightingPlaybackStatus();return true
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
  if(!pb.playing||!cam||(!pb.baseCamera&&!pb.baseSubjects))return;
  pb.elapsed=Math.min(pb.elapsed+dt,pb.duration);
  const t=Math.max(0,Math.min(1,pb.elapsed/Math.max(.001,pb.duration)));
  applyCameraTimelineSample(cam,cameraTimelineSample(pb.elapsed));
  applyCharacterTimelineTime(pb.elapsed);
  updateLightingPlaybackStatus();
  renderLightingTimeline();renderLightingCanvas();renderLightingInspector(false);renderLightingObjectList();updateThreeCameraFromObject();updateThreeSubjectsFromObjects();updateCameraViewfinder();
  if(t>=1){pb.playing=false;updateLightingPlaybackStatus(`Complete · ${lightingTimelineHasMotion()?"shot motion":"saved pose"} · ${pb.duration.toFixed(1)}s`);if(pb.exportResolve){const resolve=pb.exportResolve;pb.exportResolve=null;resolve()}}
}

async function exportLightingVideo(){
  const section=$("lightingAnimaticSection");section?.scrollIntoView({behavior:"smooth",block:"start"});section?.classList.remove("focus-pulse");requestAnimationFrame(()=>section?.classList.add("focus-pulse"));setTimeout(()=>section?.classList.remove("focus-pulse"),900)
}

const ANIMATIC_LOOKS={
  neutral:{filter:"contrast(1.04) saturate(.96) brightness(1.01)",tint:null},
  warm:{filter:"contrast(1.06) saturate(1.03) sepia(.10) brightness(1.02)",tint:"rgba(255,151,72,.035)"},
  cool:{filter:"contrast(1.08) saturate(.82) brightness(.9)",tint:"rgba(47,111,181,.09)"},
  contrast:{filter:"contrast(1.24) saturate(.9) brightness(.96)",tint:null},
  mono:{filter:"grayscale(1) contrast(1.18) brightness(1.04)",tint:null}
};
function animaticSettings(){return {resolution:Number($("lightingAnimaticResolution")?.value||1080),fps:Number($("lightingAnimaticFps")?.value||24),look:$("lightingAnimaticLook")?.value||"neutral",dof:Number($("lightingAnimaticDof")?.value||0)/100,motion:Number($("lightingAnimaticMotion")?.value||0)/100,grain:Number($("lightingAnimaticGrain")?.value||0)/100,vignette:Number($("lightingAnimaticVignette")?.value||0)/100,audioLevel:Number($("lightingAnimaticAudioLevel")?.value||80)/100,clean:!!$("lightingAnimaticCleanFrame")?.checked}}
function animaticDimensions(height){const aspect=projectFrameAspect();return aspect>=1?{width:Math.round(height*aspect/2)*2,height}:{width:height,height:Math.round(height/aspect/2)*2}}
function updateAnimaticJob(stage,progress,message=""){$("lightingAnimaticJob").hidden=false;$("lightingAnimaticStage").textContent=stage;$("lightingAnimaticProgress").value=Math.max(0,Math.min(100,progress));$("lightingAnimaticProgressValue").textContent=`${Math.round(progress)}%`;$("lightingAnimaticStatus").textContent=message}
function ensureAnimaticCanvases(width,height){const a=app.lighting.animatic;if(!a.outputCanvas)a.outputCanvas=document.createElement("canvas");if(!a.previousCanvas)a.previousCanvas=document.createElement("canvas");for(const c of [a.outputCanvas,a.previousCanvas]){if(c.width!==width||c.height!==height){c.width=width;c.height=height}}return a.outputCanvas}
function drawAnimaticComposite(){
  const a=app.lighting.animatic,source=app.lighting.three?.renderer?.domElement;if(!a.rendering||!source||!a.outputCanvas)return;const canvas=a.outputCanvas,ctx=canvas.getContext("2d",{alpha:false}),s=a.settings,look=ANIMATIC_LOOKS[s.look]||ANIMATIC_LOOKS.neutral,w=canvas.width,h=canvas.height;
  ctx.save();ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;ctx.filter=look.filter;ctx.drawImage(source,0,0,w,h);ctx.restore();
  if(s.dof>0){const band=Math.max(.18,.55-s.dof*.25),blur=Math.max(1,Math.round(s.dof*12));ctx.save();ctx.filter=`blur(${blur}px)`;ctx.globalAlpha=.28+s.dof*.25;ctx.drawImage(canvas,0,0,w,h);ctx.restore();const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(8,10,12,${.18*s.dof})`);g.addColorStop(Math.max(0,.5-band),"rgba(8,10,12,0)");g.addColorStop(Math.min(1,.5+band),"rgba(8,10,12,0)");g.addColorStop(1,`rgba(8,10,12,${.24*s.dof})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
  if(s.motion>0){ctx.save();ctx.globalAlpha=Math.min(.42,s.motion*.65);ctx.drawImage(a.previousCanvas,0,0,w,h);ctx.restore()}
  if(look.tint){ctx.fillStyle=look.tint;ctx.fillRect(0,0,w,h)}
  if(s.vignette>0){const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(.45,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${Math.min(.72,s.vignette*.8)})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
  if(s.grain>0){const count=Math.round(w*h*s.grain/900);ctx.save();for(let i=0;i<count;i++){const v=Math.random()>.5?255:0;ctx.fillStyle=`rgba(${v},${v},${v},${.025+s.grain*.08})`;ctx.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}ctx.restore()}
  a.previousCanvas.getContext("2d").drawImage(canvas,0,0,w,h);const progress=currentLightingTimeline().duration?app.lighting.playback.elapsed/currentLightingTimeline().duration*100:0;updateAnimaticJob("Rendering cinematic frames…",progress,`${formatTimelineTimecode(app.lighting.playback.elapsed)} · ${w}×${h} · ${s.fps} fps`)
}
async function animaticAudioTrack(file,level){if(!file)return null;const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;const context=new AudioCtx(),buffer=await context.decodeAudioData(await file.arrayBuffer()),source=context.createBufferSource(),gain=context.createGain(),destination=context.createMediaStreamDestination();gain.gain.value=level;source.buffer=buffer;source.connect(gain).connect(destination);return {context,source,track:destination.stream.getAudioTracks()[0]}}
async function renderLightingAnimatic(){
  if(!lightingTimelinePlayable())return updateAnimaticJob("Cannot render",0,"Add a camera or character keyframe first.");if(typeof MediaRecorder==="undefined")return updateAnimaticJob("Not supported",0,"This browser cannot record a local animatic.");if(app.lighting.animatic.rendering)return;
  if(app.lighting.viewMode!=="camera"){app.lighting.viewMode="camera";await renderLightingViewMode()}const state=app.lighting.three,source=state?.renderer?.domElement;if(!source?.captureStream)return updateAnimaticJob("Camera View is not ready",0,"Open Camera View and try again.");
  const a=app.lighting.animatic,s=animaticSettings(),dim=animaticDimensions(s.resolution),pb=app.lighting.playback,button=$("renderLightingAnimaticBtn");a.rendering=true;a.cancel=false;a.settings=s;a.startedAt=performance.now();button.disabled=true;button.textContent="Rendering…";$("lightingAnimaticResult").hidden=true;updateAnimaticJob("Preparing cinematic renderer…",1,"The render stays on this device and uses no AI credits.");
  const oldPixelRatio=state.renderer.getPixelRatio(),oldSize=state.renderer.getSize(new state.THREE.Vector2()),oldAspect=state.camera.aspect;let recorder,audio;
  try{state.renderer.setPixelRatio(1);state.renderer.setSize(dim.width,dim.height,false);state.camera.aspect=dim.width/dim.height;state.camera.updateProjectionMatrix();state.renderer.shadowMap.needsUpdate=true;const canvas=ensureAnimaticCanvases(dim.width,dim.height),stream=canvas.captureStream(s.fps);audio=await animaticAudioTrack(a.audioFile,s.audioLevel);if(audio?.track)stream.addTrack(audio.track);const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4;codecs=avc1.42E01E","video/mp4"].find(type=>MediaRecorder.isTypeSupported?.(type))||"",chunks=[];recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:s.resolution>=2160?28_000_000:s.resolution>=1080?14_000_000:7_000_000}:undefined);recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error("Animatic recording failed."))});seekLightingTimeline(0);drawAnimaticComposite();recorder.start(250);audio?.source.start(0);const finished=new Promise(resolve=>pb.exportResolve=resolve);if(!playLightingPlayback(true))throw new Error("Could not start the timeline.");await finished;if(recorder.state!=="inactive")recorder.stop();await stopped;if(a.cancel)throw new Error("Render canceled.");const type=recorder.mimeType||mime||"video/webm",blob=new Blob(chunks,{type});if(!blob.size)throw new Error("The browser returned an empty video.");if(a.resultUrl)URL.revokeObjectURL(a.resultUrl);a.resultBlob=blob;a.resultUrl=URL.createObjectURL(blob);const ext=type.includes("mp4")?"mp4":"webm",player=$("lightingAnimaticPlayer"),download=$("downloadLightingAnimaticBtn");player.src=a.resultUrl;download.href=a.resultUrl;download.download=`${slugName(app.lighting.current?.name)}-3d-animatic.${ext}`;$("lightingAnimaticResult").hidden=false;updateAnimaticJob("3D animatic ready",100,`${dim.width}×${dim.height} · ${s.fps} fps · ${ext.toUpperCase()} · no AI credits used.`)
  }catch(error){updateAnimaticJob(a.cancel?"Render canceled":"Render failed",0,error.message||"Could not render the animatic.")}
  finally{a.rendering=false;pb.exporting=false;button.disabled=false;button.textContent="Render Free 3D Animatic";try{audio?.source.stop()}catch{}audio?.context.close?.();state.renderer.setPixelRatio(oldPixelRatio);state.renderer.setSize(oldSize.x,oldSize.y,false);state.camera.aspect=oldAspect;state.camera.updateProjectionMatrix();stopLightingPlayback(true);resizeThreeRenderer();renderLightingTimeline()}
}
function cancelLightingAnimatic(){const a=app.lighting.animatic;if(!a.rendering)return;a.cancel=true;app.lighting.playback.playing=false;if(app.lighting.playback.exportResolve){const done=app.lighting.playback.exportResolve;app.lighting.playback.exportResolve=null;done()}updateAnimaticJob("Canceling…",0,"Stopping the local render.")}
async function saveLightingAnimaticToShot(){const a=app.lighting.animatic,shot=currentShot();if(!a.resultBlob||!shot)return;if(app.mode!=="cloud"||!sb){shot.animaticLocalName=$("downloadLightingAnimaticBtn").download;rememberWorkspace();return updateAnimaticJob("Saved locally",100,"The current browser remembers this result; download it to keep the video file.")}try{const ext=a.resultBlob.type.includes("mp4")?"mp4":"webm",path=`${app.current.id}/ai-video/${app.lighting.current.id}/${Date.now()}-3d-animatic.${ext}`;updateAnimaticJob("Saving to Shot…",100,"Uploading the finished local render to private project storage.");const {error}=await sb.storage.from("storyboards").upload(path,a.resultBlob,{upsert:false,contentType:a.resultBlob.type,cacheControl:"31536000"});if(error)throw error;shot.animaticPath=path;shot.animaticSettings={...a.settings};queueSave("shot");rememberWorkspace();updateAnimaticJob("Saved to Shot",100,`Free 3D animatic attached to Shot ${shot.shotNo||""}.`)}catch(error){updateAnimaticJob("Save failed",100,error.message||"Could not save the animatic.")}}

const LIGHTING_VIDEO_MODELS={
  runway:[{id:"gen4_aleph",label:"Gen-4 Aleph · control video"},{id:"gen4.5",label:"Gen-4.5 · cinematic"}],
  veo:[{id:"veo-3.1-generate-preview",label:"Veo 3.1 · quality"},{id:"veo-3.1-fast-generate-preview",label:"Veo 3.1 Fast"}]
};
function lightingVideoDuration(provider=app.lighting.video.provider){
  const raw=Math.max(1,Math.min(15,Number(currentLightingTimeline()?.duration||4)));
  if(provider==="veo")return [4,6,8].reduce((best,n)=>Math.abs(n-raw)<Math.abs(best-raw)?n:best,4);
  return Math.max(4,Math.round(raw))
}
function lightingVideoReferenceManifest(){
  const objects=app.lighting.current?.data?.objects||[],characterIds=[...new Set(objects.filter(x=>x.type==="subject"&&x.characterId).map(x=>x.characterId))];
  return {location_scan_id:app.lighting.current?.location_scan_id||null,characters:characterIds.map(id=>{const a=app.ai.characters.find(x=>x.id===id);return a?{id:a.id,name:a.name,reference_path:a.reference_path||null,spatial_reference_path:a.spatial_reference_path||null}:null}).filter(Boolean)}
}
function buildLightingVideoSnapshot(){
  const linked=lightingCurrentShotLink(),diagram=app.lighting.current,data=deepClone(diagram?.data||{}),camera=activeLightingCameraObject();
  return {schema_version:"filmboard-lighting-video-v1",captured_at:new Date().toISOString(),project_id:app.current?.id||null,scene_id:diagram?.scene_id||linked?.scene?.id||null,shot_id:diagram?.shot_id||linked?.shot?.id||null,lighting_diagram_id:diagram?.id||null,diagram_name:diagram?.name||"Lighting Diagram",camera:camera?deepClone(camera):null,lights:(data.objects||[]).filter(x=>x.type==="light"),characters:(data.objects||[]).filter(x=>x.type==="subject"),timeline:deepClone(data.timeline||{duration:4,keyframes:[],characterKeyframes:[]}),virtual_location:deepClone(data.virtualLocation||null),notes:data.notes||"",shot:linked?.shot?Object.fromEntries(["shotNo","summary","description","performance","movement","lens","shotSize","angle","focus","lighting","timeOfDay","location","props"].map(k=>[k,linked.shot[k]||""])):null,references:lightingVideoReferenceManifest()}
}
function compileLightingVideoPrompt(snapshot=buildLightingVideoSnapshot()){
  const camera=snapshot.camera||{},lights=snapshot.lights||[],characters=snapshot.characters||[],timeline=snapshot.timeline||{},shot=snapshot.shot||{};
  const cameraFrames=(timeline.keyframes||[]).filter(x=>!camera.id||!x.objectId||x.objectId===camera.id).sort((a,b)=>a.time-b.time).map(x=>`${Number(x.time).toFixed(2)}s: camera at plan (${Number(x.x).toFixed(0)}, ${Number(x.y).toFixed(0)}), ${Number(x.height3d||1.65).toFixed(2)}m high, heading ${Number(x.rotation||0).toFixed(1)}°, tilt ${Number(x.tilt||0).toFixed(1)}°`).join("; ");
  const characterFrames=(timeline.characterKeyframes||[]).sort((a,b)=>a.time-b.time).map(x=>`${Number(x.time).toFixed(2)}s: ${x.objectId} at (${Number(x.x).toFixed(0)}, ${Number(x.y).toFixed(0)}), heading ${Number(x.rotation||0).toFixed(1)}°`).join("; ");
  const lightPlan=lights.map(x=>`${x.label||x.fixture||"Light"}: ${x.fixture||"fixture"}, ${x.modifier||"bare"}, ${x.kelvin||5600}K, ${x.intensity??70}% intensity, ${x.beam||45}° beam, position (${Number(x.x).toFixed(0)}, ${Number(x.y).toFixed(0)}, ${Number(x.height3d||2.4).toFixed(2)}m), heading ${Number(x.rotation||0).toFixed(1)}°, tilt ${Number(x.tilt||0).toFixed(1)}°`).join(" | ");
  return [`Create one photoreal cinematic shot that follows the attached 3D control render and reference frames. Preserve the exact blocking, screen direction, camera path, character positions and timing; improve only realism, materials, faces and natural motion.`,`Duration: ${Number(timeline.duration||4).toFixed(2)} seconds. Camera: ${camera.cameraModel||camera.model||"ARRI Alexa Mini"}, ${camera.lens||shot.lens||"50mm"}, ${camera.shotSize||shot.shotSize||"shot-defined framing"}, ${camera.angle||shot.angle||"eye level"}, ${camera.focus||shot.focus||"natural focus"}.`,`Story action: ${shot.summary||shot.description||"Follow the diagram blocking."} Performance: ${shot.performance||"natural restrained performance"}. Time and location: ${shot.timeOfDay||"unspecified"}; ${shot.location||"use the linked location reference"}.`,`Camera keyframes: ${cameraFrames||"hold the saved camera pose"}. Character keyframes: ${characterFrames||"hold the saved character poses"}.`,`Lighting is authoritative: ${lightPlan||"use the diagram lighting"}.`,`Characters present: ${characters.map(x=>x.label||"Character").join(", ")||"none"}. Keep linked Bible faces and the linked location consistent. No subtitles, text, watermark, extra people, extra lights, camera jumps, reframing, or changes to the set geometry.`].join("\n")
}
function renderLightingVideoControls(){
  const provider=app.lighting.video.provider,models=LIGHTING_VIDEO_MODELS[provider],select=$("lightingVideoModel"),snapshot=buildLightingVideoSnapshot();
  $("lightingVideoRunwayBtn").classList.toggle("active",provider==="runway");$("lightingVideoVeoBtn").classList.toggle("active",provider==="veo");$("lightingVideoRunwayBtn").setAttribute("aria-checked",String(provider==="runway"));$("lightingVideoVeoBtn").setAttribute("aria-checked",String(provider==="veo"));
  select.innerHTML=models.map(x=>`<option value="${x.id}">${x.label}</option>`).join("");$("lightingVideoPrompt").value=compileLightingVideoPrompt(snapshot);
  $("lightingVideoInputSummary").textContent=`${snapshot.lights.length} lights · ${snapshot.characters.length} characters · ${(snapshot.timeline.keyframes||[]).length} camera keyframes · ${(snapshot.timeline.characterKeyframes||[]).length} character keyframes · ${lightingVideoDuration(provider)}s output${provider==="veo"&&Number(snapshot.timeline.duration)>8?" (first 8s segment)":""}`
}
function setLightingVideoProvider(provider){if(!LIGHTING_VIDEO_MODELS[provider]||app.lighting.video.status==="processing")return;app.lighting.video.provider=provider;renderLightingVideoControls()}
function updateLightingVideoJob(stage,progress,message=""){
  $("lightingVideoJob").hidden=false;$("lightingVideoStage").textContent=stage;$("lightingVideoProgress").value=Math.max(0,Math.min(100,progress));$("lightingVideoProgressValue").textContent=`${Math.round(progress)}%`;$("lightingVideoStatus").textContent=message
}
async function recordLightingControlBlob(){
  if(!lightingTimelinePlayable())throw new Error("Add a camera or character keyframe first.");if(typeof MediaRecorder==="undefined")throw new Error("Control rendering is not supported by this browser.");
  if(app.lighting.viewMode!=="camera"){app.lighting.viewMode="camera";await renderLightingViewMode()}
  const canvas=app.lighting.three?.renderer?.domElement;if(!canvas?.captureStream)throw new Error("Camera View is not ready.");
  const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(type=>MediaRecorder.isTypeSupported?.(type))||"",chunks=[],recorder=new MediaRecorder(canvas.captureStream(24),mime?{mimeType:mime,videoBitsPerSecond:6_000_000}:undefined),pb=app.lighting.playback;
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error("Control render failed."))});recorder.start(250);const finished=new Promise(resolve=>pb.exportResolve=resolve);if(!playLightingPlayback(true))throw new Error("Could not start the shot timeline.");await finished;recorder.stop();await stopped;stopLightingPlayback(true);const blob=new Blob(chunks,{type:recorder.mimeType||mime||"video/webm"});if(!blob.size)throw new Error("The control render was empty.");return blob
}
async function captureLightingFirstFrameBlob(){
  const canvas=app.lighting.three?.renderer?.domElement;if(!canvas)throw new Error("Camera View is not ready.");return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not capture the reference frame.")),"image/jpeg",.92))
}
async function uploadLightingVideoInput(blob,kind,extension){
  const path=`${app.current.id}/ai-video/${app.lighting.current.id}/${Date.now()}-${kind}.${extension}`,{error}=await sb.storage.from("storyboards").upload(path,blob,{upsert:false,contentType:blob.type,cacheControl:"3600"});if(error)throw error;const {data,error:signError}=await sb.storage.from("storyboards").createSignedUrl(path,3600);if(signError||!data?.signedUrl)throw signError||new Error("Could not authorize the generation input.");return {path,url:data.signedUrl}
}
async function lightingVideoApi(path,options={}){
  const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error("Sign in again to generate video.");const response=await fetch(path,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`,...options.headers}}),body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`Video request failed (${response.status}).`);return body
}
function stopLightingVideoPolling(){if(app.lighting.video.pollTimer)clearTimeout(app.lighting.video.pollTimer);app.lighting.video.pollTimer=null}
async function pollLightingAiVideo(){
  const id=app.lighting.video.jobId;if(!id)return;try{const job=await lightingVideoApi(`/api/video/generations/${id}`);app.lighting.video.status=job.status;updateLightingVideoJob(job.stage||"Generating…",job.progress||0,job.error_message||job.message||"");if(job.status==="succeeded"){app.lighting.video.resultUrl=job.output_url;app.lighting.video.resultPath=job.output_video_path;const player=$("lightingAiVideoPlayer");player.src=job.output_url;$("lightingAiVideoResult").hidden=false;$("downloadLightingAiVideoBtn").href=job.output_url;$("downloadLightingAiVideoBtn").download=`${slugName(app.lighting.current?.name)}-${app.lighting.video.provider}.mp4`;$("generateLightingAiVideoBtn").disabled=false;return}if(job.status==="failed"||job.status==="canceled"){ $("generateLightingAiVideoBtn").disabled=false;return}app.lighting.video.pollTimer=setTimeout(pollLightingAiVideo,4000)}catch(error){updateLightingVideoJob("Connection interrupted",0,error.message);app.lighting.video.pollTimer=setTimeout(pollLightingAiVideo,6000)}
}
async function generateLightingAiVideo(){
  if(app.mode!=="cloud"||!sb)return uiAlert("AI video generation requires a signed-in cloud project.");if(!lightingCanEdit())return;if(!$("lightingVideoConsent").checked)return uiAlert("Confirm that you have permission to use the selected references.");
  const button=$("generateLightingAiVideoBtn");button.disabled=true;$("lightingAiVideoResult").hidden=true;stopLightingVideoPolling();app.lighting.video.status="preparing";
  try{if(!app.lighting.current.persisted||app.lighting.dirty)await saveLightingDiagram();if(app.lighting.viewMode!=="camera"){app.lighting.viewMode="camera";await renderLightingViewMode()}seekLightingTimeline(0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const frame=await captureLightingFirstFrameBlob();updateLightingVideoJob("Preparing 3D control render…",8,"Playing the exact shot timeline.");const control=await recordLightingControlBlob();updateLightingVideoJob("Uploading references…",24,"Keeping project media private.");const [controlAsset,frameAsset]=await Promise.all([uploadLightingVideoInput(control,"control","webm"),uploadLightingVideoInput(frame,"first-frame","jpg")]);app.lighting.video.controlUrl=URL.createObjectURL(control);const snapshot=buildLightingVideoSnapshot(),payload={project_id:app.current.id,scene_id:snapshot.scene_id,shot_id:snapshot.shot_id,lighting_diagram_id:snapshot.lighting_diagram_id,provider:app.lighting.video.provider,model:$("lightingVideoModel").value,prompt:$("lightingVideoPrompt").value.trim()||compileLightingVideoPrompt(snapshot),diagram_snapshot:snapshot,reference_manifest:snapshot.references,control_video_path:controlAsset.path,control_url:controlAsset.url,first_frame_path:frameAsset.path,first_frame_url:frameAsset.url,duration_seconds:lightingVideoDuration(),aspect_ratio:app.current.aspect||"16:9",resolution:$("lightingVideoResolution").value};updateLightingVideoJob(`Submitting to ${payload.provider==="veo"?"Veo":"Runway"}…`,35,"The immutable diagram snapshot is attached to this job.");const job=await lightingVideoApi("/api/video/generations",{method:"POST",body:JSON.stringify(payload)});app.lighting.video.jobId=job.id;app.lighting.video.status=job.status;pollLightingAiVideo()}catch(error){console.error(error);app.lighting.video.status="failed";updateLightingVideoJob("Generation could not start",0,error.message);button.disabled=false}
}
async function cancelLightingAiVideo(){const id=app.lighting.video.jobId;if(!id)return;try{await lightingVideoApi(`/api/video/generations/${id}/cancel`,{method:"POST",body:"{}"});stopLightingVideoPolling();app.lighting.video.status="canceled";updateLightingVideoJob("Canceled",0,"The generation job was canceled.");$("generateLightingAiVideoBtn").disabled=false}catch(error){updateLightingVideoJob("Cancel failed",0,error.message)}}
function showLightingVideoResult(result=true){const player=$("lightingAiVideoPlayer");$("lightingVideoResultTab").classList.toggle("active",result);$("lightingVideoGuideTab").classList.toggle("active",!result);player.src=result?app.lighting.video.resultUrl:app.lighting.video.controlUrl;player.load()}
function saveLightingAiVideoToShot(){const shot=currentShot();if(!shot||!app.lighting.video.resultPath)return;shot.aiVideoPath=app.lighting.video.resultPath;shot.aiVideoProvider=app.lighting.video.provider;shot.aiVideoGenerationId=app.lighting.video.jobId;queueSave("shot");rememberWorkspace();updateLightingVideoJob("Saved to Shot",100,`AI result attached to Shot ${shot.shotNo||""}.`)}

function setLightingViewMode(mode){
  app.lighting.viewMode=mode;
  return renderLightingViewMode()
}
function lightingCompanionIsMobile(){return !!window.matchMedia?.("(max-width: 760px)")?.matches}
function resetLightingPlanPip(){
  const stage=document.querySelector(".lighting-studio-stage");if(!stage)return;stage.style.removeProperty("--lighting-pip-left");stage.style.removeProperty("--lighting-pip-top")
}
function startLightingPipDrag(event){
  if(app.lighting.viewMode!=="camera"||lightingCompanionIsMobile()||event.target.closest("button"))return;const stage=document.querySelector(".lighting-studio-stage"),plan=$("lightingPlanView");if(!stage||!plan)return;
  const stageRect=stage.getBoundingClientRect(),rect=plan.getBoundingClientRect();app.lighting.pipDrag={mode:"pip",pointerId:event.pointerId,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,stageRect};event.currentTarget.setPointerCapture?.(event.pointerId);event.preventDefault()
}
function moveLightingPipDrag(event){
  const drag=app.lighting.pipDrag;if(!drag||drag.mode!=="pip"||drag.pointerId!==event.pointerId)return;const stage=document.querySelector(".lighting-studio-stage"),plan=$("lightingPlanView"),rect=plan.getBoundingClientRect(),bounds=stage.getBoundingClientRect();
  const left=Math.max(8,Math.min(bounds.width-rect.width-8,event.clientX-bounds.left-drag.offsetX)),top=Math.max(68,Math.min(bounds.height-rect.height-8,event.clientY-bounds.top-drag.offsetY));stage.style.setProperty("--lighting-pip-left",`${left}px`);stage.style.setProperty("--lighting-pip-top",`${top}px`)
}
function endLightingCompanionDrag(event){
  if(app.lighting.pipDrag?.pointerId===event.pointerId)app.lighting.pipDrag=null
}
function startLightingSplitDrag(event){
  if(!lightingCompanionIsMobile())return;app.lighting.pipDrag={mode:"split",pointerId:event.pointerId};event.currentTarget.setPointerCapture?.(event.pointerId);moveLightingSplitDrag(event);event.preventDefault()
}
function moveLightingSplitDrag(event){
  const drag=app.lighting.pipDrag;if(!drag||drag.mode!=="split"||drag.pointerId!==event.pointerId)return;const stage=document.querySelector(".lighting-studio-stage"),rect=stage?.getBoundingClientRect();if(!stage||!rect?.height)return;
  const ratio=Math.max(28,Math.min(72,(event.clientY-rect.top)/rect.height*100));app.lighting.mobileSplit=ratio;stage.style.setProperty("--lighting-mobile-camera",`${ratio}%`);resizeThreeRenderer()
}
async function renderLightingViewMode(){
  const cameraMode=app.lighting.viewMode==="camera",mobile=lightingCompanionIsMobile(),stage=document.querySelector(".lighting-studio-stage");
  $("lightingPlanModeBtn").classList.toggle("active",!cameraMode);
  $("lightingCameraModeBtn").classList.toggle("active",cameraMode);
  stage?.classList.toggle("camera-companion",cameraMode);
  $("lightingPlanView").hidden=false;
  $("lightingCameraView").hidden=!cameraMode;
  $("lightingPlanPipHeader").hidden=false;$("lightingSplitHandle").hidden=!cameraMode||!mobile;
  if($("lightingPlanWindowTitle"))$("lightingPlanWindowTitle").textContent=cameraMode?"LIVE DIAGRAM":"LIGHTING DIAGRAM";
  if($("lightingPlanPipHint"))$("lightingPlanPipHint").textContent=cameraMode&&!mobile?"Drag bar to move · drag empty canvas to pan":"Drag empty space to pan · select an object to edit";
  if(cameraMode){if(mobile)stage?.style.setProperty("--lighting-mobile-camera",`${app.lighting.mobileSplit}%`);updateLightingPlaybackStatus();await startLighting3D();requestAnimationFrame(()=>{resizeThreeRenderer();updateCameraViewfinder()})}
  else{stopVirtualExplore();pauseLightingPlayback();stopLighting3D(false)}
  renderVirtualLocationControls();renderLightingTimeline()
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

function clearFaceModelCache(characterId=null){
  for(const [id,entry] of app.lighting.faceModelCache){if(characterId&&id!==characterId)continue;disposeVirtualLocationObject(entry.root);app.lighting.faceModelCache.delete(id)}
}
async function loadFaceModel(asset){
  const cached=app.lighting.faceModelCache.get(asset.id);if(cached?.root)return cached;if(cached?.promise)return cached.promise;const entry={root:null,promise:null};app.lighting.faceModelCache.set(asset.id,entry);
  entry.promise=(async()=>{if(!asset.faceModelUrl)await signAiAsset(asset);if(!asset.faceModelUrl)throw new Error("Could not open the 3D face scan.");const THREE=app.lighting.three?.THREE||await import(THREE_CDN),root=await loadSpatialModelRoot(asset.faceModelUrl,asset.face_scan_format||"glb",THREE);if(!root)throw new Error("The 3D face scan has no geometry.");root.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}});entry.root=root;entry.promise=null;if(app.lighting.viewMode==="camera"&&$("lightingDiagramModal")?.open)rebuildLighting3D();return entry})().catch(error=>{entry.promise=null;app.lighting.faceModelCache.delete(asset.id);console.warn("3D face scan failed",error);throw error});return entry.promise
}
function attachScannedFace(THREE,group,source,o,h){
  const root=source.clone(true),box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),largest=Math.max(size.x,size.y,size.z,.001),desired=h*.205*(Number(o.faceScale||100)/100),scale=desired/largest,wrapper=new THREE.Group();
  root.scale.setScalar(scale);root.position.set(-center.x*scale,-center.y*scale,-center.z*scale);wrapper.add(root);wrapper.position.set(0,h*.905+Number(o.faceOffset||0)/100,0);wrapper.rotation.y=THREE.MathUtils.degToRad(Number(o.faceYaw||0));wrapper.name="Scanned Character Face";group.add(wrapper)
}
function makeMannequin(THREE,o,faceRoot=null){
  const bodyScale=Number(o.scale||100)/100,gender=(o.gender||"female").toLowerCase(),h=Number(o.height3d||1.75)*bodyScale,g=new THREE.Group(),male=gender==="male";
  const skin=new THREE.MeshStandardMaterial({color:0xd4a17e,roughness:.68,metalness:0}),skinSoft=new THREE.MeshStandardMaterial({color:0xe0b08d,roughness:.72}),shirt=new THREE.MeshStandardMaterial({color:male?0x263746:0x4a3043,roughness:.82}),pants=new THREE.MeshStandardMaterial({color:0x202830,roughness:.88}),shoe=new THREE.MeshStandardMaterial({color:0x111315,roughness:.72}),hair=new THREE.MeshStandardMaterial({color:0x241b17,roughness:.9}),eyeWhite=new THREE.MeshStandardMaterial({color:0xe9e5dd,roughness:.5}),iris=new THREE.MeshStandardMaterial({color:0x273d3d,roughness:.35}),lip=new THREE.MeshStandardMaterial({color:0x925f59,roughness:.7});
  const shoulder=male ? 1.12 : .94,hips=male ? .94 : 1.1,headR=h*.092;
  const pelvis=new THREE.Mesh(new THREE.SphereGeometry(h*.105,28,20),pants);pelvis.scale.set(hips,1,.84);pelvis.position.y=h*.45;g.add(pelvis);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(h*.105*shoulder,h*.082*hips,h*.31,28,5),shirt);torso.position.y=h*.645;torso.scale.z=.72;g.add(torso);
  const chest=new THREE.Mesh(new THREE.SphereGeometry(h*.105,28,18),shirt);chest.scale.set(shoulder,1.05,.73);chest.position.y=h*.70;g.add(chest);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(h*.037,h*.008,8,24),skin);collar.rotation.x=Math.PI/2;collar.position.set(0,h*.79,h*.035);g.add(collar);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(h*.029,h*.037,h*.075,18),skin);neck.position.y=h*.825;g.add(neck);
  const jointGeo=new THREE.SphereGeometry(h*.033,16,12),upperArmGeo=new THREE.CapsuleGeometry(h*.031,h*.205,8,14),forearmGeo=new THREE.CapsuleGeometry(h*.027,h*.19,8,14);
  for(const sx of [-1,1]){const shoulderJoint=new THREE.Mesh(jointGeo,shirt);shoulderJoint.position.set(sx*h*.125*shoulder,h*.715,0);const upper=new THREE.Mesh(upperArmGeo,shirt);upper.position.set(sx*h*.145*shoulder,h*.61,0);upper.rotation.z=sx*.12;const elbow=new THREE.Mesh(new THREE.SphereGeometry(h*.03,14,10),skin);elbow.position.set(sx*h*.158*shoulder,h*.49,0);const lower=new THREE.Mesh(forearmGeo,skin);lower.position.set(sx*h*.163*shoulder,h*.39,.004);lower.rotation.z=sx*.04;const hand=new THREE.Mesh(new THREE.SphereGeometry(h*.031,16,12),skinSoft);hand.scale.set(.72,1.15,.48);hand.position.set(sx*h*.17*shoulder,h*.275,.008);g.add(shoulderJoint,upper,elbow,lower,hand)}
  const thighGeo=new THREE.CapsuleGeometry(h*.048,h*.26,8,16),calfGeo=new THREE.CapsuleGeometry(h*.038,h*.245,8,16);
  for(const sx of [-1,1]){const thigh=new THREE.Mesh(thighGeo,pants);thigh.position.set(sx*h*.052*hips,h*.315,0);thigh.rotation.z=sx*.025;const knee=new THREE.Mesh(new THREE.SphereGeometry(h*.041,16,12),pants);knee.position.set(sx*h*.052,h*.18,0);const calf=new THREE.Mesh(calfGeo,pants);calf.position.set(sx*h*.052,h*.085,0);const foot=new THREE.Mesh(new THREE.CapsuleGeometry(h*.033,h*.085,6,12),shoe);foot.rotation.x=Math.PI/2;foot.position.set(sx*h*.052,h*.018,h*.055);g.add(thigh,knee,calf,foot)}
  if(faceRoot)attachScannedFace(THREE,g,faceRoot,o,h);
  else{
    const head=new THREE.Mesh(new THREE.SphereGeometry(headR,36,28),skinSoft);head.scale.set(.82,1.04,.91);head.position.y=h*.917;g.add(head);
    const jaw=new THREE.Mesh(new THREE.SphereGeometry(headR*.72,28,20),skinSoft);jaw.scale.set(.86,.75,.92);jaw.position.set(0,h*.875,headR*.035);g.add(jaw);
    const nose=new THREE.Mesh(new THREE.ConeGeometry(headR*.12,headR*.23,14),skinSoft);nose.rotation.x=Math.PI/2;nose.position.set(0,h*.917,headR*.82);g.add(nose);
    for(const sx of [-1,1]){const white=new THREE.Mesh(new THREE.SphereGeometry(headR*.09,12,10),eyeWhite);white.scale.set(1.25,.7,.38);white.position.set(sx*headR*.28,h*.94,headR*.72);const pupil=new THREE.Mesh(new THREE.SphereGeometry(headR*.042,10,8),iris);pupil.position.set(sx*headR*.28,h*.94,headR*.79);g.add(white,pupil)}
    const mouth=new THREE.Mesh(new THREE.TorusGeometry(headR*.16,headR*.015,6,20,Math.PI),lip);mouth.position.set(0,h*.888,headR*.75);mouth.rotation.z=Math.PI;g.add(mouth);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(headR*1.01,32,18,0,Math.PI*2,0,Math.PI*.56),hair);cap.scale.set(.83,1.04,.92);cap.position.y=h*.925;g.add(cap)
  }
  g.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}});g.name=o.characterId?"Character Mannequin":"Realistic Mannequin";return g
}

async function virtualLocationModelUrl(scan){
  if(scan.objectUrl)return {url:scan.objectUrl,objectUrl:null};
  if(app.mode==="local"){
    const blob=await getLocalVirtualLocationBlob(scan.id);if(!blob)throw new Error("The offline scan file is missing. Import it again.");const objectUrl=URL.createObjectURL(blob);return {url:objectUrl,objectUrl}
  }
  const {data,error}=await sb.storage.from("storyboards").createSignedUrl(scan.model_path,VIRTUAL_LOCATION_SIGNED_URL_SECONDS);if(error||!data?.signedUrl)throw error||new Error("Could not open the 3D scan.");return {url:data.signedUrl,objectUrl:null}
}
async function loadVirtualLocationModel(scan){
  const cached=app.lighting.locationModelCache.get(scan.id);if(cached?.root)return cached;if(cached?.promise)return cached.promise;
  const entry={root:null,bounds:null,objectUrl:null,promise:null};app.lighting.locationModelCache.set(scan.id,entry);
  entry.promise=(async()=>{
    $("lighting3dLoading").hidden=false;$("lighting3dLoading").textContent=uiText("Loading 3D Camera View…");
    const source=await virtualLocationModelUrl(scan);entry.objectUrl=source.objectUrl;
    let root;
    const progress=event=>{if(event?.total){const percent=Math.round(event.loaded/event.total*100);$("lighting3dLoading").textContent=`Loading ${scan.name} · ${percent}%`}};
    if(scan.format==="usdz"){
      const {USDZLoader}=await import(USDZ_LOADER_CDN),loader=new USDZLoader();root=await loader.loadAsync(source.url,progress)
    }else{
      const [{GLTFLoader},{DRACOLoader}]=await Promise.all([import(GLTF_LOADER_CDN),import(DRACO_LOADER_CDN)]),loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath(DRACO_DECODER_PATH);loader.setDRACOLoader(draco);
      const gltf=await loader.loadAsync(source.url,progress);root=gltf.scene||gltf.scenes?.[0];draco.dispose()
    }
    if(!root)throw new Error("The scan did not contain a readable 3D scene.");
    root.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;if(node.material){const materials=Array.isArray(node.material)?node.material:[node.material];materials.forEach(material=>{material.side=material.side??0;material.needsUpdate=true})}}});
    const THREE=app.lighting.three?.THREE;if(!THREE)throw new Error("3D Camera View closed before the scan finished loading.");
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());if(box.isEmpty()||!Number.isFinite(size.x+size.y+size.z))throw new Error("The scan has invalid geometry.");
    entry.root=root;entry.bounds={min:{x:box.min.x,y:box.min.y,z:box.min.z},max:{x:box.max.x,y:box.max.y,z:box.max.z},size:{x:size.x,y:size.y,z:size.z},center:{x:center.x,y:center.y,z:center.z}};scan.metadata={...(scan.metadata||{}),bounds:entry.bounds};entry.promise=null;
    $("lighting3dLoading").hidden=true;renderVirtualLocationBadge();renderLightingCanvas();if(app.lighting.viewMode==="camera"&&linkedVirtualLocation()?.id===scan.id)rebuildLighting3D();return entry
  })().catch(error=>{
    entry.promise=null;app.lighting.locationModelCache.delete(scan.id);if(entry.objectUrl)URL.revokeObjectURL(entry.objectUrl);$("lighting3dLoading").hidden=true;setVirtualLocationNotice(`Could not load “${scan.name}”. ${error.message||"Check the model file."}`,"error");console.error("Virtual Location load failed",error);throw error
  });
  return entry.promise
}
function addVirtualLocationToScene(THREE,state){
  const scan=linkedVirtualLocation();if(!scan)return false;const cached=app.lighting.locationModelCache.get(scan.id);
  if(!cached?.root){loadVirtualLocationModel(scan).catch(()=>{});return false}
  const settings=virtualLocationSettings(),transform=settings.transform,bounds=cached.bounds,wrapper=new THREE.Group(),content=cached.root.clone(true);
  content.position.set(-bounds.center.x,-bounds.min.y,-bounds.center.z);wrapper.add(content);wrapper.scale.setScalar(transform.scale);wrapper.rotation.y=THREE.MathUtils.degToRad(-transform.rotationY);wrapper.position.set(transform.x,transform.y,transform.z);wrapper.name=`Virtual Location · ${scan.name}`;state.scene.add(wrapper);state.locationRoot=wrapper;
  const diagonal=Math.hypot(bounds.size.x,bounds.size.y,bounds.size.z)*transform.scale;state.virtualLocationFar=Math.max(100,diagonal*4);return true
}
function syncVirtualLocationTransform3D(){
  const state=app.lighting.three,root=state?.locationRoot,scan=linkedVirtualLocation(),cached=scan&&app.lighting.locationModelCache.get(scan.id);if(!root||!cached?.bounds){syncLighting3D();return}
  const transform=virtualLocationSettings().transform,THREE=state.THREE;root.scale.setScalar(transform.scale);root.rotation.y=THREE.MathUtils.degToRad(-transform.rotationY);root.position.set(transform.x,transform.y,transform.z);
  const size=cached.bounds.size,diagonal=Math.hypot(size.x,size.y,size.z)*transform.scale;state.virtualLocationFar=Math.max(100,diagonal*4);if(state.camera){state.camera.far=state.virtualLocationFar;state.camera.updateProjectionMatrix()}
}

function makeLightingFixture3D(THREE,o,color){
  const fp=lightingFixtureProps(o.fixture),mp=lightingModifierProps(o.diffusion),group=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:0x1d2226,roughness:.58,metalness:.52}),trim=new THREE.MeshStandardMaterial({color:0x07090a,roughness:.42,metalness:.65}),glow=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.5,roughness:.35}),fabric=new THREE.MeshStandardMaterial({color:0xd9d8cf,roughness:.94,side:THREE.DoubleSide,transparent:true,opacity:.9});
  const type=fp.iconType;
  if(type==="panel"||type==="slim-panel"){const frame=new THREE.Mesh(new THREE.BoxGeometry(.08,.34,.48),body),face=new THREE.Mesh(new THREE.PlaneGeometry(.4,.27),glow);face.rotation.y=Math.PI/2;face.position.x=.045;group.add(frame,face)}
  else if(type==="tube"){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.72,18),glow);tube.rotation.z=Math.PI/2;group.add(tube)}
  else if(type==="window"){const frame=new THREE.Mesh(new THREE.BoxGeometry(.035,.65,.85),trim),face=new THREE.Mesh(new THREE.PlaneGeometry(.76,.56),glow);face.rotation.y=Math.PI/2;face.position.x=.022;group.add(frame,face)}
  else if(type==="bulb"||type==="candle"){const bulb=new THREE.Mesh(new THREE.SphereGeometry(type==="candle" ? .055 : .095,20,16),glow);bulb.position.y=type==="candle" ? .11 : 0;group.add(bulb);if(type==="candle"){const base=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.22,14),new THREE.MeshStandardMaterial({color:0xe4d6b9,roughness:.95}));group.add(base)}}
  else{const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.115,.145,.34,24),body);barrel.rotation.z=Math.PI/2;const lens=new THREE.Mesh(new THREE.CircleGeometry(.105,28),glow);lens.rotation.y=Math.PI/2;lens.position.x=.18;const yoke=new THREE.Mesh(new THREE.TorusGeometry(.19,.018,8,24,Math.PI),trim);yoke.rotation.z=Math.PI/2;yoke.position.x=-.03;group.add(barrel,lens,yoke)}
  const attachment=mp.attachment||"none";
  if(["softbox","parabolic","parabolic-grid","stripbox","panel-softbox"].includes(attachment)){const strip=attachment==="stripbox",wide=strip ? .24 : .52,high=strip ? .7 : .52,box=new THREE.Mesh(new THREE.CylinderGeometry(.13,Math.max(wide,high)/2,.42,4,1,true),fabric);box.rotation.z=-Math.PI/2;box.scale.z=wide/high;box.position.x=.3;group.add(box);const front=new THREE.Mesh(new THREE.PlaneGeometry(wide,high),fabric);front.rotation.y=Math.PI/2;front.position.x=.51;group.add(front)}
  else if(attachment==="lantern"||attachment==="dome"){const dome=new THREE.Mesh(new THREE.SphereGeometry(.28,24,18),fabric);dome.position.x=.23;group.add(dome)}
  else if(attachment==="fresnel"||attachment==="projection"||attachment==="reflector"){const length=attachment==="projection" ? .36 : .2,optic=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,length,22),body);optic.rotation.z=Math.PI/2;optic.position.x=.24;group.add(optic)}
  else if(attachment==="frame"||attachment==="bounce"){const frame=new THREE.Mesh(new THREE.PlaneGeometry(.58,.58),fabric);frame.rotation.y=Math.PI/2;frame.position.x=.42;group.add(frame)}
  const height=Number(o.height3d||2.2),standMat=new THREE.MeshStandardMaterial({color:0x202428,roughness:.55,metalness:.6}),pole=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,height,10),standMat);pole.position.y=-height/2;group.add(pole);for(const angle of [0,Math.PI*2/3,Math.PI*4/3]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.42,8),standMat);leg.rotation.z=Math.PI/2.8;leg.rotation.y=angle;leg.position.set(Math.cos(angle)*.13,-height+.08,Math.sin(angle)*.13);group.add(leg)}
  group.rotation.y=-THREE.MathUtils.degToRad(Number(o.rotation||0));group.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}});group.name=o.fixture;return group
}

function createThreeScene(THREE){
  const state=app.lighting.three,host=$("lighting3dViewport");
  if(!state.renderer){
    state.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:"high-performance"});
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    state.renderer.shadowMap.enabled=true;
    state.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    state.renderer.outputColorSpace=THREE.SRGBColorSpace;
    state.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure=1;
    host.innerHTML="";host.appendChild(state.renderer.domElement);
    bindThreeControls(state.renderer.domElement)
  }
  state.scene=new THREE.Scene();
  state.scene.background=new THREE.Color(0x090b0d);
  state.scene.add(new THREE.HemisphereLight(0x8da1b0,0x111111,.42));
  state.locationRoot=null;state.virtualLocationFar=100;
  const hasVirtualLocation=addVirtualLocationToScene(THREE,state);
  if(!hasVirtualLocation){
    const floor=new THREE.Mesh(
      new THREE.PlaneGeometry(12,8),
      new THREE.MeshStandardMaterial({color:0x20252a,roughness:.93,metalness:.02})
    );
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;state.scene.add(floor);
    const grid=new THREE.GridHelper(12,24,0x52606a,0x30383e);grid.position.y=.002;state.scene.add(grid)
  }

  const objects=app.lighting.current?.data?.objects||[];
  let shadowLights=0;
  for(const o of objects){
    const p=planToWorld(o);
    if(o.type==="subject"){
      const faceAsset=(app.ai.characters||[]).find(asset=>asset.id===o.characterId&&asset.face_scan_path),faceEntry=faceAsset&&app.lighting.faceModelCache.get(faceAsset.id);if(faceAsset&&!faceEntry?.root)loadFaceModel(faceAsset).catch(()=>{});
      const g=makeMannequin(THREE,o,faceEntry?.root||null);g.position.set(p.x,0,p.z);g.rotation.y=-Number(o.rotation||0)*Math.PI/180;g.userData.lightingObjectId=o.id;g.userData.baseCharacterSize=Math.max(.01,Number(o.height3d||1.75)*(Number(o.scale||100)/100));state.scene.add(g)
    }else if(o.type==="light"){
      const fp=lightingFixtureProps(o.fixture),mp=lightingModifierProps(o.diffusion),rgb=kelvinToRgb(o.kelvin);
      const color=new THREE.Color(rgb.r/255,rgb.g/255,rgb.b/255),height=Number(o.height3d||2.2);
      const marker=makeLightingFixture3D(THREE,o,color);marker.position.set(p.x,height,p.z);state.scene.add(marker);
      const strength=Math.max(.04,(Number(o.intensity||70)/100)*(mp.transmission??1)*(fp.output??1)),beam=lightingEffectiveBeam(o),omni=fp.shape==="omni"||beam>=150||["lantern","dome"].includes(mp.attachment);
      if(omni){
        const l=new THREE.PointLight(color,45*strength,7,2);l.position.set(p.x,height,p.z);
        if(shadowLights<3){l.castShadow=true;l.shadow.mapSize.set(512,512);shadowLights++}state.scene.add(l)
      }else{
        const l=new THREE.SpotLight(color,90*strength,12,THREE.MathUtils.degToRad(Math.min(87,beam/2)),Math.min(.98,.08+(mp.softness||0)),1.55);
        l.position.set(p.x,height,p.z);
        const yaw=Number(o.rotation||0)*Math.PI/180,tilt=Number(o.tilt||-15)*Math.PI/180;
        const target=new THREE.Object3D();
        target.position.set(p.x+Math.cos(yaw)*4,height+Math.sin(tilt)*4,p.z+Math.sin(yaw)*4);
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
  state.camera=new THREE.PerspectiveCamera(cameraVerticalFov(camObj.lens,camObj),aspect,.03,state.virtualLocationFar||100);state.camera.filmGauge=cameraActiveSensor(camObj).width;
  updateThreeCameraFromObject();
  resizeThreeRenderer()
}

function explorerPoseFromCamera(camObj=activeLightingCameraObject()){
  const p=planToWorld(camObj||{});return {x:p.x,y:Number(camObj?.height3d||1.65),z:p.z,rotation:Number(camObj?.rotation||0),tilt:Number(camObj?.tilt||0),roll:Number(camObj?.roll||0),lens:camObj?.lens||"50mm",cameraModel:camObj?.cameraModel||"ARRI ALEXA Mini"}
}
function renderVirtualExploreUi(){
  const scan=linkedVirtualLocation(),cameraMode=app.lighting.viewMode==="camera",explorer=app.lighting.explorer,controls=$("virtualExploreControls");if(!controls)return;
  controls.hidden=!(cameraMode&&activeLightingCameraObject());$("lightingCameraView")?.classList.toggle("exploring",!!explorer.active);
  $("toggleVirtualExploreBtn").textContent=uiText(explorer.active?"Exit Explore":"Explore Location");$("toggleVirtualExploreBtn").classList.toggle("active",explorer.active);
  $("enablePhoneLookBtn").textContent=uiText(explorer.motionEnabled?"Stop Phone Look":"Phone Look");$("enablePhoneLookBtn").classList.toggle("active",explorer.motionEnabled);
  $("enablePhoneLookBtn").disabled=!cameraMode;$("resetVirtualExploreBtn").disabled=!explorer.active;$("placeCameraFromExplorerBtn").disabled=!explorer.active||!lightingCanEdit();
  const mobile=window.matchMedia?.("(max-width: 760px)")?.matches;$("virtualWalkPad").hidden=!(explorer.active&&mobile);
  if($("lightingCameraControlsHint"))$("lightingCameraControlsHint").textContent=explorer.active?uiText("W A S D move · Q / E rotate · R / F height · drag to look"):uiText("Press Explore to enable keyboard movement")
}
function startVirtualExplore(){
  const cam=activeLightingCameraObject();if(!cam)return setVirtualLocationNotice("Add a camera before exploring the location.","warning");
  const playhead=lightingPlayheadTime();pauseLightingPlayback();app.lighting.playback.elapsed=playhead;const pose=explorerPoseFromCamera(cam);app.lighting.explorer.active=true;app.lighting.explorer.pose={...pose};app.lighting.explorer.startPose={...pose};renderVirtualExploreUi();renderLightingTimeline();updateThreeCameraFromObject();requestAnimationFrame(()=>app.lighting.three?.renderer?.domElement?.focus())
}
function stopVirtualExplore(){
  disablePhoneLook(false);const explorer=app.lighting.explorer;explorer.active=false;explorer.pose=null;explorer.startPose=null;if(app.lighting.three?.keys)app.lighting.three.keys.clear();renderVirtualExploreUi();if(app.lighting.three?.camera)updateThreeCameraFromObject()
}
function toggleVirtualExplore(){app.lighting.explorer.active?stopVirtualExplore():startVirtualExplore()}
function syncExplorerPoseToTimelineKeyframe(){
  if(!lightingCanEdit()||!syncCurrentObjectToTimelineKeyframe(activeLightingCameraObject()))return false;markLightingDirty();
  if(!app.lighting.timelinePoseRenderQueued){app.lighting.timelinePoseRenderQueued=true;requestAnimationFrame(()=>{app.lighting.timelinePoseRenderQueued=false;renderLightingCanvas()})}
  return true
}
function resetVirtualExplore(){
  const explorer=app.lighting.explorer;if(!explorer.active||!explorer.startPose)return;disablePhoneLook(false);explorer.pose={...explorer.startPose};syncExplorerPoseToTimelineKeyframe();updateThreeCameraFromObject();renderVirtualExploreUi()
}
function orientationQuaternion(event,THREE){
  const toRad=THREE.MathUtils.degToRad,alpha=event.alpha==null?0:toRad(event.alpha),beta=event.beta==null?0:toRad(event.beta),gamma=event.gamma==null?0:toRad(event.gamma),orient=toRad(Number(window.screen?.orientation?.angle??window.orientation??0));
  const euler=new THREE.Euler(beta,alpha,-gamma,"YXZ"),quaternion=new THREE.Quaternion().setFromEuler(euler),screenFix=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)),screenRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-orient);return quaternion.multiply(screenFix).multiply(screenRotation)
}
function onVirtualDeviceOrientation(event){
  const state=app.lighting.three,explorer=app.lighting.explorer;if(!explorer.active||!explorer.motionEnabled||!state?.THREE||event.alpha==null)return;const raw=orientationQuaternion(event,state.THREE);
  if(!explorer.motionBase){explorer.motionBase=raw.clone().invert();explorer.motionStart=state.camera?.quaternion?.clone()||new state.THREE.Quaternion()}
  const delta=explorer.motionBase.clone().multiply(raw);explorer.motionQuaternion=explorer.motionStart.clone().multiply(delta);updateThreeCameraFromObject()
}
async function enablePhoneLook(){
  const explorer=app.lighting.explorer;if(explorer.motionEnabled){disablePhoneLook();return}if(!explorer.active)startVirtualExplore();if(!app.lighting.explorer.active)return;
  try{
    if(typeof DeviceOrientationEvent==="undefined")throw new Error("Phone motion is not available in this browser.");
    if(typeof DeviceOrientationEvent.requestPermission==="function"){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=="granted")throw new Error("Motion permission was not granted.")}
    explorer.motionEnabled=true;explorer.motionBase=null;explorer.motionStart=null;explorer.motionQuaternion=null;explorer.motionListener=onVirtualDeviceOrientation;window.addEventListener("deviceorientation",explorer.motionListener,true);renderVirtualExploreUi();setVirtualLocationNotice("Phone Look is active. Turn the phone to look around; use the arrows to move through the remote location.")
  }catch(error){setVirtualLocationNotice(error.message||"Could not enable phone motion.","warning");disablePhoneLook(false)}
}
function disablePhoneLook(update=true){
  const explorer=app.lighting.explorer,state=app.lighting.three;if(explorer.motionEnabled&&state?.camera&&explorer.pose){const dir=new state.THREE.Vector3(0,0,-1).applyQuaternion(state.camera.quaternion).normalize();explorer.pose.rotation=Math.atan2(dir.z,dir.x)*180/Math.PI;explorer.pose.tilt=Math.asin(Math.max(-1,Math.min(1,dir.y)))*180/Math.PI;explorer.pose.roll=0}
  if(explorer.motionListener)window.removeEventListener("deviceorientation",explorer.motionListener,true);explorer.motionEnabled=false;explorer.motionBase=null;explorer.motionStart=null;explorer.motionQuaternion=null;explorer.motionListener=null;if(update){renderVirtualExploreUi();updateThreeCameraFromObject()}
}
function formatTimelineTimecode(seconds){
  const fps=24,total=Math.max(0,Math.round(Number(seconds||0)*fps)),frames=total%fps,whole=Math.floor(total/fps),s=whole%60,m=Math.floor(whole/60)%60,h=Math.floor(whole/3600);return [h,m,s,frames].map(value=>String(value).padStart(2,"0")).join(":")
}
function updateCameraViewfinder(cameraObject=activeLightingCameraObject()){
  const overlay=$("lightingViewfinder"),view=$("lightingCameraView");if(!overlay||!view||!cameraObject)return;const spec=cinemaCameraSpec(cameraObject),rect=view.getBoundingClientRect(),aspect=projectFrameAspect();if(rect.width<2||rect.height<2)return;
  let width=rect.width*.88,height=width/aspect;if(height>rect.height*.82){height=rect.height*.82;width=height*aspect}const left=(rect.width-width)/2,top=(rect.height-height)/2;
  overlay.style.setProperty("--vf-left",`${left}px`);overlay.style.setProperty("--vf-right",`${left}px`);overlay.style.setProperty("--vf-top",`${top}px`);overlay.style.setProperty("--vf-bottom",`${top}px`);overlay.className=`lighting-viewfinder vf-${spec.hud}`;
  $("lightingViewfinderModel").textContent=`${spec.brand} ${spec.model}`;$("lightingViewfinderLens").textContent=`${parseLensMm(cameraObject.lens).toFixed(0)} mm`;
  $("lightingViewfinderFormat").textContent=`${spec.format} · ${aspectNumbers(app.current).w}:${aspectNumbers(app.current).h}`;$("lightingViewfinderResolution").textContent=`${spec.resolution} · ${spec.display}`;$("lightingViewfinderTimecode").textContent=formatTimelineTimecode(app.lighting.playback.elapsed)
}
function updateThreeCameraFromExplorer(){
  const state=app.lighting.three,explorer=app.lighting.explorer,pose=explorer.pose;if(!state?.camera||!pose)return;const THREE=state.THREE,cameraPos=new THREE.Vector3(pose.x,pose.y,pose.z);state.camera.position.copy(cameraPos);state.camera.filmGauge=cameraActiveSensor(pose).width;state.camera.fov=cameraVerticalFov(pose.lens,pose);state.camera.near=.03;state.camera.far=state.virtualLocationFar||100;
  if(explorer.motionEnabled&&explorer.motionQuaternion)state.camera.quaternion.copy(explorer.motionQuaternion);
  else{const yaw=THREE.MathUtils.degToRad(pose.rotation),pitch=THREE.MathUtils.degToRad(pose.tilt),dir=new THREE.Vector3(Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch),Math.sin(yaw)*Math.cos(pitch)).normalize();state.camera.up.set(0,1,0);state.camera.lookAt(cameraPos.clone().add(dir));if(pose.roll)state.camera.rotateZ(THREE.MathUtils.degToRad(pose.roll))}
  state.camera.updateProjectionMatrix();$("lightingCameraHudTitle").textContent="Camera Explorer";$("lightingCameraHudMeta").textContent=`${linkedVirtualLocation()?.name||"Studio"} · ${pose.y.toFixed(2)} m · ${explorer.motionEnabled?"Phone Look":"Free Look"}`;updateCameraViewfinder({...activeLightingCameraObject(),...pose})
}
function placeShotCameraFromExplorer(){
  const state=app.lighting.three,explorer=app.lighting.explorer,cam=activeLightingCameraObject();if(!state?.camera||!explorer.active||!explorer.pose||!cam||!lightingCanEdit())return;
  const dir=new state.THREE.Vector3(0,0,-1).applyQuaternion(state.camera.quaternion).normalize();cam.x=Math.max(0,Math.min(1200,600+explorer.pose.x*100));cam.y=Math.max(0,Math.min(800,400+explorer.pose.z*100));cam.height3d=Math.max(.1,Math.min(6,explorer.pose.y));cam.rotation=Math.atan2(dir.z,dir.x)*180/Math.PI;cam.tilt=Math.asin(Math.max(-1,Math.min(1,dir.y)))*180/Math.PI;cam.roll=0;cam.angle="Custom";cam.cameraHeight="Custom";cam.autoFrame=false;
  syncExplorerPoseToTimelineKeyframe();markLightingDirty();renderLightingCanvas();renderLightingInspector();renderLightingObjectList();setVirtualLocationNotice("Shot camera placed at the explored viewpoint.")
}
window.storyboardVirtualLocationPose=payload=>{
  const explorer=app.lighting.explorer;if(!explorer.active||!explorer.startPose||!payload)return;const position=payload.position||payload;explorer.pose.x=explorer.startPose.x+(Number(position.x)||0);explorer.pose.y=explorer.startPose.y+(Number(position.y)||0);explorer.pose.z=explorer.startPose.z+(Number(position.z)||0);
  if(payload.quaternion&&app.lighting.three?.THREE){const q=payload.quaternion,THREE=app.lighting.three.THREE;explorer.motionEnabled=true;explorer.motionQuaternion=new THREE.Quaternion(Number(q.x)||0,Number(q.y)||0,Number(q.z)||0,Number(q.w)||1)}syncExplorerPoseToTimelineKeyframe();updateThreeCameraFromObject()
};

function updateThreeCameraFromObject(){
  const state=app.lighting.three,camObj=activeLightingCameraObject();
  if(!state?.camera||!camObj)return;
  if(app.lighting.explorer.active&&app.lighting.explorer.pose){updateThreeCameraFromExplorer();return}
  const THREE=state.THREE;
  const p=planToWorld(camObj);
  const cameraPos=new THREE.Vector3(p.x,Number(camObj.height3d||1.65),p.z);

  state.camera.position.copy(cameraPos);
  state.camera.filmGauge=cameraActiveSensor(camObj).width;state.camera.fov=cameraVerticalFov(camObj.lens,camObj);

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
    `${cinemaCameraSpec(camObj).model} · ${camObj.lens||"50mm"} · ${camObj.angle||"Custom"} · ${shortValue(camObj.shotSize||"")} · ${Number(camObj.height3d||1.65).toFixed(2)} m`;
  updateCameraViewfinder(camObj)
}

function resizeThreeRenderer(){
  const state=app.lighting.three,host=$("lighting3dViewport");if(!state?.renderer||!state.camera||!host)return;
  const r=host.getBoundingClientRect(),w=Math.max(2,Math.floor(r.width)),h=Math.max(2,Math.floor(r.height));
  state.renderer.setSize(w,h,false);state.camera.aspect=w/h;state.camera.updateProjectionMatrix();updateCameraViewfinder()
}
function rebuildLighting3D(){
  const state=app.lighting.three;if(!state?.THREE||app.lighting.viewMode!=="camera")return;
  createThreeScene(state.THREE)
}
function syncLighting3D(){
  if(app.lighting.viewMode==="camera"&&app.lighting.three?.THREE)rebuildLighting3D()
}
function updateThreeSubjectsFromObjects(){
  const state=app.lighting.three;if(app.lighting.viewMode!=="camera"||!state?.scene)return;
  const subjects=new Map(lightingTimelineCharacters().map(subject=>[subject.id,subject]));
  state.scene.traverse(node=>{
    const subject=subjects.get(node.userData?.lightingObjectId);if(!subject)return;const point=planToWorld(subject),size=Math.max(.01,Number(subject.height3d||1.75)*(Number(subject.scale||100)/100)),base=Math.max(.01,Number(node.userData.baseCharacterSize)||size),ratio=size/base;
    node.position.set(point.x,0,point.z);node.rotation.y=-Number(subject.rotation||0)*Math.PI/180;node.scale.setScalar(ratio)
  })
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
    if(state.renderer&&state.scene&&state.camera){state.renderer.render(state.scene,state.camera);drawAnimaticComposite()}
    state.raf=requestAnimationFrame(frame)
  };
  state.raf=requestAnimationFrame(frame)
}
function stopLighting3D(clear=false){
  const state=app.lighting.three;if(!state)return;
  if(state.raf){cancelAnimationFrame(state.raf);state.raf=0}
  if(clear&&state.renderer){state.renderer.dispose();$("lighting3dViewport").innerHTML="";app.lighting.three=null}
}
function lightingExploreKeyDown(event){
  const key=event.key?.toLowerCase(),target=event.target;if(!app.lighting.explorer.active||app.lighting.viewMode!=="camera"||!["w","a","s","d","q","e","r","f"].includes(key)||target?.matches?.("input,select,textarea,[contenteditable=true]"))return;event.preventDefault();app.lighting.three?.keys?.add(key)
}
function lightingExploreKeyUp(event){
  const key=event.key?.toLowerCase();if(["w","a","s","d","q","e","r","f"].includes(key))app.lighting.three?.keys?.delete(key)
}
function bindThreeControls(canvas){
  canvas.tabIndex=0;
  canvas.addEventListener("pointerdown",e=>{
    if(!app.lighting.explorer.active&&!lightingCanEdit())return;
    if(app.lighting.explorer.active&&app.lighting.explorer.motionEnabled)disablePhoneLook();
    canvas.focus();app.lighting.three.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)
  });
  canvas.addEventListener("pointermove",e=>{
    const state=app.lighting.three,drag=state?.drag,camObj=activeLightingCameraObject();
    if(!drag||!camObj)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    if(app.lighting.explorer.active&&app.lighting.explorer.pose){
      const pose=app.lighting.explorer.pose;pose.rotation=Number(pose.rotation||0)+dx*.22;pose.tilt=Math.max(-89,Math.min(89,Number(pose.tilt||0)-dy*.18));pose.roll=0;syncExplorerPoseToTimelineKeyframe();updateThreeCameraFromObject();return
    }
    if(!lightingCanEdit())return;
    camObj.rotation=(Number(camObj.rotation||0)+dx*.22);
    camObj.tilt=Math.max(-89,Math.min(89,Number(camObj.tilt||0)-dy*.18));
    camObj.angle="Custom";
    camObj.roll=0;
    camObj.autoFrame=false;
    syncCurrentObjectToTimelineKeyframe(camObj);markLightingDirty();updateThreeCameraFromObject();renderLightingInspector();renderLightingCanvas()
  });
  canvas.addEventListener("pointerup",()=>{if(app.lighting.three)app.lighting.three.drag=null});
  canvas.addEventListener("pointercancel",()=>{if(app.lighting.three)app.lighting.three.drag=null});
  canvas.addEventListener("keydown",e=>{if(app.lighting.explorer.active&&["w","a","s","d","q","e","r","f"].includes(e.key.toLowerCase())){e.preventDefault();app.lighting.three.keys.add(e.key.toLowerCase())}});
  canvas.addEventListener("keyup",e=>app.lighting.three?.keys?.delete(e.key.toLowerCase()));
  canvas.addEventListener("blur",()=>app.lighting.three?.keys?.clear())
}
function moveThreeCameraByKeys(dt){
  const state=app.lighting.three,camObj=activeLightingCameraObject();if(!state?.keys?.size||!camObj)return;
  const explorer=app.lighting.explorer,exploring=explorer.active&&explorer.pose;if(!exploring)return;
  const speed=1.65,rot=Number(explorer.pose.rotation||0)*Math.PI/180;
  let fx=Math.cos(rot),fz=Math.sin(rot),rx=-Math.sin(rot),rz=Math.cos(rot),dx=0,dz=0,dy=0;
  if(exploring&&explorer.motionEnabled&&state.camera){const dir=new state.THREE.Vector3();state.camera.getWorldDirection(dir);const horizontal=Math.hypot(dir.x,dir.z)||1;fx=dir.x/horizontal;fz=dir.z/horizontal;rx=-fz;rz=fx}
  if(state.keys.has("w")){dx+=fx;dz+=fz}if(state.keys.has("s")){dx-=fx;dz-=fz}
  if(state.keys.has("d")){dx+=rx;dz+=rz}if(state.keys.has("a")){dx-=rx;dz-=rz}
  if(state.keys.has("e"))explorer.pose.rotation+=72*dt;if(state.keys.has("q"))explorer.pose.rotation-=72*dt;
  if(state.keys.has("r"))dy+=1;if(state.keys.has("f"))dy-=1;
  const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
  explorer.pose.x+=dx*speed*dt;explorer.pose.z+=dz*speed*dt;explorer.pose.y=Math.max(.1,Math.min(6,explorer.pose.y+dy*speed*dt));syncExplorerPoseToTimelineKeyframe();updateThreeCameraFromObject()
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
  }).on("postgres_changes",{event:"*",schema:"public",table:"location_scans",filter:`project_id=eq.${pid}`},async()=>{
    if(!$("lightingDiagramModal")?.open||app.lighting.dragging||app.lighting.dirty)return;
    await loadVirtualLocations();renderLightingCanvas();if(app.lighting.viewMode==="camera")rebuildLighting3D()
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
      const [{data:paths},{data:characters},{data:locations},{data:locationScans}]=await Promise.all([
        sb.from("shots").select("image_path,original_image_path").eq("project_id",id),
        sb.from("project_ai_characters").select("*").eq("project_id",id),
        sb.from("project_ai_locations").select("*").eq("project_id",id),
        sb.from("location_scans").select("model_path").eq("project_id",id)
      ]);
      await removeMediaPaths([...(paths||[]).flatMap(x=>[x.image_path,x.original_image_path]),...(characters||[]).flatMap(x=>[x.reference_path,x.source_path,x.spatial_reference_path,x.face_scan_path]),...(locations||[]).flatMap(x=>[x.reference_path,x.source_path,x.spatial_reference_path]),...(locationScans||[]).map(x=>x.model_path)]);
      const rpc=await sb.rpc("delete_own_project",{p_project_id:id});
      if(rpc.error){
        const {data:deleted,error}=await sb.from("projects").delete().eq("id",id).eq("owner_id",app.session.user.id).select("id");
        if(error)throw error;if(!deleted?.length)throw new Error("Project was not deleted. Run the v3.5 Supabase migration and try again.")
      }
    }catch(err){uiAlert(`Could not delete project: ${err.message}`);app.suppressRealtime--;return}
    app.suppressRealtime--
  }
  app.projects=app.projects.filter(x=>x.id!==id);if(app.current?.id===id)app.current=null;
  if(app.mode==="local"){await deleteLocalProjectVirtualLocations(id);localStorage.setItem("storyboard-v3-projects",JSON.stringify(app.projects))}else await persistProjectPositions();
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
      characterMap.set(sourceAsset.id,newAsset.id);const copied=await copyAiReferencePath(sourceAsset.reference_path,newP.id,"character",newAsset.id,"reference"),copiedSource=await copyAiReferencePath(sourceAsset.source_path,newP.id,"character",newAsset.id,"source"),copiedSpatial=await copyAiReferencePath(sourceAsset.spatial_reference_path,newP.id,"character",newAsset.id,"spatial"),copiedFace=await copyAiReferencePath(sourceAsset.face_scan_path,newP.id,"character",newAsset.id,"face");
      if(copied||copiedSource||copiedSpatial||copiedFace){const changes={reference_path:copied||null,source_path:copiedSource||null,style_snapshot:copied?(sourceAsset.style_snapshot||p.style):null,locked:!!(copied&&sourceAsset.locked)};if(Object.hasOwn(sourceAsset,"spatial_reference_path"))Object.assign(changes,{spatial_reference_path:copiedSpatial||null,face_scan_path:copiedFace||null,face_scan_format:copiedFace?sourceAsset.face_scan_format:null,face_scan_metadata:copiedFace?(sourceAsset.face_scan_metadata||{}):{}});const {error:updateError}=await sb.from("project_ai_characters").update(changes).eq("id",newAsset.id);if(updateError)throw updateError}
    }
    for(const sourceAsset of locations||[]){
      const {data:newAsset,error:assetError}=await sb.from("project_ai_locations").insert({project_id:newP.id,name:sourceAsset.name,description:sourceAsset.description||"",locked:false,created_by:app.session.user.id}).select().single();if(assetError)throw assetError;
      locationMap.set(sourceAsset.id,newAsset.id);const copied=await copyAiReferencePath(sourceAsset.reference_path,newP.id,"location",newAsset.id,"reference"),copiedSource=await copyAiReferencePath(sourceAsset.source_path,newP.id,"location",newAsset.id,"source"),copiedSpatial=await copyAiReferencePath(sourceAsset.spatial_reference_path,newP.id,"location",newAsset.id,"spatial");
      if(copied||copiedSource||copiedSpatial){const changes={reference_path:copied||null,source_path:copiedSource||null,style_snapshot:copied?(sourceAsset.style_snapshot||p.style):null,locked:!!(copied&&sourceAsset.locked)};if(Object.hasOwn(sourceAsset,"spatial_reference_path"))changes.spatial_reference_path=copiedSpatial||null;const {error:updateError}=await sb.from("project_ai_locations").update(changes).eq("id",newAsset.id);if(updateError)throw updateError}
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
  $("accountBtn").onclick=openAccount;$("closeAccountBtn").onclick=()=>$("accountModal").close();$("accountProfileForm").onsubmit=saveAccountProfile;$("accountLanguageSelect").onchange=e=>window.storyboardI18n?.setLanguage(e.target.value);$("accountLayoutSelect").onchange=e=>applyLayoutPreference(e.target.value);$("accountThemeSelect").onchange=e=>applyThemePreference(e.target.value);
  $("adminCenterBtn").onclick=openAdminCenter;$("backFromAdminBtn").onclick=async()=>{rememberProjectsView();await loadCloudProjects();showProjects()};
  $("adminAccountBtn").onclick=openAccount;$("adminLogoutBtn").onclick=logout;
  $("adminUserSearchForm").onsubmit=searchAdminUsers;$("adminShowAllUsersBtn").onclick=showAllAdminUsers;$("adminLoadMoreUsersBtn").onclick=()=>loadAdminUsers(false);$("clearAdminUserBtn").onclick=clearAdminUser;$("adminAddForm").onsubmit=addAdmin;$("exitAdminSupportBtn").onclick=()=>closeAdminSupport(true);
  $("backProjectsBtn").onclick=returnToProjects;$("editorProjectsBtn").onclick=returnToProjects;$("editorAccountBtn").onclick=()=>{closeEditorActions();openAccount()};$("editorLogoutBtn").onclick=()=>{closeEditorActions();logout()};$("headerBibleBtn").onclick=()=>{closeEditorActions();openAiVisualBible()};$("headerProjectSettingsBtn").onclick=()=>{closeEditorActions();openAiVisualBible({section:"visual",focusProject:true})};
  $("projectSearch").oninput=e=>{app.projectSearch=e.target.value;renderProjects()};
  $("projectFilter").onchange=e=>{app.projectFilter=e.target.value;renderProjects()};
  $("projectDirectoryBackBtn").onclick=()=>openProjectDirectory("all");
  $("renameCurrentFolderBtn").onclick=()=>{if(app.projectFolder!=="all"&&app.projectFolder!=="general")renameProjectFolder(app.projectFolder)};
  $("deleteCurrentFolderBtn").onclick=()=>{if(app.projectFolder!=="all"&&app.projectFolder!=="general")deleteProjectFolder(app.projectFolder)};
  $("closeProjectDetailsBtn").onclick=()=>$("projectDetailsModal").close();$("saveProjectDetailsBtn").onclick=saveProjectDetails;$("projectDetailsBtn").onclick=()=>openProjectDetails(app.current.id);
  $("aiBibleBtn").onclick=()=>openAiVisualBible();$("manageAiCharactersBtn").onclick=()=>openAiVisualBible();$("closeAiBibleBtn").onclick=()=>$("aiBibleModal").close();$("doneAiBibleBtn").onclick=()=>$("aiBibleModal").close();
  $("bibleVisualTabBtn").onclick=()=>setBibleSection("visual");$("bibleScriptTabBtn").onclick=()=>setBibleSection("script");
  $("aiBibleModal").addEventListener("close",()=>setBibleSection("visual"));
  $("addAiCharacterBtn").onclick=()=>addAiAsset("character");$("addAiLocationBtn").onclick=()=>addAiAsset("location");$("aiLocationId").onchange=onAiShotLinksChange;$("generateShotImageBtn").onclick=generateShotImage;
  $("scriptFileInput").onchange=loadScriptFile;$("saveScriptBtn").onclick=()=>saveProjectScript();$("analyzeScriptBtn").onclick=analyzeProjectScript;$("applyScriptBreakdownBtn").onclick=applyScriptBreakdown;$("linkScriptSelectionBtn").onclick=linkScriptSelectionToShot;$("createShotFromScriptBtn").onclick=createShotFromScriptSelection;
  $("insertScriptSceneHeadingBtn").onclick=insertScriptSceneHeading;$("formatScreenplayBtn").onclick=()=>{applyScreenplayFormatting();setMsg("scriptNotice",app.script.analysis?"Screenplay formatting refreshed from the latest AI breakdown.":"Character and dialogue formatting applied. Analyze with AI to identify and label every scene.")};
  ["click","keyup","mouseup","focus"].forEach(eventName=>$("scriptTextEditor").addEventListener(eventName,()=>{updateScriptSelection();updateScriptFormatState()}));$("scriptTextEditor").addEventListener("input",()=>{updateScriptSelection();updateScriptFormatState();updateScriptCharacterCount();$("applyScriptBreakdownBtn").disabled=true;clearTimeout(scriptRenderTimer);scriptRenderTimer=setTimeout(renderScriptLineMap,220)});$("scriptTextEditor").addEventListener("beforeinput",event=>{if(event.inputType==="insertParagraph"){event.preventDefault();document.execCommand("insertLineBreak",false)}});$("scriptTextEditor").addEventListener("paste",event=>{event.preventDefault();document.execCommand("insertText",false,normalizeImportedScriptText(event.clipboardData?.getData("text/plain")||""))});$("scriptDirectionSelect").onchange=event=>setScriptDirection(event.target.value);["scriptBoldBtn","scriptUnderlineBtn","scriptFontDecreaseBtn","scriptFontIncreaseBtn"].forEach(id=>$(id).addEventListener("pointerdown",event=>event.preventDefault()));$("scriptBoldBtn").onclick=toggleScriptBold;$("scriptUnderlineBtn").onclick=toggleScriptUnderline;$("scriptFontDecreaseBtn").onclick=()=>changeScriptFontSize(-1);$("scriptFontIncreaseBtn").onclick=()=>changeScriptFontSize(1);document.addEventListener("selectionchange",()=>{if(scriptSelectionRange()){updateScriptSelection();updateScriptFormatState()}});$("scriptLinkSceneSelect").onchange=()=>{renderScriptLinkSelectors();updateScriptSelection()};$("scriptLinkShotSelect").onchange=updateScriptSelection;
  ["projectName","projectAspect","projectStyle","aspectWidth","aspectHeight"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onProjectChange))});
  ["sceneTitle","sceneDescription","sceneStoryLocation","sceneStoryTime","sceneShootTime","sceneTimeStrategy","sceneAiLocationId"].forEach(id=>{["input","change"].forEach(ev=>$(id).addEventListener(ev,onSceneChange))});$("syncSceneBibleBtn").onclick=syncSceneBibleToShots;
  SHOT_FIELDS.filter(id=>id!=="shotNo").forEach(id=>{if($(id))["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>onShotChange(id)))});
  $("addSceneBtn").onclick=addScene;$("deleteSceneBtn").onclick=()=>deleteScene();$("collapseAllScenesBtn").onclick=()=>deleteScene();$("expandAllScenesBtn").onclick=toggleAllScenes;
  $("addShotBtn").onclick=async()=>{await addShot();if(isMobileEditor())setMobileEditorScreen("shot")};$("duplicateShotBtn").onclick=duplicateShot;$("copyShotBtn").onclick=copyShot;$("pasteShotBtn").onclick=pasteShot;$("deleteShotBtn").onclick=deleteShot;
  $("prevShotBtn").onclick=()=>adjacentShot(-1);$("nextShotBtn").onclick=()=>adjacentShot(1);
  $("frameImageInput").onchange=loadImage;$("removeImageBtn").onclick=removeImage;
  $("frameImage").onclick=openCurrentShotImage;$("frameImage").onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openCurrentShotImage()}};
  $("closeImageViewerBtn").onclick=closeImageViewer;$("doneImageViewerBtn").onclick=closeImageViewer;$("restoreOriginalImageBtn").onclick=restoreOriginalShotImage;$("imageViewerModal").addEventListener("cancel",event=>{event.preventDefault();if(cropState.active)closeCropEditor();else closeImageViewer()});
  $("imageViewerImage").onload=updateImageViewerAspect;
  $("openCropFromViewerBtn").onclick=()=>{const target=imageViewerTarget;if(target)openCropEditor(target)};
  $("cancelCropBtn").onclick=closeCropEditor;$("resetCropBtn").onclick=resetCrop;$("saveCropBtn").onclick=saveCrop;$("cropZoom").oninput=updateCropZoom;
  $("cropCanvas").addEventListener("pointerdown",cropPointerDown);$("cropCanvas").addEventListener("pointermove",cropPointerMove);$("cropCanvas").addEventListener("pointerup",cropPointerEnd);$("cropCanvas").addEventListener("pointercancel",cropPointerEnd);
  $("cropCanvas").addEventListener("wheel",event=>{if(!cropState.drawable||cropState.saving)return;event.preventDefault();const zoom=$("cropZoom"),next=Math.max(Number(zoom.min),Math.min(Number(zoom.max),Number(zoom.value)+(event.deltaY<0?5:-5)));zoom.value=String(next);updateCropZoom()},{passive:false});
  $("imageViewerModal").addEventListener("close",()=>{clearCropDrawable();cropState.active=false;cropState.target=null;cropState.saving=false;$("cropCanvas").hidden=true;$("cropLoading").hidden=true;setMsg("cropNotice","")});

  // Lighting Studio v5.8
  $("openLightingDiagramBtn").onclick=()=>openLightingWorkspace();
  $("closeLightingDiagramBtn").onclick=closeLightingWorkspace;
  $("lightingDiagramModal").addEventListener("cancel",e=>{e.preventDefault();closeLightingWorkspace()});
  $("lightingDiagramModal").addEventListener("close",()=>{document.documentElement.classList.remove("lighting-workspace-open");stopVirtualExplore();stopLighting3D();unsubscribeLightingRealtime()});

  $("lightingPlanModeBtn").onclick=()=>setLightingViewMode("plan");
  $("lightingCameraModeBtn").onclick=()=>setLightingViewMode("camera");
  $("lightingGodViewBtn").onclick=showLightingGodToast;
  $("lightingDrawerHeader").onclick=()=>toggleLightingDrawer();
  $("lightingPlanPipHeader").addEventListener("pointerdown",startLightingPipDrag);$("lightingPlanPipHeader").addEventListener("pointermove",moveLightingPipDrag);$("lightingPlanPipHeader").addEventListener("pointerup",endLightingCompanionDrag);$("lightingPlanPipHeader").addEventListener("pointercancel",endLightingCompanionDrag);
  $("lightingSplitHandle").addEventListener("pointerdown",startLightingSplitDrag);$("lightingSplitHandle").addEventListener("pointermove",moveLightingSplitDrag);$("lightingSplitHandle").addEventListener("pointerup",endLightingCompanionDrag);$("lightingSplitHandle").addEventListener("pointercancel",endLightingCompanionDrag);

  $("virtualLocationSelect").onchange=e=>selectVirtualLocation(e.target.value);
  $("virtualLocationFileInput").onchange=handleVirtualLocationFileInput;
  $("importVirtualLocationBtn").onclick=()=>chooseVirtualLocationFile("import");
  $("scanVirtualLocationBtn").onclick=event=>event.preventDefault();
  $("detachVirtualLocationBtn").onclick=detachVirtualLocation;
  $("deleteVirtualLocationBtn").onclick=deleteVirtualLocation;
  $("virtualLocationBibleSelect").onchange=renderVirtualLocationBibleControls;
  $("linkVirtualLocationBibleBtn").onclick=linkVirtualLocationToBible;
  $("captureVirtualLocationBibleBtn").onclick=captureVirtualLocationForBible;
  ["virtualLocationScale","virtualLocationRotation","virtualLocationOffsetX","virtualLocationOffsetY","virtualLocationOffsetZ"].forEach(id=>["input","change"].forEach(eventName=>$(id).addEventListener(eventName,updateVirtualLocationTransform)));
  $("resetVirtualLocationTransformBtn").onclick=resetVirtualLocationTransform;

  $("saveLightingDiagramBtn").onclick=saveLightingDiagram;
  $("restartLightingDiagramBtn").onclick=restartLightingDiagram;
  $("lightingDiagramName").oninput=e=>{if(!app.lighting.current)return;app.lighting.current.name=e.target.value;markLightingDirty()};
  $("lightingDiagramNotes").oninput=e=>{if(!app.lighting.current)return;app.lighting.current.data.notes=e.target.value;markLightingDirty()};

  $("addLightingCameraBtn").onclick=()=>addLightingObject(defaultLightingCamera());
  $("addLightingCharacterBtn").onclick=()=>addLightingObject(defaultLightingSubject());
  $("addLightingFixtureBtn").onclick=addLightingFixture;
  $("drawerAddLightingCameraBtn").onclick=event=>{event.preventDefault();event.stopPropagation();addLightingObject(defaultLightingCamera())};
  $("drawerAddLightingCharacterBtn").onclick=event=>{event.preventDefault();event.stopPropagation();addLightingObject(defaultLightingSubject())};
  $("drawerAddLightingFixtureBtn").onclick=event=>{event.preventDefault();event.stopPropagation();addLightingFixture()};
  $("addShotLightingBtn").onclick=addLightFromCurrentShot;
  $("applyShotCameraBtn").onclick=applyCurrentShotToCamera;
  $("useSelectedCameraViewBtn").onclick=useSelectedCameraView;

  [
    "lightingObjectLabel","lightingObjectKelvin","lightingObjectIntensity","lightingObjectBeam",
    "lightingObjectHeight3d","lightingObjectTilt","lightingObjectLens","lightingObjectShotSize",
    "lightingObjectAngle","lightingObjectMovement","lightingObjectFocus","lightingCameraModel",
    "lightingCameraHeight3d","lightingCameraTilt","lightingSubjectHeight3d","lightingSubjectScale",
    "lightingSubjectGender","lightingSubjectCharacter","lightingSubjectFaceScale","lightingSubjectFaceYaw","lightingSubjectFaceOffset","lightingObjectRotation"
  ].forEach(id=>["input","change"].forEach(ev=>$(id).addEventListener(ev,()=>selectedLightingChange(id))));

  $("deleteLightingObjectBtn").onclick=deleteSelectedLightingObject;
  $("lightingCanvas").addEventListener("pointermove",event=>{moveLightingDrag(event);moveLightingCanvasPan(event)});
  $("lightingCanvas").addEventListener("pointerup",event=>{endLightingDrag(event);endLightingCanvasPan(event)});
  $("lightingCanvas").addEventListener("pointercancel",event=>{endLightingDrag(event);endLightingCanvasPan(event)});
  $("lightingCanvas").addEventListener("wheel",event=>lightingPlanWheel(event,"top"),{passive:false});
  $("lightingCanvas").addEventListener("pointerdown",e=>{
    if(e.target===$("lightingCanvas")||e.target.classList?.contains("lighting-bg"))startLightingCanvasPan(e,"top")
  });
  $("lightingElevationCanvas").addEventListener("pointermove",event=>{moveLightingElevationDrag(event);moveLightingCanvasPan(event)});
  $("lightingElevationCanvas").addEventListener("pointerup",event=>{endLightingDrag(event);endLightingCanvasPan(event)});
  $("lightingElevationCanvas").addEventListener("pointercancel",event=>{endLightingDrag(event);endLightingCanvasPan(event)});
  $("lightingElevationCanvas").addEventListener("wheel",event=>lightingPlanWheel(event,"elevation"),{passive:false});
  $("lightingElevationCanvas").addEventListener("pointerdown",event=>{if(event.target===$("lightingElevationCanvas")||event.target.classList?.contains("lighting-elevation-bg"))startLightingCanvasPan(event,"elevation")});
  $("lightingZoomOutBtn").onclick=()=>{const pane=app.lighting.planPane||"top";setLightingPlanZoom((lightingViewState(pane).zoom||1)/1.2,pane)};
  $("lightingZoomInBtn").onclick=()=>{const pane=app.lighting.planPane||"top";setLightingPlanZoom((lightingViewState(pane).zoom||1)*1.2,pane)};
  $("lightingZoomValue").onclick=$("lightingZoomFitBtn").onclick=fitLightingPlanViews;

  $("lightingPlaybackPlayBtn").onclick=()=>playLightingPlayback(true);
  $("lightingPlaybackPauseBtn").onclick=pauseLightingPlayback;
  $("lightingPlaybackStopBtn").onclick=()=>stopLightingPlayback(true);
  $("lightingAddKeyframeBtn").onclick=addLightingCameraKeyframe;
  $("lightingDeleteKeyframeBtn").onclick=deleteLightingCameraKeyframe;
  $("lightingAddCharacterKeyframeBtn").onclick=addLightingCharacterKeyframe;
  $("lightingDeleteCharacterKeyframeBtn").onclick=deleteLightingCharacterKeyframe;
  $("lightingDeleteSelectedKeyframeBtn").onclick=deleteSelectedLightingKeyframe;
  $("lightingTimelineDuration").onchange=updateLightingTimelineDuration;
  $("lightingTimelineScrubber").oninput=event=>seekLightingTimeline(event.target.value);
  $("lightingTimelineTime").onchange=event=>seekLightingTimeline(event.target.value);
  $("exportLightingVideoBtn").onclick=exportLightingVideo;
  $("renderLightingAnimaticBtn").onclick=renderLightingAnimatic;
  $("cancelLightingAnimaticBtn").onclick=cancelLightingAnimatic;
  $("saveLightingAnimaticBtn").onclick=saveLightingAnimaticToShot;
  $("lightingAnimaticAudio").onchange=event=>{app.lighting.animatic.audioFile=event.target.files?.[0]||null};
  [["lightingAnimaticDof","lightingAnimaticDofValue"],["lightingAnimaticMotion","lightingAnimaticMotionValue"],["lightingAnimaticGrain","lightingAnimaticGrainValue"],["lightingAnimaticVignette","lightingAnimaticVignetteValue"],["lightingAnimaticAudioLevel","lightingAnimaticAudioValue"]].forEach(([input,output])=>$(input).oninput=event=>$(output).textContent=`${event.target.value}%`);
  $("lightingVideoRunwayBtn").onclick=()=>setLightingVideoProvider("runway");
  $("lightingVideoVeoBtn").onclick=()=>setLightingVideoProvider("veo");
  $("generateLightingAiVideoBtn").onclick=generateLightingAiVideo;
  $("cancelLightingAiVideoBtn").onclick=cancelLightingAiVideo;
  $("lightingVideoGuideTab").onclick=()=>showLightingVideoResult(false);
  $("lightingVideoResultTab").onclick=()=>showLightingVideoResult(true);
  $("saveLightingAiVideoBtn").onclick=saveLightingAiVideoToShot;
  $("toggleVirtualExploreBtn").onclick=toggleVirtualExplore;
  $("enablePhoneLookBtn").onclick=enablePhoneLook;
  $("resetVirtualExploreBtn").onclick=resetVirtualExplore;
  $("placeCameraFromExplorerBtn").onclick=placeShotCameraFromExplorer;
  document.querySelectorAll("[data-virtual-move]").forEach(button=>{
    const key=button.dataset.virtualMove,start=event=>{event.preventDefault();app.lighting.three?.keys?.add(key);button.classList.add("pressed");button.setPointerCapture?.(event.pointerId)},stop=event=>{event.preventDefault();app.lighting.three?.keys?.delete(key);button.classList.remove("pressed")};
    button.addEventListener("pointerdown",start);button.addEventListener("pointerup",stop);button.addEventListener("pointercancel",stop);button.addEventListener("lostpointercapture",stop)
  });
  $("exportLightingPngBtn").onclick=exportLightingPng;
  $("exportLightingSvgBtn").onclick=exportLightingSvg;
  $("exportLightingJsonBtn").onclick=exportLightingJson;
  $("shareLightingDiagramBtn").onclick=copyLightingShareLink;
  document.addEventListener("keydown",lightingExploreKeyDown);document.addEventListener("keyup",lightingExploreKeyUp);window.addEventListener("blur",()=>app.lighting.three?.keys?.clear());

  $("sheetToggleBtn").onclick=()=>{if(isMobileEditor())setMobileEditorScreen("sheet");else{toggleSheet();closeEditorActions()}};$("mobileSheetBtn").onclick=()=>setMobileEditorScreen("sheet");$("closeSheetBtn").onclick=()=>isMobileEditor()?setMobileEditorScreen("shot"):toggleSheet(false);$("shotsPerPage").onchange=renderSheet;$("printSheetBtn").onclick=()=>window.print();
  $("exportBtn").onclick=exportJSON;$("importInput").onchange=e=>{const f=e.target.files[0];if(f)importJSONOnline(f).catch(err=>uiAlert(err.message||"Import failed."));e.target.value="";};
  document.querySelectorAll("[data-focus]").forEach(button=>button.onclick=()=>openPrimarySetting(button.dataset.focus));
  $("collaborateBtn").onclick=()=>{closeEditorActions();openCollab()};$("addMemberBtn").onclick=addMemberByUsername;$("createShareLinkBtn").onclick=createShareLink;$("copyShareLinkBtn").onclick=async()=>{await navigator.clipboard.writeText($("shareLinkOutput").value);setMsg("collabMessage","Invite link copied.")};
  $("permissionPreset").onchange=e=>{if(e.target.value!=="custom")setPermissionPreset(e.target.value)};
  $("collabMembersTab").onclick=()=>setCollabTab("members");$("collabChatTab").onclick=()=>setCollabTab("chat");$("collabProductionTab").onclick=()=>setCollabTab("production");$("productionDashboardRole").onchange=renderProductionDashboard;$("sendChatMessageBtn").onclick=sendChatMessage;
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
  window.addEventListener("resize",()=>{if(!isMobileEditor())closeEditorActions();syncMobileEditorUi();renderVirtualExploreUi();if($("lightingDiagramModal")?.open&&app.lighting.viewMode==="camera")renderLightingViewMode()});
  window.addEventListener("storyboard:languagechange",()=>{
    if(app.current)renderEditor();
    if($("aiBibleModal")?.open)renderAiVisualBible();
    if(!$("projectsView").hidden)renderProjects();
    if(!$("adminView").hidden&&app.admin.isAdmin){renderAdminUserResults(app.admin.users);loadAdminTeam();loadAdminActivity()}
    if(app.profile)renderAccountProfile();if($("accountModal")?.open)renderCreatorScore();renderAiUsage();renderVirtualLocationControls();window.storyboardI18n?.translateTree(document.body)
  });
  document.addEventListener("click",e=>{
    if(!$("editorView")?.classList.contains("editor-actions-open"))return;
    if(e.target.closest(".editor-actions,.mobile-more-btn"))return;
    closeEditorActions()
  });
  window.addEventListener("pagehide",()=>rememberWorkspace())
}

start();
