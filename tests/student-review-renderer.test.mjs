import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchingStudentForRequest,requestReviewBucket} from '../existing-student-review-utils.js';

class FakeNode{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.textContent='';this.className='';this.disabled=false;this.open=false;}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children;this.textContent=''}
}
const visibleText=node=>[node.textContent,...node.children.flatMap(child=>
 typeof child==='string'?[child]:[visibleText(child)])].join(' ');
function findNodes(node,predicate){
 const all=[];
 if(predicate(node))all.push(node);
 for(const child of node.children)if(child instanceof FakeNode)all.push(...findNodes(child,predicate));
 return all;
}
function mockFirestore(){
 const table={
  existingStudentRequests:[
   {id:'1'.repeat(32),name:'Maryam',dob:'2010-10-10',course:'muallama',status:'Pending Review',submittedAt:5},
   {id:'2'.repeat(32),name:'Aisha',dob:'2011-01-01',course:'muballigha',status:'Pending Review',submittedAt:4},
   {id:'3'.repeat(32),name:'Fatima',dob:'2012-02-02',course:'alima',status:'Approved',studentCode:'ALIA00007',submittedAt:3},
   {id:'4'.repeat(32),name:'Linked',dob:'2013-03-03',course:'muallama',status:'Pending Review',submittedAt:2},
   {id:'5'.repeat(32),name:'Archived',dob:'2014-04-04',course:'maktab',status:'Rejected',submittedAt:1}
  ],
  students:[
   {id:'student-a',name:'Aisha',dob:'2011-01-01',course:'muballigha',studentCode:'ALIA00005'},
   {id:'student-b',name:'Linked',dob:'2013-03-03',course:'muallama',studentCode:'ALIA00006',existingStudentRequestId:'4'.repeat(32)}
  ],
  courses:[
   {id:'muallama',name:'Muallama'},
   {id:'muballigha',name:'Muballigha'},
   {id:'alima',name:'Aalima'},
   {id:'maktab',name:'Maktab'}
  ],
  existingStudentIntakeLinks:[]
 };
 const updates=[],reads=[];
 function snapshot(collectionName,item){
  const id=item.id;
  return {id,ref:{collection:collectionName,id},data(){
   const data={...item};delete data.id;
   if(typeof data.submittedAt==='number'){
    const millis=data.submittedAt;
    data.submittedAt={toMillis:()=>millis,toDate:()=>new Date(millis*1000)};
   }
   return data;
  },exists(){return true}};
 }
 const api={
  table,updates,reads,
  collection(_db,name){return {collection:name}},
  doc(_db,name,id){return {collection:name,id}},
  async getDocs(ref){reads.push(ref.collection);return {docs:table[ref.collection].map(item=>snapshot(ref.collection,item))}},
  async getDoc(ref){const item=table[ref.collection].find(row=>row.id===ref.id);
   return item?snapshot(ref.collection,item):{exists:()=>false};},
  async updateDoc(ref,patch){const item=table[ref.collection].find(row=>row.id===ref.id);
   if(!item)throw Error('missing request');
   Object.assign(item,patch);updates.push({ref,patch});},
  isProfilePhoto(){return false},
  academyCourseLabel(x){return String(x||'')},
  matchingStudentForRequest,requestReviewBucket,
  isVerifiedAcademyAdmin(){return true},
  serverTimestamp(){return 'now'},
  Timestamp:{fromDate(x){return {toMillis:()=>x.getTime()}}},
  writeBatch(){throw Error('not expected')},
  setDoc(){throw Error('not expected')}
 };
 return api;
}
async function loadModule(stubs){
 const source=readFileSync(new URL('../existing-student-intake-admin.js',import.meta.url),'utf8')
  .replace(/^import .*?;\s*$/gm,'');
 globalThis.__studentReviewTestStubs=stubs;
 const prefix='const {collection,doc,getDoc,getDocs,query,limit,setDoc,updateDoc,serverTimestamp,Timestamp,writeBatch,isProfilePhoto,academyCourseLabel,matchingStudentForRequest,requestReviewBucket,isVerifiedAcademyAdmin}=globalThis.__studentReviewTestStubs;\n';
 const encoded=Buffer.from(prefix+source,'utf8').toString('base64');
 return import('data:text/javascript;base64,'+encoded+'#test-'+(globalThis.__reviewImportCount=(globalThis.__reviewImportCount||0)+1));
}
function renderUI(){
 const els=new Map();
 const ids=['existingIntakeAdminStatus','existingIntakeCreateLink','existingIntakeCopyLink',
  'existingIntakeCloseLink','existingIntakeRefresh'];
 for(const prefix of ['existingIntakePending','existingIntakeApproved','existingIntakeClosed'])
  for(const suffix of ['Count','Courses','Detail','Title','Students','Back','Refresh'])
   ids.push(prefix+suffix);
 for(const id of ids)els.set(id,new FakeNode());
 globalThis.document={getElementById:id=>els.get(id),createElement:tag=>new FakeNode(tag),
  createTextNode:content=>String(content)};
 globalThis.confirm=()=>true;
 return els;
}
test('dedicated Pending and Approved pages start with ALL course tiles and show students only on course click',async()=>{
 const firestore=mockFirestore(),ui=renderUI();
 const {initExistingStudentIntakeAdmin}=await loadModule(firestore);
 const selected=[];
 const component=initExistingStudentIntakeAdmin({db:{},auth:{currentUser:{uid:'verified-admin',email:'admin@example.com',emailVerified:true}},
  onReview:(id,data)=>selected.push({id,data})});
 await component.refresh();
 const pendingGrid=ui.get('existingIntakePendingCourses');
 const approvedGrid=ui.get('existingIntakeApprovedCourses');
 const archivedGrid=ui.get('existingIntakeClosedCourses');
 assert.equal(findNodes(pendingGrid,n=>n.tagName==='BUTTON').length,4,'all four courses are shown, including zero-form courses');
 assert.equal(findNodes(approvedGrid,n=>n.tagName==='BUTTON').length,4);
 assert.equal(findNodes(archivedGrid,n=>n.tagName==='BUTTON').length,4);
 assert.match(ui.get('existingIntakePendingCount').textContent,/2 pending/);
 assert.match(ui.get('existingIntakeApprovedCount').textContent,/2 approved/);
 assert.match(ui.get('existingIntakeClosedCount').textContent,/1 closed/);
 assert.equal(ui.get('existingIntakePendingDetail').hidden,true,'pending page opens on the All Courses grid');
 assert.equal(ui.get('existingIntakeApprovedDetail').hidden,true);
 assert.equal(findNodes(pendingGrid,n=>n.className==='intake-form-row').length,0,'no student forms listed on the All Courses screen');
 assert.equal(firestore.table.existingStudentRequests.find(row=>row.id==='4'.repeat(32)).status,'Approved');
 assert.equal(firestore.table.existingStudentRequests.find(row=>row.id==='4'.repeat(32)).studentCode,'ALIA00006');
 assert.equal(firestore.table.students.length,2);
 const pendingMuallama=findNodes(pendingGrid,n=>n.tagName==='BUTTON'&&visibleText(n).includes('Muallama'))[0];
 assert.ok(pendingMuallama);
 pendingMuallama.onclick();
 assert.equal(ui.get('existingIntakePendingDetail').hidden,false);
 assert.equal(ui.get('existingIntakePendingCourses').hidden,true);
 assert.match(ui.get('existingIntakePendingTitle').textContent,/Muallama.*1 pending/);
 assert.match(visibleText(ui.get('existingIntakePendingStudents')),/Maryam/);
 assert.doesNotMatch(visibleText(ui.get('existingIntakePendingStudents')),/Fatima|Aisha|Linked/);
 const review=findNodes(ui.get('existingIntakePendingStudents'),n=>n.tagName==='BUTTON'&&n.textContent.includes('Review & Register'));
 assert.equal(review.length,1);
 review[0].onclick();
 assert.equal(selected.length,1);
 assert.equal(selected[0].data.name,'Maryam');
 ui.get('existingIntakePendingBack').onclick();
 assert.equal(ui.get('existingIntakePendingDetail').hidden,true);
 assert.equal(ui.get('existingIntakePendingCourses').hidden,false);
 const approvedMuallama=findNodes(approvedGrid,n=>n.tagName==='BUTTON'&&visibleText(n).includes('Muallama'))[0];
 approvedMuallama.onclick();
 assert.match(visibleText(ui.get('existingIntakeApprovedStudents')),/Linked/);
 assert.match(visibleText(ui.get('existingIntakeApprovedStudents')),/ALIA00006/);
 assert.doesNotMatch(visibleText(ui.get('existingIntakeApprovedStudents')),/Maryam|Aisha/);
 assert.equal(findNodes(ui.get('existingIntakeApprovedStudents'),n=>n.tagName==='BUTTON'&&n.textContent.includes('Register')).length,0);
 await component.openPage('studentApproved');
 assert.equal(ui.get('existingIntakeApprovedDetail').hidden,true,'returning to Approved Forms starts at All Courses');
 assert.equal(ui.get('existingIntakeApprovedCourses').hidden,false);
});
test('pending duplicate is manually closed and then appears only in Closed Forms, without issuing new ID',async()=>{
 const firestore=mockFirestore(),ui=renderUI();
 const {initExistingStudentIntakeAdmin}=await loadModule(firestore);
 const component=initExistingStudentIntakeAdmin({db:{},auth:{currentUser:{uid:'verified-admin',email:'admin@example.com',emailVerified:true}},
  onReview:()=>{}});
 await component.refresh();
 const pendingGrid=ui.get('existingIntakePendingCourses');
 const muballigha=findNodes(pendingGrid,n=>n.tagName==='BUTTON'&&visibleText(n).includes('Muballigha'))[0];
 muballigha.onclick();
 const pendingDetails=ui.get('existingIntakePendingStudents');
 assert.match(visibleText(pendingDetails),/Aisha/);
 assert.match(visibleText(pendingDetails),/DUPLICATE CHECK/);
 const closeButton=findNodes(pendingDetails,n=>n.tagName==='BUTTON'&&n.textContent.includes('Already Registered'));
 assert.equal(closeButton.length,1);
 await closeButton[0].onclick();
 const archived=firestore.table.existingStudentRequests.find(row=>row.id==='2'.repeat(32));
 assert.equal(archived.status,'Duplicate',ui.get('existingIntakeAdminStatus').textContent);
 assert.equal(archived.studentId,'student-a');
 assert.equal(archived.studentCode,'ALIA00005');
 assert.equal(firestore.table.students.length,2,'closing duplicate never creates a student');
 assert.match(ui.get('existingIntakePendingCount').textContent,/1 pending/);
 assert.match(ui.get('existingIntakeClosedCount').textContent,/2 closed/);
 const closedMuballigha=findNodes(ui.get('existingIntakeClosedCourses'),n=>n.tagName==='BUTTON'&&visibleText(n).includes('Muballigha'))[0];
 closedMuballigha.onclick();
 assert.match(visibleText(ui.get('existingIntakeClosedStudents')),/Aisha/);
 assert.match(visibleText(ui.get('existingIntakeClosedStudents')),/ALIA00005/);
 const approvedMuballigha=findNodes(ui.get('existingIntakeApprovedCourses'),n=>n.tagName==='BUTTON'&&visibleText(n).includes('Muballigha'))[0];
 approvedMuballigha.onclick();
 assert.doesNotMatch(visibleText(ui.get('existingIntakeApprovedStudents')),/Aisha/);
});
