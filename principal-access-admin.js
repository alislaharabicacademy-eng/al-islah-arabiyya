/* Secure Principal access setup for the Grand Launch rehearsal.
 * Email is stored only in private grandLaunch/config, never public site settings.
 * The final permission decision is enforced by Firestore rules.
 */
import {doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

export function initPrincipalCeremonyAccess({db,auth}){
  const $=id=>document.getElementById(id);
  if(!$('ceremonyPrincipalEmail'))return {load:async()=>{}};
  const status=$('ceremonyPrincipalStatus');
  let lastLoad=0;
  const say=(message,error=false)=>{
    status.textContent=message;
    status.style.color=error?'#a02824':'#20633d';
  };
  const ref=doc(db,'grandLaunch','config');
  async function load(){
    const version=++lastLoad;
    if(!auth.currentUser||!auth.currentUser.emailVerified)return;
    try{
      const snap=await getDoc(ref);
      if(version!==lastLoad)return;
      $('ceremonyPrincipalEmail').value=snap.exists()?String(snap.data().principalEmail||''):'';
      say(snap.exists()?'✓ Saved Principal login account loaded.':'Principal login is not yet registered. Save the Principal’s own verified Google email below.');
    }catch(err){
      say('Could not read Principal login access: '+err.message,true);
    }
  }
  $('ceremonyPrincipalSave').addEventListener('click',async()=>{
    const email=$('ceremonyPrincipalEmail').value.trim().toLowerCase();
    if(!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email)||email.length>254){
      say('Enter a valid email of the Principal’s verified Google account.',true);return;
    }
    const user=auth.currentUser;
    if(!user?.emailVerified){say('Authorised Admin login is required.',true);return}
    const button=$('ceremonyPrincipalSave');
    button.disabled=true;say('Registering Principal access securely…');
    try{
      await setDoc(ref,{principalEmail:email,updatedAt:serverTimestamp(),updatedBy:user.uid});
      say('✓ Principal Login registered! Open the private Principal Login link using this exact Google account.');
    }catch(err){say('Unable to save Principal Login: '+err.message,true)}
    finally{button.disabled=false}
  });
  $('ceremonyPrincipalCopy').addEventListener('click',async()=>{
    const link=new URL('./grand-launch.html?role=principal',location.href).href;
    try{await navigator.clipboard.writeText(link);say('✓ Principal Login link copied. Share it privately with the Principal.')}
    catch(err){say('Open this Principal Login link directly: '+link,true)}
  });
  return {load};
}
