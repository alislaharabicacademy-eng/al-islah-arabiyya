import {collection,doc,getDoc,getDocs,addDoc,query,where,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {photoAvatar} from './profile-photo.js';
import {validFeeLedger} from './fee-ledger-utils.js';
import {isVerifiedAcademyAdmin} from './academy-admin-access.js';


/**
 * Privileged student dashboard preview. This is NOT a student session and
 * cannot create an authenticated student context, bypass guardian verification,
 * or write student records. Each individual preview is audited first.
 */
export function initAdminStudentPreview({auth,db,renderPrivateFeeLedger,onLogout}){
 const $=id=>document.getElementById(id);
 const panel=$('adminStudentPreview'),selector=$('adminStudentSelector');
 const status=$('adminStudentPreviewStatus'),details=$('adminStudentPreviewDetails');
 const cards=$('adminStudentPreviewCards');
 let generation=0;
 function isAdmin(user){return isVerifiedAcademyAdmin(db,user)}
 function hide(){
  ++generation;panel.hidden=true;details.hidden=true;
  selector.replaceChildren(new Option('Select student',''));selector.onchange=null;
  cards.replaceChildren();
 }
 function line(parent,value){
  const p=document.createElement('p');p.textContent=value;parent.append(p);
 }
 function render(student,studentId,access,results){
  cards.replaceChildren();
  const card=document.createElement('article');card.className='student-card';
  const name=document.createElement('h4');name.textContent=String(student.name||access?.studentName||'Student');
  if(student.photoData||access?.photoData)card.append(photoAvatar(student.photoData||access.photoData,'Student profile photo'));
  card.append(name);
  const code=String(student.studentCode||access?.studentCode||'Not assigned');
  const course=String(student.course||access?.course||'Not assigned').replace(/-/g,' ');
  const courseYear=Number(student.courseYear||access?.courseYear);
  const stage=student.course==='muballigha'&&[1,2].includes(courseYear)?' · Year '+courseYear:
    student.course==='alima'?' · Year 3':'';
  line(card,'Official Student ID: '+code+' · Class: '+course+stage+
    (student.batch?' · Batch: '+String(student.batch):'')+
    ' · Status: '+String(student.state||'Active'));
  const badge=document.createElement('span');badge.className='tag';
  badge.textContent='Academy Academic Record · Read-only';card.append(badge);
  if(access?.enabled===false)line(card,'Student/guardian login is disabled. Academy records can still be previewed by authorized administrators.');
  const feeData={...access,...student,
   feeLedger:validFeeLedger(student.feeLedger||access?.feeLedger),
   feeMonthlyRate:Number(access?.feeMonthlyRate)||0,
   feeEnrollmentDate:String(student.approvedAt||student.enrollmentDate||student.admittedAt||access?.feeEnrollmentDate||'')
  };
  renderPrivateFeeLedger(feeData,card);
  const resultsHeading=document.createElement('h4');resultsHeading.textContent='🏅 Published Examination Results';
  resultsHeading.style.marginTop='23px';card.append(resultsHeading);
  let publishedCount=0;
  for(const result of results){
   const e=result.data();
   if(e.published!==true||e.studentId!==studentId)continue;
   publishedCount++;
   const row=document.createElement('section');row.className='exam-card';
   const title=document.createElement('h5');title.textContent=String(e.examTitle||'Madrasa Examination');
   row.append(title);
   line(row,[e.examDate,e.academicYear,e.course].filter(Boolean).join(' · '));
   line(row,'Marks '+String(e.total??'—')+' / '+String(e.maxTotal??'—')+
     ' · Grade '+String(e.grade||'—')+' · '+(e.passed?'PASS':'NEEDS IMPROVEMENT'));
   if(/^RESULT-[a-f0-9]{24}$/.test(result.id)){
    const link=document.createElement('a');link.className='btn secondary';
    link.href='exam-results.html?id='+encodeURIComponent(result.id);
    link.textContent='↗ View Published Result';
    row.append(link);
   }
   card.append(row);
  }
  if(!publishedCount)line(card,'No published examination results yet.');
  const promotions=Array.isArray(student.promotionHistory)?student.promotionHistory:
   (Array.isArray(access?.promotionHistory)?access.promotionHistory:[]);
  if(promotions.length){
   const heading=document.createElement('h4');heading.textContent='🎓 Academic Promotions';
   heading.style.marginTop='22px';card.append(heading);
   for(const history of promotions){
    line(card,String(history.fromCourse||'')+(history.fromYear?' Year '+history.fromYear:'')+
      ' → '+String(history.toCourse||'')+(history.toYear?' Year '+history.toYear:'')+
      ' · '+String(history.completedAcademicYear||''));
   }
  }
  const certificates=Array.isArray(student.competitionCertificates)?student.competitionCertificates:
   (Array.isArray(access?.competitionCertificates)?access.competitionCertificates:[]);
  const certTitle=document.createElement('h4');certTitle.textContent='🏆 Issued Competition Certificates';
  certTitle.style.marginTop='22px';card.append(certTitle);
  if(!certificates.length)line(card,'No competition certificates issued yet.');
  else for(const cert of certificates)
   line(card,String(cert.eventName||'Competition')+' · '+String(cert.award||'Participation')+' · '+String(cert.eventDate||''));
  cards.append(card);
 }
 async function show(user){
  const request=++generation;
  const email=String(user?.email||'').trim().toLowerCase();
  if(!email||!user.emailVerified){hide();return}
  panel.hidden=false;details.hidden=true;cards.replaceChildren();
  selector.replaceChildren(new Option('Select student',''));
  status.textContent='Loading Academy student directory…';
  try{
   const list=await getDocs(collection(db,'students'));
   if(request!==generation||auth.currentUser?.uid!==user.uid)return;
   const students=list.docs.map(d=>({id:d.id,
     name:String(d.data().name||'Student'),code:String(d.data().studentCode||'Not assigned')}));
   students.sort((a,b)=>a.name.localeCompare(b.name)||a.code.localeCompare(b.code));
   for(const s of students)selector.add(new Option(s.name+' · '+s.code,s.id));
   status.textContent=students.length?
     'Choose a student to open an audited, read-only academic dashboard.':
     'No student profiles are available yet.';
  }catch(error){
   if(request===generation)status.textContent='Student directory unavailable. Please check administrator access.';
   return;
  }
  selector.onchange=async()=>{
   const selected=selector.value;
   const selectRequest=++generation;
   details.hidden=true;cards.replaceChildren();
   if(!selected){status.textContent='Choose a student to preview.';return}
   status.textContent='Recording administrator preview…';
   try{
    // Record the real actor before reading the selected private student.
    // Firebase Rules enforce current administrator authorization.
    await addDoc(collection(db,'adminStudentPreviews'),{
     studentId:selected,actorUid:user.uid,actorEmail:user.email,
     createdAt:serverTimestamp(),purpose:'student_dashboard_preview'
    });
    const [student,access,exams]=await Promise.all([
     getDoc(doc(db,'students',selected)),
     getDoc(doc(db,'studentAccess',selected)),
     getDocs(query(collection(db,'examResults'),where('studentId','==',selected),limit(80)))
    ]);
    if(selectRequest!==generation||auth.currentUser?.uid!==user.uid)return;
    if(!student.exists())throw Error('Student record no longer exists.');
    render(student.data(),selected,access.exists()?access.data():null,exams.docs);
    details.hidden=false;
    status.textContent='✓ Read-only student preview opened. Access recorded in the Academy security audit.';
   }catch(error){
    if(selectRequest===generation)status.textContent='Unable to open this preview. Check administrator permission and retry.';
   }
  };
 }
 $('adminStudentPreviewLogout').onclick=onLogout;
 return {isAdmin,show,hide};
}
