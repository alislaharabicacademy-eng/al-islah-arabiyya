/* One published, admin-owned source for Academy appearance and authorised signatory.
   siteSettings/public is intentionally readable for homepage and downloaded public PDFs.
   Never store passwords, student data or other private information in this document. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

export const SITE_DEFAULTS=Object.freeze({
 instituteName:'Madrasa Al Islahul Arabiya',
 instituteSubtitle:'WOMEN’S ONLINE MADRASA',
 heroLine1:'Nurturing Faith.',
 heroLine2:'Inspiring Knowledge.',
 heroDescription:"Welcome to Madrasa Al Islahul Arabiya — a dedicated Women's Online Madrasa creating a welcoming space to grow in Islamic knowledge, character, and connection to the Qur'an.",
 programmesHeading:'Islamic Learning, From Wherever You Are',
 programmesDescription:'Structured online Islamic education for women, taught by female teachers. Learn from home in a supportive environment.',
 aboutHeading:'A Place to Learn with Purpose',
 aboutParagraph:"Madrasa Al Islahul Arabiya is a Women's Online Madrasa with a focus on Islamic education. Our website is designed to make it easier for prospective learners to discover the institute and express interest in joining.",
 contactHeading:'Begin Your Learning Journey',
 contactDescription:'',
 email:'alislaharabicacademy@gmail.com',
 phone:'+91 78453 60505',
 whatsapp:'917845360505',
 instagram:'https://www.instagram.com/al_islahul_arabiyya24/',
 theme:'emerald',
 principal:{name:'',designation:'Principal',qualifications:'',message:'',photoData:'',signatureData:'',showOnHome:false}
});
let sharedPromise=null;
export function normalizeSiteSettings(data){
 const d=data&&typeof data==='object'?data:{};
 const p=d.principal&&typeof d.principal==='object'?d.principal:{};
 const result={...SITE_DEFAULTS};
 for(const k of Object.keys(SITE_DEFAULTS)){
  if(k==='principal')continue;
  if(typeof d[k]==='string'&&d[k].trim())result[k]=d[k].trim();
 }
 result.theme=['emerald','sapphire','plum'].includes(d.theme)?d.theme:'emerald';
 result.principal={...SITE_DEFAULTS.principal};
 for(const k of ['name','designation','qualifications','message']){
  if(typeof p[k]==='string')result.principal[k]=p[k].trim();
 }
 for(const k of ['photoData','signatureData']){
  if(typeof p[k]==='string'&&/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p[k])&&p[k].length<270000)result.principal[k]=p[k];
 }
 result.principal.showOnHome=p.showOnHome===true;
 return result;
}
async function settingsDb(){
 const config=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>{
  if(!r.ok)throw Error('Firebase configuration unavailable');return r.json();
 });
 if(!config?.projectId||!config?.apiKey)throw Error('Firebase configuration not complete');
 const app=getApps().find(x=>x.name==='academy-site-settings')||initializeApp(config,'academy-site-settings');
 return getFirestore(app);
}
export async function loadSiteSettings({fresh=false}={}){
 if(!sharedPromise||fresh){
  sharedPromise=(async()=>{
   const db=await settingsDb();
   const snap=await getDoc(doc(db,'siteSettings','public'));
   return normalizeSiteSettings(snap.exists()?snap.data():{});
  })().catch(e=>{sharedPromise=null;throw e});
 }
 return sharedPromise;
}
export function resetSiteSettingsCache(){sharedPromise=null}
/* Print the principal's exact uploaded, PNG signature. Never simulate a signature. */
export async function stampPrincipalOnPdf(pdf,{centerX,lineY,maxWidth=51,maxHeight=17}={}){
 const data=(await loadSiteSettings({fresh:true})).principal.signatureData;
 if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data))return false;
 const img=new Image();
 img.src=data;
 await new Promise((resolve,reject)=>{if(img.complete){img.naturalWidth?resolve():reject(Error('Invalid principal signature'));return}img.onload=resolve;img.onerror=()=>reject(Error('Cannot load principal signature'))});
 const factor=Math.min(maxWidth/img.naturalWidth,maxHeight/img.naturalHeight);
 const w=img.naturalWidth*factor,h=img.naturalHeight*factor;
 pdf.addImage(data,'PNG',centerX-w/2,lineY-h-1,w,h);
 return true;
}
