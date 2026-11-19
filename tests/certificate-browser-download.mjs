
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
 const longEvent='Annual Arabic Language and Islamic Studies International Recognition and Achievement Presentation';
 const limits={landscape:{left:99,right:1315},portrait:{left:79,right:921}};
 for(const type of ['exam','winner','participation','event','results']){
  try{
   await page.goto(root+'/certificate-studio.html?type='+type,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#preview svg',{timeout:15000});
   await page.locator('#studentName').fill(longName);
   await page.locator('#eventName').fill(longEvent);
   const measurement=await page.evaluate(({name,event})=>{
    const svg=document.querySelector('#preview svg');
    const boxOf=element=>{
     const box=element?.getBBox();
     return box?{x:box.x,right:box.x+box.width,top:box.y,bottom:box.y+box.height,width:box.width}:null;
    };
    const svgWidth=svg.viewBox.baseVal.width;
    const texts=[...svg.querySelectorAll('text')];
    const student=texts.find(t=>t.textContent===name);
    const headline=texts.find(t=>t.textContent===event);
    const eventChip=texts.find(t=>t.textContent===event.slice(0,64));
    return {svgWidth,student:boxOf(student),headline:boxOf(headline),eventChip:boxOf(eventChip)};
   },{name:longName,event:longEvent});
   const bound=measurement.svgWidth===1000?limits.portrait:limits.landscape;
   if(!measurement.student)throw Error('Name is absent from SVG');
   if(measurement.student.x<bound.left||measurement.student.right>bound.right)
    throw Error('Student name overlaps A4 safe boundary: '+JSON.stringify(measurement.student));
   if(!measurement.headline)throw Error('Event/exam heading missing from SVG');
   if(measurement.headline.x<bound.left||measurement.headline.right>bound.right)
    throw Error('Exam/event title overflows A4 safe boundary: '+JSON.stringify(measurement.headline));
   if(type!=='results'&&measurement.eventChip&&measurement.eventChip.width>237)
    throw Error('Event chip text overflows its 255px card: '+JSON.stringify(measurement.eventChip));
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
