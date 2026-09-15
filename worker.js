// Storyboard v4.2.0 AI gateway. Cloudflare FLUX multipart input follows the provider schema exactly.
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
function buildReferencePrompt(type,project,asset){
  const common=`Project: ${clean(project.name,120)}. Global visual language: ${projectStyle(project)}. Keep the image free of captions, labels, watermarks, borders and logos.`;
  if(type==="character")return `Create a definitive visual-bible reference image for the recurring character ${clean(asset.name,80)}. Stable identity specification: ${clean(asset.description,1400)}. Show one clear full-body front three-quarter view plus a readable head-and-shoulders identity view in the same image. Neutral unobtrusive background, even reference lighting, no other people. Facial identity, age, hair, body proportions, distinguishing features and base costume must be unambiguous and reusable in later shots. ${common}`;
  return `Create a definitive visual-bible environment plate for the recurring location ${clean(asset.name,80)}. Stable location specification: ${clean(asset.description,1600)}. Show the architecture, floor layout, entrances, windows, fixed set dressing, materials, palette and spatial relationships clearly in a wide establishing composition. No people and no unrelated place. This exact location must be reusable from different camera positions in later shots. ${common}`
}
function fieldLine(label,value,max=500){const text=clean(value,max);return text?`${label}: ${text}.`:""}
function buildShotPrompt(project,scene,shot,location,characters){
  const d=shot||{},characterNames=characters.map(x=>clean(x.name,80)).join(", ")||"none";
  return [
    "Create exactly one cinematic storyboard frame, not a contact sheet.",
    `Project: ${clean(project.name,120)}. Global visual language: ${projectStyle(project)}.`,
    `CONTINUITY IS THE HIGHEST PRIORITY. The first reference image is the locked location ${clean(location.name,80)}. Reproduce that same place, architecture, materials and fixed objects; do not invent, substitute or move the scene to another location. Location specification: ${clean(location.description,1400)}.`,
    characters.length?`The remaining reference images are the locked recurring characters, in this order: ${characterNames}. Preserve each character's facial identity, age, hair, body proportions and distinguishing features exactly. Only change pose, expression and explicitly requested costume details.`:"This shot contains no locked recurring-character reference.",
    fieldLine("Scene",`${clean(scene?.title,160)} — ${clean(scene?.description,700)}`),
    fieldLine("Shot summary",d.summary),fieldLine("Main subject",d.subject),fieldLine("Visual action",d.description),fieldLine("Performance and emotion",d.performance),fieldLine("Subject movement",d.subjectMovement),fieldLine("Intentional costume details",d.costume),
    fieldLine("Shot size",d.shotSize,120),fieldLine("Camera angle",d.angle,120),fieldLine("Camera height",d.cameraHeight,120),fieldLine("Lens",d.lens,80),fieldLine("Depth of field",d.focus,120),fieldLine("Camera movement implication",d.movement,120),fieldLine("Composition",d.composition,160),fieldLine("Start to end frame",d.startEnd,300),
    fieldLine("Time of day",d.timeOfDay,80),fieldLine("Shot-specific details inside the locked location",d.location,400),fieldLine("Light source",d.lightSource,120),fieldLine("Light direction",d.lightDirection,120),fieldLine("Light quality",d.lightQuality,120),fieldLine("Lighting notes",d.lighting,500),fieldLine("Props and set elements",d.props,500),fieldLine("Important notes",d.notes,500),
    "Respect the requested aspect ratio. Keep all important action inside frame. No captions, speech balloons, UI, written labels, watermarks, signatures, split panels or extra frames."
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
      const rows=await restRows(env,auth.token,table,`id=eq.${encodeURIComponent(payload.asset_id)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,name,description,locked`),asset=rows[0];if(!asset)return json({error:"Visual Bible item not found or access denied."},404);if(asset.locked)return json({error:"Unlock this reference before regenerating it."},409);prompt=buildReferencePrompt(type,project,asset);dimensions=type==="character"?{width:768,height:1024}:{width:1024,height:768}
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
