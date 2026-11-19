
import { chromium } from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import{resolve}from'node:path';
const port=Number(process.env.PORT||8765);
const root='http://127.0.0.1:'+port;
const output=resolve('certificate-download-proof');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']});
let fail=0;
try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:1000}});
 const errors=[];
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Browser: '+m.text())});
 page.on('requestfailed',req=>errors.push('Network: '+req.url()+' '+req.failure()?.errorText));
 for(const type of ['exam','winner','participation','event','results']){
  try{
   await page.goto(root+'/certificate-studio.html?type='+type,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#vectorDownload:not([disabled])',{timeout:15000});
   const download=page.waitForEvent('download',{timeout:18000});
   await page.locator('#vectorDownload').click();
   const item=await download;
   const path=resolve(output,type+'.pdf');
   await item.saveAs(path);
   const size=readFileSync(path).byteLength;
   if(size<2000)throw Error('PDF too small: '+size);
   const buffer=readFileSync(path);
   if(buffer.toString('latin1',0,8).indexOf('%PDF-')!==0)throw Error('Not a real PDF');
   console.log('PASS '+type+' PDF '+size+' bytes');
  }catch(e){
   fail++;
   console.error('FAIL '+type+': '+e.message);
   console.error('Current status: '+await page.locator('#status').textContent().catch(()=>'<no status>'));
   console.error('Browser diagnostics: '+errors.slice(-20).join('\n'));
  }
 }

 // Actual Chromium SVG geometry stress test, not a heuristic based on character
 // counts. A full-width name or a 95-character event must not touch A4 edges.
 // Test the user-editable long-name fields in *all five* designs.
 const longName='Fathima Zahra Bint Abdul Rahman Al Qadiriya Bint Muhammad Farooq Al Islahi Bint Abdul Kareem';
 const longEvent='Annual Arabic Language and Islamic Studies International Recognition and Achievement Presentation'.slice(0,95); // Studio field maxlength=95
 const limits={landscape:{left:99,right:1315},portrait:{left:79,right:921}};
 for(const type of ['exam','winner','participation','event','results']){
  try{
   await page.goto(root+'/certificate-studio.html?type='+type,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#preview svg',{timeout:15000});
   await page.locator('#studentName').fill(longName);
   await page.locator('#eventName').fill(longEvent);
   const measurement=await page.evaluate(({name,event})=>{
    const svg=document.querySelector('#preview svg');
    const texts=[...svg.querySelectorAll('text')];
    const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
    const bounds=elements=>{
     if(!elements.length)return null;
     const boxes=elements.map(x=>x.getBBox());
     const x=Math.min(...boxes.map(b=>b.x)),right=Math.max(...boxes.map(b=>b.x+b.width));
     return {x,right,width:right-x,lines:elements.length};
    };
    // Two-line names/headings are valid. Compare their full reconstructed
    // text with user input, not only one SVG <text> element.
    const collect=expected=>{
     const prefix=expected.split(' ').slice(0,3).join(' ');
     const start=texts.findIndex(x=>normalize(x.textContent).startsWith(prefix));
     if(start<0)return null;
     const selected=[];
     for(let i=start;i<Math.min(texts.length,start+4);i++){
      selected.push(texts[i]);
      const joined=normalize(selected.map(x=>x.textContent).join(' '));
      if(joined===expected)return bounds(selected);
      if(!expected.startsWith(joined))break;
     }
     return null;
    };
    const chipPieces=texts.filter(x=>String(x.getAttribute('x'))==='705.5' &&
      Number(x.getAttribute('y'))>=760 && Number(x.getAttribute('y'))<=811);
    return {svgWidth:svg.viewBox.baseVal.width,student:collect(name),
     headline:collect(event),eventChip:bounds(chipPieces),
     eventChipText:normalize(chipPieces.map(x=>x.textContent).join(' ')),
     resultFooter:(()=>{
      const ref=texts.find(t=>normalize(t.textContent).startsWith('RESULT REFERENCE:'));
      const rect=[...svg.querySelectorAll('rect')].find(r=>
       r.getAttribute('x')==='69' && r.getAttribute('y')==='1261' && r.getAttribute('height')==='85');
      return ref&&rect?{referenceTop:ref.getBBox().y,totalsBottom:1261+85}:null;
     })()};
   },{name:longName,event:longEvent});
   const bound=measurement.svgWidth===1000?limits.portrait:limits.landscape;
   if(!measurement.student)throw Error('Full student name is missing or truncated in SVG');
   if(measurement.student.x<bound.left||measurement.student.right>bound.right)
    throw Error('Student name overlaps A4 safe boundary: '+JSON.stringify(measurement.student));
   if(!measurement.headline)throw Error('Full exam/event heading missing or truncated');
   if(measurement.headline.x<bound.left||measurement.headline.right>bound.right)
    throw Error('Exam/event title overflows A4 safe boundary: '+JSON.stringify(measurement.headline));
   if(['winner','participation','event'].includes(type)){
    if(measurement.eventChipText!==longEvent)
     throw Error('Event value in certificate chip is truncated: '+measurement.eventChipText);
    if(!measurement.eventChip||measurement.eventChip.x<590||measurement.eventChip.right>820)
     throw Error('Event chip content escapes its card: '+JSON.stringify(measurement.eventChip));
   }
   if(type==='results'&&(!measurement.resultFooter||measurement.resultFooter.referenceTop<measurement.resultFooter.totalsBottom))
    throw Error('Result reference overlaps the totals/grade panel: '+JSON.stringify(measurement.resultFooter));
   console.log('PASS '+type+' long-text SVG geometry '+JSON.stringify(measurement));
  }catch(err){
   fail++;
   console.error('FAIL '+type+' long-text SVG geometry: '+err.message);
   console.error('Status: '+await page.locator('#status').textContent().catch(()=>'<not found>'));
  }finally{
   await page.screenshot({path:resolve(output,type+'-long-text.png')}).catch(()=>{});
  }
 }
 await page.screenshot({path:resolve(output,'certificate-studio.png')});
}finally{await browser.close()}
if(fail)process.exitCode=1;
