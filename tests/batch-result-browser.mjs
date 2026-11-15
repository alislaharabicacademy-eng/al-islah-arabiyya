import { chromium } from 'playwright';
import{mkdirSync,readFileSync}from'node:fs';
import{resolve}from'node:path';
mkdirSync('batch-report-proof',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1330,height:940}});
 const errors=[];page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('Browser '+m.text())});
 await page.goto('http://127.0.0.1:8765/certificate-studio.html',{waitUntil:'domcontentloaded'});
 for(const type of ['full','top3']){
  const awaited=page.waitForEvent('download',{timeout:50000});
  const data=await page.evaluate(async mode=>{
   const lib=await import('/exam-batch-report.js');
   const students=[
    ['1','Farhana B','muallama','Muallama',97,'A+'],['2','Aakifa S','muallama','Muallama',91,'A+'],
    ['3','Anas','muallama','Muallama',84,'A'],['4','Muhsin','muallama','Muallama',77,'B'],
    ['5','Ayana','alima','Alima',94,'A+'],['6','Aadhil','alima','Alima',82,'A']
   ].map(([id,studentName,courseId,course,percent,grade])=>({
    id:'RESULT-'+id,studentId:id,studentCode:'ALIA'+id.padStart(5,'0'),studentName,
    courseId,course,percent:Number(percent),grade,examTitle:'Annual Examination',
    academicYear:'2026-2027',published:true,passed:true,total:Number(percent),
    maxTotal:100,subjects:[{name:'Arabic',score:Number(percent),max:100}]
   }));
   const groups=lib.groupedPublishedResults(students);
   const blob=await lib.createAcademyPublishedRegisterPdf(groups,{mode,permissionConfirmed:true});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=mode+'.pdf';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
   return {bytes:blob.size,groups:groups.length};
  },type);
  const download=await awaited;const dest=resolve('batch-report-proof',type+'.pdf');await download.saveAs(dest);
  const buf=readFileSync(dest);if(buf.byteLength<4000||buf.toString('latin1',0,5)!=='%PDF-')throw Error('Invalid batch '+type+' PDF');
  console.log('PASS '+type+' '+JSON.stringify(data));
 }
 if(errors.length)console.warn(errors.join('\n'));
}finally{await browser.close()}
