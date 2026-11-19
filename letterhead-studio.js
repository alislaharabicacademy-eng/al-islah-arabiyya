/* Academy Official Letterhead Studio.
 * Only verified Academy admins can enter. Nothing is written to Firestore:
 * unsent letter text remains solely in the browser tab.
 * Principal signature is the exact published image from Website Settings.
 */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {loadSiteSettings} from './site-settings.js';
import {isVerifiedMasterAdmin} from './admin-role-status.js';

const $=id=>document.getElementById(id);
const fields=['letterDate','letterRef','letterTo','letterSubject','letterGreeting','letterBody','letterClosing'];
const form=Object.fromEntries(fields.map(id=>[id,$(id)]));
const defaults={letterRef:'',letterTo:'',letterSubject:'',letterGreeting:'Assalamu Alaikum wa Rahmatullahi wa Barakatuh,',letterBody:'',letterClosing:'JazakAllahu Khairan.'};
let isAuthorized=false;
let hasSignature=false;
let settings=null;

const todayInIndia=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
form.letterDate.value=todayInIndia();
const val=id=>form[id].value.trim();
function displayDate(dateValue){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateValue))return '[Enter date]';
 const parsed=new Date(dateValue+'T12:00:00');
 return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(parsed):'[Enter date]';
}
function text(id,value){$(id).textContent=value;}
function refresh(){
 text('pvDate',displayDate(val('letterDate')));
 $('refRow').hidden=!val('letterRef');
 text('pvRef',val('letterRef'));
 $('pvTo').hidden=!val('letterTo');
 text('pvTo',val('letterTo')?'To,\n'+val('letterTo'):'');
 text('pvSubject',val('letterSubject')||'[Enter subject]');
 text('pvGreeting',val('letterGreeting'));
 $('pvGreeting').hidden=!val('letterGreeting');
 text('pvBody',val('letterBody')||'Your letter content will appear here.');
 $('pvBody').classList.toggle('empty',!val('letterBody'));
 text('pvClosing',val('letterClosing'));
 $('pvClosing').hidden=!val('letterClosing');
 const ready=isAuthorized&&hasSignature&&!!settings?.principal?.name&&!!val('letterDate')&&!!val('letterSubject')&&!!val('letterBody');
 $('printLetter').disabled=!ready;
 if(!hasSignature)text('status','Upload the principal’s PNG/JPG signature under Admin → Website Settings & Principal before printing.');
 else if(!settings?.principal?.name)text('status','Add the principal’s name under Website Settings before printing.');
 else if(!val('letterSubject')||!val('letterBody')||!val('letterDate'))text('status','Enter the date, subject and letter content to enable the signed PDF.');
 else if(val('letterBody').length>2200)text('status','Long letter: print preview may continue onto a second A4 page. Check before saving.');
 else text('status','✓ Ready. Click Print / Save Signed PDF; choose “Save as PDF” in the browser.');
}
function useSettings(s){
 settings=s;
 text('brandName',s.instituteName);
 text('brandSubtitle',s.instituteSubtitle);
 text('brandContact',[s.phone,s.email].filter(Boolean).join('   •   '));
 text('footerName',s.instituteName);
 text('pvPrincipal',s.principal?.name||'Principal name not set');
 text('pvRole',s.principal?.designation||'Principal');
 const signature=s.principal?.signatureData||'';
 hasSignature=/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(signature);
 const img=$('pvSignature');
 img.hidden=!hasSignature;
 $('signatureMissing').hidden=hasSignature;
 if(hasSignature)img.src=signature;
 else img.removeAttribute('src');
 refresh();
}
for(const id of fields)form[id].addEventListener('input',refresh);
$('sampleLetter').addEventListener('click',()=>{
 form.letterTo.value='Parents and Guardians';
 form.letterSubject.value='Notice Regarding the Monthly Parent Meeting';
 form.letterBody.value='We are pleased to inform you that our Academy will conduct its monthly parent meeting to review students’ learning progress and discuss upcoming academic activities.\n\nAll parents and guardians are kindly requested to attend. The meeting schedule and joining details will be shared through the official class group.\n\nThank you for your continued cooperation and support.';
 form.letterRef.value='';
 refresh();
});
$('clearLetter').addEventListener('click',()=>{
 for(const [id,v] of Object.entries(defaults))form[id].value=v;
 form.letterDate.value=todayInIndia();refresh();
});
async function waitForImage(image){
 if(!image||image.hidden)return;
 if(typeof image.decode==='function')await image.decode();
 else if(!image.complete)await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});
}
$('printLetter').addEventListener('click',async()=>{
 refresh();
 if($('printLetter').disabled)return;
 $('printLetter').disabled=true;
 try{
  await Promise.all([waitForImage($('pvSignature')),waitForImage(document.querySelector('.masthead img'))]);
  const previousTitle=document.title;
  document.title='Official Letter - '+val('letterSubject').slice(0,65).replace(/[\\/:*?"<>|]/g,'');
  window.print();
  setTimeout(()=>{document.title=previousTitle;refresh();},1000);
 }catch(error){
  text('status','Cannot prepare logo or signature for printing. Reload Website Settings or try again.');
  $('printLetter').disabled=false;
 }
});
async function permittedAdmin(db,user){
 if(!user?.email||!user.emailVerified)return false;
 const address=user.email.toLowerCase().trim();
 if(address==='alislaharabicacademy@gmail.com')return true;
 if(await isVerifiedMasterAdmin(db,user))return true;
 try{
  const grant=await getDoc(doc(db,'adminAccess',address));
  return grant.exists()&&grant.data().enabled===true;
 }catch{return false;}
}
function showGate(message){
 $('gate').hidden=false;$('workspace').hidden=true;$('notice').hidden=true;
 $('gate').querySelector('h2').textContent=message;
}
async function start(){
 try{
  const response=await fetch('./firebase-config.json',{cache:'no-store'});
  if(!response.ok)throw Error('Firebase config unavailable');
  const config=await response.json();
  const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(config);
  const auth=getAuth(app),db=getFirestore(app);
  onAuthStateChanged(auth,async user=>{
   isAuthorized=false;
   $('workspace').hidden=true;
   if(!user){showGate('Administrator sign-in required');return;}
   if(!await permittedAdmin(db,user)){showGate('This account does not have administrator access');return;}
   isAuthorized=true;
   showGate('Loading Academy letterhead settings…');
   try{
    const s=await loadSiteSettings({fresh:true});
    if(!isAuthorized)return;
    useSettings(s);
    $('gate').hidden=true;$('workspace').hidden=false;$('notice').hidden=false;
   }catch(error){showGate('Could not load Academy Settings. Please retry from Admin Dashboard.');}
  },()=>showGate('Authentication could not be verified'));
 }catch(error){showGate('Cannot connect to the Academy. Check your internet connection.');}
}
refresh();
start();
