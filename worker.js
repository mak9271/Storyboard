// Storyboard v4.4.0 AI gateway. Cloudflare FLUX multipart input follows the provider schema exactly.
const DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const ALLOWED_MODEL = new Set([DEFAULT_MODEL]);
const MAX_JSON_BYTES = 96 * 1024;
const MAX_REFERENCE_BYTES = 12 * 1024 * 1024;
const MAX_CHARACTER_REFERENCES = 3;

const STYLE_RULES = {
  "Storyboard B&W": "black-and-white production storyboard drawing, bold readable values, clean cinematic blocking, economical detail",
  "Pencil": "traditional graphite pencil storyboard, visible confident construction strokes, monochrome paper texture, cinematic blocking",
  "Ink": "high-contrast black ink storyboard, expressive brush line, sparse hatching, strong silhouettes, cinematic blocking",
  "Photoreal Reference": "cinematic photoreal pre-production reference, natural texture, realistic lens behavior, production-design clarity"
};
const SHOT_SIZE_RULES = [
  [/^ECU\b/i,"EXTREME CLOSE-UP: an isolated facial detail, eyes, mouth, hand, or very small story detail fills almost the entire frame; never show the full body"],
  [/^CU\b/i,"CLOSE-UP: the face and head-and-shoulders dominate roughly 70% of the frame; crop around upper chest; never deliver a full shot"],
  [/^MCU\b/i,"MEDIUM CLOSE-UP: frame from about mid-chest upward with the face visually dominant"],
  [/^MS\b/i,"MEDIUM SHOT: frame approximately from the waist upward; do not show the entire body"],
  [/^MLS\b/i,"MEDIUM LONG SHOT: frame approximately from knees upward while keeping the subject prominent"],
  [/^WS\b/i,"WIDE SHOT: show the full subject and meaningful surrounding location, with clear spatial blocking"],
  [/^EWS\b/i,"EXTREME WIDE SHOT: the location dominates and the complete subject is small but readable within it"],
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
function buildShotPrompt(project,scene,shot,location,characters){
  const d=shot||{},characterNames=characters.map(x=>clean(x.name,80)).join(", ")||"none",dimensions=aspectDimensions(project),orientation=dimensions.width===dimensions.height?"square":dimensions.width>dimensions.height?"landscape":"portrait";
  const framing=matchingRule(d.shotSize,SHOT_SIZE_RULES,"FRAMING"),viewpoint=matchingRule(d.angle,ANGLE_RULES,"CAMERA ANGLE"),optics=lensRule(d.lens),focus=focusRule(d.focus);
  return [
    `STRICT OUTPUT CANVAS: create exactly one ${orientation} cinematic storyboard image at ${dimensions.width} × ${dimensions.height}, using the project's ${clean(project.aspect,60)||"selected"} aspect ratio as the native full canvas.`,
    "Fill the complete canvas edge to edge with one continuous scene. Never place horizontal images, reference plates, or smaller framed pictures inside a vertical canvas (or vice versa). No collage, diptych, triptych, contact sheet, storyboard grid, split screen, inset image, border, matte, letterbox, pillarbox, empty band, or frame-within-a-frame.",
    `NON-NEGOTIABLE SHOT SIZE — ${framing}.`,
    `NON-NEGOTIABLE CAMERA VIEWPOINT — ${viewpoint}.`,
    `NON-NEGOTIABLE LENS RENDERING — ${optics}.`,
    `NON-NEGOTIABLE DEPTH OF FIELD — ${focus}.`,
    "The location and character reference files are identity and continuity inputs only. Do not copy their reference-sheet layout into the final image.",
    `Project: ${clean(project.name,120)}. Global visual language: ${projectStyle(project)}.`,
    `CONTINUITY IS THE HIGHEST PRIORITY. The first reference image is the locked location ${clean(location.name,80)}. Reproduce that same place, architecture, materials and fixed objects; do not invent, substitute or move the scene to another location. Location specification: ${clean(location.description,1400)}.`,
    characters.length?`The remaining reference images are the locked recurring characters, in this order: ${characterNames}. Preserve each character's facial identity, age, hair, body proportions and distinguishing features exactly. Only change pose, expression and explicitly requested costume details.`:"This shot contains no locked recurring-character reference.",
    "SHOT REQUIREMENTS — apply every populated field below to this single frame:",
    fieldLine("Scene",`${clean(scene?.title,160)} — ${clean(scene?.description,700)}`),
    fieldLine("Shot number",d.shotNo,40),fieldLine("Intended duration",d.duration,80),fieldLine("Shot summary",d.summary),fieldLine("Main subject",d.subject),fieldLine("Visual action",d.description),fieldLine("Performance and emotion",d.performance),fieldLine("Subject movement",d.subjectMovement),fieldLine("Intentional costume and appearance",d.costume),
    fieldLine("Shot size and framing",d.shotSize,120),fieldLine("Camera angle",d.angle,120),fieldLine("Lens focal length and perspective",d.lens,80),fieldLine("Focus and depth-of-field behavior",d.focus,160),fieldLine("Camera movement implication",d.movement,120),fieldLine("Composition",d.composition,160),fieldLine("Start-frame to end-frame intention",d.startEnd,300),
    fieldLine("Time of day",d.timeOfDay,80),fieldLine("Shot-specific details inside the locked location",d.location,400),fieldLine("Light source",d.lightSource,120),fieldLine("Light direction",d.lightDirection,120),fieldLine("Light quality",d.lightQuality,120),fieldLine("Lighting notes",d.lighting,500),fieldLine("Props and set elements",d.props,500),fieldLine("Important notes",d.notes,500),
    fieldLine("Dialogue context — use only to inform expression and action; do not print it",d.dialogue,500),fieldLine("Voice-over context — do not print it",d.voiceOver,400),fieldLine("Sound-effect context",d.sfx,240),fieldLine("Music and emotional rhythm",d.music,240),fieldLine("Incoming edit transition",d.transitionIn,120),fieldLine("Outgoing edit transition",d.transitionOut,120),
    `FINAL CAMERA CHECK: the delivered image must visibly read as ${clean(d.shotSize,80)||"the requested shot size"}, ${clean(d.angle,80)||"the requested angle"}, ${clean(d.lens,80)||"the requested lens"}, and ${clean(d.focus,100)||"the requested focus"}. Reject any full-body/wide composition when a close-up is requested and reject any eye-level composition when a low or high angle is requested.`,
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
  form.append("guidance","4");
  references.forEach((ref,index)=>form.append(`input_image_${index}`,new Blob([ref.bytes],{type:ref.type}),`reference-${index}.${ref.type.split("/")[1]||"webp"}`));
  // Cloudflare's Workers AI binding requires the serialized multipart stream
  // plus its generated boundary. Passing an ArrayBuffer is rejected upstream.
  const encoded=new Response(form);return {multipart:{body:encoded.body,contentType:encoded.headers.get("Content-Type")}}
}
function decodeBase64(value){
  const cleanValue=String(value||"").replace(/^data:image\/[^;]+;base64,/,"");const binary=atob(cleanValue),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes
}
async function promptHash(prompt){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(prompt));return [...new Uint8Array(digest)].slice(0,10).map(x=>x.toString(16).padStart(2,"0")).join("")}
async function generateWithModel(env,prompt,dimensions,references){
  const model=ALLOWED_MODEL.has(env.AI_MODEL)?env.AI_MODEL:DEFAULT_MODEL,input=await modelInput(prompt,dimensions.width,dimensions.height,references),result=await env.AI.run(model,input);
  if(!result?.image)throw new Error("The image model returned no image.");return {bytes:decodeBase64(result.image),model}
}
async function handleGenerate(request,env){
  if(!env.AI||!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return json({error:"AI service is not configured."},503);
  const auth=await authenticate(env,request);if(!auth)return json({error:"Sign in again to generate images."},401);
  const declared=Number(request.headers.get("Content-Length")||0);if(declared>MAX_JSON_BYTES)return json({error:"Request is too large."},413);
  let payload;try{const text=await request.text();if(text.length>MAX_JSON_BYTES)return json({error:"Request is too large."},413);payload=JSON.parse(text)}catch{return json({error:"Invalid request."},400)}
  try{
    const {projectId,project}=await loadContext(env,auth.token,payload),mode=clean(payload.mode,40);let prompt,references=[],dimensions=aspectDimensions(project);
    if(mode==="character_reference"||mode==="location_reference"){
      const type=mode.startsWith("character")?"character":"location",table=type==="character"?"project_ai_characters":"project_ai_locations";if(!isUuid(payload.asset_id))return json({error:"Invalid Visual Bible item."},400);
      const rows=await restRows(env,auth.token,table,`id=eq.${encodeURIComponent(payload.asset_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,source_path,locked`),asset=rows[0];if(!asset)return json({error:"Visual Bible item not found or access denied."},404);if(asset.locked)return json({error:"Unlock this reference before regenerating it."},409);if(asset.source_path)references=[await loadReferenceBytes(env,auth.token,asset.source_path)];prompt=buildReferencePrompt(type,project,asset);dimensions=type==="character"?{width:768,height:1024}:{width:1024,height:768}
    }else if(mode==="shot"){
      if(!isUuid(payload.shot_id)||!isUuid(payload.scene_id))return json({error:"Invalid shot."},400);
      const shots=await restRows(env,auth.token,"shots",`id=eq.${encodeURIComponent(payload.shot_id)}&project_id=eq.${encodeURIComponent(projectId)}&scene_id=eq.${encodeURIComponent(payload.scene_id)}&select=id,scene_id`);if(!shots[0])return json({error:"Shot not found or access denied."},404);
      const scenes=await restRows(env,auth.token,"scenes",`id=eq.${encodeURIComponent(payload.scene_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,title,description`),scene=scenes[0];if(!scene)return json({error:"Scene not found or access denied."},404);
      const shot=payload.shot_data&&typeof payload.shot_data==="object"?payload.shot_data:{},locationId=clean(shot.aiLocationId,50),characterIds=Array.isArray(shot.aiCharacterIds)?[...new Set(shot.aiCharacterIds.filter(isUuid))]:[];
      if(!isUuid(locationId))return json({error:"Choose a locked project location."},400);if(characterIds.length>MAX_CHARACTER_REFERENCES)return json({error:`Choose no more than ${MAX_CHARACTER_REFERENCES} recurring characters for one shot.`},400);
      const locations=await restRows(env,auth.token,"project_ai_locations",`id=eq.${encodeURIComponent(locationId)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,reference_path,style_snapshot,locked`),location=locations[0];if(!location?.locked||!location.reference_path||location.style_snapshot!==project.style)return json({error:"The selected location needs an approved reference locked for the current project style."},409);
      const allCharacters=await restRows(env,auth.token,"project_ai_characters",`project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,reference_path,style_snapshot,locked`),characters=characterIds.map(id=>allCharacters.find(x=>x.id===id));if(characters.some(x=>!x?.locked||!x.reference_path||x.style_snapshot!==project.style))return json({error:"Every selected character needs an approved reference locked for the current project style."},409);
      references=await Promise.all([location,...characters].map(asset=>loadReferenceBytes(env,auth.token,asset.reference_path)));prompt=buildShotPrompt(project,scene,shot,location,characters)
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
    return env.ASSETS.fetch(request)
  }
};

export {aspectDimensions,buildReferencePrompt,buildShotPrompt,clean,isUuid};
