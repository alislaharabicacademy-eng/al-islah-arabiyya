import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId:'demo-class-reschedule',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
test('teacher needs an approved request before makeup class attendance can be saved',async()=>{
  try{
    const teacherId='teacher-wafa';
    const originalDate='2026-11-15',confirmedDate='2026-11-17',requestId='reschedule-abc';
    const requestPath='classRescheduleRequests/'+teacherId+'/requests/'+requestId;
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async admin=>{
      await setDoc(doc(admin.firestore(),'teacherAccess',teacherId),{name:'Wafa',email:'wafa@example.com'});
    });
    const context=env.authenticatedContext('wafa-uid',{email:'wafa@example.com',email_verified:true});
    const db=context.firestore();
    const request={
      teacherId,teacherName:'Wafa',teacherEmail:'wafa@example.com',
      course:'muballigha',courseName:'Muballigha',batch:'',
      subject:'DurusMeezan',timing:'2:30 - 3:30',
      originalDate,proposedDate:confirmedDate,proposedTime:'16:00',
      reason:'Medical appointment',status:'pending',
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    };
    const ref=doc(db,requestPath);
    await assertSucceeds(setDoc(ref,request));
    const created=await assertSucceeds(getDoc(ref));
    assert.equal(created.data().status,'pending');
    await assertFails(updateDoc(ref,{status:'approved',confirmedDate,confirmedTime:'16:00'}));
    const key='muballigha__DurusMeezan__makeup__'+requestId;
    const attendance={status:'present',reason:'',leaveStatus:null,course:'muballigha',batch:'',
      subject:'DurusMeezan',timing:'16:00',classType:'makeup',
      rescheduleRequestId:requestId,originalDate,
      students:{studentA:{name:'Student A',status:'present'}}};
    const day='teacherAttendance/'+teacherId+'/days/'+confirmedDate;
    await assertFails(setDoc(doc(db,day),{date:confirmedDate,teacherId,email:'wafa@example.com',markedAt:serverTimestamp(),subjects:{[key]:attendance}}));
    await env.withSecurityRulesDisabled(async admin=>{
      await updateDoc(doc(admin.firestore(),requestPath),{
        status:'approved',confirmedDate,confirmedTime:'16:00',
        reviewedBy:'alislaharabicacademy@gmail.com',reviewedAt:serverTimestamp()
      });
    });
    await assertFails(setDoc(doc(db,'teacherAttendance/'+teacherId+'/days/2026-11-18'),{
      date:'2026-11-18',teacherId,email:'wafa@example.com',markedAt:serverTimestamp(),subjects:{[key]:attendance}
    }));
    await assertSucceeds(setDoc(doc(db,day),{
      date:confirmedDate,teacherId,email:'wafa@example.com',markedAt:serverTimestamp(),subjects:{[key]:attendance}
    }));
    await assertFails(updateDoc(doc(db,day),{'subjects.'+key+'.students.studentA.status':'absent'}));
    const stranger=env.authenticatedContext('someone-else',{email:'stranger@example.com',email_verified:true});
    await assertFails(getDoc(doc(stranger.firestore(),requestPath)));
  }finally{await env.cleanup();}
});
