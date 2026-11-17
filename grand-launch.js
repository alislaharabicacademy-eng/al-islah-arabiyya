/* Isolated, reversible multi-device ceremony rehearsal. NO official launch API or state. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {getFirestore,doc,collection,query,limit,getDocs,getDoc,setDoc,updateDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isVerifiedMasterAdmin} from './admin-role-status.js';

const $=id=>document.getElementById(id);
const role=new URLSearchParams(location.search).get('role')==='principal'?'principal':'host';
const COUNTDOWN_MS=5000;
let auth,db,me,trial=null,unsubscribe=null,authorized=false,principalEmail='',experiencedCountdown=false,cutPlayed=false,cutPending=false,previousPhase='',lastDigit=0,redirectTimer=null;
const message=(text,isError=false)=>{$('message').textContent=text;$('message').classList.toggle('danger',isError)};
const show=(id,visible)=>$(id).hidden=!visible;
const isEmail=value=>/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(value);
const principalUrl=new URL('./grand-launch.html?role=principal',location.href).href;
$('principalLink').href=principalUrl;
$('loginHeading').textContent=role==='principal'?'Principal · Verified Google Login':'Host · Secure Admin Login';
show('passwordForm',role==='host');
show('switchGoogleAccount',role==='principal');

function resetVisual(){
  clearTimeout(redirectTimer);
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
  setTimeout(()=>field.replaceChildren(),5200);
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
    $('ribbonWrap').classList.add('is-cut');confetti();
  }));
  message('✂️ Trial ribbon cut confirmed! Showing the rehearsal website…');
  setTimeout(()=>{show('ribbonArea',false);show('success',true)},1250);
  // Only the Meet/Zoom HOST screen automatically reveals the website.
  // The principal's phone remains on the successful rehearsal confirmation.
  if(role==='host'&&experiencedCountdown){
    redirectTimer=setTimeout(()=>location.assign('./index.html'),3400);
  }
}
function render(){
  if(!authorized||!trial)return;
  const phase=trial.phase;
  if(phase==='idle'){
    if(previousPhase!=='idle')resetVisual();
    message(role==='host'?'Ready to rehearse. Save Principal access, then start the 5-second countdown.':'Waiting for the Host to start the trial countdown.');
  }else if(phase==='countdown'){
    experiencedCountdown=true;
    if(previousPhase!=='countdown'){
      cutPlayed=false;cutPending=false;clearTimeout(redirectTimer);show('success',false);show('ribbonArea',false);
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
        message('LIVE REHEARSAL COUNTDOWN · '+digit);
      }else{
        show('countdown',false);show('ribbonArea',true);
        show('cutRibbon',true);
        show('scissorsTrigger',true);
        $('cutRibbon').textContent=role==='principal'?'✂️ CUT THE RIBBON · TRIAL':'✂️ TEST CUT HERE · HOST TRIAL';
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
  unsubscribe?.();unsubscribe=null;authorized=false;me=user;trial=null;resetVisual();
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
    message('Connected to secure rehearsal. Official Launch remains locked.');
    unsubscribe=onSnapshot(doc(db,'grandLaunch','trial'),{includeMetadataChanges:true},snapshot=>{
      // Never celebrate an optimistic write: wait for the server to accept the ribbon cut.
      if(snapshot.metadata.hasPendingWrites)return;
      trial=snapshot.exists()?snapshot.data():{phase:'idle'};
      render();
    },error=>{trial=null;message('Cannot read rehearsal status: '+error.message,true)});
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
    message(phase==='countdown'?'Countdown started on Host and Principal screens.':'Trial reset. Start another rehearsal whenever ready.');
  }catch(error){message('Could not '+(phase==='countdown'?'start':'reset')+' trial: '+error.message,true)}
}
$('startTrial').addEventListener('click',()=>writeTrial('countdown'));
$('resetTrial').addEventListener('click',()=>writeTrial('idle'));
async function requestTrialCut(){
  // On the shared Host screen this is strictly a rehearsal; the Principal
  // can still perform the full two-device ceremony from their own account.
  if(!authorized||!(role==='host'||role==='principal')||cutPending||
     trial?.phase!=='countdown'||!trial.startedAt?.toMillis)return;
  if(Date.now()-trial.startedAt.toMillis()<COUNTDOWN_MS){
    message('Finish the 5–4–3–2–1 countdown before cutting.',true);return;
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
$('cutRibbon').addEventListener('click',requestTrialCut);
$('scissorsTrigger').addEventListener('click',requestTrialCut);

setInterval(render,130);
initialise();
