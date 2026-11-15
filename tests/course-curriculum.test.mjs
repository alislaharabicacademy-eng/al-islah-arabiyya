import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const curriculumSource=readFileSync(new URL('course-curriculum.js',root),'utf8');
const sandbox={window:{}};
runInNewContext(curriculumSource,sandbox);
const curriculum=sandbox.window.AcademyCurriculum;

test('Muballiga 1st and 2nd year books remain distinct and numbered',()=>{
 const years=curriculum.years('muballigha',{});
 assert.equal(years.length,2);
 assert.equal(years[0].year,1);
 assert.equal(years[0].subjects.length,8);
 assert.equal(years[1].year,2);
 assert.equal(years[1].subjects.length,9);
});

test('Aalima syllabus is limited to 3rd year',()=>{
 const years=curriculum.years('alima',{});
 assert.equal(years.length,1);
 assert.equal(years[0].year,3);
 assert.equal(years[0].subjects.length,7);
});

test('Muallama has its own kitab list',()=>{
 assert.deepEqual([...curriculum.books('muallama',{})],['Deeniyath – Part 1 & 2','Suvarka Nagaigal']);
});

test('Muballiga award description mentions completion of 1st and 2nd years',()=>{
 const s=curriculum.description('muballigha','General description.');
 assert.match(s,/1st and 2nd years/i);
 assert.match(s,/Muballiga Sanad/);
 assert.equal(curriculum.description('muballigha',s),s);
});

test('Aalima award description requires prior Muballiga and completed 3rd year',()=>{
 const s=curriculum.description('alima','Advanced studies.');
 assert.match(s,/both years of the Muballiga course/i);
 assert.match(s,/3rd year of Aalima/i);
 assert.match(s,/Aalima Sanad/);
 assert.equal(curriculum.description('alima',s),s);
});

test('Muballiga description stays short even if stored records contain previous long copy',()=>{
 const previous='Two-year programme for continued Islamic study. New admissions are accepted for Muballiga 1st Year only. Students who successfully complete both the 1st and 2nd years of the Muballiga course may finish their studies and receive the Muballiga Sanad. Students who wish to continue may apply for Aalima 3rd Year separately, after paying the additional Aalima admission fee and receiving Academy approval.';
 const text=curriculum.description('muballigha',previous);
 assert.match(text,/Two-year program for continued Islamic Studies/);
 assert.match(text,/Muballiga Sanad/);
 assert.doesNotMatch(text,/Aalima|admission fee/);
 assert.equal(text,curriculum.description('muballigha',text));
});

test('Unrelated course descriptions are unchanged',()=>{
 assert.equal(curriculum.description('muallama','Muallama course'),'Muallama course');
});

test('Public course lists and details all display the full Sanad description',()=>{
 for(const file of ['index.html','all-courses.html','courses.html']){
  const html=readFileSync(new URL(file,root),'utf8');
  assert.match(html,/course-curriculum\.js/);
  assert.match(html,/AcademyCurriculum\.description/);
 }
 const admin=readFileSync(new URL('admin.html',root),'utf8');
 assert.match(admin,/AcademyCurriculum\.description\(id,data\.description\)/);
});
