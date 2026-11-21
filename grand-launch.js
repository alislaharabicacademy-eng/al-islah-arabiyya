/* Host/Principal inauguration UX. Trial and Main Preview are reversible; only separately confirmed Official mode creates a permanent launch record. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {getFirestore,doc,collection,query,limit,getDocs,getDoc,setDoc,updateDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isVerifiedMasterAdmin} from './admin-role-status.js';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const role=params.get('role')==='principal'?'principal':'host';
// Rehearsals are reversible. Only mode=official records the actual one-time event.
const isOfficial=params.get('mode')==='official';
const isMainPreview=!isOfficial && params.get('mode')==='main-preview';
const COUNTDOWN_MS=10000;
let auth,db,me,trial=null,unsubscribe=null,authorized=false,principalEmail='',experiencedCountdown=false,cutPlayed=false,cutPending=false,previousPhase='',lastDigit=0,redirectTimer=null,successTimer=null,confettiTimer=null,sparkleTimer=null;
let officialControl=null,officialRecord=null,officialControlLoaded=false,officialRecordLoaded=false,officialTrialLoaded=false;
let officialUnsubscribes=[],officialSeenCountdown=false,masterVerified=false;
const message=(text,isError=false)=>{$('message').textContent=text;$('message').classList.toggle('danger',isError)};
const show=(id,visible)=>$(id).hidden=!visible;
const isEmail=value=>/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(value);
const principalUrl=new URL('./grand-launch.html?role=principal'+(isOfficial?'&mode=official':isMainPreview?'&mode=main-preview':''),location.href).href;
document.body.dataset.mode=isOfficial?'official':isMainPreview?'main-preview':'trial';
$('switchCeremonyMode').href=isMainPreview?'./grand-launch.html?role=host':'./grand-launch.html?role=host&mode=main-preview';
$('switchCeremonyMode').textContent=isMainPreview?'↩ Return to Regular Trial':'✨ See Main Ceremony Preview';
if(isMainPreview){
  document.title='Main Ceremony Preview · NOT OFFICIAL | Women\'s Online Madrasa';
  $('ceremonyModeBadge').classList.add('main-preview-badge');
  $('ceremonyModeBadge').textContent='🎀 MAIN CEREMONY PREVIEW · NOT OFFICIAL';
  $('ceremonyTopline').textContent='21 NOVEMBER 2026 · FULL LAUNCH DRESS REHEARSAL';
  $('hostControlHeading').textContent='🎬 Main Ceremony Preview · Resettable';
  $('startTrial').textContent='▶ Start Main Ceremony Preview';
  $('resetTrial').textContent='↻ Reset Main Preview';
  $('successHeadline').textContent='WEBSITE OFFICIALLY INAUGURATED';
  $('successSubtitle').textContent='✨ GRAND CEREMONY PREVIEW · NOT OFFICIAL ✨';
}
if(isOfficial){
  document.title='Official Inauguration · 21 November 2026 | Women\'s Online Madrasa';
  $('ceremonyModeBadge').classList.add('main-preview-badge');
  $('ceremonyModeBadge').textContent='👑 OFFICIAL INAUGURATION · ONE TIME ONLY';
  $('ceremonyTopline').textContent='SATURDAY, 21 NOVEMBER 2026 · OFFICIAL INAUGURATION';
  $('hostControlHeading').textContent='🔐 One-Time Official Opening · Master Control';
  $('principalInstruction').textContent='After the 10-second official countdown, tap the scissors to reveal the inauguration. The Master Admin can RESET even after the ribbon cut. Only your separate CONFIRM FINAL OPENING action locks the ceremony permanently.';
  $('ceremonyFooter').innerHTML='Official inauguration · Saturday, 21 November 2026 · The confirmed ceremony is permanently recorded.<br>Madrasa Al Islahul Arabiya · Women\'s Online Madrasa';
  $('successHeadline').textContent='WEBSITE OFFICIALLY INAUGURATED';
  $('successSubtitle').textContent='21 November 2026 · Official Inauguration';
  $('successExplanation').textContent='Ribbon-cut display completed. Waiting for the Principal to confirm the final official opening. Until then, the Master Admin can reset and repeat.';
  $('previewLaunchHeader').textContent='🎀 CEREMONY PREVIEW · AWAITING FINAL CONFIRMATION';
  $('previewLaunchFooter').textContent='Ribbon cut preview only · Not permanently recorded until Principal confirms';
  $('previewReset').textContent='↻ Reset Ribbon & Rehearse';
  show('rehearsalControls',false);
  show('officialControls',true);
}
$('principalLink').href=principalUrl;
$('officialPrincipalLink').href=principalUrl;
$('loginHeading').textContent=role==='principal'?'Principal · Verified Google Login':'Host · Secure Admin Login';
show('passwordForm',role==='host');
show('switchGoogleAccount',role==='principal');

function resetVisual(){
  clearTimeout(redirectTimer);
  clearTimeout(successTimer);
  clearTimeout(confettiTimer);
  clearTimeout(sparkleTimer);
  $('sparkles').replaceChildren();
  $('celebrationFlash').classList.remove('play');
  show('previewLaunchOverlay',false);
  $('previewLaunchFrame').removeAttribute('src');
  cutPlayed=false;
  cutPending=false;
  experiencedCountdown=false;
  previousPhase='';
  lastDigit=0;
  $('ribbonWrap').classList.remove('is-cut');
  $('confetti').replaceChildren();
  show('success',false);
  show('ribbonArea',false);
  show('countdown',false);
  show('cutRibbon',false);
  show('scissorsTrigger',false);
  show('waitingForPrincipal',false);
}

function goldSparkles(){
  const field=$('sparkles');field.replaceChildren();
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // Deterministic radial fireworks from the ribbon, with no network or
  // heavy canvas dependency. Fewer particles on Android/small screens.
  const mobile=window.matchMedia('(max-width: 600px)').matches;
  const count=mobile?38:72;
  for(let i=0;i<count;i++){
    const piece=document.createElement('i');
    const angle=(i*137.508+18)*Math.PI/180;
    const distance=(mobile?95:160)+(i%7)*(mobile?12:23);
    const dx=Math.round(Math.cos(angle)*distance);
    const dy=Math.round(Math.sin(angle)*distance);
    piece.style.setProperty('--x',(48+(i%7)*.6)+'%');
    piece.style.setProperty('--y',(39+(i%5)*2.3)+'%');
    piece.style.setProperty('--dx',dx+'px');
    piece.style.setProperty('--dy',dy+'px');
    piece.style.setProperty('--dx-half',Math.round(dx*.6)+'px');
    piece.style.setProperty('--dy-half',Math.round(dy*.6)+'px');
    piece.style.setProperty('--s',((i%5)+4)+'px');
    piece.style.setProperty('--d',(1.6+(i%5)*.4)+'s');
    piece.style.setProperty('--delay',((i%9)*.14)+'s');
    field.append(piece);
  }
  const flash=$('celebrationFlash');
  flash.classList.remove('play');
  void flash.offsetWidth;
  flash.classList.add('play');
  sparkleTimer=setTimeout(()=>{field.replaceChildren();flash.classList.remove('play')},4900);
}
function confetti(){
  const field=$('confetti');field.replaceChildren();
  for(let i=0;i<42;i++){
    const piece=document.createElement('i');
    piece.style.setProperty('--x',((i*73)%100)+'%');
    piece.style.setProperty('--c',['#efd483','#f7f3de','#dbad5c','#e0a3a0'][i%4]);
    piece.style.setProperty('--t',(2.3+(i%8)*.25)+'s');
    piece.style.setProperty('--r',((i*57)%360)+'deg');
    piece.style.animationDelay=((i%6)*.065)+'s';
    field.append(piece);
  }
  clearTimeout(confettiTimer);
  confettiTimer=setTimeout(()=>field.replaceChildren(),5700);
}
function playCutAnimation(){
  if(cutPlayed)return;
  cutPlayed=true;
  show('countdown',false);
  show('ribbonArea',true);
  show('cutRibbon',false);
  show('scissorsTrigger',true);
  $('scissorsTrigger').disabled=true;
  show('waitingForPrincipal',false);
  $('ribbonWrap').classList.remove('is-cut');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    $('ribbonWrap').classList.add('is-cut');confetti();goldSparkles();
  }));
  message(isOfficial?(officialRecord?.phase==='launched'?'🎉 Official inauguration permanently recorded. Presenting the website…':'🎀 Ribbon-cut preview complete. Reset is still available until Principal FINAL CONFIRM.'):isMainPreview?'✂️ Preview ribbon cut confirmed. Revealing the homepage without recording any official launch…':'✂️ Trial ribbon cut confirmed! Showing the rehearsal website…');
  // Keep celebration title visible for ~5 seconds before the real homepage reveal.
  successTimer=setTimeout(()=>{show('ribbonArea',false);show('success',true)},1550);
  // On the Host MAIN PREVIEW show the actual homepage in a full-size frame
  // with a persistent preview banner and reset button, without navigating away.
  if(role==='host'&&experiencedCountdown){
    if(isMainPreview||isOfficial){
      redirectTimer=setTimeout(()=>{
        $('previewLaunchFrame').src='./index.html';
        show('previewLaunchOverlay',true);
      },7100);
    }else{
      redirectTimer=setTimeout(()=>location.assign('./index.html'),3400);
    }
  }
}
function officialIndiaDate(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return p.year+'-'+p.month+'-'+p.day;
}
function officialTimeString(ts){
  return ts?.toDate?.().toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true})||'21 November 2026';
}
// The irreversible grandLaunch/official document is created only at the
// Principal's explicit FINAL CONFIRMATION, never by the visual scissors tap.
// A cut is staged in the existing resettable trial document, so no new
// Firestore permissions or rule deployment is needed for this workflow.
function isStagedOfficialCut(){
  if(officialControl?.state!=='countdown'||trial?.phase!=='cut')return false;
  const began=officialControl.startedAt?.toMillis?.();
  const trialBegan=trial.startedAt?.toMillis?.();
  const cutAt=trial.cutAt?.toMillis?.();
  return Number.isFinite(began)&&Number.isFinite(trialBegan)&&Number.isFinite(cutAt)
    && trialBegan<=began && began-trialBegan<30000 && cutAt>=began+COUNTDOWN_MS;
}
function renderOfficial(){
  if(!authorized||!officialControlLoaded||!officialRecordLoaded||!officialTrialLoaded)return;
  const launched=officialRecord?.phase==='launched';
  const state=officialControl?.state||'not-prepared';
  const staged=isStagedOfficialCut()&&!launched;
  show('officialFinalize',role==='principal'&&staged);
  show('officialFinalizeHelp',role==='principal'&&staged);
  if(role==='host'){
    $('officialStatus').textContent=launched
      ?'✅ Officially inaugurated: '+officialTimeString(officialRecord.launchedAt)+' (India time). Final record locked permanently.'
      :staged
      ?'🎀 The ribbon was cut and the full website reveal can be shown. NOT YET FINAL: Reset and repeat, or ask the Principal to CONFIRM FINAL OPENING.'
      :state==='countdown'
      ?'⏳ Official countdown running. You can reset it now or even after the ribbon is cut (until final confirmation).'
      :state==='armed'
      ?'🔒 Ceremony armed. The countdown may start on Saturday 21 November 2026 (India time).'
      :'🔐 Not yet armed. The Master Admin can prepare the ceremony without launching.';
    const canManage=masterVerified&&!launched;
    show('officialArm',canManage&&!officialControl);
    show('officialStart',canManage&&state==='armed');
    show('officialCancel',canManage&&state==='countdown');
    $('officialStart').disabled=officialIndiaDate()!=='2026-11-21';
    $('officialPhrase').closest('label').hidden=!canManage||!!officialControl;
    // The full-screen reveal must retain a Master-only reset button while
    // pending final confirmation, so accidental taps never lock the launch.
    show('previewReset',canManage&&staged);
  }
  if(launched){
    $('previewLaunchHeader').textContent='🎉 OFFICIALLY INAUGURATED · 21 NOVEMBER 2026';
    $('previewLaunchFooter').textContent='Official inauguration permanently confirmed · 21 November 2026';
    $('successExplanation').textContent='The Principal has confirmed the official launch. The final record is permanent.';
    show('previewReset',false);
    if(!cutPlayed){
      if(officialSeenCountdown||staged){
        experiencedCountdown=true;
        playCutAnimation();
      }else{
        cutPlayed=true;show('ribbonArea',false);show('countdown',false);show('success',true);
      }
    }
    message('✅ Officially inaugurated on '+officialTimeString(officialRecord.launchedAt)+' (India time). Final confirmation is permanent.');
    previousPhase='launched';
    return;
  }
  const phase=state;
  if(phase==='not-prepared'||phase==='armed'){
    if(previousPhase!==phase)resetVisual();
    message(phase==='armed'
      ?(role==='principal'?'Official ceremony is armed. Wait for the Master Admin to start. The ribbon cut may be reset until FINAL CONFIRM.':'Ready to start. Countdown and ribbon cutting may be reset until the Principal finalises.')
      :(role==='principal'?'Official ceremony is not armed yet.':'The official ceremony has not been armed.'));
  }else if(phase==='countdown'){
    officialSeenCountdown=true;experiencedCountdown=true;
    if(staged){
      $('previewLaunchHeader').textContent='🎀 RIBBON CUT PREVIEW · NOT YET FINAL';
      $('previewLaunchFooter').textContent='Reset permitted · No permanent inauguration record until Principal confirms';
      $('successExplanation').textContent='Preview completed. The Principal may confirm the one-time opening, or the Master Admin can reset and repeat.';
      if(!cutPlayed)playCutAnimation();
      previousPhase='staged-cut';
      return;
    }
    if(previousPhase!=='countdown'){
      resetVisual();
      officialSeenCountdown=true;experiencedCountdown=true;
    }
    const start=officialControl.startedAt?.toMillis?.();
    if(!start){
      show('countdown',false);show('ribbonArea',false);
      message('Synchronising the official countdown between Host and Principal…');
    }else{
      const remaining=Math.max(0,COUNTDOWN_MS-(Date.now()-start));
      const digit=Math.ceil(remaining/1000);
      if(digit>=1){
        if(lastDigit!==digit){
          $('countdown').textContent=digit;
          $('countdown').style.animation='none';void $('countdown').offsetWidth;
          $('countdown').style.animation='';lastDigit=digit;
        }
        show('countdown',true);show('ribbonArea',false);
        message('👑 OFFICIAL OPENING COUNTDOWN · '+digit);
      }else{
        show('countdown',false);show('ribbonArea',true);
        show('scissorsTrigger',true);
        show('cutRibbon',role==='principal');
        $('cutRibbon').textContent='✂️ CUT THE RIBBON · RESETTABLE UNTIL FINAL CONFIRM';
        $('cutRibbon').disabled=cutPending;
        $('scissorsTrigger').disabled=role!=='principal'||cutPending;
        show('waitingForPrincipal',role==='host');
        message(role==='principal'?'Tap scissors to show the full ribbon-cut reveal. Then choose FINAL CONFIRM to lock, or ask the Master Admin to reset.':'Countdown complete. Waiting for the Principal to show the ribbon-cut reveal.');
      }
    }
  }else message('Unknown official status. Contact the Master Admin.',true);
  previousPhase=phase;
}
function render(){
  if(isOfficial){renderOfficial();return}
  if(!authorized||!trial)return;
  const phase=trial.phase;
  if(phase==='idle'){
    if(previousPhase!=='idle')resetVisual();
    message(role==='host'?(isMainPreview?'Main ceremony preview ready. Start 10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1 and practise the complete ribbon-cut reveal; Reset remains available.':'Ready to rehearse. Save Principal access, then start the 10-second countdown.'):'Waiting for the Host to start the rehearsal countdown.');
  }else if(phase==='countdown'){
    experiencedCountdown=true;
    if(previousPhase!=='countdown'){
      cutPlayed=false;cutPending=false;clearTimeout(redirectTimer);clearTimeout(successTimer);show('success',false);show('ribbonArea',false);
      $('ribbonWrap').classList.remove('is-cut');$('confetti').replaceChildren();
    }
    const start=trial.startedAt?.toMillis?.();
    if(!start){
      show('countdown',false);
      message('Synchronising countdown time between Host and Principal…');
    }else{
      const remaining=Math.max(0,COUNTDOWN_MS-(Date.now()-start));
      const digit=Math.ceil(remaining/1000);
      if(digit>=1){
        if(lastDigit!==digit){
          $('countdown').textContent=digit;
          $('countdown').style.animation='none';
          void $('countdown').offsetWidth;
          $('countdown').style.animation='';
          lastDigit=digit;
        }
        show('countdown',true);show('ribbonArea',false);show('scissorsTrigger',false);
        message((isMainPreview?'MAIN CEREMONY PREVIEW':'LIVE REHEARSAL COUNTDOWN')+' · '+digit);
      }else{
        show('countdown',false);show('ribbonArea',true);
        show('cutRibbon',true);
        show('scissorsTrigger',true);
        $('cutRibbon').textContent=role==='principal'?(isMainPreview?'✂️ CUT THE RIBBON · PREVIEW':'✂️ CUT THE RIBBON · TRIAL'):(isMainPreview?'✂️ CUT THE RIBBON · MAIN PREVIEW':'✂️ TEST CUT HERE · HOST TRIAL');
        $('cutRibbon').disabled=cutPending;
        $('scissorsTrigger').disabled=cutPending;
        show('waitingForPrincipal',role==='host'&&Boolean(principalEmail));
        message(role==='principal'?'Principal, tap the scissors or CUT THE RIBBON button.':'Countdown complete: tap the scissors or HOST TEST CUT to try it on this screen.');
      }
    }
  }else if(phase==='cut'){
    if(!cutPlayed)playCutAnimation();
  }else{
    message('Unknown rehearsal state. Ask the Host to reset.',true);
  }
  previousPhase=phase;
}
async function showSignedIn(user,version){
  unsubscribe?.();unsubscribe=null;
  officialUnsubscribes.forEach(stop=>stop());officialUnsubscribes=[];
  officialControl=null;officialRecord=null;officialControlLoaded=false;officialRecordLoaded=false;officialTrialLoaded=false;
  officialSeenCountdown=false;masterVerified=false;
  authorized=false;me=user;trial=null;resetVisual();
  show('hostControls',false);show('principalInfo',false);
  show('loginPanel',!user);
  if(!user){message('Sign in securely to access the '+(role==='host'?'Host':'Principal')+' rehearsal screen.');return}
  if(!user.emailVerified){
    message('This Google account must have a verified email address.',true);
    show('loginPanel',true);return;
  }
  try{
    if(role==='host'){
      // Server-side isAdmin() protects listing siteSettings; works for both Admin tiers.
      await getDocs(query(collection(db,'siteSettings'),limit(1)));
      if(version!==authVersion)return;
      const snap=await getDoc(doc(db,'grandLaunch','config'));
      if(version!==authVersion)return;
      principalEmail=snap.exists()?String(snap.data().principalEmail||''):'';
      $('principalEmail').value=principalEmail;
      if(isOfficial){
        masterVerified=await isVerifiedMasterAdmin(db,user);
        if(version!==authVersion)return;
      }
      show('hostControls',true);
    }else{
      const snap=await getDoc(doc(db,'grandLaunch','config'));
      if(version!==authVersion)return;
      // The registered Principal remains the only configured ceremony email.
      // A verified Master Admin has quiet backup access via a server-enforced
      // role probe. Never add a second email to the Principal configuration,
      // HTML, JavaScript, or any public website setting.
      principalEmail=snap.exists()?String(snap.data().principalEmail||'').toLowerCase():'';
      const registeredPrincipal=!!principalEmail && principalEmail===user.email.toLowerCase();
      if(!registeredPrincipal){
        const verifiedMaster=await isVerifiedMasterAdmin(db,user);
        if(version!==authVersion)return;
        if(!verifiedMaster)throw Error('Your Google account is not registered for Principal Login. Ask the Academy Admin to verify the Principal account in Settings → Principal Login, or choose a different Google account.');
      }
      show('principalInfo',true);
    }
    authorized=true;show('loginPanel',false);
    if(isOfficial){
      message('🔐 Official inauguration connected. Ribbon display is resettable until the Principal confirms the final lock.');
      officialUnsubscribes.push(onSnapshot(doc(db,'grandLaunch','officialControl'),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.hasPendingWrites)return;
        officialControl=snapshot.exists()?snapshot.data():null;
        officialControlLoaded=true;render();
      },error=>message('Cannot read official countdown control: '+error.message,true)));
      officialUnsubscribes.push(onSnapshot(doc(db,'grandLaunch','official'),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.hasPendingWrites)return;
        officialRecord=snapshot.exists()?snapshot.data():null;
        officialRecordLoaded=true;render();
      },error=>message('Cannot read official inauguration record: '+error.message,true)));
      officialUnsubscribes.push(onSnapshot(doc(db,'grandLaunch','trial'),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.hasPendingWrites)return;
        trial=snapshot.exists()?snapshot.data():{phase:'idle'};
        officialTrialLoaded=true;render();
      },error=>message('Cannot read staged ceremony: '+error.message,true)));
    }else{
      message('Connected to secure rehearsal. Official Launch remains locked.');
      unsubscribe=onSnapshot(doc(db,'grandLaunch','trial'),{includeMetadataChanges:true},snapshot=>{
        // Never celebrate an optimistic write: wait for the server to accept the ribbon cut.
        if(snapshot.metadata.hasPendingWrites)return;
        trial=snapshot.exists()?snapshot.data():{phase:'idle'};
        render();
      },error=>{trial=null;message('Cannot read rehearsal status: '+error.message,true)});
    }
  }catch(error){
    message('Access denied: '+error.message,true);
    show('loginPanel',true);
  }
}
let authVersion=0;
async function initialise(){
  try{
    const config=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuration unavailable');return r.json()});
    const app=getApps().find(a=>a.name==='academy-grand-launch')||initializeApp(config,'academy-grand-launch');
    auth=getAuth(app);db=getFirestore(app);
    onAuthStateChanged(auth,user=>{const version=++authVersion;showSignedIn(user,version)});
  }catch(error){message('Cannot connect to Firebase: '+error.message,true)}
}
async function loginWithGoogle(){
  if(!auth)return;
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  try{await signInWithPopup(auth,provider)}
  catch(error){
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error.code)){
      await signInWithRedirect(auth,provider).catch(e=>message('Google sign-in failed: '+e.message,true));
    }else message('Google sign-in failed: '+error.message,true);
  }
}
$('googleLogin').addEventListener('click',loginWithGoogle);
$('switchGoogleAccount').addEventListener('click',async()=>{
  if(!auth||role!=='principal')return;
  try{await signOut(auth);await loginWithGoogle()}
  catch(error){message('Cannot switch account: '+error.message,true)}
});
$('passwordForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!auth||role!=='host')return;
  try{
    await signInWithEmailAndPassword(auth,$('adminEmail').value.trim(),$('adminPassword').value);
    $('adminPassword').value='';
  }catch(error){message('Admin login failed: '+error.message,true)}
});
$('savePrincipal').addEventListener('click',async()=>{
  if(!authorized||role!=='host')return;
  const value=$('principalEmail').value.trim().toLowerCase();
  if(!isEmail(value)){message('Enter the Principal’s verified Google email address.',true);return}
  try{
    await setDoc(doc(db,'grandLaunch','config'),{principalEmail:value,updatedAt:serverTimestamp(),updatedBy:me.uid});
    principalEmail=value;message('Principal Google access saved. Share the Principal control link privately.');
  }catch(error){message('Could not save Principal access: '+error.message,true)}
});
async function writeTrial(phase){
  if(!authorized||role!=='host')return;
  try{
    await setDoc(doc(db,'grandLaunch','trial'),{
      kind:'trial',phase,startedAt:phase==='countdown'?serverTimestamp():null,
      cutAt:null,cutBy:null,updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    message(phase==='countdown'?'Countdown started on Host and Principal screens.':'Rehearsal reset. No official launch has happened.');
    return true;
  }catch(error){message('Could not '+(phase==='countdown'?'start':'reset')+' trial: '+error.message,true);return false}
}
$('startTrial').addEventListener('click',()=>writeTrial('countdown'));
$('resetTrial').addEventListener('click',()=>writeTrial('idle'));
$('previewReset').addEventListener('click',async()=>{
  if(role!=='host'||!authorized)return;
  if(isOfficial){await cancelOfficialCountdown();return}
  if(!isMainPreview)return;
  const button=$('previewReset');button.disabled=true;
  try{
    if(await writeTrial('idle'))resetVisual();
  }finally{button.disabled=false}
});
// The visual ribbon is staged in the resettable Trial document.
// Only FINAL CONFIRM writes the server-protected immutable official record.
async function armOfficial(){
  if(!isOfficial||role!=='host'||!masterVerified||officialRecord||officialControl)return;
  if($('officialPhrase').value.trim().toUpperCase()!=='LAUNCH 21 NOV 2026'){
    message('Type exactly LAUNCH 21 NOV 2026 to PREPARE the ceremony. This does NOT launch it.',true);return;
  }
  if(!confirm('ARM the official ceremony for 21 November? This is only preparation.'))return;
  const button=$('officialArm');button.disabled=true;
  try{
    await setDoc(doc(db,'grandLaunch','officialControl'),{
      kind:'officialControl',state:'armed',startedAt:null,startedBy:null,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    $('officialPhrase').value='';
    message('✅ Ceremony armed. The countdown and ribbon cut are resettable until final Principal confirmation.');
  }catch(error){message('Could not arm official ceremony: '+error.message,true)}
  finally{button.disabled=false}
}
async function startOfficial(){
  if(!isOfficial||role!=='host'||!masterVerified||officialRecord||officialControl?.state!=='armed')return;
  if(officialIndiaDate()!=='2026-11-21'){
    message('Official opening is restricted to Saturday 21 November 2026, India time.',true);return;
  }
  if(!confirm('START the official countdown? Ribbon cut + website reveal can be RESET and repeated. No permanent inauguration is recorded until the Principal separately presses CONFIRM FINAL OPENING.'))return;
  const button=$('officialStart');button.disabled=true;
  try{
    // Start the staging timer first. Both timers use server timestamps.
    await setDoc(doc(db,'grandLaunch','trial'),{
      kind:'trial',phase:'countdown',startedAt:serverTimestamp(),
      cutAt:null,cutBy:null,updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    await updateDoc(doc(db,'grandLaunch','officialControl'),{
      state:'countdown',startedAt:serverTimestamp(),startedBy:me.uid,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    message('Countdown started. You may reset before or AFTER cutting the ribbon, until final confirmation.');
  }catch(error){
    // If the official timer failed, do not leave the rehearsal stuck running.
    try{
      if(officialControl?.state==='armed')await setDoc(doc(db,'grandLaunch','trial'),{
        kind:'trial',phase:'idle',startedAt:null,cutAt:null,cutBy:null,
        updatedAt:serverTimestamp(),updatedBy:me.uid
      });
    }catch(_ignored){}
    message('Countdown could not start: '+error.message,true);
  }finally{button.disabled=false}
}
async function cancelOfficialCountdown(){
  if(!isOfficial||role!=='host'||!masterVerified||officialRecord||officialControl?.state!=='countdown')return;
  if(!confirm('RESET the countdown AND displayed ribbon cut? No permanent launch record has been created. You can start the ceremony again.'))return;
  const button=$('officialCancel'),overlayButton=$('previewReset');
  button.disabled=true;overlayButton.disabled=true;
  try{
    // Firestore rules refuse this update after FINAL CONFIRM, including
    // if another device just made the permanent record.
    await updateDoc(doc(db,'grandLaunch','officialControl'),{
      state:'armed',startedAt:null,startedBy:null,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    try{
      await setDoc(doc(db,'grandLaunch','trial'),{
        kind:'trial',phase:'idle',startedAt:null,cutAt:null,cutBy:null,
        updatedAt:serverTimestamp(),updatedBy:me.uid
      });
    }catch(e){
      message('Official status is armed, but staging clean-up failed: '+e.message+'. Restarting will clear the stage.',true);
    }
    resetVisual();
    message('✅ Countdown and ribbon display reset. Start again when you are ready. Nothing was permanently launched.');
  }catch(error){message('Cannot reset: the Principal may already have confirmed the final launch. '+error.message,true)}
  finally{button.disabled=false;overlayButton.disabled=false}
}
async function requestStagedOfficialCut(){
  if(!isOfficial||role!=='principal'||!authorized||cutPending||officialRecord||
     officialControl?.state!=='countdown'||trial?.phase!=='countdown')return;
  const officialStart=officialControl.startedAt?.toMillis?.();
  const trialStart=trial.startedAt?.toMillis?.();
  if(!officialStart||!trialStart){message('Please wait for both countdowns to sync.',true);return}
  if(Date.now()-officialStart<COUNTDOWN_MS||Date.now()-trialStart<COUNTDOWN_MS){
    message('Wait for the full official countdown.',true);return;
  }
  if(!confirm('CUT the ribbon and show the website reveal? This visual cut is RESETTABLE. The permanent official opening requires a SEPARATE FINAL CONFIRM.'))return;
  cutPending=true;$('cutRibbon').disabled=true;$('scissorsTrigger').disabled=true;
  try{
    await updateDoc(doc(db,'grandLaunch','trial'),{
      phase:'cut',cutAt:serverTimestamp(),cutBy:me.uid,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    cutPending=false;
    message('Ribbon-cut display submitted. The Principal must FINAL CONFIRM to lock the opening, or Master Admin can reset.');
  }catch(error){
    cutPending=false;$('cutRibbon').disabled=false;$('scissorsTrigger').disabled=false;
    message('Ribbon cut preview failed; no inauguration recorded: '+error.message,true);
  }
}
async function finalizeOfficial(){
  if(!isOfficial||role!=='principal'||!authorized||cutPending||officialRecord||!isStagedOfficialCut())return;
  if(officialIndiaDate()!=='2026-11-21'){
    message('Final opening is restricted to 21 November 2026 (India time).',true);return;
  }
  if(!confirm('FINAL CONFIRMATION: Permanently inaugurate the website NOW? The final record can NEVER be reset. Cancel this dialog if you want another rehearsal.'))return;
  cutPending=true;
  $('officialFinalize').disabled=true;
  message('Submitting the Principal’s final one-time inauguration confirmation…');
  try{
    await setDoc(doc(db,'grandLaunch','official'),{
      kind:'official',phase:'launched',dateLocal:'2026-11-21',
      startedAt:officialControl.startedAt,
      launchedAt:serverTimestamp(),launchedBy:me.uid
    });
    message('Final confirmation submitted. Awaiting secure server verification…');
  }catch(error){
    cutPending=false;$('officialFinalize').disabled=false;
    message('Final launch NOT recorded: '+error.message+'. Confirm the status before retrying.',true);
  }
}
$('officialArm').addEventListener('click',armOfficial);
$('officialStart').addEventListener('click',startOfficial);
$('officialCancel').addEventListener('click',cancelOfficialCountdown);
$('officialFinalize').addEventListener('click',finalizeOfficial);

async function requestTrialCut(){
  if(isOfficial)return; // Official mode can never use the resettable cut path.
  // On the shared Host screen this is strictly a rehearsal; the Principal
  // can still perform the full two-device ceremony from their own account.
  if(!authorized||!(role==='host'||role==='principal')||cutPending||
     trial?.phase!=='countdown'||!trial.startedAt?.toMillis)return;
  if(Date.now()-trial.startedAt.toMillis()<COUNTDOWN_MS){
    message('Finish the 10–9–8–7–6–5–4–3–2–1 countdown before cutting.',true);return;
  }
  cutPending=true;
  $('cutRibbon').disabled=true;
  $('scissorsTrigger').disabled=true;
  message('✂️ Confirming rehearsal ribbon cut securely…');
  try{
    await updateDoc(doc(db,'grandLaunch','trial'),{
      phase:'cut',cutAt:serverTimestamp(),cutBy:me.uid,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
  }catch(error){
    cutPending=false;
    if(trial?.phase==='countdown'){
      $('cutRibbon').disabled=false;
      $('scissorsTrigger').disabled=false;
    }
    message('Ribbon cutting was not accepted: '+error.message+
      ' · Make sure you are signed in and the trial is still active.',true);
  }
}
$('cutRibbon').addEventListener('click',()=>isOfficial?requestStagedOfficialCut():requestTrialCut());
$('scissorsTrigger').addEventListener('click',()=>isOfficial?requestStagedOfficialCut():requestTrialCut());

setInterval(render,130);
initialise();
