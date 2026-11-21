/* A one-day public welcome, gated on a Firestore record created atomically
 * with the real Principal-confirmed official launch. A rehearsed ribbon cut,
 * countdown, preview URL or browser date alone NEVER activates the welcome.
 */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getFirestore,getDoc,doc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const EVENT_DATE='2026-11-21';
const SHOW_ONCE_KEY='alia-official-opening-welcome-shown-2026-11-21';
const banner=document.getElementById('launchDayBanner');
const overlay=document.getElementById('launchWelcomeOverlay');
const petals=document.getElementById('launchWelcomePetals');
const skip=document.getElementById('launchWelcomeSkip');
const enter=document.getElementById('launchWelcomeEnter');
const bannerClose=document.getElementById('launchBannerClose');
let complete=false,poll=null,tries=0;
function indiaDate(value=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(value);
 const obj=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 return [obj.year,obj.month,obj.day].join('-');
}
function alreadyShown(){
 try{return localStorage.getItem(SHOW_ONCE_KEY)==='1'}
 catch(_){return false}
}
function markShown(){
 try{localStorage.setItem(SHOW_ONCE_KEY,'1')}catch(_){}
}
function closeIntro(){
 if(!overlay||overlay.hidden)return;
 overlay.hidden=true;
 document.body.classList.remove('launch-welcome-open');
 petals?.replaceChildren();
}
function addPetals(){
 if(!petals||window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 petals.replaceChildren();
 for(let i=0;i<32;i++){
  const item=document.createElement('span');
  item.className='launch-welcome-petal';
  item.style.setProperty('--petal-x',((i*71)%99)+'%');
  item.style.setProperty('--petal-size',(7+i%8)+'px');
  item.style.setProperty('--petal-turn',((i*37)%300)+'deg');
  item.style.setProperty('--petal-duration',(6+(i%6)*.9)+'s');
  item.style.setProperty('--petal-delay',(-i*.47)+'s');
  item.style.setProperty('--petal-drift',((i%2?1:-1)*(30+i%7*12))+'px');
  petals.append(item);
 }
}
function revealConfirmedOpening(){
 if(complete||indiaDate()!==EVENT_DATE)return;
 complete=true;
 if(poll){clearInterval(poll);poll=null}
 banner.hidden=false;
 if(alreadyShown())return;
 markShown(); // one automatic welcome per browser on launch day
 addPetals();
 overlay.hidden=false;
 document.body.classList.add('launch-welcome-open');
 skip?.focus({preventScroll:true});
}
async function checkRealOpening(){
 if(complete||indiaDate()!==EVENT_DATE)return;
 try{
  // Only one small public document. Firestore security rules deny GET
  // until grandLaunch/official actually exists on the server.
  const config=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>{
   if(!r.ok)throw Error('Firebase config unavailable');
   return r.json();
  });
  if(!config.apiKey||!config.projectId||!config.appId)return;
  const app=getApps().find(a=>a.options.projectId===config.projectId)
    ||initializeApp(config,'academy-public-inauguration');
  const publicOpening=await getDoc(doc(getFirestore(app),'grandLaunchPublic','opening'));
  if(!publicOpening.exists())return;
  const opening=publicOpening.data();
  const date=opening.launchedAt?.toDate?.();
  if(opening.phase==='launched'&&opening.dateLocal===EVENT_DATE&&
     date instanceof Date&&!Number.isNaN(date.getTime())&&indiaDate(date)===EVENT_DATE){
    revealConfirmedOpening();
  }
 }catch(_){
  // Before the real launch: "permission-denied" is expected by design.
  // No reveal, badge or fabricated announcement on failures.
 }
}
if(banner&&overlay&&indiaDate()===EVENT_DATE){
 skip?.addEventListener('click',closeIntro);
 enter?.addEventListener('click',closeIntro);
 bannerClose?.addEventListener('click',()=>{banner.hidden=true});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape')closeIntro()});
 // An already open homepage should notice a live final confirmation.
 // Checks stop automatically after 3 minutes or once confirmed.
 checkRealOpening();
 poll=setInterval(()=>{
  if(complete||indiaDate()!==EVENT_DATE||++tries>12){
   clearInterval(poll);poll=null;return;
  }
  checkRealOpening();
 },15000);
}
