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
export async function createExamResultPdf(record){
 const JS=await readyPdf(),brand=await logoPair();
 const pdf=new JS({unit:'mm',format:'a4',orientation:'portrait',compress:true}),rows=marks(record);
 let page=0,y=0;
 function newPage(){
  if(page)pdf.addPage();page++;header(pdf,brand,210,297,'OFFICIAL EXAMINATION RESULT','Confidential result statement • Published result only');
  setColor(pdf,[24,73,48]);
  text(pdf,'Student: '+String(record.studentName||''),19,69,12,{bold:true,maxWidth:165});
  text(pdf,'Student ID: '+String(record.studentCode||'Not recorded')+'    Class: '+String(record.course||'-')+'    Batch: '+String(record.batch||'-'),19,77,9);
  text(pdf,'Examination: '+String(record.examTitle||''),19,85,10,{bold:true});
  text(pdf,'Academic Year: '+String(record.academicYear||'-')+'    Exam Date: '+String(record.examDate||'-'),19,93,9);
  pdf.setFillColor(221,239,225);pdf.roundedRect(17,101,176,10,2,2,'F');
  text(pdf,'SUBJECT',21,108,8,{bold:true});text(pdf,'MARKS',133,108,8,{bold:true});text(pdf,'MAX',172,108,8,{bold:true});
  y=116;
 }
 newPage();
 for(let i=0;i<rows.length;i++){
  if(y>244)newPage();
  const row=rows[i],back=i%2===0?[248,252,248]:[255,255,255];
  pdf.setFillColor(...back);pdf.rect(17,y-5,176,11,'F');
  pdf.setDrawColor(224,234,226);pdf.line(17,y+6,193,y+6);
  setColor(pdf,[25,61,43]);text(pdf,row.name.slice(0,60),21,y+1,9,{maxWidth:105});text(pdf,String(row.score),135,y+1,9);text(pdf,String(row.max),174,y+1,9);
  y+=12;
 }
 if(y>222)newPage();
 y=Math.min(y+5,238);
 pdf.setFillColor(229,245,233);pdf.roundedRect(17,y,176,30,3,3,'F');
 setColor(pdf,[15,81,50]);text(pdf,'TOTAL: '+record.total+' / '+record.maxTotal,22,y+10,12,{bold:true});
 text(pdf,'PERCENTAGE: '+Number(record.percent||0).toFixed(2)+'%',22,y+20,11,{bold:true});
 text(pdf,'GRADE: '+String(record.grade||'-'),109,y+10,11,{bold:true});
 text(pdf,'RESULT: '+gradeLabel(record),109,y+20,10,{bold:true});
 pdf.setTextColor(99,116,101);text(pdf,'Result Code: '+String(record.id||''),18,271,8);
 text(pdf,'Verify: '+new URL('exam-results.html?id='+encodeURIComponent(record.id||''),location.href).href,18,278,7);
 return pdf.output('blob');
}
export async function createExamCertificatePdf(record){
 if(!record?.published)throw Error('Publish the result before issuing an official certificate.');
 const JS=await readyPdf(),brand=await logoPair();
 const pdf=new JS({unit:'mm',format:'a4',orientation:'landscape',compress:true});
 header(pdf,brand,297,210,'ACADEMIC EXAMINATION CERTIFICATE','Faith • Knowledge • Excellence');
 const green=[15,72,46],gold=[180,143,66];setColor(pdf,green);
 text(pdf,record.passed?'CERTIFICATE OF ACHIEVEMENT':'CERTIFICATE OF PARTICIPATION',148.5,79,22,{bold:true,align:'center'});
 pdf.setDrawColor(...gold);pdf.setLineWidth(.5);pdf.line(76,85,221,85);
 pdf.setTextColor(88,103,91);text(pdf,'This certificate is respectfully presented to',148.5,99,12,{align:'center'});
 setColor(pdf,green);text(pdf,String(record.studentName||'Student'),148.5,118,23,{bold:true,align:'center',maxWidth:220});
 pdf.setDrawColor(...gold);pdf.line(59,123,238,123);
 const phrase=record.passed?'for successfully passing the assessment':'for participation in the assessment';
 pdf.setTextColor(77,99,82);text(pdf,phrase,148.5,135,11,{align:'center'});
 text(pdf,String(record.examTitle||'Academy Examination'),148.5,144,14,{bold:true,align:'center'});
 setColor(pdf,green);
 text(pdf,'Student ID: '+String(record.studentCode||'Not recorded')+'  |  Class: '+String(record.course||'-')+'  |  Academic Year: '+String(record.academicYear||'-'),148.5,154,10,{align:'center'});
 text(pdf,'Score: '+record.total+' / '+record.maxTotal+'  |  '+Number(record.percent||0).toFixed(2)+'%  |  Grade: '+String(record.grade||'-'),148.5,164,10,{align:'center'});
 pdf.setDrawColor(...gold);pdf.setLineWidth(.35);pdf.line(39,183,90,183);pdf.line(207,183,258,183);
 pdf.setTextColor(50,73,55);text(pdf,'Date: '+String(record.examDate||'-'),65,189,8,{align:'center'});
 text(pdf,'Authorized Signatory',232.5,189,9,{align:'center'});
 pdf.setFont('helvetica','normal');pdf.setFontSize(7.2);pdf.setTextColor(94,111,100);
 pdf.text('Certificate ID: CERT-'+String(record.id||'').slice(-16).toUpperCase(),148.5,192.5,{align:'center'});
 pdf.setFontSize(6.8);pdf.text('Verify at: exam-results.html   |   Reference: '+String(record.id||''),148.5,198,{align:'center'});
 return pdf.output('blob');
}
export function downloadExamBlob(blob,filename){
 if(!(blob instanceof Blob)||!blob.size)throw Error('The PDF is empty.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export {safePdfName};
