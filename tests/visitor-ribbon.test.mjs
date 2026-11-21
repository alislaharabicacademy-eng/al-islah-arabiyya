import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const homepage=read('index.html');
const script=read('visitor-ribbon.js');
const css=read('visitor-ribbon.css');
const legacyWelcome=read('launch-day-welcome.js');
const rules=read('firestore.rules');

test('Homepage has an accessible, hidden-by-default ribbon intro for public visitors',()=>{
 assert.match(homepage,/id="vrOpeningOverlay"[^>]*aria-modal="true"[^>]*hidden/);
 for(const id of ['vrCutRibbon','vrSkipOpening','vrOpeningStatus','vrParticles']){
   assert.match(homepage,new RegExp('id="'+id+'"'));
 }
 assert.match(homepage,/1_20261112_080707_0000\.png/);
 assert.match(homepage,/Parents, Students &amp; Teachers/);
 assert.match(homepage,/CUT THE RIBBON &amp; ENTER/);
 assert.match(homepage,/src="\.\/visitor-ribbon\.js"/);
 assert.match(homepage,/href="\.\/visitor-ribbon\.css"/);
 assert.match(css,/#vrOpeningOverlay\[hidden\]\{display:none!important\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Personal ribbon is NOT official launch, requires no Google login, and preserves existing security',()=>{
 assert.match(script,/alia-visitor-ribbon-seen-v1/);
 assert.match(script,/storageWrite\(\);[\s\S]*overlay\.hidden=false/);
 assert.doesNotMatch(script,/firebase|grandLaunch|setDoc|writeBatch|signInWith|location\.assign|fetch\(/i);
 assert.match(legacyWelcome,/if\(document\.getElementById\('vrOpeningOverlay'\)\)return/);
 assert.match(legacyWelcome,/grandLaunchPublic','opening'/);
 assert.match(rules,/allow create: if documentId == 'official'/);
 assert.match(homepage,/id="launchWelcomeOverlay"[^>]*hidden/);
});

function makeBrowser(stored=new Map(),reduced=false){
 const calls=[];
 const node=()=>{
   const classes=new Set();
   return {
     hidden:true,disabled:false,textContent:'',events:{},focusCount:0,
     children:[],style:{setProperty(){}},
     classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
     setAttribute(){},focus(){this.focusCount++},
     replaceChildren(){this.children=[]},
     append(element){this.children.push(element)},
     addEventListener(type,fn){this.events[type]=fn},
     click(){this.events.click?.()}
   };
 };
 const elements=Object.fromEntries(['vrOpeningOverlay','vrCutRibbon','vrSkipOpening','vrOpeningStatus','vrParticles'].map(id=>[id,node()]));
 elements.vrOpeningOverlay.hidden=true;
 const body=node();
 const heading=node();
 const storage={getItem:k=>stored.has(k)?stored.get(k):null,setItem:(k,v)=>stored.set(k,v)};
 const document={
   body,
   activeElement:null,
   getElementById:id=>elements[id]||null,
   createElement:()=>node(),
   querySelector:()=>heading
 };
 const window={matchMedia:()=>({matches:reduced}),addEventListener(){}};
 const timers=[];
 runInNewContext(script,{
   document,window,localStorage:storage,sessionStorage:storage,
   setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},
   clearTimeout:()=>{}
 });
 return {stored,elements,body,heading,timers,document};
}

test('First browser visit sees one cut, click celebrates and returns to normal homepage',()=>{
 const storage=new Map();
 const page=makeBrowser(storage);
 assert.equal(page.elements.vrOpeningOverlay.hidden,false);
 assert.equal(storage.get('alia-visitor-ribbon-seen-v1'),'1');
 assert.equal(page.body.classList.contains('vr-opening-active'),true);
 assert.equal(page.elements.vrSkipOpening.focusCount,1);
 page.elements.vrCutRibbon.click();
 assert.equal(page.elements.vrCutRibbon.disabled,true);
 assert.equal(page.elements.vrOpeningOverlay.classList.contains('vr-is-cut'),true);
 assert.equal(page.timers.length,2);
 for(const task of [...page.timers].sort((a,b)=>a.ms-b.ms))task.fn();
 assert.equal(page.elements.vrOpeningOverlay.hidden,true);
 assert.equal(page.body.classList.contains('vr-opening-active'),false);
 assert.equal(page.heading.focusCount,1);
 const returnVisit=makeBrowser(storage);
 assert.equal(returnVisit.elements.vrOpeningOverlay.hidden,true,'Repeat visits must not see an opening overlay');
 assert.equal(returnVisit.elements.vrCutRibbon.events.click,undefined,'Return visits never install ceremony handlers');
});

test('Skipping marks one-time visit and reduced-motion cuts do not delay website entry',()=>{
 const storage=new Map();
 const page=makeBrowser(storage);
 page.elements.vrSkipOpening.click();
 assert.equal(page.elements.vrOpeningOverlay.hidden,true);
 assert.equal(makeBrowser(storage).elements.vrOpeningOverlay.hidden,true);
 const accessibilityPage=makeBrowser(new Map(),true);
 accessibilityPage.elements.vrCutRibbon.click();
 assert.equal(accessibilityPage.elements.vrOpeningOverlay.hidden,true);
 assert.equal(accessibilityPage.timers.length,0);
});
