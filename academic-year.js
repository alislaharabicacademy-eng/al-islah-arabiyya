/* Public academic-year display: read from any published academy course. */
import{initializeApp,getApps,getApp}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import{getFirestore,doc,getDoc}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
(async()=>{
 try{
  const cfg=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>r.json());
  if(!cfg.apiKey||!cfg.projectId||!cfg.appId)return;
  const app=getApps().find(a=>a.options.projectId===cfg.projectId)||initializeApp(cfg,'academic-year-display');
  const db=getFirestore(app);
  for(const id of ['muallama','muballigha','alima','boys-hifz']){
   try{
    const snap=await getDoc(doc(db,'courses',id));
    if(!snap.exists())continue;
    const y=snap.data().academicYear;
    if(typeof y==='string'&&/^20\d{2}[–-]20\d{2}$/.test(y)){
     document.querySelectorAll('[data-academic-year]').forEach(el=>el.textContent=y.replace('-', '–'));
     break;
    }
   }catch(e){/* unpublished courses cannot be read publicly */ }
  }
 }catch(e){console.warn('Academic year unavailable; showing default year',e)}
})();
