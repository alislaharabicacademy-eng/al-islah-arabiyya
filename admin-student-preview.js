import {collection,doc,getDoc,getDocs,addDoc,query,where,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {photoAvatar} from './profile-photo.js';
import {validFeeLedger} from './fee-ledger-utils.js';
import {isVerifiedAcademyAdmin} from './academy-admin-access.js';
import {studentTeachingAssignments} from './student-teaching-utils.js';


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
 // Reflect the current official Teacher Directory in the read-only admin preview.
 // A student never reads /teachers: their live dashboard only reads their own
 // admin-published, verified /studentAccess grant.
 function renderTeachingPreview(card,student,access,teachingAssignments){
  const section=document.createElement('section');section.className='exam-card';
  section.style.cssText='margin-top:17px;border:1px solid #cfdfd5;background:linear-gradient(120deg,#f5fbf7,#fffdf6);';
  const heading=document.createElement('h4');heading.textContent='📚 My Subjects, Kitabs & Assigned Teachers';
  heading.style.cssText='color:#194d37;margin:3px 0 9px;';section.append(heading);
  if(!teachingAssignments.length){
   const message=document.createElement('p');
   message.textContent='No teacher or subject has been assigned yet for '+String(student.course||'this course')+
    (student.batch?' · '+String(student.batch):'')+'. Go to Admin → Teacher Management to assign a teacher, subject and optional Kitab.';
   section.append(message);
  }else for(const assignment of teachingAssignments){
   const row=document.createElement('div');
   row.style.cssText='border:1px solid #e1e9e2;border-radius:10px;background:white;margin:8px 0;padding:11px 14px;';
   const subject=document.createElement('strong');subject.textContent='📖 '+String(assignment.subject||'Subject');
   const teacher=document.createElement('p');teacher.style.cssText='margin:5px 0 0;font-size:14px;';
   teacher.textContent='👩‍🏫 Teacher: '+String(assignment.teacherName||'Not assigned');
   row.append(subject,teacher);
   if(assignment.kitab){
    const kitab=document.createElement('p');kitab.style.cssText='margin:3px 0 0;font-size:14px;color:#456353;';
    kitab.textContent='📕 Kitab / Book: '+String(assignment.kitab);row.append(kitab);
   }
   if(assignment.timing){
    const timing=document.createElement('p');timing.style.cssText='margin:3px 0 0;font-size:13px;color:#456353;';
    timing.textContent='🕒 Class timing: '+String(assignment.timing);row.append(timing);
   }
   section.append(row);
  }
  if(access?.enabled===true){
   const assigned=Array.isArray(access.teachingAssignments)?access.teachingAssignments:[];
   if(JSON.stringify(assigned)!==JSON.stringify(teachingAssignments)){
    const warning=document.createElement('p');warning.style.cssText='border-top:1px solid #d6dfd5;margin-top:14px;padding-top:11px;color:#79511a;font-size:13px;';
    warning.textContent='⚠ Student Login is not yet synchronized with this latest teacher list. Admin → Teacher Management → Sync Subjects & Teachers to Student Logins. Then refresh the student dashboard.';
    section.append(warning);
   }
  }else{
   const note=document.createElement('p');note.style.cssText='margin-top:12px;color:#5b665d;font-size:13px;';
   note.textContent='Preview only: no active approved Student Login for this student. Approve access in Student Details to publish private assignments.';
   section.append(note);
  }
  card.append(section);
 }
 function render(student,studentId,access,results,teachingAssignments){
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
  renderTeachingPreview(card,student,access,teachingAssignments);
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
    const [student,access,exams,teachers]=await Promise.all([
     getDoc(doc(db,'students',selected)),
     getDoc(doc(db,'studentAccess',selected)),
     getDocs(query(collection(db,'examResults'),where('studentId','==',selected),limit(80))),
     getDocs(collection(db,'teachers')) // Admin-only; after audited preview event.
    ]);
    if(selectRequest!==generation||auth.currentUser?.uid!==user.uid)return;
    if(!student.exists())throw Error('Student record no longer exists.');
    const teachingAssignments=studentTeachingAssignments(student.data(),teachers.docs.map(d=>d.data()));
    render(student.data(),selected,access.exists()?access.data():null,exams.docs,teachingAssignments);
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
