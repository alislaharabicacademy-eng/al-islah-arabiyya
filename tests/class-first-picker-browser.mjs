import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const url='http://127.0.0.1:8766/tests/class-first-student-picker-fixture.html';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>Boolean(window.qaPickers?.competitionStudent));
  const all=['competitionStudent','examResultStudent','adminStudentSelector','homepageWinnerResult1'];
  for(const id of all){
   const dropdown=page.locator('#'+id);
   assert.equal(await dropdown.isDisabled(),true,id+' should be disabled before class selection');
   assert.equal(await dropdown.locator('option').count(),1,id+' should not list any student before class');
  }
  const cert=page.locator('#competitionStudent');
  const classSelect=page.locator('#competitionStudentClass');
  const groups=await classSelect.locator('option').allTextContents();
  assert.ok(groups.some(label=>label.includes('Muballigha · Year 1')));
  assert.ok(groups.some(label=>label.includes('Muballigha · Year 2')));
  assert.ok(groups.some(label=>label.includes('Maktab · Batch 1')));
  assert.ok(groups.some(label=>label.includes('Maktab · Batch 2')));
  await classSelect.selectOption({label:groups.find(x=>x.includes('Maktab · Batch 1'))});
  assert.equal(await cert.locator('option').count(),2);
  assert.equal(await cert.locator('option').nth(1).textContent(),'Anas · ALIA00004');
  await cert.selectOption('S4');
  assert.equal(await cert.inputValue(),'S4');
  const batchTwo=groups.find(x=>x.includes('Maktab · Batch 2'));
  await classSelect.selectOption({label:batchTwo});
  assert.equal(await cert.inputValue(),'');
  assert.equal(await cert.locator('option').count(),2);
  assert.match(await cert.locator('option').nth(1).textContent(),/Rahma/);
  await page.evaluate(()=>window.qaChoose('S3'));
  assert.match(await classSelect.locator('option:checked').textContent(),/Muballigha · Year 2/);
  assert.equal(await cert.inputValue(),'S3');
  await page.evaluate(()=>window.qaRefresh());
  assert.equal(await cert.inputValue(),'S3');
  const exam=page.locator('#examResultStudent');
  const examGroups=await page.locator('#examResultStudentClass option').allTextContents();
  await page.locator('#examResultStudentClass').selectOption({label:examGroups.find(x=>x.includes('Muallama'))});
  assert.equal(await exam.locator('option').count(),2);
  assert.match(await exam.locator('option').nth(1).textContent(),/Amina/);
  const preview=page.locator('#adminStudentSelector');
  assert.equal(await page.locator('#adminStudentSelectorClass').count(),1);
  assert.equal(await preview.locator('option').count(),1);
  const winner=page.locator('#homepageWinnerResult1');
  const winnerGroups=await page.locator('#homepageWinnerResult1Class option').allTextContents();
  await page.locator('#homepageWinnerResult1Class').selectOption({label:winnerGroups.find(x=>x.includes('Muballigha · Year 2'))});
  assert.equal(await winner.locator('option').count(),2);
  assert.match(await winner.locator('option').nth(1).textContent(),/Haniya/);
  assert.deepEqual(errors,[]);
  await mkdir('class-first-picker-proof',{recursive:true});
  await page.screenshot({path:'class-first-picker-proof/class-first-'+viewport.width+'.png',fullPage:true});
  console.log('PASS real Chrome class-first flow at '+viewport.width+'px, with only class students shown');
  await page.close();
 }
}finally{await browser.close();}
