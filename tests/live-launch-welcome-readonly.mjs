import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base='https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/';
mkdirSync('launch-welcome-proof',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const path of ['','launch-day-welcome.js','launch-day-welcome.css']){
  const resp=await fetch(new URL(path,base));
  console.log('HTTP',path||'homepage',resp.status);
  assert.equal(resp.status,200);
  const html=await resp.text();
  if(path==='')assert.match(html,/id="launchWelcomeOverlay"[^>]*hidden/);
  if(path==='launch-day-welcome.js')assert.match(html,/grandLaunchPublic','opening'/);
 }
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForTimeout(6000);
 const state=await page.evaluate(async()=>{
  const modal=document.getElementById('launchWelcomeOverlay');
  const banner=document.getElementById('launchDayBanner');
  const data={
   modalPresent:!!modal,bannerPresent:!!banner,modalHidden:modal?.hidden,
   bannerHidden:banner?.hidden,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+5,
   title:document.title,launchSignal:null
  };
  try{
   const c=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>r.json());
   const {initializeApp,getApps}=await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
   const {doc,getDoc,getFirestore}=await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
   const app=getApps().find(a=>a.options.projectId===c.projectId)||initializeApp(c,'verification-readonly');
   const snap=await getDoc(doc(getFirestore(app),'grandLaunchPublic','opening'));
   data.launchSignal=snap.exists()?snap.data().phase:'absent';
  }catch(e){data.launchSignal=e.code||String(e.message||e).slice(0,70)}
  return data;
 });
 console.log('LIVE RESULT',JSON.stringify(state));
 assert.equal(state.modalPresent,true);
 assert.equal(state.bannerPresent,true);
 assert.equal(state.horizontalOverflow,false,'Mobile horizontal overflow');
 const confirmed=state.launchSignal==='launched';
 if(confirmed){
  assert.equal(state.bannerHidden,false,'After confirmed launch, banner should appear');
  assert.equal(state.modalHidden,false,'First-time visitor should see welcome');
  await page.screenshot({path:'launch-welcome-proof/confirmed-opening-mobile.png',fullPage:false,animations:'disabled'});
  await page.getByRole('button',{name:/Enter Our Academy/i}).click();
  assert.equal(await page.locator('#launchWelcomeOverlay').evaluate(node=>node.hidden),true);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(2300);
  assert.equal(await page.locator('#launchWelcomeOverlay').evaluate(node=>node.hidden),true,'Show only once');
 }else{
  assert.equal(state.bannerHidden,true,'No banner before actual immutable official launch');
  assert.equal(state.modalHidden,true,'No welcome popup before actual immutable official launch');
  await page.screenshot({path:'launch-welcome-proof/pre-official-opening-mobile.png',fullPage:false,animations:'disabled'});
 }
 assert.deepEqual(errors,[],'Homepage JavaScript should not throw');
 console.log('PASS: Live opening-day welcome follows the immutable Firebase signal, never a rehearsal');
}finally{await browser.close()}
