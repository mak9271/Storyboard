// Storyboard v4.7.0 AI gateway: FLUX storyboard generation + multilingual script breakdown.
const DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const ALLOWED_MODEL = new Set([DEFAULT_MODEL]);
const DEFAULT_SCRIPT_MODEL = "@cf/zai-org/glm-4.7-flash";
const ALLOWED_SCRIPT_MODELS = new Set([DEFAULT_SCRIPT_MODEL]);
const MAX_JSON_BYTES = 96 * 1024;
const MAX_SCRIPT_JSON_BYTES = 920 * 1024;
const MAX_SCRIPT_CHARS = 180000;
const MAX_REFERENCE_BYTES = 12 * 1024 * 1024;
const MAX_CHARACTER_REFERENCES = 3;

const STYLE_RULES = {
  "Storyboard B&W": "black-and-white production storyboard drawing, bold readable values, clean cinematic blocking, economical detail",
  "Pencil": "traditional graphite pencil storyboard, visible confident construction strokes, monochrome paper texture, cinematic blocking",
  "Ink": "high-contrast black ink storyboard, expressive brush line, sparse hatching, strong silhouettes, cinematic blocking",
  "Photoreal Reference": "cinematic photoreal pre-production reference, natural texture, realistic lens behavior, production-design clarity"
};
const SHOT_SIZE_RULES = [
  [/^ECU\b/i,"EXTREME CLOSE-UP: one isolated facial feature, hand, prop, or tiny story detail occupies 85–100% of the canvas. Exclude torso, legs, full body and wide environment"],
  [/^CU\b/i,"CLOSE-UP: face plus head-and-shoulders occupies 70–90% of the canvas; crop between shoulders and upper chest. Do not show waist, legs, full body or an establishing view"],
  [/^MCU\b/i,"MEDIUM CLOSE-UP: frame from mid-chest upward; head and torso occupy 60–80% of canvas height. Exclude waist, knees, feet and full body"],
  [/^MS\b/i,"MEDIUM SHOT: frame from the waist upward; subject occupies about 55–75% of canvas height. Exclude knees and feet"],
  [/^MLS\b/i,"MEDIUM LONG SHOT: frame from knees upward; subject occupies about 60–80% of canvas height while remaining dominant"],
  [/^WS\b/i,"WIDE SHOT: show the complete subject head-to-toe and meaningful surrounding location; subject occupies about 25–55% of canvas height"],
  [/^EWS\b/i,"EXTREME WIDE SHOT: location and spatial geography dominate; complete subject is small, normally under 25% of canvas height"],
  [/^OTS\b/i,"OVER-THE-SHOULDER: include a foreground shoulder/head edge and frame the opposing subject beyond it"],
  [/^POV\b/i,"POINT OF VIEW: the camera is the character's eyes; do not show that observing character from outside"],
  [/^Insert\b/i,"INSERT SHOT: isolate the specified object or action detail so it fills most of the frame"],
  [/^Top Shot\b/i,"TOP SHOT: a true overhead composition looking straight down"],
];
const ANGLE_RULES = [
  [/Low Angle/i,"LOW ANGLE: place the camera clearly below the subject and point upward; show unmistakable upward perspective and dominance"],
  [/High Angle/i,"HIGH ANGLE: place the camera clearly above the subject and point downward; show unmistakable downward perspective"],
  [/Top|Bird|Overhead/i,"OVERHEAD ANGLE: look straight or steeply downward from above; this must not appear eye-level"],
  [/Ground Level/i,"GROUND-LEVEL ANGLE: lens is close to the floor and looks across or upward from ground level"],
  [/Dutch/i,"DUTCH ANGLE: visibly roll the horizon/camera axis while preserving the requested shot size"],
  [/Eye Level/i,"EYE-LEVEL ANGLE: camera axis is level with the subject's eyes, with no high- or low-angle tilt"],
];

function json(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}})
}
function clean(value,max=700){return String(value??"").replace(/[\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function isUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||""))}
function supabaseHeaders(env,token,extra={}){return {apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,...extra}}
function restUrl(env,path,query=""){return `${String(env.SUPABASE_URL||"").replace(/\/$/,"")}/rest/v1/${path}${query?`?${query}`:""}`}
async function restRows(env,token,path,query){
  const response=await fetch(restUrl(env,path,query),{headers:supabaseHeaders(env,token,{Accept:"application/json"})});
  if(!response.ok)throw new Error(`Database request failed (${response.status}).`);return await response.json()
}
async function canEditScript(env,token,projectId){
  const response=await fetch(restUrl(env,"rpc/storyboard_script_can_edit"),{method:"POST",headers:supabaseHeaders(env,token,{"Content-Type":"application/json",Accept:"application/json"}),body:JSON.stringify({p_project_id:projectId})});
  if(!response.ok)throw new Error("Bible Script permission check failed.");const value=await response.json();return value===true||(Array.isArray(value)&&value[0]===true)
}
async function authenticate(env,request){
  const auth=request.headers.get("Authorization")||"";if(!auth.startsWith("Bearer "))return null;
  const token=auth.slice(7).trim();if(!token)return null;
  const response=await fetch(`${String(env.SUPABASE_URL||"").replace(/\/$/,"")}/auth/v1/user`,{headers:supabaseHeaders(env,token)});
  if(!response.ok)return null;const user=await response.json();return user?.id?{user,token}:null
}
async function reserveGeneration(env,token,projectId){
  const response=await fetch(restUrl(env,"rpc/reserve_ai_generation"),{method:"POST",headers:supabaseHeaders(env,token,{"Content-Type":"application/json",Accept:"application/json"}),body:JSON.stringify({p_project_id:projectId})});
  if(!response.ok){const detail=await response.text();if(detail.includes("MEDIA_PERMISSION_REQUIRED"))throw json({error:"You need the project media permission to generate images."},403);if(response.status===404||detail.includes("reserve_ai_generation"))throw new Error("AI quota is not configured. Run supabase-v4.0-ai.sql.");throw new Error("Could not reserve an AI generation.")}
  const raw=await response.json(),row=Array.isArray(raw)?raw[0]:raw;return {allowed:!!row?.allowed,remaining:Number(row?.remaining||0),globalRemaining:Number(row?.global_remaining||0)}
}
function aspectDimensions(project){
  let width=Number(project.aspect_width||3),height=Number(project.aspect_height||4);const match=clean(project.aspect,40).match(/([\d.]+)\s*:\s*([\d.]+)/);
  if(project.aspect!=="Custom"&&match){width=Number(match[1]);height=Number(match[2])}
  width=Math.max(.1,width||3);height=Math.max(.1,height||4);const ratio=width/height;
  let w,h;if(ratio>=1){w=1024;h=Math.round((1024/ratio)/16)*16}else{h=1024;w=Math.round((1024*ratio)/16)*16}
  return {width:Math.max(384,Math.min(1024,w)),height:Math.max(384,Math.min(1024,h))}
}
function projectStyle(project){const selected=clean(project.style,80)||"Storyboard B&W";return `${selected}: ${STYLE_RULES[selected]||selected}`}
function matchingRule(value,rules,fallback){const text=clean(value,120);return rules.find(([pattern])=>pattern.test(text))?.[1]||`${fallback}: ${text||"unspecified"}`}
function lensRule(value){
  const text=clean(value,80),mm=Number(text.match(/(\d+(?:\.\d+)?)\s*mm/i)?.[1]);
  if(Number.isFinite(mm)){
    if(mm<=24)return `${text} ULTRA-WIDE LENS: strong spatial expansion and foreground/background size difference, without fisheye distortion`;
    if(mm<=35)return `${text} WIDE LENS: visible environmental context and expanded depth perspective`;
    if(mm<=65)return `${text} NORMAL LENS: natural perspective and moderate spatial compression`;
    if(mm<=100)return `${text} PORTRAIT/TELEPHOTO LENS: compressed perspective, narrower field of view and flattering facial geometry`;
    return `${text} LONG TELEPHOTO LENS: strong spatial compression, narrow field of view and isolated subject`;
  }
  if(/wide/i.test(text))return "WIDE LENS: expanded depth and environmental context";
  if(/tele/i.test(text))return "TELEPHOTO LENS: visibly compressed perspective and isolated subject";
  return `${text||"NORMAL"} LENS: render the corresponding field of view and perspective character`;
}
function focusRule(value){
  const text=clean(value,120);
  if(/shallow|selective/i.test(text))return `${text}: keep the intended subject plane critically sharp with obvious foreground/background blur and optical falloff`;
  if(/deep/i.test(text))return `${text}: keep foreground, subject and background visibly sharp with broad depth of field`;
  if(/soft/i.test(text))return `${text}: retain readable features with controlled soft optical rendering, not an out-of-focus mistake`;
  if(/split diopter/i.test(text))return `${text}: keep both a near subject and a distant subject sharp with a convincing split-diopter look`;
  if(/rack/i.test(text))return `${text}: depict the stated end-focus subject as sharp and the other plane clearly defocused in this still frame`;
  return `${text||"Natural focus"}: use physically plausible focus and depth of field`;
}
function buildReferencePrompt(type,project,asset){
  const hasSource=!!asset.source_path;
  const sourceCharacter=hasSource?"An attached source image is the PRIMARY identity guide. Preserve its face, apparent age, hair, skin features, body proportions, distinguishing traits and base costume; the text only clarifies it. ":"";
  const sourceLocation=hasSource?"An attached source image is the PRIMARY location guide. Preserve its architecture, layout, entrances, materials, fixed objects and spatial relationships; the text only clarifies it. ":"";
  const common=`Project: ${clean(project.name,120)}. Global visual language: ${projectStyle(project)}. Create one continuous full-bleed image only—no collage, contact sheet, inset, split panel, border, captions, labels, watermarks or logos.`;
  if(type==="character")return `Create a definitive visual-bible reference portrait for the recurring character ${clean(asset.name,80)}. ${sourceCharacter}Stable identity specification: ${clean(asset.description,1400)}. Show one clear full-body front three-quarter pose in a single portrait image, with the face large and readable enough to establish identity. Neutral unobtrusive background, even reference lighting, no other people. Keep this identity exact and reusable in later shots. ${common}`;
  return `Create a definitive visual-bible environment plate for the recurring location ${clean(asset.name,80)}. ${sourceLocation}Stable location specification: ${clean(asset.description,1600)}. Show the architecture, floor layout, entrances, windows, fixed set dressing, materials, palette and spatial relationships clearly in one wide establishing image. No people and no unrelated place. This exact location must be reusable from different camera positions in later shots. ${common}`
}
function fieldLine(label,value,max=500){const text=clean(value,max);return text?`${label}: ${text}.`:""}
function shotReferencePlan(location,characters,shot={}){
  const characterEntries=(characters||[]).map(asset=>({type:"character",asset})),locationEntry={type:"location",asset:location},closeFraming=/^(ECU|CU|MCU|OTS|Insert)\b/i.test(clean(shot.shotSize,80));
  return closeFraming&&characterEntries.length?[...characterEntries,locationEntry]:[locationEntry,...characterEntries]
}
function sceneTimeRule(scene){
  const strategy=clean(scene?.time_strategy,40),story=clean(scene?.story_time,40)||"Unspecified",shoot=clean(scene?.shoot_time,40)||"Unspecified";
  if(strategy==="day_for_night")return `DAY FOR NIGHT: the story reads unmistakably as ${story||"night"}, but it is photographed in ${shoot||"day"}; darken and cover visible interior windows, suppress direct daylight, cool and underexpose exterior ambience, and preserve believable night motivation.`;
  if(strategy==="night_for_day")return `NIGHT FOR DAY: the story reads unmistakably as ${story||"day"}, but it is photographed in ${shoot||"night"}; motivate strong daylight through windows/openings and keep the finished frame convincingly daytime.`;
  return `Story time is ${story}; intended shooting time is ${shoot}. Render the finished story time, not behind-the-scenes conditions.`
}
function buildShotPrompt(project,scene,shot,location,characters,referencePlan=shotReferencePlan(location,characters,shot)){
  const d=shot||{},dimensions=aspectDimensions(project),orientation=dimensions.width===dimensions.height?"square":dimensions.width>dimensions.height?"landscape":"portrait";
  const framing=matchingRule(d.shotSize,SHOT_SIZE_RULES,"FRAMING"),viewpoint=matchingRule(d.angle,ANGLE_RULES,"CAMERA ANGLE"),optics=lensRule(d.lens),focus=focusRule(d.focus),referenceGuide=referencePlan.map((entry,index)=>entry.type==="location"?`Reference image ${index} is the locked location ${clean(entry.asset.name,80)}. Preserve its architecture, materials, fixed set pieces and spatial identity, but DO NOT copy its wide reference composition.`:`Reference image ${index} is the locked character ${clean(entry.asset.name,80)}. Preserve face, age, hair, body proportions and distinguishing features, but DO NOT copy the reference portrait pose or framing.`).join("\n");
  return [
    `STRICT OUTPUT CANVAS: create exactly one ${orientation} cinematic storyboard image at ${dimensions.width} × ${dimensions.height}, using the project's ${clean(project.aspect,60)||"selected"} aspect ratio as the native full canvas.`,
    "Fill the complete canvas edge to edge with one continuous scene. Never place horizontal images, reference plates, or smaller framed pictures inside a vertical canvas (or vice versa). No collage, diptych, triptych, contact sheet, storyboard grid, split screen, inset image, border, matte, letterbox, pillarbox, empty band, or frame-within-a-frame.",
    `COMPOSITION PRIORITY 1 — NON-NEGOTIABLE SHOT SIZE: ${framing}. This crop rule overrides the composition and scale visible in every reference image. Compose from scratch for this exact shot size.`,
    `NON-NEGOTIABLE CAMERA VIEWPOINT — ${viewpoint}.`,
    `NON-NEGOTIABLE LENS RENDERING — ${optics}.`,
    `NON-NEGOTIABLE DEPTH OF FIELD — ${focus}.`,
    "The location and character files are identity/continuity evidence only. Never treat a reference image as the requested camera framing. Never reproduce a full-body reference portrait when the requested shot is CU, MCU or ECU.",
    referenceGuide,
    `Project: ${clean(project.name,120)}. Global visual language: ${projectStyle(project)}.`,
    `CONTINUITY: reproduce the locked location ${clean(location.name,80)} and no other location. Location specification: ${clean(location.description,1400)}.`,
    characters.length?`Recurring characters present: ${characters.map(x=>clean(x.name,80)).join(", ")}. Preserve each identity exactly; only change pose, expression and explicitly requested costume details.`:"This shot contains no locked recurring-character reference.",
    "SHOT REQUIREMENTS — apply every populated field below to this single frame:",
    fieldLine("Scene",`${clean(scene?.title,160)} — ${clean(scene?.description,700)}`),
    fieldLine("Scene location",scene?.story_location,300),fieldLine("Story time",scene?.story_time,80),fieldLine("Planned shooting time",scene?.shoot_time,80),sceneTimeRule(scene),
    fieldLine("Shot number",d.shotNo,40),fieldLine("Intended duration",d.duration,80),fieldLine("Shot summary",d.summary),fieldLine("Main subject",d.subject),fieldLine("Visual action",d.description),fieldLine("Performance and emotion",d.performance),fieldLine("Subject movement",d.subjectMovement),fieldLine("Intentional costume and appearance",d.costume),
    fieldLine("Shot size and framing",d.shotSize,120),fieldLine("Camera angle",d.angle,120),fieldLine("Lens focal length and perspective",d.lens,80),fieldLine("Focus and depth-of-field behavior",d.focus,160),fieldLine("Camera movement implication",d.movement,120),fieldLine("Composition",d.composition,160),fieldLine("Start-frame to end-frame intention",d.startEnd,300),
    fieldLine("Time of day",d.timeOfDay,80),fieldLine("Shot-specific details inside the locked location",d.location,400),fieldLine("Light source",d.lightSource,120),fieldLine("Light direction",d.lightDirection,120),fieldLine("Light quality",d.lightQuality,120),fieldLine("Lighting notes",d.lighting,500),fieldLine("Props and set elements",d.props,500),fieldLine("Important notes",d.notes,500),
    fieldLine("Dialogue context — use only to inform expression and action; do not print it",d.dialogue,500),fieldLine("Voice-over context — do not print it",d.voiceOver,400),fieldLine("Sound-effect context",d.sfx,240),fieldLine("Music and emotional rhythm",d.music,240),fieldLine("Incoming edit transition",d.transitionIn,120),fieldLine("Outgoing edit transition",d.transitionOut,120),
    `FINAL CAMERA CHECK BEFORE RENDERING: verify the subject crop and screen occupancy against this exact rule: ${framing}. The delivered image must immediately read as ${clean(d.shotSize,80)||"the requested shot size"}, ${clean(d.angle,80)||"the requested angle"}, ${clean(d.lens,80)||"the requested lens"}, and ${clean(d.focus,100)||"the requested focus"}. If a close-up shows a full body, legs, feet or wide establishing space, it is wrong and must be recomposed. If a low/high angle looks eye-level, it is wrong and must be recomposed.`,
    "Apply the requested lens perspective and depth of field visibly and accurately. Keep all essential action and subjects inside the single full-bleed frame. No captions, subtitles, dialogue text, speech balloons, UI, written labels, watermarks, signatures, split panels, duplicated scenes, or extra frames."
  ].filter(Boolean).join("\n")
}
async function loadContext(env,token,payload){
  const projectId=payload.project_id;if(!isUuid(projectId))throw new Response(JSON.stringify({error:"Invalid project."}),{status:400,headers:{"Content-Type":"application/json"}});
  const projects=await restRows(env,token,"projects",`id=eq.${encodeURIComponent(projectId)}&select=id,name,style,aspect,aspect_width,aspect_height`);const project=projects[0];if(!project)throw new Response(JSON.stringify({error:"Project not found or access denied."}),{status:404,headers:{"Content-Type":"application/json"}});
  return {projectId,project}
}
async function loadReferenceBytes(env,token,path){
  const safePath=String(path||"").split("/").map(encodeURIComponent).join("/");
  const response=await fetch(`${String(env.SUPABASE_URL||"").replace(/\/$/,"")}/storage/v1/object/authenticated/storyboards/${safePath}`,{headers:supabaseHeaders(env,token)});
  if(!response.ok)throw new Error("A locked reference image could not be loaded.");const type=(response.headers.get("Content-Type")||"").split(";")[0];if(!/^image\/(jpeg|png|webp)$/.test(type))throw new Error("A reference has an unsupported image format.");
  const bytes=await response.arrayBuffer();if(bytes.byteLength>MAX_REFERENCE_BYTES)throw new Error("A reference image is too large.");return {bytes,type}
}
async function modelInput(prompt,width,height,references){
  const form=new FormData();form.append("prompt",prompt);form.append("width",String(width));form.append("height",String(height));
  // Cloudflare documents guidance as the model's prompt-adherence control.
  // A moderate value improves framing/angle compliance without overcooking the
  // four-step distilled model.
  form.append("guidance","5.5");
  references.forEach((ref,index)=>form.append(`input_image_${index}`,new Blob([ref.bytes],{type:ref.type}),`reference-${index}.${ref.type.split("/")[1]||"webp"}`));
  // Cloudflare's Workers AI binding requires the serialized multipart stream
  // plus its generated boundary. Passing an ArrayBuffer is rejected upstream.
  const encoded=new Response(form);return {multipart:{body:encoded.body,contentType:encoded.headers.get("Content-Type")}}
}
function decodeBase64(value){
  const cleanValue=String(value||"").replace(/^data:image\/[^;]+;base64,/,"");const binary=atob(cleanValue),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes
}
async function promptHash(prompt){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(prompt));return [...new Uint8Array(digest)].slice(0,10).map(x=>x.toString(16).padStart(2,"0")).join("")}
const SCRIPT_BREAKDOWN_TOOL = {
  name:"submit_script_breakdown",
  description:"Return the complete evidence-based screenplay breakdown.",
  parameters:{
    type:"object",
    additionalProperties:false,
    properties:{
      title:{type:"string"},
      language:{type:"string"},
      characters:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},description:{type:"string"}},required:["name","description"]}},
      locations:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},description:{type:"string"}},required:["name","description"]}},
      scenes:{type:"array",items:{type:"object",additionalProperties:false,properties:{key:{type:"string"},title:{type:"string"},description:{type:"string"},location:{type:"string"},story_time:{type:"string",enum:["Unspecified","Dawn","Morning","Day","Sunset","Twilight","Night"]},shoot_time:{type:"string",enum:["Unspecified","Dawn","Morning","Day","Sunset","Twilight","Night"]},time_strategy:{type:"string",enum:["natural","day_for_night","night_for_day"]},characters:{type:"array",items:{type:"string"}},start_line:{type:"integer"},end_line:{type:"integer"}},required:["key","title","description","location","story_time","shoot_time","time_strategy","characters","start_line","end_line"]}}
    },
    required:["title","language","characters","locations","scenes"]
  }
};
function scriptSlug(value,index){const slug=clean(value,100).toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"");return slug||`scene-${String(index+1).padStart(3,"0")}`}
function scriptTime(value){const text=clean(value,30);return ["Unspecified","Dawn","Morning","Day","Sunset","Twilight","Night"].includes(text)?text:"Unspecified"}
function normalizeScriptBreakdown(raw,totalLines){
  const source=raw&&typeof raw==="object"?raw:{},characters=new Map(),locations=new Map(),sceneKeys=new Set();
  const addAsset=(map,item,fallback)=>{const value=typeof item==="string"?{name:item}:item||{},name=clean(value.name,100);if(!name)return;const key=name.toLocaleLowerCase();if(!map.has(key))map.set(key,{name,description:clean(value.description,900)||fallback})};
  for(const item of Array.isArray(source.characters)?source.characters:[])addAsset(characters,item,"Recurring character detected in the screenplay; add stable visual identity and costume details before generation.");
  for(const item of Array.isArray(source.locations)?source.locations:[])addAsset(locations,item,"Recurring location detected in the screenplay; add stable architecture, layout and palette details before generation.");
  const scenes=(Array.isArray(source.scenes)?source.scenes:[]).slice(0,500).map((item,index)=>{const row=item&&typeof item==="object"?item:{},characterNames=[...new Set((Array.isArray(row.characters)?row.characters:[]).map(value=>clean(value,100)).filter(Boolean))].slice(0,40),location=clean(row.location,100),story=scriptTime(row.story_time),shoot=scriptTime(row.shoot_time),strategy=["natural","day_for_night","night_for_day"].includes(row.time_strategy)?row.time_strategy:"natural",start=Math.max(1,Math.min(totalLines,Number(row.start_line)||1)),end=Math.max(start,Math.min(totalLines,Number(row.end_line)||start)),baseKey=scriptSlug(row.key,index);let key=baseKey,suffix=2;while(sceneKeys.has(key)){key=`${baseKey}-${suffix}`;suffix++}sceneKeys.add(key);for(const name of characterNames)addAsset(characters,{name},"Recurring character detected in the screenplay; add stable visual identity and costume details before generation.");if(location)addAsset(locations,{name:location},"Recurring location detected in the screenplay; add stable architecture, layout and palette details before generation.");return {key,title:clean(row.title,160)||`Scene ${index+1}`,description:clean(row.description,900)||"Script scene",location,story_time:story,shoot_time:shoot==="Unspecified"?story:shoot,time_strategy:strategy,characters:characterNames,start_line:start,end_line:end}});
  return {title:clean(source.title,160)||"Imported Script",language:clean(source.language,80)||"Unknown",characters:[...characters.values()],locations:[...locations.values()],scenes}
}
function numberedScript(text){return String(text).split("\n").map((line,index)=>`L${String(index+1).padStart(5,"0")}: ${line}`).join("\n")}
function parseScriptModelResult(result){
  const choices=result?.choices||[],message=choices[0]?.message||{},calls=[...(Array.isArray(message.tool_calls)?message.tool_calls:[]),...(Array.isArray(result?.tool_calls)?result.tool_calls:[])],toolCall=calls.find(call=>(call?.function?.name||call?.name)==="submit_script_breakdown"),candidate=toolCall?.function?.arguments??toolCall?.arguments??result?.response??message.content;
  if(candidate&&typeof candidate==="object")return candidate;
  const text=String(candidate||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,""),start=text.indexOf("{"),end=text.lastIndexOf("}");if(start<0||end<=start)throw new Error("The script model returned an unreadable breakdown.");return JSON.parse(text.slice(start,end+1))
}
async function analyzeScriptWithModel(env,scriptText){
  const model=ALLOWED_SCRIPT_MODELS.has(env.SCRIPT_AI_MODEL)?env.SCRIPT_AI_MODEL:DEFAULT_SCRIPT_MODEL,totalLines=scriptText.split("\n").length,system="You are a meticulous multilingual screenplay breakdown assistant. Read Persian, English, or mixed-language screenplays. Use only evidence in the supplied script. Identify each dramatic scene or slugline in order; do not invent characters, locations, events, or production facts. Normalize recurring character and location names so the same entity has one name. Character descriptions should include only identity, age/role, appearance or costume evidence present in the script. Location descriptions should include only architecture, layout, fixed elements, palette or atmosphere evidence present in the script. story_time is the time experienced in the finished film. shoot_time equals story_time unless an explicit production note indicates Day for Night or Night for Day. time_strategy must describe that explicit conversion. start_line and end_line must use the supplied L-number boundaries. Every scene character and location name must also appear in the global lists. Submit exactly one complete breakdown through the required function.";
  const user=`Analyze this complete screenplay. It contains ${totalLines} numbered lines. Preserve scene order and line boundaries.\n\n${numberedScript(scriptText)}`,result=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],tools:[SCRIPT_BREAKDOWN_TOOL],tool_choice:"required",temperature:.1,max_completion_tokens:12000});return {analysis:normalizeScriptBreakdown(parseScriptModelResult(result),totalLines),model}
}
async function generateWithModel(env,prompt,dimensions,references){
  const model=ALLOWED_MODEL.has(env.AI_MODEL)?env.AI_MODEL:DEFAULT_MODEL,input=await modelInput(prompt,dimensions.width,dimensions.height,references),result=await env.AI.run(model,input);
  if(!result?.image)throw new Error("The image model returned no image.");return {bytes:decodeBase64(result.image),model}
}
async function handleScriptAnalyze(request,env){
  if(!env.AI||!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return json({error:"AI service is not configured."},503);const auth=await authenticate(env,request);if(!auth)return json({error:"Sign in again to analyze a script."},401);const declared=Number(request.headers.get("Content-Length")||0);if(declared>MAX_SCRIPT_JSON_BYTES)return json({error:"Script request is too large."},413);
  let payload;try{const text=await request.text();if(text.length>MAX_SCRIPT_JSON_BYTES)return json({error:"Script request is too large."},413);payload=JSON.parse(text)}catch{return json({error:"Invalid script request."},400)}
  try{const {projectId}=await loadContext(env,auth.token,payload);if(!await canEditScript(env,auth.token,projectId))return json({error:"You need project editing permission to analyze this script."},403);if(!isUuid(payload.script_id))return json({error:"Save the script before analysis."},400);const scriptText=String(payload.script_text||"");if(scriptText.trim().length<20)return json({error:"Add more screenplay text before analysis."},400);if(scriptText.length>MAX_SCRIPT_CHARS)return json({error:`AI analysis accepts up to ${MAX_SCRIPT_CHARS.toLocaleString()} characters at once.`},413);const scripts=await restRows(env,auth.token,"project_scripts",`id=eq.${encodeURIComponent(payload.script_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,content`),saved=scripts[0];if(!saved)return json({error:"Script not found or access denied."},404);if(saved.content!==scriptText)return json({error:"Save the latest script text before analysis."},409);const result=await analyzeScriptWithModel(env,scriptText);return json({analysis:result.analysis,model:result.model.replace(/^@cf\//,"")})}
  catch(error){if(error instanceof Response)return error;console.error("AI script analysis failed",error);const message=/script|configured|access|save/i.test(error?.message||"")?error.message:"AI script analysis failed. Please try again.";return json({error:message},500)}
}
async function handleGenerate(request,env){
  if(!env.AI||!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return json({error:"AI service is not configured."},503);
  const auth=await authenticate(env,request);if(!auth)return json({error:"Sign in again to generate images."},401);
  const declared=Number(request.headers.get("Content-Length")||0);if(declared>MAX_JSON_BYTES)return json({error:"Request is too large."},413);
  let payload;try{const text=await request.text();if(text.length>MAX_JSON_BYTES)return json({error:"Request is too large."},413);payload=JSON.parse(text)}catch{return json({error:"Invalid request."},400)}
  try{
    const {projectId,project}=await loadContext(env,auth.token,payload),mode=clean(payload.mode,40);let prompt,references=[],dimensions=aspectDimensions(project);
    if(mode==="character_reference"||mode==="location_reference"){
      const type=mode.startsWith("character")?"character":"location",table=type==="character"?"project_ai_characters":"project_ai_locations";if(!isUuid(payload.asset_id))return json({error:"Invalid Bible item."},400);
      const rows=await restRows(env,auth.token,table,`id=eq.${encodeURIComponent(payload.asset_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,source_path,locked`),asset=rows[0];if(!asset)return json({error:"Bible item not found or access denied."},404);if(asset.locked)return json({error:"Unlock this reference before regenerating it."},409);if(asset.source_path)references=[await loadReferenceBytes(env,auth.token,asset.source_path)];prompt=buildReferencePrompt(type,project,asset);dimensions=type==="character"?{width:768,height:1024}:{width:1024,height:768}
    }else if(mode==="shot"){
      if(!isUuid(payload.shot_id)||!isUuid(payload.scene_id))return json({error:"Invalid shot."},400);
      const shots=await restRows(env,auth.token,"shots",`id=eq.${encodeURIComponent(payload.shot_id)}&project_id=eq.${encodeURIComponent(projectId)}&scene_id=eq.${encodeURIComponent(payload.scene_id)}&select=id,scene_id,data`);if(!shots[0])return json({error:"Shot not found or access denied."},404);
      const scenes=await restRows(env,auth.token,"scenes",`id=eq.${encodeURIComponent(payload.scene_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=*`),scene=scenes[0];if(!scene)return json({error:"Scene not found or access denied."},404);
      const savedShot=shots[0].data&&typeof shots[0].data==="object"?shots[0].data:{},submittedShot=payload.shot_data&&typeof payload.shot_data==="object"?payload.shot_data:{},shot={...savedShot,...submittedShot},locationId=clean(shot.aiLocationId,50),characterIds=Array.isArray(shot.aiCharacterIds)?[...new Set(shot.aiCharacterIds.filter(isUuid))]:[];
      if(!isUuid(locationId))return json({error:"Choose a locked project location."},400);if(characterIds.length>MAX_CHARACTER_REFERENCES)return json({error:`Choose no more than ${MAX_CHARACTER_REFERENCES} recurring characters for one shot.`},400);
      const locations=await restRows(env,auth.token,"project_ai_locations",`id=eq.${encodeURIComponent(locationId)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,reference_path,style_snapshot,locked`),location=locations[0];if(!location?.locked||!location.reference_path||location.style_snapshot!==project.style)return json({error:"The selected location needs an approved reference locked for the current project style."},409);
      const allCharacters=await restRows(env,auth.token,"project_ai_characters",`project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,reference_path,style_snapshot,locked`),characters=characterIds.map(id=>allCharacters.find(x=>x.id===id));if(characters.some(x=>!x?.locked||!x.reference_path||x.style_snapshot!==project.style))return json({error:"Every selected character needs an approved reference locked for the current project style."},409);
      const referencePlan=shotReferencePlan(location,characters,shot);references=await Promise.all(referencePlan.map(entry=>loadReferenceBytes(env,auth.token,entry.asset.reference_path)));prompt=buildShotPrompt(project,scene,shot,location,characters,referencePlan)
    }else return json({error:"Unsupported generation mode."},400);

    const quota=await reserveGeneration(env,auth.token,projectId);if(!quota.allowed)return json({error:quota.globalRemaining<=0?"Today's shared free-generation pool has been reached.":"Your free daily generation limit has been reached.",remaining:quota.remaining},429);
    const result=await generateWithModel(env,prompt,dimensions,references),hash=await promptHash(prompt);
    return new Response(result.bytes,{status:200,headers:{"Content-Type":"image/jpeg","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-AI-Remaining":String(quota.remaining),"X-AI-Global-Remaining":String(quota.globalRemaining),"X-AI-Model":result.model.replace(/^@cf\/black-forest-labs\//,""),"X-AI-Prompt-Hash":hash}})
  }catch(error){
    if(error instanceof Response)return error;console.error("AI generation failed",error);const message=/configured|reference|locked|quota/i.test(error?.message||"")?error.message:"AI generation failed. Please try again.";return json({error:message},500)
  }
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==="/api/ai/health"&&request.method==="GET")return json({ok:!!env.AI,model:(ALLOWED_MODEL.has(env.AI_MODEL)?env.AI_MODEL:DEFAULT_MODEL).replace(/^@cf\/black-forest-labs\//,"")});
    if(url.pathname==="/api/ai/generate"){
      if(request.method!=="POST")return json({error:"Method not allowed."},405,{Allow:"POST"});return handleGenerate(request,env)
    }
    if(url.pathname==="/api/script/analyze"){
      if(request.method!=="POST")return json({error:"Method not allowed."},405,{Allow:"POST"});return handleScriptAnalyze(request,env)
    }
    return env.ASSETS.fetch(request)
  }
};

export {aspectDimensions,buildReferencePrompt,buildShotPrompt,clean,isUuid,normalizeScriptBreakdown,shotReferencePlan};
