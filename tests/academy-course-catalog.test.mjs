import test from 'node:test';
import assert from 'node:assert/strict';
import {
 academyCourseLabel,validAcademyCourseId,normaliseAcademyCourseList
} from '../academy-course-catalog-core.js';

test('Academy Admin and student forms share one clean course display name',()=>{
 assert.equal(academyCourseLabel('  Muballigha  — 2 Years '),'Muballigha');
 assert.equal(academyCourseLabel(' Tajweed  for   Girls '),'Tajweed for Girls');
 assert.equal(academyCourseLabel('Alima'),'Alima');
});
test('student class picker includes new published Academy courses, never hidden/config',()=>{
 const result=normaliseAcademyCourseList([
  {id:'muallama',data:{name:'Muallama',published:true}},
  {id:'tajweed-for-girls',data:{name:'Tajweed for Girls',published:true}},
  {id:'childrens-quran-maktab',data:{name:"Children's Quran Maktab",published:true}},
  {id:'alima',data:{name:'Alima',published:true}},
  {id:'hidden-course',data:{name:'Hidden Course',published:false}},
  {id:'admission-form-config',data:{name:'Admission Settings',published:true}},
  {id:'untitled',data:{published:true}},
  {id:'muallama',data:{name:'Duplicate Muallama',published:true}}
 ]);
 assert.deepEqual(result.map(x=>x.id),[
  'alima','childrens-quran-maktab','muallama','tajweed-for-girls'
 ]);
 assert.equal(result.find(x=>x.id==='tajweed-for-girls').name,'Tajweed for Girls');
 assert.ok(!result.some(x=>x.id==='hidden-course'));
});
test('course document identifiers remain canonical and cannot read arbitrary collections',()=>{
 assert.equal(validAcademyCourseId('tajweed-for-girls'),true);
 assert.equal(validAcademyCourseId('adminAccess/foo'),false);
 assert.equal(validAcademyCourseId('admission-form-config'),false);
 assert.equal(validAcademyCourseId('../students'),false);
 assert.equal(validAcademyCourseId(''),false);
});
