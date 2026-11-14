/* node --test tests/certificate-vector.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
const code=readFileSync(new URL('../premium-certificate-svg.js',import.meta.url),'utf8')
 .replace(/^import\s.+$/gm,'').replace(/^export /gm,'');
const studio=new Function(code+'\nreturn {premiumCertificatePages,sampleCertificate,CERTIFICATE_TYPES,classifyCompetitionAward};')();
for(const [kind] of studio.CERTIFICATE_TYPES){
 test('Premium '+kind+' template is full-page SVG with original Academy logo and SAMPLE warning in preview',()=>{
  const pages=studio.premiumCertificatePages(kind,studio.sampleCertificate(kind));
  assert.ok(pages.length>0);
  for(const svg of pages){
   assert.match(svg,/^<svg /);assert.match(svg,/<\/svg>$/);
   assert.match(svg,/href="1_20261112_080707_0000\.png"/);
   assert.match(svg,/SAMPLE - NOT VALID/);
   assert.match(svg,/url\(#gold\)/);
   assert.match(svg,/cornerPanel|AL ISLAH|CERTIFICATE|RESULT/);
  }
 });
}
test('Landscape certificate has five independent premium course/date/result panels',()=>{
 const svg=studio.premiumCertificatePages('exam',{...studio.sampleCertificate('exam'),previewMode:false})[0];
 assert.match(svg,/Academic Year/);assert.match(svg,/Exam Date/);assert.match(svg,/Student ID/);assert.match(svg,/Result/);
 assert.equal((svg.match(/fill="#FFFCF6"/g)||[]).length,5);
 assert.doesNotMatch(svg,/SAMPLE - NOT VALID/);
});
test('Competition roles map to distinct premium templates',()=>{
 assert.equal(studio.classifyCompetitionAward('First Prize'),'winner');
 assert.equal(studio.classifyCompetitionAward('Participation'),'participation');
 assert.equal(studio.classifyCompetitionAward('Event Volunteer'),'event');
});
test('Failed exam never receives an excellence certificate',()=>{
 const source=readFileSync(new URL('../exam-documents.js',import.meta.url),'utf8');
 assert.match(source,/const kind=record\.passed===true/);
 assert.match(source,/'exam-achievement'/);
 assert.match(source,/'exam-participation'/);
 const svg=studio.premiumCertificatePages('exam-participation',{...studio.sampleCertificate('exam'),passed:false,previewMode:false})[0];
 assert.match(svg,/EXAMINATION PARTICIPATION/);
 assert.doesNotMatch(svg,/ACADEMIC EXCELLENCE/);
});
test('Ordinary passing exams receive ACHIEVEMENT, not an inflated EXCELLENCE award',()=>{
 const svg=studio.premiumCertificatePages('exam-achievement',{...studio.sampleCertificate('exam'),percent:55,passed:true,previewMode:false})[0];
 assert.match(svg,/CERTIFICATE OF/);
 assert.match(svg,/ACHIEVEMENT/);
 assert.doesNotMatch(svg,/ACADEMIC EXCELLENCE/);
});
test('Portrait result statement paginates large marksheets to avoid rows overlapping totals',()=>{
 const sample=studio.sampleCertificate('results');
 const subjects=Array.from({length:32},(_,i)=>({name:'Subject '+(i+1),score:40,max:50}));
 const pages=studio.premiumCertificatePages('results',{...sample,previewMode:false,subjects});
 assert.equal(pages.length,5);
 assert.ok(pages[4].includes('TOTAL'));
 assert.ok(!pages[0].includes('TOTAL'));
});
test('Digital PDF export uses exact same SVG source as web preview instead of a separate plain document',()=>{
 const src=readFileSync(new URL('../premium-certificate-svg.js',import.meta.url),'utf8');
 assert.match(src,/pages=premiumCertificatePages\(type,documentRecord\)/);
 assert.match(src,/await pdf\.svg\(svg/);
 const documents=readFileSync(new URL('../exam-documents.js',import.meta.url),'utf8');
 assert.match(documents,/return createPremiumVectorPdf\('results',record\)/);
 assert.match(documents,/createPremiumVectorPdf\(classifyCompetitionAward\(certificate\.award\),certificate\)/);
});
