/* Public announcement contains zero student names, IDs, marks or photos. */
import{initializeApp,getApps}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import{doc,getDoc,getFirestore}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const panel=document.getElementById('academy-exam-announcement');
if(panel){
 try{
  const response=await fetch('./firebase-config.json',{cache:'no-store'});
  if(!response.ok)throw Error('Firebase site settings unavailable');
  const config=await response.json();
  const app=getApps().find(a=>a.name==='academy-exam-announcements')||
   initializeApp(config,'academy-exam-announcements');
  const snap=await getDoc(doc(getFirestore(app),'examAnnouncements','current'));
  const info=snap.exists()?snap.data():null;
  if(info?.visible===true&&typeof info.examTitle==='string'&&info.examTitle.trim()){
   document.getElementById('academyExamAnnouncementTitle').textContent='🎓 Examination Results Published!';
   document.getElementById('academyExamAnnouncementInfo').textContent=
    [info.examTitle,info.academicYear,info.examDate].filter(Boolean).map(String).join(' · ').slice(0,250);
   panel.hidden=false;
  }
 }catch(error){
  // Fail closed when public Firebase metadata is offline; do not reveal drafts.
  console.warn('Exam publication notice unavailable',error);
 }
}
