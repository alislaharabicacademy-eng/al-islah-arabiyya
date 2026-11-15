import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{runInNewContext}from'node:vm';
const source=readFileSync(new URL('../course-eligibility.js',import.meta.url),'utf8');
const env={};runInNewContext(source,env);
const {parse,render}=env.AcademyEligibility;
const normal=value=>JSON.parse(JSON.stringify(parse(value)));
test('Previously merged Muallama criteria display as two separate labelled points',()=>{
 const entries=normal('Educational Qualification 10th Standard Pass or Above Language Proficiency Ability to Read and Write Tamil');
 assert.equal(entries.length,2);
 assert.deepEqual(entries.map(({label,detail})=>[label,detail]),[
  ['Educational Qualification','10th Standard Pass or Above'],
  ['Language Proficiency','Ability to Read and Write Tamil']
 ]);
});
test('Admin multiline points each get their own entry',()=>{
 const list=normal('Educational Qualification: 10th Standard Pass or Above\nLanguage Proficiency: Ability to Read and Write Tamil\nMinimum Age: 16 Years');
 assert.equal(list.length,3);assert.deepEqual(list.map(x=>x.label),['Educational Qualification','Language Proficiency','Minimum Age']);
});
test('Pasted numbered, hyphen and bullet formats retain each point, no numbers repeated',()=>{
 const list=normal('1. 10th Pass\n2) Tamil reading\n- Qaidha completed\n• Guardian permission\nTamil and Arabic knowledge');
 assert.deepEqual(list.map(x=>x.detail),['10th Pass','Tamil reading','Qaidha completed','Guardian permission','Tamil and Arabic knowledge']);
});
test('Semicolons and HTML line-break pasted by admins are separated safely',()=>{
 assert.deepEqual(normal('Age: 16; Tamil: Read and Write<br>Previous Qualification: Qaidha').map(x=>x.label),['Age','Tamil','Previous Qualification']);
});
test('No fabricated requirements when saved criteria are a single sentence',()=>{
 assert.equal(normal('Applicants must be able to read Arabic.').length,1);
 assert.equal(normal('Eligibility criteria will be published by the madrasa.').length,1);
 assert.deepEqual(normal(''),[]);
});
test('DOM renderer writes literal text, never trusted HTML',()=>{
 function node(tag){
  return {tagName:tag,children:[],textContent:'',className:'',
   append(...elements){this.children.push(...elements)},
   replaceChildren(...elements){this.children=elements},
   ownerDocument:doc};
 }
 const doc={createElement:tag=>node(tag)},target=node('ul');
 render(target,'Educational Qualification: <img src=x onerror=alert(1)>\nLanguage Proficiency: Tamil reading');
 assert.equal(target.children.length,2);
 assert.equal(target.children[0].children[0].tagName,'strong');
 assert.equal(target.children[0].children[1].textContent,'<img src=x onerror=alert(1)>');
 assert.equal(target.children[1].children[1].textContent,'Tamil reading');
});
test('Course page uses a rendered UL and Admin course editor shows the live numbered preview',()=>{
 const publicHtml=readFileSync(new URL('../courses.html',import.meta.url),'utf8');
 assert.match(publicHtml,/<ul id="eligibility" class="eligibility-points"/);
 assert.match(publicHtml,/<script src="\.\/course-eligibility\.js"><\/script>/);
 assert.match(publicHtml,/AcademyEligibility\.render\(document\.getElementById\('eligibility'\),x\.eligibility\)/);
 assert.doesNotMatch(publicHtml,/\['name','duration','description','eligibility','syllabus'/);
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.match(admin,/Eligibility Criteria — One Point Per Line/);
 assert.match(admin,/id="eligibilityPreview"/);
 assert.match(admin,/renderEligibilityPreview\(\)/);
 assert.match(admin,/addEventListener\('input',renderEligibilityPreview\)/);
});
