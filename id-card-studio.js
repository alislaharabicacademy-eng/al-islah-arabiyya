import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isProfilePhoto} from './profile-photo.js';
import {
  normalizedCardSettings,cardDocumentId,validVerificationCode,newVerificationCode,
  teacherDisplayId,isCurrentCard,renderCardCanvas,createIdCardPdf,safeCardFilename
} from './id-card-utils.js';
const $=id=>document.getElementById(id);
const OWNER='alislaharabicacademy@gmail.com';
const today=()=>new Date().toISOString().slice(0,10);
function plusOneYear(value=today()){
 const parts=value.split('-').map(Number);const date=new Date(Date.UTC(parts[0]+1,parts[1]-1,parts[2]));
 return date.toISOString().slice(0,10);
}
const pairs=[
 ['studentTheme','studentTheme'],['teacherTheme','teacherTheme'],['academicYear','academicYear'],
 ...['showDob','showGuardian','showEmergencyPhone','showBloodGroup','showAddress'].map(x=>[x,x])
];
let auth=null,db=null,ready=false,people={student:[],teacher:[]};
let settings=normalizedCardSettings(),institute='Madrasa Al Islahul Arabiya';
let draft=null,currentIdCard=null,changed=0;
const status=(id,msg)=>{$(id).textContent=msg};
function selected(){
 const kind=$('cardKind').value,id=$('cardHolder').value;
 return {kind,id,item:people[kind].find(p=>p.id===id)||null};
}
function formSettings(){
 const data={};
 for(const [key,input] of pairs)data[key]=['showDob','showGuardian','showEmergencyPhone','showBloodGroup','showAddress'].includes(key)?$(input).checked:$(input).value.trim();
 return normalizedCardSettings(data);
}
function writeSettings(value){
 for(const [key,input] of pairs)$(input).type==='checkbox'?$(input).checked=!!value[key]:$(input).value=String(value[key]||'');
}
async function approved(user){
 if(!user?.email||!user.emailVerified)return false;
 const email=user.email.trim().toLowerCase();
 if(email===OWNER)return true;
 try{const grant=await getDoc(doc(db,'adminAccess',email));return grant.exists()&&grant.data().enabled===true}
 catch(error){return false}
}
async function loadSettings(){
 try{
  const [idSnap,siteSnap]=await Promise.all([
   getDoc(doc(db,'idCardSettings','current')),
   getDoc(doc(db,'siteSettings','public'))
  ]);
  settings=normalizedCardSettings(idSnap.exists()?idSnap.data():{});
  if(siteSnap.exists()&&typeof siteSnap.data().instituteName==='string')institute=siteSnap.data().instituteName.slice(0,88);
  if(!idSnap.exists()&&siteSnap.exists()&&siteSnap.data().academicYear)
   settings.academicYear=String(siteSnap.data().academicYear).slice(0,24);
  writeSettings(settings);
  status('settingsStatus','Card settings loaded. Changes are not published until saved.');
 }catch(error){status('settingsStatus','Cannot load saved settings. Please review Firebase administrator access.')}
}
async function loadPeople(){
 if(!ready)return;
 status('cardStatus','Loading existing Academy student and teacher records…');
 const [students,teachers]=await Promise.all([
  getDocs(collection(db,'students')),
  getDocs(collection(db,'teachers'))
 ]);
 people.student=students.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
 people.teacher=teachers.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
 refreshChoices();
 status('cardStatus','Loaded '+people.student.length+' students and '+people.teacher.length+' teachers. Choose a person to preview.');
}
function refreshChoices(){
 const kind=$('cardKind').value;
 const select=$('cardHolder'),before=select.value;
 select.replaceChildren(new Option('Select '+(kind==='teacher'?'Teacher':'Student'),''));
 for(const p of people[kind]){
  const label=String(p.name||'Unnamed')+' · '+(kind==='student'?String(p.studentCode||'ALIA pending'):String(p.subject||'Teacher').slice(0,42));
  select.add(new Option(label,p.id));
 }
 if(people[kind].some(x=>x.id===before))select.value=before;
}
async function buildCard(kind,record,id,issued=null){
 if(!record?.name?.trim())throw Error('Add a student or teacher name first.');
 const name=String(record.name).trim().slice(0,120);
 let displayId='';
 if(kind==='student'){
  displayId=String(record.studentCode||'').trim().toUpperCase();
  if(!/^ALIA[0-9]{5}$/.test(displayId))throw Error('This student has no valid ALIA ID yet. Save the Student record first.');
 }else{
  displayId=String(record.teacherCode||record.staffId||issued?.displayId||await teacherDisplayId(id)).trim().slice(0,48);
 }
 const subject=Array.isArray(record.subjects)?record.subjects.join(', '):String(record.subject||record.subjects||'');
 const validUntil=$('cardValidUntil').value||$('defaultValidity').value||plusOneYear();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)||validUntil<today())
  throw Error('Choose a valid expiry date (today or later).');
 return {
  kind,holderId:id,displayId,name,
  course:String(kind==='student'?record.course||'Islamic Studies':subject||'Islamic Studies').slice(0,120),
  subject:subject.slice(0,120),
  batch:String(record.batch||'').slice(0,60),
  guardian:String(record.guardian||record.fatherName||record.father||'').slice(0,100),
  dob:String(record.dob||'').slice(0,20),
  emergencyPhone:String(record.guardianPhone||record.phone||record.mobile||'').slice(0,35),
  bloodGroup:String(record.bloodGroup||'').slice(0,20),
  address:String(record.address||'').slice(0,200),
  photoData:isProfilePhoto(record.photoData)?record.photoData:'',
  instituteName:institute,
  institution:institute,
  issueDate:issued?.issueDate||today(),validUntil,
  verificationCode:issued?.verificationCode||'',status:issued?.status||'draft',
  published:issued?.published===true
 };
}
async function existingCard(kind,id){
 const snap=await getDoc(doc(db,'idCards',cardDocumentId(kind,id)));
 return snap.exists()?snap.data():null;
}
async function draw(card,draftFlag){
 const current=++changed;
 const settingsNow=formSettings();
 const [front,back]=await Promise.all([
  renderCardCanvas(card,'front',{settings:settingsNow,draft:draftFlag}),
  renderCardCanvas(card,'back',{settings:settingsNow,draft:draftFlag})
 ]);
 if(current!==changed)return;
 for(const [source,dest] of [[front,'previewFront'],[back,'previewBack']]){
  const output=$(dest);output.width=source.width;output.height=source.height;
  output.getContext('2d').drawImage(source,0,0);
 }
}
async function previewSelected(){
 if(!ready)return;
 const {kind,id,item}=selected();
 if(!item){status('cardStatus','Select a Student or Teacher first.');return}
 try{
  status('cardStatus','Preparing front and back preview…');
  const saved=await existingCard(kind,id);
  const base=await buildCard(kind,item,id,saved);
  const issued=!!saved&&saved.published===true&&saved.status==='active';
  draft=base;currentIdCard=issued?saved:null;
  await draw(base,!issued);
  status('cardStatus',issued?
   '✓ Issued card '+saved.displayId+' · Current status: '+saved.status+
    ' · Valid until '+saved.validUntil+'. Reissue to refresh official fields or generate a new QR.':
   'DRAFT PREVIEW ONLY. No official ID is issued until you click Issue / Publish ID Card.');
 }catch(error){status('cardStatus','Preview error: '+error.message)}
}
async function issueOne(kind,record,{reissue=false,validUntil=null}={}){
 const id=record.id,key=cardDocumentId(kind,id),ref=doc(db,'idCards',key);
 const saved=await getDoc(ref);
 const previous=saved.exists()?saved.data():null;
 if(previous?.status==='active'&&!reissue)return {status:'exists',card:previous};
 const draft=await buildCard(kind,record,id,previous);
 if(validUntil)draft.validUntil=validUntil;
 const code=newVerificationCode();
 const card={
  ...draft,verificationCode:code,status:'active',published:true,
  issueDate:today(),validUntil:draft.validUntil,
  createdAt:previous?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()
 };
 const publicDoc={
  published:true,status:'active',kind,
  holderName:card.name,displayId:card.displayId,validUntil:card.validUntil
 };
 const batch=writeBatch(db);
 if(previous&&validVerificationCode(previous.verificationCode)){
  // A replaced or formerly revoked QR must never become valid again.
  batch.update(doc(db,'idCardPublic',previous.verificationCode),{status:'revoked'});
 }
 batch.set(ref,card);
 batch.set(doc(db,'idCardPublic',code),publicDoc);
 await batch.commit();
 return {status:'issued',card};
}
async function issueSelected(forceReissue=false){
 if(!ready)return;
 const {kind,item,id}=selected();
 if(!item)return status('cardStatus','Choose a student or teacher.');
 if(forceReissue&&!confirm('Reissue this card? The old QR code will be permanently revoked.'))return;
 if(!forceReissue&&!confirm('Publish an official ID card for '+String(item.name||'this person')+'?'))return;
 const btn=forceReissue?$('reissueCard'):$('issueCard');btn.disabled=true;
 try{
  const result=await issueOne(kind,item,{reissue:forceReissue});
  if(result.status==='exists'){
   status('cardStatus','An active card is already issued. Use Reissue to replace it after reviewing details.');
  }else{
   currentIdCard=result.card;
   await draw(result.card,false);
   status('cardStatus','✅ Official '+(kind==='student'?'Student':'Teacher')+' ID published! ID: '+
      result.card.displayId+' · QR verification is now active. Download the PVC PDF.');
  }
 }catch(error){status('cardStatus','Issuance failed: '+error.message)}
 finally{btn.disabled=false}
}
async function revokeSelected(){
 if(!ready)return;
 const {kind,id,item}=selected();if(!item)return status('cardStatus','Choose a card to revoke.');
 if(!confirm('Revoke '+String(item.name||'this person')+' ID card? QR verification will show REVOKED and personal downloads will stop.'))return;
 $('revokeCard').disabled=true;
 try{
  const key=cardDocumentId(kind,id),ref=doc(db,'idCards',key);
  const saved=await getDoc(ref);
  if(!saved.exists()||saved.data().status!=='active')throw Error('No active card to revoke.');
  const code=saved.data().verificationCode;
  if(!validVerificationCode(code))throw Error('Invalid verification token; cannot revoke safely.');
  const batch=writeBatch(db);
  batch.update(ref,{status:'revoked',updatedAt:serverTimestamp()});
  batch.update(doc(db,'idCardPublic',code),{status:'revoked'});
  await batch.commit();
  currentIdCard=null;draft={...saved.data(),status:'revoked'};
  await draw(draft,true);
  status('cardStatus','⛔ ID Card revoked. Old QR scans will show REVOKED. Reissue for a new, active code.');
 }catch(error){status('cardStatus','Revocation failed: '+error.message)}
 finally{$('revokeCard').disabled=false}
}
async function downloadSingle(){
 if(!ready)return;
 const {kind,id}=selected();if(!id)return status('cardStatus','Choose a person first.');
 $('downloadPvc').disabled=true;
 try{
  const card=await existingCard(kind,id);
  if(!isCurrentCard(card))throw Error('No currently valid issued card. Issue or reissue first.');
  status('cardStatus','Creating double-sided PVC print PDF…');
  const pdf=await createIdCardPdf([card],{layout:'pvc',settings:formSettings()});
  pdf.save('ALIA_'+safeCardFilename(card.displayId)+'_ID_Card.pdf');
  status('cardStatus','✓ Exact-size double-sided PVC PDF prepared. Print at 100% scale (85.6 × 54 mm).');
 }catch(error){status('cardStatus','PDF download failed: '+error.message)}
 finally{$('downloadPvc').disabled=false}
}
async function bulkIssue(){
 if(!ready)return;
 const kind=$('cardKind').value;
 const selectedPeople=people[kind].slice(0,80);
 if(!selectedPeople.length)return status('bulkStatus','No profiles to process.');
 if(!confirm('Issue missing '+kind+' ID cards for up to '+selectedPeople.length+
    ' people? This will publish verifiable IDs. Review the records and expiry first.'))return;
 const btn=$('issueBulk');btn.disabled=true;
 let issued=0,skipped=0,errors=[];
 try{
  for(let i=0;i<selectedPeople.length;i++){
   const person=selectedPeople[i];
   status('bulkStatus','Issuing '+(i+1)+' of '+selectedPeople.length+' · '+person.name+
    ' · Published '+issued+' · Skipped '+skipped);
   try{
    const result=await issueOne(kind,person);
    if(result.status==='issued')issued++;else skipped++;
   }catch(error){errors.push(person.name+': '+error.message)}
  }
  status('bulkStatus','✅ Batch complete. Published '+issued+', already issued '+skipped+
    ', failed '+errors.length+(errors.length?'\n'+errors.slice(0,8).join('\n'):'')+
    (people[kind].length>80?'\nFirst 80 processed. Filter and issue remaining cards individually.':''));
 }finally{btn.disabled=false}
}
async function bulkPrint(){
 if(!ready)return;
 const btn=$('printBulk');btn.disabled=true;
 try{
  const kind=$('cardKind').value;
  status('bulkStatus','Loading active issued cards…');
  const snap=await getDocs(collection(db,'idCards'));
  const list=snap.docs.map(d=>d.data()).filter(card=>card.kind===kind&&isCurrentCard(card)).slice(0,80);
  if(!list.length)throw Error('No active cards in this category. Issue cards first.');
  if(!confirm('Prepare '+list.length+' active '+kind+' ID cards in front/back A4 sheets for duplex printing?'))return;
  const pdf=await createIdCardPdf(list,{layout:'a4',settings:formSettings(),
   onProgress:pct=>status('bulkStatus','Rendering '+list.length+' cards: '+pct+'%')});
  pdf.save('ALIA_'+kind+'_Bulk_ID_Cards_A4.pdf');
  status('bulkStatus','✓ '+list.length+' '+kind+' ID cards included. Print A4 at 100% scale, DOUBLE-SIDED, flip on LONG edge. Review a paper proof first.');
 }catch(error){status('bulkStatus','Bulk PDF failed: '+error.message)}
 finally{btn.disabled=false}
}
$('signIn').onclick=async()=>{
 $('signIn').disabled=true;
 try{
  if(auth.currentUser)await signOut(auth);
  await signInWithPopup(auth,new GoogleAuthProvider());
 }catch(error){status('loginStatus','Google login failed. Choose your authorized, verified Academy account.')}
 finally{$('signIn').disabled=false}
};
$('signOut').onclick=()=>signOut(auth);
$('cardKind').onchange=()=>{currentIdCard=null;draft=null;refreshChoices();status('cardStatus','Select a record to preview a card.')};
$('cardHolder').onchange=()=>{currentIdCard=null;draft=null;previewSelected()};
$('cardValidUntil').onchange=()=>{if(selected().id)previewSelected()};
$('previewCard').onclick=previewSelected;
$('issueCard').onclick=()=>issueSelected(false);
$('reissueCard').onclick=()=>issueSelected(true);
$('revokeCard').onclick=revokeSelected;
$('downloadPvc').onclick=downloadSingle;
$('issueBulk').onclick=bulkIssue;
$('printBulk').onclick=bulkPrint;
$('reloadPeople').onclick=()=>loadPeople().catch(error=>status('bulkStatus',error.message));
$('saveSettings').onclick=async()=>{
 if(!ready)return;
 const btn=$('saveSettings');btn.disabled=true;
 try{
  const updated=formSettings();
  await setDoc(doc(db,'idCardSettings','current'),{...updated,updatedAt:serverTimestamp()});
  settings=updated;
  status('settingsStatus','✓ ID card themes and printed-field settings saved privately.');
  if(selected().id)await previewSelected();
 }catch(error){status('settingsStatus','Unable to save settings: '+error.message)}
 finally{btn.disabled=false}
};
for(const [key,input] of pairs){
 const field=$(input);
 field.addEventListener('change',()=>{if(selected().id)previewSelected()});
}
try{
 const config=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>r.json());
 const app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);
 $('defaultValidity').value=plusOneYear();
 $('cardValidUntil').value=plusOneYear();
 onAuthStateChanged(auth,async user=>{
  ready=false;
  $('studio').hidden=true;$('loginPanel').hidden=false;
  if(!user){status('loginStatus','Choose an Academy administrator Google account.');return}
  if(!await approved(user)){status('loginStatus','Access denied. Only a verified Academy administrator can issue identity cards.');return}
  ready=true;$('studio').hidden=false;$('loginPanel').hidden=true;
  status('loginStatus','Administrator verified.');
  try{await Promise.all([loadSettings(),loadPeople()])}
  catch(error){status('cardStatus','Could not load Academy records: '+error.message)}
 });
}catch(error){status('loginStatus','Firebase could not start: '+error.message)}
