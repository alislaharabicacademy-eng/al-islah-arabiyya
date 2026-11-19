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
 return import('data:text/javascript;base64,'+encoded);
}
function renderUI(){
 const els=new Map();
 const ids=['existingIntakeAdminStatus','existingIntakeRequests','existingIntakeCreateLink','existingIntakeCopyLink','existingIntakeCloseLink','existingIntakeRefresh'];
 for(const id of ids)els.set(id,new FakeNode());
 globalThis.document={getElementById:id=>els.get(id),createElement:tag=>new FakeNode(tag),
  createTextNode:content=>String(content)};
 globalThis.confirm=()=>true;
 return els;
}
test('real Admin review renderer groups course folders, synchronizes approvals, closes duplicates without new ALIA',async()=>{
 const firestore=mockFirestore(),ui=renderUI();
 const {initExistingStudentIntakeAdmin}=await loadModule(firestore);
 const selected=[];
 const component=initExistingStudentIntakeAdmin({db:{},auth:{currentUser:{uid:'verified-admin',email:'admin@example.com',emailVerified:true}},
  onReview:(id,data)=>selected.push({id,data})});
 await component.refresh();
 const root=ui.get('existingIntakeRequests'),labels=findNodes(root,n=>n.tagName==='SUMMARY').map(n=>n.textContent);
 assert.ok(labels.some(x=>x==='📥 Pending Forms (1)'),JSON.stringify(labels));
 assert.ok(labels.some(x=>x==='✅ Approved Forms (2)'),JSON.stringify(labels));
 assert.ok(labels.some(x=>x.includes('Possible Duplicate Forms')&&x.includes('(1)')));
 assert.ok(labels.some(x=>x.includes('Closed / Rejected Forms (1)')));
 assert.ok(labels.some(x=>x.includes('Muallama · 1 pending')));
 assert.ok(labels.some(x=>x.includes('Muallama · 1 approved')));
 assert.ok(labels.some(x=>x.includes('Muballigha · 1 to verify')));
 assert.equal(firestore.table.existingStudentRequests.find(row=>row.id==='4'.repeat(32)).status,'Approved');
 assert.equal(firestore.table.existingStudentRequests.find(row=>row.id==='4'.repeat(32)).studentCode,'ALIA00006');
 assert.equal(firestore.table.students.length,2);
 assert.equal(firestore.reads.includes('students'),true);
 const review=findNodes(root,n=>n.tagName==='BUTTON'&&n.textContent.includes('Review & Register'));
 assert.equal(review.length,2,'one regular and one duplicate-review action');
 review[0].onclick();
 assert.equal(selected.length,1);
 assert.equal(selected[0].data.name,'Maryam');
 const duplicate=findNodes(root,n=>n.tagName==='BUTTON'&&n.textContent.includes('Confirm Already Registered'));
 assert.equal(duplicate.length,1);
 await duplicate[0].onclick();
 const archived=firestore.table.existingStudentRequests.find(row=>row.id==='2'.repeat(32));
 assert.equal(archived.status,'Duplicate');
 assert.equal(archived.studentId,'student-a');
 assert.equal(archived.studentCode,'ALIA00005');
 assert.equal(firestore.table.students.length,2,'duplicate archival must not create official students');
 assert.ok(firestore.updates.some(x=>x.patch.status==='Duplicate'));
 assert.match(visibleText(ui.get('existingIntakeRequests')),/Closed \/ Rejected Forms \(2\)/);
});
