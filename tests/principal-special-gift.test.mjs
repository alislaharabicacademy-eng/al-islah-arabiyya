import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('a-special-gift-for-our-principal.html');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
test('Unlisted special gift has one accessible tap, honest message, and direct Academy URL',()=>{
  assert.ok(script,'Inline script present');
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(html,/id="cut" type="button"/);
  assert.match(html,/id="afterCut" class="reveal" hidden tabindex="-1"/);
  assert.match(html,/id="enterAcademy" href="\.\/index\.html"/);
  assert.match(html,/original|1_20261112_080707_0000\.png/);
  assert.match(html,/lang="ta"/);
  assert.match(html,/lang="ar"/);
  assert.match(html,/prefers-reduced-motion:reduce/);
  assert.match(html,/special ribbon is a personal celebration/i);
  assert.doesNotMatch(html,/signInWithPopup|writeBatch|setDoc|grandLaunch\/official|firebase-config|<audio|<video/);
  assert.match(html,/alia-visitor-ribbon-seen-v1/);
});
function harness(reduced=false){
  const events={};
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)){
      const e={id,hidden:id==='afterCut',disabled:false,focusCalled:0,children:[],style:{setProperty(){}},
        addEventListener:(type,fn)=>{events[id+':'+type]=fn},
        focus(){this.focusCalled++},scrollIntoView(){},append(child){this.children.push(child)},replaceChildren(){this.children=[]}};
      nodes.set(id,e);
    }
    return nodes.get(id);
  };
  const classes=new Set();
  const local=new Map();
  const timers=[];
  const context={
    document:{getElementById:node,body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}},
      createElement:()=>({style:{setProperty(){}}})},
    window:{matchMedia:()=>({matches:reduced}),scrollTo(){}},
    localStorage:{setItem:(k,v)=>local.set(k,v),getItem:k=>local.get(k)},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length}
  };
  vm.runInNewContext(script,context);
  return {node,events,classes,local,timers};
}
test('One click reveals heartfelt gift and normal Academy route without a login',()=>{
  const h=harness(true);
  h.events['cut:click']();
  assert.equal(h.node('beforeCut').hidden,true);
  assert.equal(h.node('afterCut').hidden,false);
  assert.equal(h.node('afterCut').focusCalled,1);
  assert.equal(h.node('cut').disabled,true);
  assert.equal(h.classes.has('cut'),true);
  assert.equal(h.local.get('alia-visitor-ribbon-seen-v1'),'1');
  h.events['replay:click']();
  assert.equal(h.node('beforeCut').hidden,false);
  assert.equal(h.node('afterCut').hidden,true);
  assert.equal(h.node('cut').disabled,false);
  h.events['cut:click']();
  assert.equal(h.node('afterCut').hidden,false);
});
test('Animated path reveals gift even with no fonts, media or Firebase',()=>{
  const h=harness(false);
  assert.equal(h.node('stars').children.length,28);
  h.events['cut:click']();
  assert.equal(h.node('confetti').children.length,60);
  assert.equal(h.node('afterCut').hidden,true);
  assert.equal(h.timers.some(t=>t.ms===1100),true);
  for(const t of h.timers.filter(t=>t.ms===1100))t.fn();
  assert.equal(h.node('afterCut').hidden,false);
  h.events['enterAcademy:click']();
  assert.equal(h.local.get('alia-visitor-ribbon-seen-v1'),'1');
});
