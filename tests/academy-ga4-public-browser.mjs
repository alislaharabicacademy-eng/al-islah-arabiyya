import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://127.0.0.1:8770/';
try{
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 let gaRequests=0;
 await context.route('https://www.googletagmanager.com/**',route=>{
   gaRequests++;
   return route.fulfill({status:200,contentType:'application/javascript',body:'window.__ga4LibraryLoaded=true;'});
 });
 const page=await context.newPage();
 await page.goto(base+'all-courses.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#aliaAnalyticsConsent').isVisible(),true);
 assert.equal(gaRequests,0,'Google Analytics must never load before consent');
 await page.locator('button[data-analytics-choice="yes"]').click();
 await page.waitForFunction(()=>window.__ga4LibraryLoaded===true);
 assert.equal(gaRequests,1);
 const config=await page.evaluate(()=>{
   const args=window.dataLayer.find(x=>x[0]==='config');
   return {measurement:args[1],page_location:args[2].page_location,signals:args[2].allow_google_signals};
 });
 assert.equal(config.measurement,'G-XQEL7QXFLD');
 assert.equal(config.page_location,'http://127.0.0.1:8770/all-courses.html');
 assert.equal(config.signals,false);
 await page.goto(base+'admission.html?course=Muallama&name=PRIVATE',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ga4LibraryLoaded===true);
 assert.equal(gaRequests,2,'Second approved public page should be tracked');
 const cleaned=await page.evaluate(()=>window.dataLayer.find(x=>x[0]==='config')[2].page_location);
 assert.equal(cleaned,base+'admission.html','PII URL query must not reach Google tag');
 await page.goto(base+'student-login.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>Boolean(window.dataLayer)),false,'Private student portal must not load GA4');
 assert.equal(gaRequests,2,'No GA4 request on student portal');
 await context.close();

 const another=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 let declinedRequests=0;
 await another.route('https://www.googletagmanager.com/**',route=>{
   declinedRequests++;return route.abort();
 });
 const p=await another.newPage();
 await p.goto(base+'all-courses.html',{waitUntil:'domcontentloaded'});
 await p.locator('button[data-analytics-choice="no"]').click();
 await p.goto(base+'courses.html?course=alima',{waitUntil:'domcontentloaded'});
 assert.equal(declinedRequests,0,'Declining consent must prevent tracking now and later');
 await p.locator('#aliaAnalyticsSettings').click();
 assert.equal(await p.locator('#aliaAnalyticsConsent').isVisible(),true,'Visitor can revise consent');
 await another.close();
 console.log('PASS GA4 mobile Chrome: opt-in only, no PII, no private portal, revocable consent');
} finally { await browser.close(); }
