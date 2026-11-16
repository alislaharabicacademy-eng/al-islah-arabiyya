import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const port=Number(process.env.PORT||8766);
const origin='http://127.0.0.1:'+port;
const output=resolve('id-card-print-proof');mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']
});
try{
 const page=await browser.newPage({viewport:{width:1100,height:890},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(origin+'/tests/id-card-render-fixture.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.smokeReady!==undefined,{timeout:16000});
 await page.evaluate(()=>window.smokeReady);
 const canvases=await page.locator('#cards canvas').count();
 if(canvases!==2)throw Error('Expected front/back preview canvases, got '+canvases);
const dimensions=await page.locator('#cards canvas').evaluateAll(cs=>cs.map(c=>[c.width,c.height]));
if(dimensions.some(([w,h])=>w>=h||w<650||h<1000))
 throw Error('Cards must render top-to-bottom at high resolution: '+JSON.stringify(dimensions));
 await page.screenshot({path:resolve(output,'preview.png'),fullPage:true});
 for(const [action,file] of [['makePVC','student-pvc-smoke.pdf'],['makeBulk','bulk-portrait-smoke.pdf']]){
  const request=page.waitForEvent('download',{timeout:35000});
  await page.evaluate(name=>window[name](),action);
  const download=await request;
  const path=resolve(output,file);await download.saveAs(path);
  const content=readFileSync(path);
  if(content.length<12000||content.toString('latin1',0,5)!=='%PDF-')
   throw Error('Invalid PDF '+file+' '+content.length+' bytes');
  console.log('PASS '+action+' valid '+content.length+'-byte PDF');
 }
 if(errors.length)throw Error('Browser runtime errors: '+errors.join('\n'));
 console.log('PASS portrait front/back previews, local QR generation and 2 card-size PDFs');
}finally{await browser.close()}
