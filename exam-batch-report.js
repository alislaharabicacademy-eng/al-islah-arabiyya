
// Admin-only A4 batch register: published marks only, private by default.
export const normalizedName=v=>String(v??'').trim().replace(/\s+/g,' ').slice(0,120);
const keyPart=v=>normalizedName(v).toLowerCase();
export const groupKey=r=>[keyPart(r.courseId||r.course),keyPart(r.batch),keyPart(r.academicYear),keyPart(r.examTitle)].join('|');
export function groupedPublishedResults(input,{course='all',academicYear='all',exam='all'}={}){
 const records=(Array.isArray(input)?input:[]).filter(r=>r?.published===true&&String(r.studentName||'').trim()
 &&(course==='all'||String(r.courseId||r.course)===String(course))
 &&(academicYear==='all'||String(r.academicYear||'')===String(academicYear))
 &&(exam==='all'||String(r.examTitle||'')===String(exam)));
 const map=new Map();
 for(const r of records){
  const k=groupKey(r);
  if(!map.has(k))map.set(k,{key:k,course:normalizedName(r.course||r.courseId)||'Unassigned',
   courseId:String(r.courseId||''),batch:normalizedName(r.batch),examTitle:normalizedName(r.examTitle),
   academicYear:normalizedName(r.academicYear),byStudent:new Map()});
  const g=map.get(k),student=String(r.studentId||r.studentCode||r.id||r.studentName);
  const prev=g.byStudent.get(student);
  if(!prev||String(r.updatedAt||'')>String(prev.updatedAt||''))g.byStudent.set(student,{...r});
 }
 const groups=[];
 for(const g of map.values()){
  const ordered=[...g.byStudent.values()].sort((a,b)=>Number(b.percent||0)-Number(a.percent||0)
   ||String(a.studentName).localeCompare(String(b.studentName)));
  const scheme=new Set(ordered.map(r=>(Array.isArray(r.subjects)?r.subjects:[])
   .map(s=>keyPart(s.name)+':'+Number(s.max||0)).sort().join(';')));
  let place=0,last=null,passedSeen=0;
  const ranked=ordered.map(r=>{
   let rank=null;
   if(r.passed===true){
    passedSeen++;
    const value=Number(r.percent||0);
    if(last===null||Math.abs(value-last)>0.00001){place=passedSeen;last=value}
    rank=place;
   }
   return {...r,rank};
  });
  groups.push({key:g.key,course:g.course,courseId:g.courseId,batch:g.batch,examTitle:g.examTitle,
   academicYear:g.academicYear,records:ranked,studentCount:ranked.length,
   passedCount:ranked.filter(r=>r.passed===true).length,schemeComparable:scheme.size<=1,
   winners:scheme.size<=1?ranked.filter(r=>r.rank!==null&&r.rank<=3):[]});
 }
 return groups.sort((a,b)=>a.course.localeCompare(b.course)||a.batch.localeCompare(b.batch)
 ||a.academicYear.localeCompare(b.academicYear)||a.examTitle.localeCompare(b.examTitle));
}
export function publishedResultFilterOptions(input){
 const records=(Array.isArray(input)?input:[]).filter(r=>r?.published===true);
 const distinct=f=>[...new Set(records.map(r=>String(r[f]||'').trim()).filter(Boolean))].sort();
 const courses=new Map();
 for(const r of records){const id=String(r.courseId||r.course||'').trim();if(id&&!courses.has(id))courses.set(id,String(r.course||id))}
 return {courses:[...courses].sort((a,b)=>a[1].localeCompare(b[1])),academicYears:distinct('academicYear'),exams:distinct('examTitle')};
}
async function jsPDF(){
 if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
 for(const url of ['./vendor/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js']){
  try{
   await new Promise((yes,no)=>{const s=document.createElement('script');s.src=url;s.async=true;
    const timer=setTimeout(()=>no(Error('PDF library source timed out')),12000);
    s.onload=()=>{clearTimeout(timer);yes()};
    s.onerror=()=>{clearTimeout(timer);no(Error('PDF library URL unavailable'))};document.head.append(s)});
   if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
  }catch(e){console.warn('Alternate PDF source:',e.message)}
 }
 throw Error('PDF library unavailable. Check Internet connection and use Chrome.');
}
async function logo(){
 try{const r=await fetch('1_20261112_080707_0000.png');if(!r.ok)return null;
 const b=await r.blob();
 return await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(String(f.result));f.onerror=reject;f.readAsDataURL(b)})
 }catch{return null}
}
export async function createAcademyPublishedRegisterPdf(groups,{mode='full',permissionConfirmed=false}={}){
 if(mode!=='full'&&mode!=='top3')throw Error('Invalid result register format.');
 if(!Array.isArray(groups)||!groups.length)throw Error('No published results match selected filters.');
 if(mode==='top3'&&!permissionConfirmed)throw Error('Confirm guardian/student permission before making the shareable rank PDF.');
 const PDF=await jsPDF(),logoData=await logo();
 const pdf=new PDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,precision:9});
 const W=210,H=297,M=13;
 let y=0,page=0,items=0,table=null;
 function text(s,x,yy,size=8,bold=false,align){
  pdf.setTextColor(18,48,47);pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
  pdf.text(String(s),x,yy,align?{align}:{});
 }
 function safe(s,max=50){return String(s??'').replace(/\s+/g,' ').trim().slice(0,max)}
 function pageStart(){
  if(page)pdf.addPage('a4','portrait');page++;
  pdf.setFillColor(16,58,46);pdf.rect(0,0,W,35,'F');
  pdf.setFillColor(196,158,83);pdf.rect(0,34,W,1,'F');
  if(logoData){try{pdf.addImage(logoData,'PNG',14,4,27,27)}catch(e){console.warn('Logo embed failed:',e.message)}}
  pdf.setTextColor(255,245,214);pdf.setFont('times','bold');pdf.setFontSize(16);
  pdf.text('AL ISLAH ARABIC ACADEMY',logoData?117:105,14,{align:'center'});
  pdf.setFontSize(11);pdf.text(mode==='top3'?'PUBLISHED TOP ACHIEVERS':'PUBLISHED EXAMINATION RESULT REGISTER',logoData?117:105,22,{align:'center'});
  pdf.setFontSize(8);pdf.text('ACADEMY EXAMINATION DEPARTMENT',logoData?117:105,28,{align:'center'});
  pdf.setDrawColor(218,207,177);pdf.line(M,H-14,W-M,H-14);
  text(mode==='top3'?'SHARE ONLY WITH GUARDIAN PERMISSION':'CONFIDENTIAL - FOR ACADEMY ADMIN ONLY',M,H-9,7);
  text('Page '+page,W-M,H-9,7,false,'right');y=43;
 }
 function heading(g){
  if(y+40>H-20)pageStart();
  pdf.setFillColor(239,246,239);pdf.roundedRect(M,y,W-2*M,24,2,2,'F');
  pdf.setDrawColor(192,155,75);pdf.roundedRect(M,y,W-2*M,24,2,2,'S');
  text(safe(g.course,48)+(g.batch?' / '+safe(g.batch,17):''),M+4,y+7,12,true);
  text(safe(g.examTitle,65),M+4,y+14,9);
  text('Year: '+safe(g.academicYear,20)+'   Students: '+g.studentCount+'   Pass: '+g.passedCount,M+4,y+20,8);
  y+=30;
  if(!g.schemeComparable){text('WARNING: Mixed subject schemes. Top ranks withheld until reviewed.',M,y+4,8,true);y+=10}
 }
 function tableHeader(){
  pdf.setFillColor(17,66,49);pdf.rect(M,y,W-2*M,9,'F');
  pdf.setTextColor(255,244,214);pdf.setFont('helvetica','bold');pdf.setFontSize(7.6);
  if(mode==='top3'){
   pdf.text('POSITION',M+3,y+6);pdf.text('STUDENT NAME',M+32,y+6);pdf.text('PERCENT',W-M-35,y+6);
   pdf.text('GRADE',W-M-3,y+6,{align:'right'});
  }else{
   for(const [label,x] of [['RANK',2],['STUDENT NAME',19],['ALIA ID',88],['MARKS',121],['%',145],['GRADE',160]])pdf.text(label,M+x,y+6);
   pdf.text('STATUS',W-M-2,y+6,{align:'right'});
  }
  y+=9;
 }
 function row(r,index){
  if(y+9>H-20){pageStart();tableHeader()}
  if(index%2){pdf.setFillColor(249,247,243);pdf.rect(M,y,W-2*M,8.5,'F')}
  if(mode==='top3'){
   text(r.rank===1?'1st':r.rank===2?'2nd':'3rd',M+3,y+5.6);
   text(safe(r.studentName,48),M+32,y+5.6,8,false);
   text(Number(r.percent||0).toFixed(2)+'%',W-M-35,y+5.6);
   text(safe(r.grade,9),W-M-3,y+5.6,8,false,'right');
  }else{
   text(r.rank===null?'—':r.rank,M+2,y+5.6,8);
   text(safe(r.studentName,32),M+19,y+5.6,8);
   text(safe(r.studentCode||'—',15),M+88,y+5.6,8);
   text(Number(r.total||0)+'/'+Number(r.maxTotal||0),M+121,y+5.6,7.5);
   text(Number(r.percent||0).toFixed(2),M+145,y+5.6,7.5);
   text(safe(r.grade||'—',8),M+160,y+5.6,8);
   text(r.passed===true?'PASS':'REVIEW',W-M-2,y+5.6,7.4,false,'right');
  }
  pdf.setDrawColor(226,222,211);pdf.line(M,y+8.4,W-M,y+8.4);y+=8.5;
 }
 pageStart();
 for(const g of groups){
  const records=mode==='top3'?g.winners:g.records;
  if(mode==='top3'&&!records.length)continue;
  heading(g);tableHeader();
  records.forEach((r,i)=>row(r,i));
  if(!records.length){text('No result entries for this group.',M+3,y+6);y+=10}
  items+=records.length;y+=12;
 }
 if(mode==='top3'&&!items)throw Error('No comparable published top-three ranks found.');
 const blob=pdf.output('blob');
 if(!(blob instanceof Blob)||blob.size<1000)throw Error('Empty PDF generated.');
 return blob;
}
