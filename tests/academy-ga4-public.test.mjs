import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('academy-ga4-public.js');
const allowed=['index.html','all-courses.html','admission.html','courses.html'];
const privatePages=['admin.html','student-login.html','teacher-login.html','teacher-attendance.html','grand-launch.html','student-update.html','letterhead-studio.html','certificate-studio.html','exam-results.html','teacher-registration.html','existing-student-registration.html','id-card-studio.html'];

test('Public pages load GA4 consent resources, private portal pages do not',()=>{
 for(const p of allowed){
   const h=read(p);
   assert.match(h,/<script defer src="\.\/academy-ga4-public\.js"><\/script>/,p);
   assert.match(h,/<link rel="stylesheet" href="\.\/academy-ga4-public\.css">/,p);
 }
 for(const p of privatePages){
   assert.doesNotMatch(read(p),/academy-ga4-public\.(?:js|css)/,p);
 }
 assert.match(source,/G-XQEL7QXFLD/);
 assert.doesNotMatch(source,/form\.value|input\.value|sendBeacon|fetch\(/);
 assert.match(source,/page_location: location\.origin \+ location\.pathname/);
 assert.match(source,/allow_ad_personalization_signals: false/);
});

function run(path,store=new Map()){
 const elements=[];
 const create=tag=>{
   const events={}; const attrs={};
   return {
     tag, hidden:false, style:{}, events, attrs, innerHTML:'', textContent:'', type:'', src:'',
     addEventListener(type,fn){events[type]=fn;},
     setAttribute(k,v){attrs[k]=v;},
     querySelector(){return {focus(){}};},
     append(){},
     get dataset(){return {};}
   };
 };
 const document={
   title:'Test page', readyState:'complete', referrer:'https://other.example/private?token=SHOULD_NOT_LEAK',
   cookie:'',createElement(tag){const el=create(tag);elements.push(el);return el;},
   head:{children:[],append(v){this.children.push(v)}},
   body:{children:[],append(v){this.children.push(v)}}
 };
 const window={localStorage:{
   getItem:k=>store.has(k)?store.get(k):null,
   setItem:(k,v)=>store.set(k,v)
 },addEventListener(){}};
 const url=new URL('https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/'+path);
 const location={pathname:url.pathname,origin:url.origin};
 vm.runInNewContext(source,{document,window,location,URL,Date,Set});
 const box=document.body.children.find(x=>x.id==='aliaAnalyticsConsent');
 return {document,window,store,box};
}

test('No GA script or page event before explicit visitor consent',()=>{
 const r=run('admission.html?course=Muallama&name=PERSONAL');
 assert.equal(r.document.head.children.length,0);
 assert.ok(r.box,'Consent UI should be displayed');
 assert.equal(r.box.hidden,false);
 assert.equal(r.window.dataLayer,undefined);
 const target={closest:()=>({dataset:{analyticsChoice:'no'}})};
 r.box.events.click({target});
 assert.equal(r.document.head.children.length,0);
 assert.equal(r.store.get('alia-public-analytics-consent-v1'),'no');
});
test('Opt-in tracks only sanitized public page views, and can be revoked',()=>{
 const r=run('admission.html?course=Muallama&secret=NO');
 const allow={closest:()=>({dataset:{analyticsChoice:'yes'}})};
 r.box.events.click({target:allow});
 assert.equal(r.store.get('alia-public-analytics-consent-v1'),'yes');
 assert.equal(r.document.head.children.length,1);
 assert.equal(r.document.head.children[0].src,'https://www.googletagmanager.com/gtag/js?id=G-XQEL7QXFLD');
 const cfg=r.window.dataLayer.find(x=>x[0]==='config');
 assert.ok(cfg,'GA config must be queued');
 assert.equal(cfg[1],'G-XQEL7QXFLD');
 assert.equal(cfg[2].page_location,'https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/admission.html');
 assert.equal(cfg[2].page_referrer,'https://other.example');
 assert.equal(cfg[2].allow_google_signals,false);
 assert.equal(cfg[2].allow_ad_personalization_signals,false);
 const deny={closest:()=>({dataset:{analyticsChoice:'no'}})};
 r.box.events.click({target:deny});
 assert.equal(r.window['ga-disable-G-XQEL7QXFLD'],true);
 assert.equal(r.store.get('alia-public-analytics-consent-v1'),'no');
 assert.equal(run('courses.html',r.store).document.head.children.length,0);
});
test('Consent persists for public pages; private pages never run even with consent',()=>{
 const store=new Map([['alia-public-analytics-consent-v1','yes']]);
 const good=run('all-courses.html',store);
 assert.equal(good.document.head.children.length,1);
 assert.equal(good.box.hidden,true);
 for(const path of ['admin.html','student-login.html','teacher-login.html','grand-launch.html']){
   const privatePage=run(path,store);
   assert.equal(privatePage.document.head.children.length,0,path);
   assert.equal(privatePage.document.body.children.length,0,path);
 }
});
