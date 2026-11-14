/* Madrasa Al Islahul Arabiya — private/admin and published-result PDF builder.
   Vector drawings and Latin text; only original logo and non-Latin glyphs are rasterized. */
let jspdfLoad=null,brandCache=null;
async function readyPdf(){
 if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
 if(!jspdfLoad)jspdfLoad=(async()=>{
  for(const url of ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js']){
   try{await new Promise((ok,bad)=>{const el=document.createElement('script');el.src=url;el.onload=ok;el.onerror=()=>bad(Error('PDF library not reachable'));document.head.append(el)});if(window.jspdf?.jsPDF)return window.jspdf.jsPDF}catch(e){console.warn(e)}
  }
  throw Error('PDF library could not load. Please use Chrome with an internet connection.');
 })().catch(e=>{jspdfLoad=null;throw e});
 return jspdfLoad;
}
function gradeLabel(record){return record.passed?'PASS':'NEEDS IMPROVEMENT'}
function safePdfName(value){return String(value||'Student').replace(/[^a-z0-9_-]+/gi,'_').slice(0,62)||'Student'}
function text(pdf,value,x,y,size=11,opts={}){
 const str=String(value??'');
 pdf.setFont('helvetica',opts.bold?'bold':'normal');pdf.setFontSize(size);
 if(!/[^\u0020-\u007E]/.test(str)){pdf.text(str,x,y,opts.align?{align:opts.align}:undefined);return}
 // Browser system fonts retain Tamil/Arabic/Urdu names without missing-glyph boxes.
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const scale=3;ctx.font=(opts.bold?'bold ':'')+(size*scale*1.34)+'px sans-serif';
 const lines=str.split('\n');
 const max=Math.max(1,...lines.map(l=>ctx.measureText(l).width));
 canvas.width=Math.ceil(max+30);canvas.height=Math.ceil(lines.length*size*scale*1.95+12);
 const c=canvas.getContext('2d');
 c.fillStyle=opts.color||'#173f2c';c.font=(opts.bold?'bold ':'')+(size*scale*1.34)+'px sans-serif';
 c.textBaseline='top';lines.forEach((line,i)=>c.fillText(line,15,5+i*size*scale*1.8));
 const w=Math.min(opts.maxWidth||175,Math.max(12,canvas.width/(scale*4.5)));
 const h=w*canvas.height/canvas.width;
 const left=opts.align==='center'?x-w/2:opts.align==='right'?x-w:x;
 pdf.addImage(canvas.toDataURL('image/png'),'PNG',left,y-h*.82,w,h);
}
async function logoPair(){
 if(brandCache)return brandCache;
 brandCache=(async()=>{
  const img=new Image();img.src='1_20261112_080707_0000.png';
  await new Promise((ok,bad)=>{if(img.complete&&img.naturalWidth)return ok();img.onload=ok;img.onerror=()=>bad(Error('Official Madrasa logo could not load'))});
  const make=(alpha,side)=>{
   const c=document.createElement('canvas');c.width=c.height=side;
   const g=c.getContext('2d');g.clearRect(0,0,side,side);g.save();
   g.beginPath();g.arc(side/2,side/2,side/2,0,Math.PI*2);g.clip();g.globalAlpha=alpha;
   const scale=Math.min(side/img.naturalWidth,side/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
   g.drawImage(img,(side-w)/2,(side-h)/2,w,h);g.restore();
   return c.toDataURL('image/png');
  };
  return {logo:make(1,560),watermark:make(.075,480)};
 })().catch(e=>{brandCache=null;throw e});
 return brandCache;
}
function setColor(pdf,c){pdf.setTextColor(...c)}
function header(pdf,logo,width,height,title,subtitle){
 const green=[13,68,43],gold=[195,159,89];
 pdf.setFillColor(255,255,255);pdf.rect(0,0,width,height,'F');
 pdf.setFillColor(...green);pdf.rect(0,0,width,14,'F');
 pdf.setFillColor(...gold);pdf.rect(0,14,width,1.1,'F');
 pdf.setDrawColor(...gold);pdf.setLineWidth(.55);pdf.roundedRect(10,20,width-20,height-30,3,3,'S');
 const midSize=Math.min(115,height*.5);
 pdf.addImage(logo.watermark,'PNG',(width-midSize)/2,(height-midSize)/2+13,midSize,midSize,'examWatermark');
 pdf.addImage(logo.logo,'PNG',18,24,25,25,'examMainLogo');
 setColor(pdf,green);text(pdf,'MADRASA AL ISLAHUL ARABIYA',49,31,17,{bold:true});
 text(pdf,title,49,41,12,{bold:true});pdf.setTextColor(90,110,96);text(pdf,subtitle,49,48,8);
 pdf.setDrawColor(...gold);pdf.line(17,56,width-17,56);
}
function marks(record){
 const subjects=Array.isArray(record.subjects)?record.subjects:[];
 return subjects.map(s=>({name:String(s.name||'Subject'),score:Number(s.score)||0,max:Number(s.max)||0}));
}
/* 2026 premium print-ready original Academy certificate system.
 * The actual Academy logo is rendered from the bundled asset.
 * No invented signature, issued seal or photo is composited into a document.
 * Distinct: result statement, exam award, competition winner,
 * competition participant and event contribution. */
const INK=[17,37,65], ROYAL=[48,19,73], EMERALD=[10,78,57],
 GOLD=[196,154,69], PALE=[255,252,244], SAND=[244,235,214],
 MID=[95,107,108], WHITE=[255,255,255];
function fill(pdf,c){pdf.setFillColor(...c)}
function stroke(pdf,c,width=.3){pdf.setDrawColor(...c);pdf.setLineWidth(width)}
function dotDiamond(pdf,x,y,r=1.5,color=GOLD){
 fill(pdf,color);pdf.triangle(x,y-r,x+r,y,x-r,y,'F');
 pdf.triangle(x,y+r,x+r,y,x-r,y,'F');
}
function swirlCorner(pdf,x,y,turn=1){
 stroke(pdf,GOLD,.42);
 pdf.line(x,y+10*turn,x,y+2*turn);
 pdf.line(x+2*turn,y,x+10*turn,y);
 pdf.circle(x+5*turn,y+5*turn,2.3,'S');
 pdf.circle(x+8*turn,y+8*turn,1.3,'S');
 dotDiamond(pdf,x+12*turn,y+12*turn,1.6);
}
function premiumFrame(pdf,w,h,accent=ROYAL){
 fill(pdf,PALE);pdf.rect(0,0,w,h,'F');
 fill(pdf,accent);pdf.rect(0,0,w,12,'F');
 fill(pdf,GOLD);pdf.rect(0,12,w,1.45,'F');
 fill(pdf,EMERALD);pdf.rect(0,h-9,w,9,'F');
 fill(pdf,GOLD);pdf.rect(0,h-10.4,w,1.4,'F');
 stroke(pdf,GOLD,1.15);pdf.rect(4.5,4.5,w-9,h-9,'S');
 stroke(pdf,GOLD,.35);pdf.rect(7,7,w-14,h-14,'S');
 for(let x=22;x<w-19;x+=12){dotDiamond(pdf,x,8.3,1.1);dotDiamond(pdf,x,h-5.5,1.1)}
 swirlCorner(pdf,11,16,1);
 swirlCorner(pdf,w-11,16,-1);
 swirlCorner(pdf,11,h-17,1);
 swirlCorner(pdf,w-11,h-17,-1);
}
function academyMasthead(pdf,brand,w,accent=ROYAL){
 // Layered Islamic arch and real Academy logo.
 fill(pdf,INK);pdf.roundedRect(w*.245,8,w*.51,43,10,10,'F');
 fill(pdf,accent);pdf.roundedRect(w*.32,13,w*.36,32,11,11,'F');
 fill(pdf,INK);pdf.roundedRect(w*.335,15,w*.33,27,10,10,'F');
 stroke(pdf,GOLD,.9);pdf.roundedRect(w*.26,10,w*.48,39,10,10,'S');
 pdf.addImage(brand.logo,'PNG',w/2-12,10,24,24);
 setColor(pdf,GOLD);
 fitText(pdf,'MADRASA AL ISLAHUL ARABIYA',w/2,42,16,w*.65,11,{bold:true,align:'center'});
}
function fitText(pdf,value,x,y,size,maxWidth,minSize=8,options={}){
 const val=String(value??'').replace(/[\r\n]+/g,' ').trim();
 let n=size;
 pdf.setFont('helvetica',options.bold?'bold':'normal');
 if(!/[^\u0020-\u007e]/.test(val)){
  while(n>minSize){
   pdf.setFontSize(n);
   if(pdf.getTextWidth(val)<=maxWidth)break;
   n-=.5;
  }
 }
 text(pdf,val,x,y,n,{...options,maxWidth});
}
function watermark(pdf,brand,w,h,size=92){
 // Transparent copy of the genuine logo, no false official seal.
 pdf.addImage(brand.watermark,'PNG',w/2-size/2,h/2-size/2+11,size,size);
}
function elegantLine(pdf,cx,y,width=160){
 stroke(pdf,GOLD,.48);pdf.line(cx-width/2,y,cx+width/2,y);
 dotDiamond(pdf,cx,y,1.9);
 dotDiamond(pdf,cx-width/2,y,1.3);dotDiamond(pdf,cx+width/2,y,1.3);
}
function labelChip(pdf,label,value,x,y,w=64){
 fill(pdf,WHITE);stroke(pdf,GOLD,.35);pdf.roundedRect(x,y,w,16,3,3,'FD');
 setColor(pdf,MID);fitText(pdf,label.toUpperCase(),x+4,y+5,7,w-8,6.2,{bold:true});
 setColor(pdf,INK);fitText(pdf,value,x+4,y+12.7,9,w-8,6.5,{bold:true});
}
function footerSignature(pdf,w,ref,date){
 stroke(pdf,GOLD,.48);
 pdf.line(31,186,99,186);pdf.line(w-99,186,w-31,186);
 setColor(pdf,INK);
 text(pdf,'AUTHORIZED SIGNATORY',65,191,8,{align:'center',bold:true});
 text(pdf,'DATE: '+String(date||'-'),w-65,191,8,{align:'center'});
 setColor(pdf,MID);
 fitText(pdf,'CERTIFICATE ID: '+String(ref||'-'),w/2,194,7,w-100,6,{align:'center'});
 text(pdf,'MADRASA AL ISLAHUL ARABIYA  |  ISSUED BY THE ACADEMY',w/2,199,7,{align:'center'});
}
function festivalBadge(pdf,cx,cy,mode){
 const accent=mode==='event'?INK:mode==='participation'?EMERALD:ROYAL;
 fill(pdf,accent);pdf.circle(cx,cy,18,'F');
 stroke(pdf,GOLD,1);pdf.circle(cx,cy,18,'S');pdf.circle(cx,cy,15.5,'S');
 dotDiamond(pdf,cx,cy-15,1.7);dotDiamond(pdf,cx,cy+15,1.7);
 if(mode==='winner'){
  // Vector trophy icon, not a made-up Academy emblem.
  fill(pdf,GOLD);pdf.roundedRect(cx-7,cy-6,14,9,1.3,1.3,'F');
  stroke(pdf,GOLD,1.1);
  pdf.line(cx-7,cy-4,cx-11,cy-6);pdf.line(cx-11,cy-6,cx-11,cy+1);
  pdf.line(cx+7,cy-4,cx+11,cy-6);pdf.line(cx+11,cy-6,cx+11,cy+1);
  pdf.line(cx,cy+3,cx,cy+9);pdf.line(cx-8,cy+9,cx+8,cy+9);
 }else if(mode==='event'){
  stroke(pdf,GOLD,1.2);
  pdf.circle(cx,cy-2,8,'S');
  pdf.line(cx-7,cy+7,cx+7,cy+7);pdf.line(cx,cy-10,cx,cy+6);
  dotDiamond(pdf,cx,cy-10,1.2);
 }else{
  stroke(pdf,GOLD,1.2);
  pdf.circle(cx,cy,7,'S');
  pdf.line(cx-7,cy,cx+7,cy);
  pdf.line(cx,cy-7,cx,cy+7);
 }
}
function landscapeTemplate(pdf,brand,{accent=ROYAL,heading,subtitle,studentName,course,studentCode,date,reference,mode='winner'}){
 premiumFrame(pdf,297,210,accent);watermark(pdf,brand,297,210,107);
 academyMasthead(pdf,brand,297,accent);
 fill(pdf,accent);pdf.roundedRect(29,56,239,17,4,4,'F');
 stroke(pdf,GOLD,.7);pdf.roundedRect(29,56,239,17,4,4,'S');
 setColor(pdf,GOLD);fitText(pdf,heading,148.5,68.2,21,230,13,{bold:true,align:'center'});
 setColor(pdf,INK);fitText(pdf,subtitle,148.5,84,10,223,8,{align:'center'});
 setColor(pdf,INK);fitText(pdf,studentName,148.5,107,27,217,15,{bold:true,align:'center'});
 elegantLine(pdf,148.5,113,176);
 festivalBadge(pdf,252,126,mode);
 labelChip(pdf,'Student ID',studentCode||'-',25,159,74);
 labelChip(pdf,'Class',course||'-',111.5,159,74);
 labelChip(pdf,'Date',date||'-',198,159,74);
 footerSignature(pdf,297,reference,date);
}
function singleText(pdf,value,y,size=12,accent=INK){
 setColor(pdf,accent);
 fitText(pdf,value,148.5,y,size,211,9,{align:'center',bold:true});
}
function signedExamBadge(pdf,record){
 fill(pdf,record.passed?EMERALD:ROYAL);
 pdf.roundedRect(82,145,133,16,4,4,'F');
 stroke(pdf,GOLD,.65);pdf.roundedRect(82,145,133,16,4,4,'S');
 setColor(pdf,GOLD);
 const v=record.passed?'PASS  |  CERTIFICATE OF ACHIEVEMENT':'EXAMINATION PARTICIPATION';
 fitText(pdf,v,148.5,156,13,126,9,{bold:true,align:'center'});
}

export async function createExamResultPdf(record){
 const JS=await readyPdf(),brand=await logoPair();
 const pdf=new JS({unit:'mm',format:'a4',orientation:'portrait',compress:true});
 const subjects=marks(record);
 let page=0,y=0,finalPage=1;
 function resultPage(){
  if(page)pdf.addPage();page++;
  premiumFrame(pdf,210,297,INK);watermark(pdf,brand,210,297,80);
  academyMasthead(pdf,brand,210,ROYAL);
  fill(pdf,ROYAL);pdf.roundedRect(21,58,168,17,3,3,'F');stroke(pdf,GOLD,.55);
  pdf.roundedRect(21,58,168,17,3,3,'S');
  setColor(pdf,GOLD);fitText(pdf,'OFFICIAL EXAM RESULT STATEMENT',105,70,16,160,11,{bold:true,align:'center'});
  labelChip(pdf,'Student ID',String(record.studentCode||'-'),17,81,55);
  labelChip(pdf,'Student Name',String(record.studentName||'-'),77,81,116);
  labelChip(pdf,'Course',String(record.course||'-'),17,101,84);
  labelChip(pdf,'Academic Year',String(record.academicYear||'-'),107,101,86);
  setColor(pdf,INK);fitText(pdf,String(record.examTitle||'Academy Examination'),105,124,11,175,8,{bold:true,align:'center'});
  setColor(pdf,MID);fitText(pdf,'EXAM DATE: '+String(record.examDate||'-'),105,131,8,175,7,{align:'center'});
  fill(pdf,ROYAL);pdf.roundedRect(15,138,180,12,2,2,'F');
  setColor(pdf,WHITE);text(pdf,'SUBJECT',20,146.3,9,{bold:true});
  text(pdf,'MAX',149,146.3,9,{bold:true});
  text(pdf,'OBTAINED',167,146.3,8.5,{bold:true});
  y=153;
 }
 resultPage();
 for(let i=0;i<subjects.length;i++){
  if(y+10>242)resultPage();
  const s=subjects[i];
  fill(pdf,i%2===0?[249,246,240]:WHITE);pdf.rect(16,y-1,178,9,'F');
  stroke(pdf,[230,219,197],.2);pdf.line(16,y+8,194,y+8);
  setColor(pdf,INK);
  fitText(pdf,s.name,20,y+5,9,122,7.5);
  fitText(pdf,String(s.max),150,y+5,9,14,7.5);
  fitText(pdf,String(s.score),169,y+5,9,20,7.5);
  y+=10;
 }
 if(y>219)resultPage();
 const sy=Math.max(y+4,164);finalPage=page;
 fill(pdf,[236,247,238]);pdf.roundedRect(16,sy,178,32,4,4,'F');
 stroke(pdf,GOLD,.65);pdf.roundedRect(16,sy,178,32,4,4,'S');
 setColor(pdf,EMERALD);
 fitText(pdf,'TOTAL  '+String(record.total??'-')+' / '+String(record.maxTotal??'-'),22,sy+11,12,77,9,{bold:true});
 fitText(pdf,'PERCENTAGE  '+Number(record.percent||0).toFixed(2)+'%',22,sy+24,10,77,8,{bold:true});
 fitText(pdf,'GRADE  '+String(record.grade||'-'),117,sy+11,11,70,9,{bold:true});
 setColor(pdf,record.passed?EMERALD:[165,50,45]);
 fitText(pdf,'RESULT  '+gradeLabel(record),117,sy+24,11,74,8,{bold:true});
 stroke(pdf,GOLD,.55);pdf.line(22,265,83,265);pdf.line(127,265,188,265);
 setColor(pdf,INK);text(pdf,'ACADEMY RECORD',105,266.5,7.5,{align:'center',bold:true});
 setColor(pdf,MID);
 fitText(pdf,'REFERENCE: '+String(record.id||'-'),105,276,7,180,6,{align:'center'});
 const url=new URL('exam-results.html?id='+encodeURIComponent(String(record.id||'')),location.href).href;
 fitText(pdf,'RESULT LINK: '+url,105,284,6.8,183,6.0,{align:'center'});
 return pdf.output('blob');
}

export async function createExamCertificatePdf(record){
 if(!record?.published)throw Error('Publish the result before issuing an official certificate.');
 const JS=await readyPdf(),brand=await logoPair();
 const pdf=new JS({unit:'mm',format:'a4',orientation:'landscape',compress:true});
 landscapeTemplate(pdf,brand,{
  accent:ROYAL,
  heading:record.passed?'CERTIFICATE OF ACADEMIC EXCELLENCE':'CERTIFICATE OF EXAMINATION PARTICIPATION',
  subtitle:'This certificate is proudly presented to',
  studentName:String(record.studentName||'Student'),studentCode:String(record.studentCode||'-'),
  course:String(record.course||'-'),date:String(record.examDate||'-'),
  reference:'CERT-'+String(record.id||'').slice(-16).toUpperCase(),mode:'participation'
 });
 singleText(pdf,record.passed?'for successfully completing the Academy examination':'for taking part in the Academy examination',126,10);
 singleText(pdf,String(record.examTitle||'Academy Examination'),139,14,ROYAL);
 signedExamBadge(pdf,record);
 setColor(pdf,INK);
 fitText(pdf,'Score: '+String(record.total??'-')+' / '+String(record.maxTotal??'-')+'   |   Grade: '+String(record.grade||'-')+'   |   '+Number(record.percent||0).toFixed(2)+'%',
  148.5,181.2,8,185,7,{align:'center'});
 return pdf.output('blob');
}

export async function createCompetitionCertificatePdf(certificate){
 if(!certificate?.id||!certificate?.studentName||!certificate?.eventName||!certificate?.eventDate)throw Error('A complete issued competition certificate is required.');
 const JS=await readyPdf(),brand=await logoPair();
 const pdf=new JS({unit:'mm',format:'a4',orientation:'landscape',compress:true});
 const award=String(certificate.award||'Participation');
 const isParticipant=award==='Participation';
 const isEvent=/^Event /.test(award);
 const mode=isEvent?'event':isParticipant?'participation':'winner';
 const heading=isEvent?'CERTIFICATE OF EVENT RECOGNITION':isParticipant?'CERTIFICATE OF PARTICIPATION':'CERTIFICATE OF EXCELLENCE';
 const subtitle=isEvent?'For dedication, service and contribution to Academy activities':
  isParticipant?'For enthusiastic participation and sincere effort':
  'In recognition of outstanding achievement and distinction';
 const accent=isEvent?INK:isParticipant?EMERALD:ROYAL;
 landscapeTemplate(pdf,brand,{
  accent,heading,subtitle,mode,
  studentName:String(certificate.studentName),
  course:String(certificate.course||'-'),studentCode:String(certificate.studentCode||'-'),
  date:String(certificate.eventDate),reference:String(certificate.id)
 });
 const intro=isEvent?'For valuable contribution to':isParticipant?'For active participation in':'For exceptional performance in';
 singleText(pdf,intro,126,10);
 singleText(pdf,String(certificate.eventName),138,14,accent);
 const ribbon=isEvent?award.replace(/^Event /,'').toUpperCase():isParticipant?'PARTICIPANT':award.toUpperCase();
 fill(pdf,accent);pdf.roundedRect(90,145,117,15,5,5,'F');
 stroke(pdf,GOLD,.7);pdf.roundedRect(90,145,117,15,5,5,'S');
 setColor(pdf,GOLD);fitText(pdf,ribbon,148.5,155.6,13,110,9,{bold:true,align:'center'});
 return pdf.output('blob');
}
export function downloadExamBlob(blob,filename){
 if(!(blob instanceof Blob)||!blob.size)throw Error('The PDF is empty.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export {safePdfName};
