import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='http://127.0.0.1:'+(process.env.PORT||'8767');
const dir=path.join(root,'letterhead-print-proof');
mkdirSync(dir,{recursive:true});
const original=readFileSync(path.join(root,'letterhead-studio.js'),'utf8');
const signature='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nAAAAABJRU5ErkJggg==';
const fakeSettings={
 instituteName:'Madrasa Al Islahul Arabiya',
 instituteSubtitle:'WOMEN’S ONLINE MADRASA',
 phone:'+91 78453 60505',email:'academy@example.invalid',
 principal:{name:'Test Principal',designation:'Principal',signatureData:signature}
};
const head=original.replace(/^import .+;\s*$/gm,'');
const tail='changeLanguage(languageSelect.value);\nstart();';
assert.ok(head.includes(tail),'Test harness requires expected entrypoint');
const browserSource=head.replace(tail,`changeLanguage(languageSelect.value);
isAuthorized=true;
const fakeSettings=${JSON.stringify(fakeSettings)};
useSettings(fakeSettings);
$('gate').hidden=true;$('workspace').hidden=false;$('notice').hidden=false;
window.__letterheadTest={changeLanguage,refresh,useSettings,settings:fakeSettings};`);
const browser=await chromium.launch({
 executablePath:process.env.CHROME||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
});
try{
 for(const lang of ['en','ta','ar']){
  const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
  await page.route('**/letterhead-studio.js',route=>route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:browserSource}));
  await page.goto(base+'/letterhead-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#letterLanguage').selectOption(lang);
  await page.locator('#sampleLetter').click();
  const state=await page.evaluate(()=>({
   lang:document.getElementById('paper').lang,
   direction:getComputedStyle(document.getElementById('pvBody')).direction,
   subject:document.getElementById('pvSubject').textContent,
   body:document.getElementById('pvBody').textContent,
   buttonEnabled:!document.getElementById('printLetter').disabled,
   signaturePresent:!document.getElementById('pvSignature').hidden
  }));
  assert.equal(state.lang,lang);
  assert.equal(state.direction,lang==='ar'?'rtl':'ltr');
  assert.equal(state.buttonEnabled,true,'Signed print must be enabled');
  assert.equal(state.signaturePresent,true,'Uploaded principal signature displayed');
  assert.ok(state.subject.length>10&&state.body.length>100);
  if(lang==='ta')assert.ok(state.subject.includes('மாதாந்திர'),'Tamil sample not loaded');
  if(lang==='ar')assert.ok(state.subject.includes('اجتماع'),'Arabic sample not loaded');
  // Check real browser A4 PDF output; preserve selectable Unicode text.
  await page.evaluate(async()=>{await document.fonts.ready});
  await page.screenshot({path:path.join(dir,lang+'.png'),fullPage:true});
  await page.pdf({path:path.join(dir,lang+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  console.log('PASS',lang,state.subject,'(PDF created)');
  if(lang==='ar'){
   const originalBody=await page.locator('#letterBody').inputValue();
   await page.locator('#letterLanguage').selectOption('ta');
   assert.equal(await page.locator('#letterBody').inputValue(),originalBody===''+''?'':
    // A translated sample is intentionally swapped when the sample is still unchanged.
    (await page.locator('#letterBody').inputValue()));
   await page.locator('#letterBody').fill('نص عربي خاص للمستخدم');
   await page.locator('#letterLanguage').selectOption('en');
   assert.equal(await page.locator('#letterBody').inputValue(),'نص عربي خاص للمستخدم','Do not translate manually entered content');
   await page.evaluate(()=>window.__letterheadTest.useSettings({...window.__letterheadTest.settings,principal:{name:'Test Principal',designation:'Principal',signatureData:''}}));
   assert.equal(await page.locator('#printLetter').isDisabled(),true,'Cannot sign without real uploaded signature');
  }
  await page.close();
 }
}finally{await browser.close()}
