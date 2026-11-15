import {collection, doc, getDoc, getDocs, addDoc, updateDoc, runTransaction, serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {classDate, classKey, makeupKey, canConfirmDate, isLockedRequest, isSameClass, originalAlreadyMarked, findMakeupRecord} from './class-reschedule-utils.js';

/* No teacher can approve their own request. Firestore rules enforce this too. */
export function initTeacherReschedules({db, auth, teacherId, teacher, assignments, getToday, onAttendanceSaved}) {
  const host = document.getElementById('reschedulePanel');
  const requestsRef = collection(db, 'classRescheduleRequests', teacherId, 'requests');
  let requests = [], loadError = '';
  const message = (value, error=false) => {
    const node = document.getElementById('rescheduleStatus');
    if (node) { node.textContent = value; node.style.color = error ? '#9c3030' : '#246846'; }
  };
  const label = (item) => [item.courseName || item.course, item.batch, item.subject].filter(Boolean).join(' · ');
  const eligible = (item) => item?.course && item?.subject && (!['maktab','childrens-quran-maktab'].includes(item.course) || item.batch);
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const field = (caption, input) => {
    const wrapper = el('label', caption);
    wrapper.style.cssText = 'display:block;margin:12px 0;font-weight:700';
    input.style.cssText = 'display:block;box-sizing:border-box;width:100%;margin-top:5px;padding:10px;border:1px solid #b6cdbc;border-radius:9px;font:inherit';
    wrapper.append(input);
    return wrapper;
  };
  const input = (type, value = '') => {
    const node = document.createElement('input');
    node.type = type;
    node.value = value;
    return node;
  };
  function blockingRequest(assignment, date) {
    return requests.find(r => r.originalDate === date && isSameClass(r, assignment) && isLockedRequest(r));
  }
  async function submitRequest(assignment, originalDate, proposedDate, proposedTime, reason, button) {
    if (!eligible(assignment) || !classDate(originalDate) || originalDate < getToday()) throw Error('Choose an assigned class and today or a future original date.');
    if (proposedDate && !canConfirmDate(originalDate, proposedDate)) throw Error('The makeup date must be after the original class date.');
    if (Boolean(proposedDate) !== Boolean(proposedTime)) throw Error('Enter both proposed date and time, or leave both blank.');
    if (reason.trim().length < 5 || reason.length > 500) throw Error('Give a reason of 5–500 characters.');
    if (requests.some(r => isSameClass(r, assignment) && r.originalDate === originalDate && isLockedRequest(r))) throw Error('A request for this class and date is already pending or approved.');
    button.disabled = true;
    try {
      const day = await getDoc(doc(db, 'teacherAttendance', teacherId, 'days', originalDate));
      const record = {course:assignment.course, batch:assignment.batch||'',subject:assignment.subject};
      if (originalAlreadyMarked(day.data()?.subjects, record)) throw Error('Attendance was already submitted for this original class date.');
      await addDoc(requestsRef, {
        teacherId, teacherName:String(teacher.name||'Teacher'), teacherEmail:String(auth.currentUser?.email||''),
        course:assignment.course, courseName:assignment.courseName||assignment.course, batch:assignment.batch||'',
        subject:assignment.subject, timing:assignment.timing||'', originalDate, proposedDate:proposedDate||'', proposedTime:proposedTime||'',
        reason:reason.trim(), status:'pending', createdAt:serverTimestamp(), updatedAt:serverTimestamp()
      });
      await load();
      await onAttendanceSaved();
      message('✓ Request sent to Admin. The class is NOT rescheduled until Admin approves.');
    } finally { button.disabled = false; }
  }
  function renderRequestForm(root) {
    const wrap = el('section');
    wrap.style.cssText = 'padding:16px;border:1px solid #d3e4d5;border-radius:14px;background:#f7faf6;margin:14px 0';
    wrap.append(el('h3','📅 Request Class Postponement'));
    wrap.append(el('p','Send a request to Admin before changing the class date. Admin approval is mandatory.'));
    const picker = el('select');picker.add(new Option('Choose assigned class / subject', ''));
    assignments.forEach((item,i) => { if(eligible(item))picker.add(new Option(label(item),String(i))); });
    const date = input('date',getToday()),proposed = input('date'),time = input('time'),reason = document.createElement('textarea');
    reason.rows = 3;reason.maxLength = 500;reason.placeholder = 'Why can you not conduct the original class?';
    date.min = getToday();
    proposed.min = getToday();
    date.onchange = () => { proposed.min = date.value; if(proposed.value && proposed.value <= date.value) proposed.value=''; };
    wrap.append(field('Assigned Class / Subject',picker),field('Original Class Date',date),
      field('Proposed Makeup Date (optional)',proposed),field('Proposed New Time (optional)',time),field('Reason for Postponement',reason));
    const submit = el('button','🟠 Submit for Admin Approval');
    submit.type='button';
    submit.onclick = async () => {
      const assignment = assignments[Number(picker.value)];
      try { await submitRequest(assignment,date.value,proposed.value,time.value,reason.value,submit); }
      catch(error) { message('Request failed: '+error.message,true); }
    };
    wrap.append(submit);root.append(wrap);
  }
  async function proposeDifferentDate(request, root) {
    const section = el('div');
    const date = input('date'), time = input('time');
    date.min = request.originalDate;
    const button = el('button','↻ Send Revised Date for Approval');button.type='button';
    section.append(field('Revised Makeup Date',date),field('Revised Time',time),button);
    button.onclick = async () => {
      if(!canConfirmDate(request.originalDate,date.value)||!time.value){message('Choose a date after the original class and a time.',true);return;}
      button.disabled=true;
      try {
        await updateDoc(doc(requestsRef,request.id),{proposedDate:date.value,proposedTime:time.value,status:'pending',updatedAt:serverTimestamp()});
        await load();
        message('✓ Revised date sent to Admin for approval.');
      }catch(error){message('Could not submit revised date: '+error.message,true);}
      finally{button.disabled=false;}
    };
    root.append(section);
  }
  function attendanceMessage(request, record, day) {
    const students = Object.values(record.students||{});
    const present = students.filter(s=>s.status==='present').length;
    const absent = students.filter(s=>s.status==='absent').length;
    const leave = students.filter(s=>s.status==='leave').length;
    return [
      '✨ Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh ✨','','🕌 *AL ISLAH ARABIC ACADEMY*',
      '📋 *MAKEUP CLASS ATTENDANCE*','','📅 Date: '+day.split('-').reverse().join('/'),
      '🏫 Class: '+(request.courseName||request.course),'📚 Subject: '+request.subject,
      '👩‍🏫 Teacher: '+(teacher.name||''),...(request.batch?['🎓 Batch: '+request.batch]:[]),
      '⏰ Timing: '+request.confirmedTime,'🔄 Class Type: Rescheduled',
      '📅 Original Date: '+request.originalDate.split('-').reverse().join('/'),
      '✅ Makeup Class Completed','','🌹 *STUDENT ATTENDANCE*','',
      ...students.map((s,i)=>'🌹 '+String(i+1).padStart(2,'0')+'. '+s.name+' '+(s.status==='present'?'✅':s.status==='leave'?'🟡 Leave':'❌')),
      '', '👥 Total: '+students.length,'✅ Present: '+present,'❌ Absent: '+absent,
      '🟡 Leave: '+leave,'📊 Attendance: '+(students.length?Math.round(present/students.length*100):0)+'%',
      '', '🤲 رَبِّ زِدْنِي عِلْمًا'
    ].join('\n');
  }
  async function renderMakeup(request, box) {
    const assignment = assignments.find(a=>isSameClass(a,request));
    if(!assignment || !assignment.students?.length) {
      box.append(el('p','Ask Admin to refresh your teacher roster before makeup attendance.'));return;
    }
    const today = getToday();
    const dayRef = doc(db,'teacherAttendance',teacherId,'days',today);
    const day = await getDoc(dayRef);
    const saved = findMakeupRecord(day.data()?.subjects,request,request.id);
    if(saved) {
      box.append(el('p','✅ Makeup class attendance saved. This class is completed.'));
      const text = attendanceMessage(request,saved,today);
      const copy = el('button','📋 Copy Makeup Attendance');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);message('✓ Makeup report copied.');}catch(e){window.prompt('Copy report:',text);}};
      const share = el('button','📤 Share to WhatsApp');share.type='button';share.onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
      const preview = el('textarea');preview.readOnly=true;preview.value=text;preview.rows=11;
      preview.style.cssText='display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:10px;border-radius:9px';
      preview.onclick=()=>preview.select();
      box.append(copy,share,preview);return;
    }
    if (today !== request.confirmedDate) {
      box.append(el('p',today < request.confirmedDate?'Makeup attendance opens on the approved date only.':'Approved date passed without submitted attendance. Contact Admin to reschedule again.'));return;
    }
    box.append(el('p','Mark the students only after conducting this approved makeup class.'));
    const picks=[];
    for (const student of assignment.students) {
      const select = el('select');
      [['present','✅ Present'],['absent','❌ Absent'],['leave','🟡 Leave']].forEach(([value,label])=>select.add(new Option(label,value)));
      const row = field(student.name,select);box.append(row);picks.push({student,select});
    }
    const button = el('button','✅ Submit Makeup Class Attendance');button.type='button';box.append(button);
    button.onclick=async()=>{
      button.disabled=true;
      try{
        const recordKey=makeupKey(request,request.id),students={};
        for(const {student,select} of picks)students[student.id]={name:student.name,status:select.value};
        await runTransaction(db,async tx=>{
          const grant=await tx.get(doc(requestsRef,request.id));
          if(!grant.exists() || grant.data().status!=='approved'||grant.data().confirmedDate!==today)throw Error('Approval is not valid for today. Ask Admin.');
          const daySnapshot=await tx.get(dayRef),old=daySnapshot.exists()?daySnapshot.data():{};
          if(old.subjects?.[recordKey])throw Error('Makeup attendance was already recorded.');
          const record={status:'present',reason:'',leaveStatus:null,course:request.course,batch:request.batch||'',
            subject:request.subject,timing:request.confirmedTime,students,classType:'makeup',
            rescheduleRequestId:request.id,originalDate:request.originalDate};
          tx.set(dayRef,{date:today,teacherId,email:auth.currentUser.email,
            markedAt:serverTimestamp(),subjects:{...(old.subjects||{}),[recordKey]:record}},{merge:true});
        });
        await load();
        await onAttendanceSaved();
        message('✅ Makeup class saved. Original class was not counted separately.');
      }catch(error){message('Makeup save failed: '+error.message,true);}
      finally{button.disabled=false;}
    };
  }
  async function render() {
    host.replaceChildren();
    const heading=el('h2','🔄 Class Postponement & Makeup Classes');
    heading.style.marginTop='27px';host.append(heading);
    const status=el('p','', 'reschedule-message');status.id='rescheduleStatus';status.setAttribute('role','status');host.append(status);
    if(loadError){message('Could not load class requests: '+loadError+' — attendance changes are temporarily blocked.',true);return;}
    renderRequestForm(host);
    const title=el('h3','📋 My Reschedule Requests');host.append(title);
    if(!requests.length){host.append(el('p','No postponement requests submitted yet.'));return;}
    for(const request of requests){
      const box=el('section');box.style.cssText='padding:14px;margin:12px 0;border:1px solid #d4e0d3;border-radius:12px;background:#fff';
      const statusMap={pending:'🟡 Pending Admin Approval',approved:'✅ Admin Approved',rejected:'❌ Rejected',date_change_requested:'🔄 Admin Requested a Different Date'};
      box.append(el('strong',label(request)),el('p','Original: '+request.originalDate+' · '+(request.timing||'Scheduled class time')),
        el('p','Status: '+(statusMap[request.status]||request.status)));
      if(request.proposedDate)box.append(el('p','Requested: '+request.proposedDate+' · '+request.proposedTime));
      if(request.reviewNote)box.append(el('p','Admin note: '+request.reviewNote));
      if(request.status==='approved'){
        box.append(el('p','Confirmed: '+request.confirmedDate+' · '+request.confirmedTime));
        if(classDate(request.confirmedDate))await renderMakeup(request,box);
      }else if(request.status==='date_change_requested')await proposeDifferentDate(request,box);
      host.append(box);
    }
  }
  async function load(){
    try {
      const snap=await getDocs(requestsRef);
      requests=snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>String(b.createdAt?.seconds||0).localeCompare(String(a.createdAt?.seconds||0)));
      loadError='';
    } catch(e){requests=[];loadError=e.message;}
    await render();
  }
  return {load, blockingRequest, isUnavailable:()=>Boolean(loadError)};
}
