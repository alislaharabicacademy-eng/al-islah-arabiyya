import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const base='https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/';
const failures=[],warnings=[],successes=[];
mkdirSync('live-course-smoke-proof',{recursive:true});
const report=(kind,name,detail='')=>{
 const line=kind+' '+name+(detail?' · '+detail:'');
 console.log(line);
 (kind==='PASS'?successes:kind==='FAIL'?failures:warnings).push(line);
};
const check=(name,ok,detail='')=>report(ok?'PASS':'FAIL',name,detail);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 const scriptErrors=[];
 page.on('pageerror',e=>scriptErrors.push({url:page.url().split('?')[0],message:e.message.slice(0,220)}));
 const http=async path=>{
  try{
   const r=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000),redirect:'follow'});
   return {ok:r.ok,status:r.status,text:await r.text(),url:r.url};
  }catch(e){return {ok:false,status:0,text:'',error:e.message,url:new URL(path,base).href}}
 };
 // Confirm the live URLs themselves—not only the repository branch.
 for(const path of ['','courses.html','course-public-copy.js','course-eligibility.js','all-courses.html','admission.html']){
  const r=await http(path);
  check('HTTP '+(path||'homepage'),r.ok,'status='+r.status);
  if(path==='courses.html'&&r.ok)check('Public course page includes fallback script',r.text.includes('course-public-copy.js'));
  if(path==='course-public-copy.js'&&r.ok)check('Deployed script has six course-specific fallbacks',r.text.includes("'boys-hifz'")&&r.text.includes("'tajweed-for-girls'"));
 }
 // Check anonymous visitor experience, not authenticated administration.
 const homepage=base;
 try{
  await page.goto(homepage,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(2500);
  const info=await page.evaluate(()=>({
   title:document.title,
   name:document.querySelector('h1')?.innerText?.slice(0,120)||'',
   courseLinks:[...document.querySelectorAll('a[href*="courses.html?course="]')].length,
   explore:[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')?.includes('all-courses.html')),
   overflow:document.documentElement.scrollWidth>innerWidth+5
  }));
  check('Homepage opens on mobile',!!info.title&&documentTitleIsAcademy(info.title),JSON.stringify(info));
  check('Homepage Explore All Courses link',info.explore);
  if(info.overflow)report('WARN','Homepage horizontal overflow detected','390px viewport');
  await page.screenshot({path:'live-course-smoke-proof/homepage-mobile.png',fullPage:true,animations:'disabled'});
 }catch(e){report('FAIL','Homepage browser render',e.message.slice(0,220))}
 // Live course-detail UI including Firebase overrides for published course records.
 const courses=[
  ['muallama','Muallama'],['muballigha','Muballigha'],
  ['alima','Alima'],['boys-hifz','Boys Hifz'],
  ['childrens-quran-maktab','Children Maktab'],
  ['tajweed-for-girls','Tajweed for Girls']
 ];
 for(const [id,label] of courses){
  try{
   await page.goto(new URL('courses.html?course='+encodeURIComponent(id),base).href,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.querySelectorAll('#eligibility li').length>=1,{timeout:20000});
   await page.waitForTimeout(1600);
   const data=await page.evaluate(()=>({
    heading:document.querySelector('#name')?.textContent?.trim(),
    eligibility:[...document.querySelectorAll('#eligibility li')].map(x=>x.textContent.trim()),
    description:document.querySelector('#description')?.textContent?.trim(),
    syllabus:document.querySelector('#syllabus')?.textContent?.trim(),
    books:[...document.querySelectorAll('#kitabs li')].map(x=>x.textContent.trim()),
    fees:document.querySelector('#fees')?.textContent?.trim(),
    timing:document.querySelector('#timings')?.textContent?.trim(),
    duration:document.querySelector('#duration')?.textContent?.trim(),
    applyHidden:document.querySelector('#apply')?.hidden,
    overflow:document.documentElement.scrollWidth>innerWidth+5
   }));
   const pending=/coming soon|details will be announced|eligibility criteria will be (announced|published)|kitab list will be announced|to be announced/i;
   const visible=[data.description,data.syllabus,...data.eligibility,...data.books,data.fees,data.timing].filter(Boolean);
   check(label+' · course heading',!!data.heading&&data.heading!=='Loading course details…',data.heading||'missing');
   check(label+' · meaningful eligibility',data.eligibility.length>=1&&!data.eligibility.some(x=>pending.test(x)),JSON.stringify(data.eligibility).slice(0,300));
   check(label+' · no placeholder public details',visible.length>=5&&!visible.some(x=>pending.test(x)),JSON.stringify({description:data.description,fees:data.fees,timing:data.timing}).slice(0,280));
   if(id==='alima')check('Alima continuation hides new admission button',data.applyHidden===true);
   if(data.overflow)report('WARN',label+' horizontal overflow on mobile');
   if(['muallama','alima','boys-hifz'].includes(id))await page.screenshot({path:'live-course-smoke-proof/'+id+'-mobile.png',fullPage:true,animations:'disabled'});
  }catch(e){report('FAIL',label+' · course browser render',e.message.slice(0,280))}
 }
 try{
  await page.goto(new URL('all-courses.html',base).href,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(4000);
  const details=await page.evaluate(()=>({
   count:document.querySelectorAll('#grid .card').length,
   links:[...document.querySelectorAll('#grid .card a[href*="courses.html"]')].length,
   status:document.querySelector('#status')?.textContent?.trim().slice(0,180)||''
  }));
  check('Explore All Courses renders public catalog',details.count>=1,JSON.stringify(details));
  check('Course cards link to More Details',details.links>=1);
  await page.screenshot({path:'live-course-smoke-proof/all-courses-mobile.png',fullPage:true,animations:'disabled'});
 }catch(e){report('FAIL','All Courses browser render',e.message.slice(0,280))}
 try{
  await page.goto(new URL('admission.html',base).href,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(4000);
  const data=await page.evaluate(()=>({
   heading:document.querySelector('h1')?.textContent?.trim(),
   courseOptions:[...document.querySelectorAll('#course option')].map(x=>x.textContent.trim()).filter(Boolean),
   courseStatus:document.querySelector('#courseLoadStatus')?.textContent?.trim().slice(0,180)
  }));
  check('Admission page opens publicly',/admission/i.test(data.heading||''),JSON.stringify(data));
  check('Admission course options load',data.courseOptions.length>1,JSON.stringify(data.courseOptions));
  await page.screenshot({path:'live-course-smoke-proof/admission-mobile.png',fullPage:true,animations:'disabled'});
 }catch(e){report('FAIL','Admission browser render',e.message.slice(0,260))}
 if(scriptErrors.length)report('WARN','Browser runtime JavaScript errors',JSON.stringify(scriptErrors.slice(0,8)));
 console.log('LIVE SITE CHECK TOTAL '+JSON.stringify({pass:successes.length,fail:failures.length,warn:warnings.length,base}));
}finally{await browser.close()}
function documentTitleIsAcademy(title){return /madrasa|arabic|islah|online/i.test(title)}
if(failures.length)process.exitCode=1;
