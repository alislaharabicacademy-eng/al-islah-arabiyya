import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../course-public-copy.js',import.meta.url),'utf8');
const env={};runInNewContext(source,env);
const {enrich,missing}=env.AcademyCoursePublicCopy;
const html=readFileSync(new URL('../courses.html',import.meta.url),'utf8');

test('All known courses have appropriate public eligibility when saved text is empty',()=>{
 for(const id of ['muallama','muballigha','alima','boys-hifz','childrens-quran-maktab','tajweed-for-girls']){
  const value=enrich(id,{name:id,eligibility:''});
  assert.ok(value.eligibility.split('\n').length>=3,id);
  assert.match(value.description,/\w+/);
  assert.match(value.syllabus,/\w+/);
  assert.ok(!/soon|announced|published by the madrasa/i.test(value.eligibility),id);
  assert.ok(!/soon|announced/i.test(value.description),id);
 }
});
test('Saved admission and course details remain the source of truth',()=>{
 const saved={
  name:'Muallama',duration:'18 Months',
  eligibility:'Minimum Age: 16 years\nLanguage Proficiency: Tamil reading',
  description:'Academy verified course description',syllabus:'Academy verified syllabus',
  fees:'₹500 per month',timings:'Monday 7 pm',kitabs:['Academy chosen textbook']
 };
 const enriched=enrich('muallama',saved);
 for(const key of ['name','duration','eligibility','description','syllabus','fees','timings'])
  assert.equal(enriched[key],saved[key],key);
 assert.equal(enriched.kitabs[0],saved.kitabs[0]);
 assert.equal(saved.eligibility,'Minimum Age: 16 years\nLanguage Proficiency: Tamil reading');
});
test('Legacy placeholders are replaced without publishing invented minimum marks, age, fees or durations',()=>{
 assert.equal(missing('Eligibility criteria will be published by the madrasa.'),true);
 assert.equal(missing('Eligibility criteria will be announced by the madrasa.'),true);
 assert.equal(missing('To be announced'),true);
 assert.equal(missing("Qur'an memorisation (Hifz) programme for boys. Full course details will be published soon."),true);
 const copy=enrich('boys-hifz',{
  name:'Boys Hifz Class',
  eligibility:'Eligibility criteria will be announced by the madrasa.',
  duration:'To be announced',fees:'',timings:''
 });
 assert.equal(copy.duration,'');
 assert.match(copy.eligibility,/memorisation/i);
 assert.match(copy.fees,/Admissions/);
 assert.match(copy.timings,/Academy/);
 assert.ok(!/\d+ (?:years?|months?|standard)/i.test(copy.eligibility));
});
test('Newly added custom courses receive neutral, relevant fallback without adding a new course',()=>{
 const x=enrich('calligraphy',{name:'Arabic Calligraphy'});
 assert.match(x.eligibility,/Arabic Calligraphy/);
 assert.match(x.description,/Arabic Calligraphy/);
 assert.equal(x.duration,'');
 assert.match(x.publicLearningMaterials,/course topics/);
});
test('Public Course Details page uses fallbacks only while keeping admin-provided eligibility formatting',()=>{
 assert.match(html,/<script src="\.\/course-public-copy\.js"><\/script>/);
 assert.match(html,/AcademyCoursePublicCopy\.enrich\(id,saved\)/);
 assert.match(html,/AcademyEligibility\.render\(document\.getElementById\('eligibility'\),x\.eligibility\)/);
 assert.match(html,/document\.getElementById\('duration'\)\.hidden=!x\.duration/);
 assert.match(html,/li\.textContent=x\.publicLearningMaterials/);
 assert.doesNotMatch(html,/\|\|'Details will be announced soon\.'/);
});
