import {collection, doc, getDoc, getDocs, updateDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {classDate, canConfirmDate, originalAlreadyMarked, findMakeupRecord} from './class-reschedule-utils.js';

export function initClassRescheduleAdmin({db,auth}) {
  const root=document.getElementById('classRescheduleAdmin');
  const status=document.getElementById('classRescheduleAdminStatus');
  const refresh=document.getElementById('refreshClassRescheduleRequests');
  const node=(tag,text)=>{const item=document.createElement(tag);if(text!==undefined)item.textContent=text;return item;};
  const fmt=request=>[request.courseName||request.course,request.batch,request.subject].filter(Boolean).join(' · ');
  let busy=false;
  function field(label,value,type='text'){
    const outer=node('label',label);outer.style.cssText='display:block;font-weight:700;margin:9px 0';
    const input=document.createElement('input');input.type=type;input.value=value||'';
    input.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #c9d7ca;border-radius:9px;margin-top:5px';
    outer.append(input);return {outer,input};
  }
  async function completed(request){
    if(request.status!=='approved'||!classDate(request.confirmedDate))return false;
    const day=await getDoc(doc(db,'teacherAttendance',request.teacherId,'days',request.confirmedDate));
    return Boolean(findMakeupRecord(day.data()?.subjects,request,request.id));
  }
  async function act(request,action,confirmedDate,confirmedTime,note,button){
    if(!auth.currentUser || auth.currentUser.email?.toLowerCase()!=='alislaharabicacademy@gmail.com'||!auth.currentUser.emailVerified)throw Error('Admin access required.');
    if(action==='approved'&&!canConfirmDate(request.originalDate,confirmedDate))throw Error('Confirmed date must be after the original class date.');
    if(action==='approved'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(confirmedTime))throw Error('Choose the new class time.');
    if(action!=='approved'&&note.trim().length<5)throw Error('Please explain the rejection or requested date change (at least 5 characters).');
    button.disabled=true;
    try{
      const requestRef=doc(db,'classRescheduleRequests',request.teacherId,'requests',request.id);
      const latest=await getDoc(requestRef);
      if(!latest.exists())throw Error('Request has been removed. Refresh the queue.');
      const current={...latest.data(),id:request.id};
      if(current.status!==request.status)throw Error('Request status changed. Refresh the queue.');
      if(['rejected','date_change_requested'].includes(current.status)&&action==='approved')throw Error('Teacher must first submit a new or revised request.');
      if(current.status==='approved'&&await completed(current))throw Error('Makeup attendance has already been saved; a completed class cannot be changed.');
      const original=await getDoc(doc(db,'teacherAttendance',current.teacherId,'days',current.originalDate));
      if(action==='approved'&&originalAlreadyMarked(original.data()?.subjects,current))throw Error('Original class attendance already exists. Cannot approve a postponement for a completed class.');
      const update={status:action,reviewedBy:auth.currentUser.email,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp(),
        reviewNote:note.trim().slice(0,500),confirmedDate:action==='approved'?confirmedDate:'',confirmedTime:action==='approved'?confirmedTime:''};
      await updateDoc(requestRef,update);
      status.textContent='✓ '+(action==='approved'?'Reschedule approved and confirmed.':action==='rejected'?'Request rejected.':'Different date requested.')+' Teacher can see the decision in their dashboard.';
      await load();
    }finally{button.disabled=false;}
  }
  async function renderRequest(request){
    const card=node('section');card.className='record';card.style.margin='12px 0';
    card.append(node('h4',request.teacherName||request.teacherId),
      node('p',fmt(request)),
      node('p','Original: '+request.originalDate+' · '+(request.timing||'Time not specified')),
      node('p','Proposed: '+(request.proposedDate?request.proposedDate+' · '+request.proposedTime:'Not decided')),
      node('p','Reason: '+request.reason),
      node('p','Status: '+({
        pending:'🟡 Pending Admin Approval',approved:'✅ Approved',
        rejected:'❌ Rejected',date_change_requested:'🔄 Different Date Requested'
      }[request.status]||request.status)));
    if(request.reviewNote)card.append(node('p','Last admin note: '+request.reviewNote));
    let isComplete=false;
    try{isComplete=await completed(request);}catch(error){card.append(node('p','Cannot verify makeup completion: '+error.message));}
    if(isComplete)card.append(node('p','✅ Makeup completed on '+request.confirmedDate+' · Original date not double-counted.'));
    if(request.status==='approved')card.append(node('p','Confirmed: '+request.confirmedDate+' at '+request.confirmedTime));
    if(isComplete || request.status==='rejected')return card;
    if(request.status==='date_change_requested')return card;
    const date=field('Confirmed Makeup Date',request.confirmedDate||request.proposedDate,'date');
    date.input.min=request.originalDate;
    const time=field('Confirmed Makeup Time',request.confirmedTime||request.proposedTime,'time');
    const note=field('Admin Note',request.reviewNote||'');
    card.append(date.outer,time.outer,note.outer);
    const actions=node('div');actions.className='actions';
    for(const [action,label] of [['approved','✅ Approve & Confirm'],['date_change_requested','🔄 Request Different Date'],['rejected','❌ Reject Request']]){
      const button=node('button',label);button.type='button';
      if(action!=='approved')button.className='secondary';
      button.onclick=async()=>{
        const message=action==='approved'?'Approve this makeup date and time?':action==='rejected'?'Reject this postponement request?':'Ask the teacher to propose a different date?';
        if(!confirm(message))return;
        try{await act(request,action,date.input.value,time.input.value,note.input.value,button);}
        catch(error){status.textContent='Could not update request: '+error.message;}
      };
      actions.append(button);
    }
    card.append(actions);return card;
  }
  async function load(){
    if(busy||!auth.currentUser||auth.currentUser.email?.toLowerCase()!=='alislaharabicacademy@gmail.com'||!auth.currentUser.emailVerified)return;
    busy=true;refresh.disabled=true;root.replaceChildren();status.textContent='Loading teachers and class reschedule requests…';
    try{
      const teachers=await getDocs(collection(db,'teachers'));
      const results=await Promise.allSettled(teachers.docs.map(async teacher=>{
        const snap=await getDocs(collection(db,'classRescheduleRequests',teacher.id,'requests'));
        return snap.docs.map(d=>({id:d.id,...d.data(),teacherId:teacher.id,teacherName:teacher.data().name||'Teacher'}));
      }));
      const failed=results.filter(r=>r.status==='rejected');
      if(failed.length)throw Error('Could not read '+failed.length+' teacher request queue(s): '+failed[0].reason.message);
      const all=results.flatMap(r=>r.value).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      status.textContent='Total requests: '+all.length+' · Pending: '+all.filter(r=>r.status==='pending').length+' · Approved: '+all.filter(r=>r.status==='approved').length;
      if(!all.length)root.append(node('p','No reschedule requests yet.'));
      for(const request of all)root.append(await renderRequest(request));
    }catch(error){status.textContent='Request queue could not load: '+error.message;}
    finally{busy=false;refresh.disabled=false;}
  }
  refresh.onclick=load;
  return {load};
}
