/* A small, intentionally public, opt-in homepage top-achievers feature.
   Private student records and examination marks NEVER enter this public document.
   Parents/guardians must authorise displaying each name and image. */
import {doc,getDoc,getDocs,collection,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {compressProfilePhoto,isProfilePhoto} from './profile-photo.js';

const ROLES=[1,2,3];
const roleName=n=>({1:'First Place',2:'Second Place',3:'Third Place'})[n];
const $=id=>document.getElementById(id);
const validResult=id=>/^RESULT-[a-f0-9]{24}$/.test(id);
const profile=data=>isProfilePhoto(data)?data:'';
const blank=()=>({rank:1,resultId:'',consent:false,photoOverride:''});
const privateRef=db=>doc(db,'homepageWinnersAdmin','current');
const publicRef=db=>doc(db,'homepageWinners','current');
const initial=()=>({visible:false,title:'Our Top Achievers',subtitle:'Celebrating excellence in Islamic learning',picks:[]});
function cleanPicks(picks){
 if(!Array.isArray(picks))return [];
 const usedRanks=new Set(),usedResults=new Set(),out=[];
 for(const p of picks){
  const rank=Number(p?.rank),resultId=String(p?.resultId||'');
  if(!ROLES.includes(rank)||!validResult(resultId)||usedRanks.has(rank)||usedResults.has(resultId))continue;
  usedRanks.add(rank);usedResults.add(resultId);
  out.push({rank,resultId,consent:p?.consent===true,photoOverride:profile(p?.photoOverride||'')});
 }
 return out.sort((a,b)=>a.rank-b.rank);
}
function sanitize(state){
 return {
  visible:state?.visible===true,
  title:String(state?.title||'Our Top Achievers').trim().slice(0,90),
  subtitle:String(state?.subtitle||'Celebrating excellence in Islamic learning').trim().slice(0,160),
  picks:cleanPicks(state?.picks)
 };
}
export function initHomepageWinners({db}){
 const status=$('homepageWinnersStatus');
 const rows=new Map();
 let students=[],results=[],state=initial(),dirty=false;
 const say=(message,error=false)=>{if(status){status.textContent=message;status.classList.toggle('error',error)}};
 function studentFor(record){return students.find(x=>x.id===record?.studentId)}
 function photoFor(record,pick){
  return profile(pick?.photoOverride)||profile(studentFor(record)?.photoData);
 }
 function resultFor(id){return results.find(r=>r.id===id&&r.published===true)}
 function updateRow(rank){
  const ui=rows.get(rank),record=resultFor(ui.select.value);
  const choice=photoFor(record,ui.pick);
  ui.photo.replaceChildren();
  if(choice){const img=document.createElement('img');img.src=choice;img.alt='Selected achiever photo preview';ui.photo.append(img)}
  else ui.photo.textContent=record?'No student photo. Add a photo in Student Details or upload it here.':'Select a published result.';
  ui.meta.textContent=record?[record.examTitle,record.course,record.academicYear].filter(Boolean).join(' · '):'Not selected';
 }
 function render(){
  $('homepageWinnersVisible').checked=state.visible;
  $('homepageWinnersTitle').value=state.title;
  $('homepageWinnersSubtitle').value=state.subtitle;
  rows.forEach((ui,rank)=>{
   const pick=state.picks.find(x=>x.rank===rank)||{rank,resultId:'',consent:false,photoOverride:''};
   ui.pick={...pick};
   ui.select.replaceChildren(new Option('— Do not display this position —',''));
   results.filter(r=>r.published).sort((a,b)=>String(a.studentName||'').localeCompare(String(b.studentName||''))).forEach(r=>
     ui.select.add(new Option(r.studentName+' — '+r.examTitle+' ('+r.academicYear+')',r.id))
   );
   ui.select.value=pick.resultId;
   if(ui.select.value!==pick.resultId)ui.select.value='';
   ui.consent.checked=pick.consent===true;
   ui.file.value='';
   updateRow(rank);
  });
  dirty=false;
  say(state.visible?'✓ Homepage winners are enabled. Review and Save to make changes.':'Homepage winners are hidden. Your private selections can be saved without showing them.');
 }
 function readForm(){
  const obj={visible:$('homepageWinnersVisible').checked,
   title:$('homepageWinnersTitle').value.trim(),
   subtitle:$('homepageWinnersSubtitle').value.trim(),picks:[]};
  if(!obj.title||obj.title.length>90||obj.subtitle.length>160)throw Error('Enter a heading (up to 90 characters) and optional subtitle (up to 160 characters).');
  for(const [rank,ui] of rows){
   const resultId=ui.select.value;
   if(resultId)obj.picks.push({rank,resultId,consent:ui.consent.checked,photoOverride:ui.pick.photoOverride||''});
  }
  const rawCount=obj.picks.length;
  const uniqueResults=new Set(obj.picks.map(p=>p.resultId));
  if(rawCount!==uniqueResults.size)throw Error('A student result cannot occupy two positions. Choose a different student or clear one rank.');
  obj.picks=cleanPicks(obj.picks);
  return obj;
 }
 async function entriesFor(config,{pending=null}={}){
  if(!config.visible)return [];
  if(!config.picks.length)throw Error('Select at least one position before enabling the homepage winners.');
  const out=[],usedStudents=new Set();
  let commonExam='';
  for(const pick of config.picks){
   if(!pick.consent)throw Error(roleName(pick.rank)+': confirm student/guardian public-photo consent.');
   const snap=pick.resultId===pending?.id?null:await getDoc(doc(db,'examResults',pick.resultId));
   const result=pick.resultId===pending?.id?pending.record:snap?.exists()?{id:snap.id,...snap.data()}:null;
   if(!result?.published)throw Error(roleName(pick.rank)+': its examination result is not published.');
   const st=pick.resultId===pending?.id?pending.student:
       students.find(x=>x.id===result.studentId)||(await getDoc(doc(db,'students',result.studentId))).data();
   if(!st)throw Error(roleName(pick.rank)+': student record not found.');
   if(usedStudents.has(result.studentId))throw Error('One student cannot hold more than one rank in the same top-achievers display.');
   usedStudents.add(result.studentId);
   const photoData=profile(pick.photoOverride)||profile(st.photoData);
   if(!photoData)throw Error(roleName(pick.rank)+': a student photo is required. Upload one here or in Student Details.');
   const examKey=[String(result.examTitle||'').trim().toLowerCase(),String(result.academicYear||'').trim().toLowerCase(),String(result.course||'').trim().toLowerCase()].join('|');
   if(!commonExam)commonExam=examKey;
   else if(examKey!==commonExam)throw Error('All displayed winners must come from the same examination, academic year and course.');
   out.push({rank:pick.rank,label:roleName(pick.rank),
     name:String(result.studentName||st.name||'Student').slice(0,120),
     photoData,examTitle:String(result.examTitle||'').slice(0,120),
     course:String(result.course||'').slice(0,120),
     academicYear:String(result.academicYear||'').slice(0,30)});
  }
  return out.sort((a,b)=>a.rank-b.rank);
 }
 async function store(config,{batch=null,pending=null}={}){
  const saved=sanitize(config),entries=await entriesFor(saved,{pending});
  const timestamp=new Date().toISOString();
  const publicData={visible:saved.visible&&entries.length>0,
   title:saved.title,subtitle:saved.subtitle,entries:saved.visible?entries:[],updatedAt:timestamp};
  const privateData={...saved,updatedAt:timestamp};
  const b=batch||writeBatch(db);
  b.set(privateRef(db),privateData);
  b.set(publicRef(db),publicData);
  if(!batch)await b.commit();
  state=saved;
 }
 async function load(){
  say('Loading published results and saved homepage winners…');
  try{
   const [ss,rs,conf]=await Promise.all([
    getDocs(collection(db,'students')),
    getDocs(collection(db,'examResults')),
    getDoc(privateRef(db))
   ]);
   students=ss.docs.map(x=>({id:x.id,...x.data()}));
   results=rs.docs.map(x=>({id:x.id,...x.data()}));
   state=sanitize(conf.exists()?conf.data():initial());
   render();
  }catch(e){say('Could not load homepage winners: '+e.message,true)}
 }
 async function savePanel(){
  const btn=$('homepageWinnersSave');
  btn.disabled=true;say('Saving selected winners…');
  try{
   const data=readForm();
   if(!data.visible) {
    // Hidden means public data and public images are cleared, while private picks remain editable.
    if(!confirm('Hide the whole winners panel from the homepage? Your choices stay saved privately.'))return;
   }else{
    if(!confirm('Publish '+data.picks.length+' selected position(s), student name(s) and portrait(s) publicly on the homepage?'))return;
   }
   await store(data);
   await load();
   say(data.visible?'✓ Homepage updated. Only the selected positions are public.':'✓ Winners panel hidden; no student photo or name remains in the public winners document.');
  }catch(e){say('Save failed: '+e.message,true)}
  finally{btn.disabled=false}
 }
 function setup(){
  const grid=$('homepageWinnersRankGrid');
  for(const rank of ROLES){
   const box=document.createElement('div');box.className='homepage-rank-editor';
   const heading=document.createElement('h4');heading.textContent=({1:'🥇 FIRST',2:'🥈 SECOND',3:'🥉 THIRD'})[rank];
   const select=document.createElement('select');select.setAttribute('aria-label',roleName(rank)+' published result');
   const label=document.createElement('label');label.textContent='Published student result';label.append(select);
   const meta=document.createElement('p');meta.className='homepage-rank-meta';
   const photo=document.createElement('div');photo.className='homepage-rank-photo';photo.textContent='Select a published result';
   const upload=document.createElement('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';
   upload.setAttribute('aria-label','Upload photo for '+roleName(rank));
   const uploadLabel=document.createElement('label');uploadLabel.textContent='Public winner photo (optional if Student Details has photo)';uploadLabel.append(upload);
   const clear=document.createElement('button');clear.type='button';clear.className='secondary';clear.textContent='Remove selected upload';
   const consent=document.createElement('input');consent.type='checkbox';
   const consentLabel=document.createElement('label');consentLabel.className='homepage-rank-consent';consentLabel.append(consent,document.createTextNode('I have student/guardian permission to publish this name and photo.'));
   box.append(heading,label,meta,photo,uploadLabel,clear,consentLabel);grid.append(box);
   const ui={select,meta,photo,file:upload,consent,pick:{rank,resultId:'',photoOverride:''}};
   rows.set(rank,ui);
   select.addEventListener('change',()=>{ui.pick.photoOverride='';upload.value='';consent.checked=false;ui.pick.consent=false;dirty=true;updateRow(rank)});
   clear.onclick=()=>{ui.pick.photoOverride='';upload.value='';dirty=true;updateRow(rank)};
   upload.addEventListener('change',async()=>{
    if(!upload.files?.[0])return;
    say('Preparing '+roleName(rank)+' photo…');
    try{
     if(!select.value)throw Error('Choose a published student result first.');
     const data=await compressProfilePhoto(upload.files[0]);
     ui.pick.photoOverride=data;
     dirty=true;updateRow(rank);
     say('✓ Photo prepared. Confirm guardian consent and click Save & Publish.');
    }catch(e){upload.value='';say('Photo error: '+e.message,true)}
   });
  }
  $('homepageWinnersSave').onclick=savePanel;
  $('homepageWinnersRefresh').onclick=async()=>{
   if(dirty&&!confirm('Discard unsaved homepage winner selections?'))return;
   await load();
  };
  $('homepageWinnersHide').onclick=async()=>{
   if(!confirm('Hide all homepage winners immediately? Private choices will be kept for later.'))return;
   const button=$('homepageWinnersHide');button.disabled=true;
   try{
    const saved=await getDoc(privateRef(db));
    const cfg=sanitize(saved.exists()?saved.data():initial());
    cfg.visible=false;
    await store(cfg);await load();say('✓ All winners hidden from the public website.');
   }catch(e){say('Hide failed: '+e.message,true)}
   finally{button.disabled=false}
  };
  $('homepageWinnersVisible').addEventListener('change',()=>{dirty=true});
 }
 async function beforeResultSave(batch,{id,record,student,feature=false,rank=0,consent=false,photoOverride=''}) {
  const snap=await getDoc(privateRef(db));
  const config=sanitize(snap.exists()?snap.data():initial());
  const used=config.picks.some(p=>p.resultId===id);
  if(!used&&!feature)return false;
  if(feature){
   if(!record.published)throw Error('Publish this result before adding it to the homepage.');
   if(!ROLES.includes(Number(rank)))throw Error('Choose First, Second or Third position.');
   if(!consent)throw Error('Confirm student/guardian permission before posting a winner photo.');
   config.picks=config.picks.filter(p=>p.rank!==Number(rank)&&p.resultId!==id);
   config.picks.push({rank:Number(rank),resultId:id,consent:true,photoOverride:profile(photoOverride)});
   config.visible=true;
  }
  if(!record.published)config.picks=config.picks.filter(p=>p.resultId!==id);
  if(!config.picks.length)config.visible=false;
  if(!record.published){
   try{await store(config,{batch,pending:{id,record,student}})}
   catch(e){
    // Never block unpublishing a student's private result due to another rank's
    // stale photo or consent data. Hide all public winners instead (fail closed).
    const safe={...config,visible:false};
    const now=new Date().toISOString();
    batch.set(privateRef(db),{...safe,updatedAt:now});
    batch.set(publicRef(db),{visible:false,title:safe.title,subtitle:safe.subtitle,entries:[],updatedAt:now});
    state=safe;
   }
  }else await store(config,{batch,pending:{id,record,student}});
  return true;
 }
 setup();
 return {load,beforeResultSave};
}
