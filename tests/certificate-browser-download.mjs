
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
   const download=page.waitForEvent('download',{timeout:60000});
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
 await page.screenshot({path:resolve(output,'certificate-studio.png')});
}finally{await browser.close()}
if(fail)process.exitCode=1;
