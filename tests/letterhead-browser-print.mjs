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
  // Default is unsigned. The principal name, separator and signature image must
  // be absent, leaving only the localized Principal role.
  const unchecked=await page.evaluate(()=>({
   lang:document.getElementById('paper').lang,
   direction:getComputedStyle(document.getElementById('pvBody')).direction,
   subject:document.getElementById('pvSubject').textContent,
   body:document.getElementById('pvBody').textContent,
   checked:document.getElementById('includePrincipalSignature').checked,
   buttonEnabled:!document.getElementById('printLetter').disabled,
   imgHidden:document.getElementById('pvSignature').hidden,
   imageSrc:document.getElementById('pvSignature').getAttribute('src'),
   nameHidden:document.getElementById('pvPrincipal').hidden,
   ruleHidden:document.getElementById('signRule').hidden,
   missingHidden:document.getElementById('signatureMissing').hidden,
   role:document.getElementById('pvRole').textContent
  }));
  assert.equal(unchecked.lang,lang);
  assert.equal(unchecked.direction,lang==='ar'?'rtl':'ltr');
  assert.equal(unchecked.checked,false,'Checkbox must be unticked by default');
  assert.equal(unchecked.buttonEnabled,true,'Unsigned printing should not require a signature');
  assert.equal(unchecked.imgHidden,true);
  assert.equal(unchecked.imageSrc,null,'Unsigned signature image must be absent from DOM');
  assert.equal(unchecked.nameHidden,true,'Unsigned preview must show role only, not principal name');
  assert.equal(unchecked.ruleHidden,true);
  assert.equal(unchecked.missingHidden,true,'No missing-signature placeholder in unsigned mode');
  assert.equal(unchecked.role,lang==='en'?'Principal':lang==='ta'?'முதல்வர்':'المديرة');
  assert.ok(unchecked.subject.length>10&&unchecked.body.length>100);
  if(lang==='ta')assert.ok(unchecked.subject.includes('மாதாந்திர'));
  if(lang==='ar')assert.ok(unchecked.subject.includes('اجتماع'));
  await page.evaluate(async()=>{await document.fonts.ready});
  await page.screenshot({path:path.join(dir,lang+'-unsigned.png'),fullPage:true});
  await page.pdf({path:path.join(dir,lang+'-unsigned.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  // Checking the box must insert the original signature in both preview and PDF.
  await page.locator('#includePrincipalSignature').check();
  const checked=await page.evaluate(()=>({
   checked:document.getElementById('includePrincipalSignature').checked,
   buttonEnabled:!document.getElementById('printLetter').disabled,
   imgHidden:document.getElementById('pvSignature').hidden,
   imageSrc:document.getElementById('pvSignature').getAttribute('src'),
   nameHidden:document.getElementById('pvPrincipal').hidden,
   principal:document.getElementById('pvPrincipal').textContent,
   ruleHidden:document.getElementById('signRule').hidden,
   missingHidden:document.getElementById('signatureMissing').hidden
  }));
  assert.equal(checked.checked,true);
  assert.equal(checked.buttonEnabled,true);
  assert.equal(checked.imgHidden,false);
  assert.equal(checked.imageSrc,signature,'Exact uploaded signature must be rendered');
  assert.equal(checked.nameHidden,false);
  assert.equal(checked.principal,'Test Principal');
  assert.equal(checked.ruleHidden,false);
  assert.equal(checked.missingHidden,true);
  await page.locator('#pvSignature').evaluate(async image=>await image.decode());
  await page.screenshot({path:path.join(dir,lang+'-signed.png'),fullPage:true});
  await page.pdf({path:path.join(dir,lang+'-signed.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  // Switching it back off must remove the signature completely.
  await page.locator('#includePrincipalSignature').uncheck();
  assert.equal(await page.locator('#pvSignature').getAttribute('src'),null);
  assert.equal(await page.locator('#printLetter').isEnabled(),true);
  console.log('PASS',lang,'unsigned + signed PDF and exact signature toggle');

  if(lang==='ar'){
   const originalBody=await page.locator('#letterBody').inputValue();
   await page.locator('#letterLanguage').selectOption('ta');
   const translatedBody=await page.locator('#letterBody').inputValue();
   assert.notEqual(translatedBody,originalBody,'Sample should switch languages');
   assert.ok(translatedBody.includes('அகாடமியில்'),'Tamil text must replace Arabic sample');
   await page.locator('#letterBody').fill('نص عربي خاص للمستخدم');
   await page.locator('#letterLanguage').selectOption('en');
   assert.equal(await page.locator('#letterBody').inputValue(),'نص عربي خاص للمستخدم','Do not translate manually entered content');
   // No uploaded signature: unsigned PDF is still allowed; checking the box disables printing.
   await page.evaluate(()=>window.__letterheadTest.useSettings({...window.__letterheadTest.settings,principal:{name:'Test Principal',designation:'Principal',signatureData:''}}));
   assert.equal(await page.locator('#printLetter').isEnabled(),true,'Missing signature should not block unsigned PDF');
   await page.locator('#includePrincipalSignature').check();
   assert.equal(await page.locator('#printLetter').isDisabled(),true,'Do not sign without real uploaded signature');
   assert.equal(await page.locator('#signatureMissing').isVisible(),true);
   await page.locator('#includePrincipalSignature').uncheck();
   assert.equal(await page.locator('#printLetter').isEnabled(),true,'Unchecking missing signature must allow PDF again');
   // Name absent too: unsigned requires neither a name nor a signature.
   await page.evaluate(()=>window.__letterheadTest.useSettings({...window.__letterheadTest.settings,principal:{name:'',designation:'Principal',signatureData:''}}));
   assert.equal(await page.locator('#printLetter').isEnabled(),true,'Unsigned letter must work without principal profile');
   await page.locator('#clearLetter').click();
   assert.equal(await page.locator('#includePrincipalSignature').isChecked(),false,'Clear resets signature option to off');
  }
  await page.close();
 }
}finally{await browser.close()}
