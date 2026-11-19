import {doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {SITE_DEFAULTS,normalizeSiteSettings,resetSiteSettingsCache} from './site-settings.js';
import {isVerifiedAcademyAdmin} from './academy-admin-access.js';

const textFields={
 siteInstituteName:'instituteName',siteInstituteSubtitle:'instituteSubtitle',
 siteHeroLine1:'heroLine1',siteHeroLine2:'heroLine2',siteHeroDescription:'heroDescription',
 siteProgrammesHeading:'programmesHeading',siteProgrammesDescription:'programmesDescription',
 siteAboutHeading:'aboutHeading',siteAboutParagraph:'aboutParagraph',
 siteContactHeading:'contactHeading',siteContactDescription:'contactDescription',
 sitePhone:'phone',siteEmail:'email',siteWhatsApp:'whatsapp',siteInstagram:'instagram',
 sitePrincipalName:'name',sitePrincipalDesignation:'designation',
 sitePrincipalQualifications:'qualifications',sitePrincipalMessage:'message'
};
const bounded={instituteName:70,instituteSubtitle:80,heroLine1:80,heroLine2:80,heroDescription:600,
 programmesHeading:110,programmesDescription:500,aboutHeading:110,aboutParagraph:750,
 contactHeading:110,contactDescription:350,phone:30,email:160,whatsapp:20,instagram:220,
 name:100,designation:90,qualifications:250,message:650};
const $=id=>document.getElementById(id);
function previewImage(element,data,label){
 element.replaceChildren();
 if(data){const img=document.createElement('img');img.alt=label;img.src=data;img.loading='lazy';element.append(img)}
 else element.textContent='Not uploaded';
}
async function loadImage(file,kind){
 if(!file||!file.type.match(/^image\/(?:png|jpeg|webp)$/))throw Error('Choose a PNG, JPG or WebP image.');
 if(file.size>3*1024*1024)throw Error('Image must be under 3 MB.');
 const img=await new Promise((resolve,reject)=>{
  const i=new Image(),url=URL.createObjectURL(file);
  i.onload=()=>{URL.revokeObjectURL(url);resolve(i)};
  i.onerror=()=>{URL.revokeObjectURL(url);reject(Error('The uploaded image is damaged or unsupported'))};
  i.src=url;
 });
 if(img.naturalWidth<25||img.naturalHeight<15)throw Error('Image resolution is too small.');
 let max=kind==='signature'?600:380;
 for(let attempt=0;attempt<7;attempt++){
  const ratio=Math.min(1,max/img.naturalWidth,(kind==='signature'?220:480)/img.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const encoded=canvas.toDataURL(kind==='signature'?'image/png':'image/jpeg',.78);
  if(encoded.length<225000)return encoded;
  max=Math.round(max*.78);
 }
 throw Error('Image is too complex. Use a simpler, smaller image (prefer a transparent PNG signature).');
}
export function initSiteSettingsAdmin({db,auth}){
 const form=$('siteSettingsForm');
 if(!form)return {load:async()=>{}};
 const status=$('siteSettingsStatus');
 const state={photoData:'',signatureData:'',oldSignatureData:''};
 const reference=doc(db,'siteSettings','public');
 function say(message,error=false){status.textContent=message;status.classList.toggle('error',error)}
 function fill(data){
  const s=normalizeSiteSettings(data);
  for(const [id,key] of Object.entries(textFields)){
   const val=id.startsWith('sitePrincipal')?s.principal[key]:s[key];
   if($(id))$(id).value=val||'';
  }
  $('siteTheme').value=s.theme;
  $('siteShowPrincipal').checked=s.principal.showOnHome;
  state.photoData=s.principal.photoData;
  state.signatureData=s.principal.signatureData;
  state.oldSignatureData=s.principal.signatureData;
  previewImage($('sitePrincipalPhotoPreview'),state.photoData,'Principal portrait');
  previewImage($('sitePrincipalSignaturePreview'),state.signatureData,'Principal handwritten signature');
  $('sitePrincipalPhotoFile').value='';
  $('sitePrincipalSignatureFile').value='';
  $('siteSignatureAuthorised').checked=false;
 }
 async function load(){
  if(!auth.currentUser||!auth.currentUser.emailVerified)return;
  say('Loading saved website settings…');
  try{
   const saved=await getDoc(reference);
   fill(saved.exists()?saved.data():{});
   say(saved.exists()?'✓ Saved website & principal details loaded.':'No settings saved yet. Current website defaults are ready to customise.');
  }catch(e){say('Cannot read website settings: '+e.message,true)}
 }
 async function attach(id,kind){
  const file=$(id).files?.[0];if(!file)return;
  say('Preparing '+kind+' image…');
  try{
   const data=await loadImage(file,kind);
   state[kind==='signature'?'signatureData':'photoData']=data;
   previewImage($(kind==='signature'?'sitePrincipalSignaturePreview':'sitePrincipalPhotoPreview'),data,'Uploaded '+kind);
   say('✓ '+kind+' image is ready. Click Save & Publish to apply it.');
  }catch(e){$(id).value='';say('Image upload failed: '+e.message,true)}
 }
 $('sitePrincipalPhotoFile').addEventListener('change',()=>attach('sitePrincipalPhotoFile','photo'));
 $('sitePrincipalSignatureFile').addEventListener('change',()=>attach('sitePrincipalSignatureFile','signature'));
 $('sitePrincipalPhotoRemove').addEventListener('click',()=>{
  state.photoData='';$('sitePrincipalPhotoFile').value='';
  previewImage($('sitePrincipalPhotoPreview'),'','Principal portrait');say('Photo removed from the editor. Save & Publish to confirm.');
 });
 $('sitePrincipalSignatureRemove').addEventListener('click',()=>{
  if(state.signatureData&&!confirm('Remove the principal signature from all newly generated documents?'))return;
  state.signatureData='';$('sitePrincipalSignatureFile').value='';
  previewImage($('sitePrincipalSignaturePreview'),'','Principal signature');say('Signature removed from the editor. Save & Publish to confirm.');
 });
 $('siteSettingsReload').addEventListener('click',load);
 $('siteSettingsRestoreText').addEventListener('click',()=>{
  if(!confirm('Restore only the homepage text, theme and contact fields in this editor? Principal details will stay unchanged until Save.'))return;
  for(const [id,key] of Object.entries(textFields)){
   if(id.startsWith('sitePrincipal'))continue;
   $(id).value=SITE_DEFAULTS[key]||'';
  }
  $('siteTheme').value='emerald';say('Default text restored in the editor. Save & Publish to confirm.');
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!await isVerifiedAcademyAdmin(db,auth.currentUser)){
   say('Only the verified Academy admin can save settings.',true);return;
  }
  const values={};
  const principal={photoData:state.photoData,signatureData:state.signatureData,showOnHome:$('siteShowPrincipal').checked};
  for(const [id,key] of Object.entries(textFields)){
   const el=$(id),value=String(el.value||'').trim();
   if(value.length>(bounded[key]||350)){say('Text is too long: '+el.labels?.[0]?.textContent,true);el.focus();return}
   if(id.startsWith('sitePrincipal'))principal[key]=value;else values[key]=value;
  }
  if(!values.instituteName||!values.heroLine1||!values.heroLine2||!values.heroDescription||!values.email){
   say('Please complete the Academy name, homepage headings, description and contact email.',true);return;
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)){say('Enter a valid academy email address.',true);return}
  if(!/^\+?[0-9 ()-]{7,30}$/.test(values.phone)){say('Enter a valid phone number.',true);return}
  values.whatsapp=values.whatsapp.replace(/\D/g,'');
  if(!/^\d{9,15}$/.test(values.whatsapp)){say('WhatsApp number must contain 9–15 digits including country code.',true);return}
  if(values.instagram&&!/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.-]+\/?$/.test(values.instagram)){
   say('Use a valid https://www.instagram.com/username/ profile link.',true);return;
  }
  if(principal.showOnHome&&!principal.name){say('Enter the principal’s name before showing the profile publicly.',true);return}
  if(principal.signatureData&&!principal.name){say('Enter the principal’s name before publishing a signature.',true);return}
  if(principal.signatureData&&!$('siteSignatureAuthorised').checked){say('Confirm that this is the authorised principal’s own signature.',true);return}
  if(principal.signatureData!==state.oldSignatureData&&principal.signatureData){
   if(!confirm('Publish the uploaded principal signature? It will appear on future official certificates and principal-signature fields in PDFs. This published image can be viewed by PDF recipients.'))return;
  }
  values.theme=$('siteTheme').value;
  values.principal=principal;
  values.updatedAt=serverTimestamp();
  values.updatedBy=auth.currentUser.email;
  const button=$('siteSettingsSave');button.disabled=true;say('Publishing new website settings…');
  try{
   await setDoc(reference,values,{merge:true});
   state.oldSignatureData=state.signatureData;
   resetSiteSettingsCache();
   say('✓ Published successfully! Refresh the homepage or create a new PDF to see the changes. Existing downloaded PDFs do not change.');
  }catch(e){say('Publish failed: '+e.message+'. Check Firestore rules deployment.',true)}
  finally{button.disabled=false}
 });
 return {load};
}
