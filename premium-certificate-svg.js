
const NS='http://www.w3.org/2000/svg';
const LOGO='1_20261112_080707_0000.png';
export const CERTIFICATE_TYPES=[['exam','Academic Examination Certificate'],['winner','Competition Prize / Winner'],['participation','Competition Participation'],['event','Event Appreciation / Service'],['results','Exam Result Statement']];
const E=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const T=(x,y,str,size=25,attrs='')=>`<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${E(str)}</text>`;
const diamond=(x,y,r=7)=>`<path d="M${x} ${y-r}l${r} ${r}l${-r} ${r}l${-r} ${-r}Z" fill="#D6A34D"/>`;
function flowers(x,y,s=1,flip=1){
 return `<g transform="translate(${x} ${y}) scale(${s*flip} ${s})" stroke="#E2AF59" fill="none" stroke-width="4">
 <path d="M5 104C3 51 40 10 85 13C155 14 171 75 138 109C107 138 88 97 116 82C143 69 149 115 121 115"/>
 <path d="M10 103C37 88 52 65 56 41M28 85C59 75 87 78 109 87M74 15C75 49 61 62 42 70"/>
 <path d="M55 43C20 30 24 6 34 0C64 4 69 30 55 43Z M77 44C100 10 120 17 129 30C117 56 91 54 77 44Z" fill="#D8A64E" fill-opacity=".6"/>
 </g>`;
}
function lantern(x,y,s=1){
 return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#A97226" stroke-width="3.5" fill="#FFE3A0">
 <path d="M0-76V-31 M-13-31Q0-52 13-31L19 7L11 47Q0 60-11 47L-19 7Z" fill-opacity=".82"/>
 <path d="M0-27V50 M-18 7H18 M-12 41H12 M-19 11L0-14L19 11 M-17 30L0 49L17 30" fill="none" stroke-width="2.3"/>
 <circle cy="-31" r="5"/><path d="M-8 48L0 64L8 48Z"/></g>`;
}
function skyline(w,h){
 const y=h-61;let o='<g fill="#DFCBA9" opacity=".54">';
 for(let i=0;i<20;i++){const x=60+i*(w-100)/20,dx=24+(i%4)*9,hi=20+(i%4)*10;
  o+=`<rect x="${x}" y="${y-hi}" width="${dx}" height="${hi}"/><path d="M${x} ${y-hi}Q${x+dx/2} ${y-hi-27} ${x+dx} ${y-hi}Z"/>`;}
 for(const x of [w*.18,w*.79])o+=`<rect x="${x-5}" y="${y-89}" width="10" height="89"/><path d="M${x-13} ${y-88}L${x} ${y-113}L${x+13} ${y-88}Z"/>`;
 return o+'</g>';
}
function defs(){
 return `<defs>
 <linearGradient id="cream" x2="0" y2="1"><stop stop-color="#FFFEFA"/><stop offset=".75" stop-color="#FFF7E9"/><stop offset="1" stop-color="#EEDCC0"/></linearGradient>
 <linearGradient id="gold" x2="0" y2="1"><stop stop-color="#FFF5BC"/><stop offset=".27" stop-color="#EDC77A"/><stop offset=".51" stop-color="#A77323"/><stop offset=".79" stop-color="#E7C46C"/><stop offset="1" stop-color="#FAE2A4"/></linearGradient>
 <linearGradient id="purple" x2="1" y2="1"><stop stop-color="#2D103D"/><stop offset=".5" stop-color="#69196B"/><stop offset="1" stop-color="#291040"/></linearGradient>
 <linearGradient id="navy" x2="1" y2="1"><stop stop-color="#0A1E3E"/><stop offset=".55" stop-color="#153666"/><stop offset="1" stop-color="#061733"/></linearGradient>
 <linearGradient id="green" x2="0" y2="1"><stop stop-color="#045E45"/><stop offset="1" stop-color="#003C33"/></linearGradient>
 <pattern id="mosaic" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M22.5 0L45 22.5L22.5 45L0 22.5ZM0 0L45 45M45 0L0 45" stroke="#C2A673" stroke-width=".8" opacity=".37" fill="none"/></pattern>
 <pattern id="bluepattern" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0L40 20L20 40L0 20ZM0 0L40 40M40 0L0 40" stroke="#B69C63" stroke-width="1.2" opacity=".3" fill="none"/></pattern>
 </defs>`;
}
function frame(w,h){
 const a=w>h?1:0;
 const p=a?`M${w*.26} 198Q${w*.38} 30 ${w*.5} 26Q${w*.62} 30 ${w*.74} 198Q${w*.9} 160 ${w-49} 300V${h-74}Q${w-130} ${h-14} ${w*.83} ${h-40}H${w*.17}Q130 ${h-14} 49 ${h-74}V300Q${w*.1} 160 ${w*.26} 198Z`:
 `M${w*.22} 148Q${w*.35} 25 ${w*.5} 27Q${w*.65} 25 ${w*.78} 148Q${w*.93} 205 ${w-43} 300V${h-82}Q${w-120} ${h-20} ${w*.78} ${h-41}H${w*.22}Q120 ${h-20} 43 ${h-82}V300Q70 205 ${w*.22} 148Z`;
 return `<rect width="${w}" height="${h}" fill="url(#navy)"/><rect width="${w}" height="${h}" fill="url(#bluepattern)"/>
 <rect x="10" y="10" width="${w-20}" height="${h-20}" rx="11" fill="none" stroke="url(#gold)" stroke-width="15"/>
 <rect x="25" y="25" width="${w-50}" height="${h-50}" rx="10" fill="none" stroke="#DFB65F" stroke-width="3"/>
 <path d="${p}" fill="url(#cream)" stroke="url(#gold)" stroke-width="14"/>
 <path d="${p}" fill="url(#mosaic)" stroke="#FFF2CC" stroke-width="3"/>
 ${skyline(w,h)}
 ${flowers(35,34,.65,1)}${flowers(w-35,34,.65,-1)}
 ${flowers(27,h-55,.46,1)}${flowers(w-27,h-55,.46,-1)}
 ${lantern(w*.116,310,a?1:.75)}${lantern(w*.884,310,a?1:.75)}
 <rect x="26" y="${h-27}" width="${w-52}" height="9" rx="3" fill="url(#green)" stroke="#C8A058" stroke-width="3"/>`;
}
function brand(w,cy=90,s=1){
 const x=w/2;
 return `<circle cx="${x}" cy="${cy}" r="${43*s}" fill="#FFF8EC" stroke="#D4A450" stroke-width="5"/>
 <image href="${LOGO}" x="${x-38*s}" y="${cy-38*s}" width="${76*s}" height="${76*s}"/>
 ${T(x,cy+81*s,'AL ISLAH',55*s,'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" letter-spacing="7" fill="#0B2549"')}
 ${T(x,cy+115*s,'ARABIC ACADEMY',31*s,'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" letter-spacing="8" fill="#0A523C"')}
 ${diamond(x,cy+134*s,7*s)}`;
}
function banner(w,y,title,small=false){
 const x=w*.17,width=w*.66;
 return `<path d="M${x+33} ${y}H${x+width-33}Q${x+width} ${y} ${x+width} ${y+37}L${x+width+18} ${y+62}L${x+width} ${y+88}Q${x+width} ${y+123} ${x+width-33} ${y+123}H${x+33}Q${x} ${y+123} ${x} ${y+88}L${x-18} ${y+62}L${x} ${y+37}Q${x} ${y} ${x+33} ${y}Z" fill="url(#purple)" stroke="url(#gold)" stroke-width="8"/>
 ${T(w/2,y+73,title,small?37:49,'font-family="Georgia,serif" font-weight="bold" text-anchor="middle" letter-spacing="2" fill="#F9E3A0"')}
 ${diamond(x+56,y+62,11)}${diamond(x+width-56,y+62,11)}`;
}
function studentName(w,y,name,fontSize=79){
 const n=String(name||'Student Name'),size=n.length>36?43:n.length>24?54:n.length>17?62:fontSize;
 return T(w/2,y,n,size,'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-style="italic" fill="#07503D"')+
 `<path d="M${w*.25} ${y+21}H${w*.75}" fill="none" stroke="#D5A44B" stroke-width="2"/>${diamond(w/2,y+21,7)}`;
}
function chip(x,y,w,label,value){
 const txt=String(value??'-'),size=txt.length>30?18:txt.length>18?23:27;
 return `<rect x="${x}" y="${y}" width="${w}" height="102" rx="17" fill="#FFFCF6" stroke="#CFA04B" stroke-width="4"/>
 <path d="M${x+3} ${y+16}Q${x+3} ${y+3} ${x+18} ${y+3}H${x+w-18}Q${x+w-3} ${y+3} ${x+w-3} ${y+16}V${y+50}H${x+3}Z" fill="url(#green)"/>
 ${T(x+w/2,y+36,label,21,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#FFE2A0"')}
 ${T(x+w/2,y+80,txt,size,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#0B2649"')}`;
}
function stamp(cx,cy,size=82){
 return `<circle cx="${cx}" cy="${cy}" r="${size+11}" fill="#3F174C" stroke="#DDB45D" stroke-width="10"/>
 <circle cx="${cx}" cy="${cy}" r="${size}" fill="url(#purple)" stroke="#F5D894" stroke-width="4"/>
 <circle cx="${cx}" cy="${cy}" r="${size-13}" fill="none" stroke="#D7B067" stroke-width="2"/>
 <image href="${LOGO}" x="${cx-58}" y="${cy-61}" width="116" height="116"/>
 ${T(cx,cy+size-19,'AL ISLAH ACADEMY',13,'font-family="Georgia,serif" text-anchor="middle" fill="#FFE6A7" letter-spacing="1.8"')}`;
}
function trophy(cx,cy,label='First Prize'){
 return `<g transform="translate(${cx} ${cy})" fill="url(#gold)" stroke="#A8762E" stroke-width="4">
 <path d="M-50-46H50L39 9Q20 35 2 35H-2Q-29 26 -39 9Z"/>
 <path d="M-50-36Q-89-49 -89-8Q-87 10 -44 19M50-36Q89-49 89-8Q87 10 44 19" fill="none" stroke="#E2AD4B" stroke-width="7"/>
 <rect x="-9" y="34" width="18" height="27"/><rect x="-46" y="62" width="92" height="15" rx="5"/></g>
 <path d="M${cx-92} ${cy+84}Q${cx} ${cy+101} ${cx+92} ${cy+84}L${cx+74} ${cy+124}Q${cx} ${cy+143} ${cx-74} ${cy+124}Z" fill="url(#purple)" stroke="#CBA24F" stroke-width="6"/>
 ${T(cx,cy+119,String(label).toUpperCase(),22,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#FFE5A6"')}`;
}
function certificate(kind,r){
 const w=1414,h=1000,competition=kind!=='exam';
 const title=kind==='exam'?'CERTIFICATE OF ACADEMIC EXCELLENCE':kind==='winner'?'CERTIFICATE OF EXCELLENCE':kind==='participation'?'CERTIFICATE OF PARTICIPATION':'CERTIFICATE OF APPRECIATION';
 const event=competition?r.eventName:r.examTitle,dt=competition?r.eventDate:r.examDate;
 const award=r.award||'First Prize';
 const desc=kind==='exam'?'for excellent academic performance and successful completion':
 kind==='winner'?'for securing '+award+' in the':
 kind==='participation'?'for active participation and sincere effort in the':
 'for dedication and valuable service in the';
 let s=frame(w,h)+brand(w,90,.95)+banner(w,288,title,title.length>34);
 s+=T(w/2,452,'This certificate is proudly presented to',30,'text-anchor="middle" font-family="Georgia,serif" font-style="italic" fill="#1F3152"');
 s+=studentName(w,551,r.studentName);
 s+=T(w/2,624,desc,29,'text-anchor="middle" font-family="Georgia,serif" font-style="italic" fill="#222B50"');
 s+=T(w/2,677,event||'Academy Programme',String(event||'').length>42?26:35,'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" fill="#4F1764"');
 const cards=kind==='exam'?[['Student ID',r.studentCode],['Class',r.course],['Academic Year',r.academicYear],['Result',r.passed?'PASS':'PARTICIPATED']]:
 [['Student ID',r.studentCode],['Class',r.course],['Event Date',dt],['Award',kind==='winner'?award:kind==='event'?award.replace('Event ',''):'PARTICIPANT']];
 cards.forEach(([label,value],i)=>s+=chip(67+i*322,714,303,label,value));
 if(kind==='winner')s+=trophy(w*.23,797,award);
 else if(kind==='event')s+=lantern(w*.23,826,1.5);
 else s+=`<circle cx="${w*.23}" cy="795" r="66" fill="url(#gold)" stroke="#6C2456" stroke-width="9"/>${diamond(w*.23,795,27)}`;
 s+=stamp(w/2,835);
 s+=`<path d="M${w*.65} 870h${w*.21}" stroke="#1C2D50" stroke-width="3"/>
 ${T(w*.755,901,'AUTHORIZED SIGNATORY',23,'font-family="Georgia,serif" font-style="italic" text-anchor="middle" fill="#1B2A50"')}
 ${T(w/2,940,'CERTIFICATE ID: '+String(r.id||'ALIA-DEMO').slice(0,55),16,'font-family="Arial,sans-serif" text-anchor="middle" fill="#263D56"')}`;
 return `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${s}</svg>`;
}
function resultPage(r,subjects,page,totalPages){
 const w=1000,h=1414,rows=subjects.slice(page*7,page*7+7);
 let s=frame(w,h)+brand(w,86,.82)+banner(w,281,'OFFICIAL EXAM RESULT STATEMENT',true);
 s+=T(w/2,457,'EXAMINATION RESULTS',28,'font-family="Georgia,serif" text-anchor="middle" fill="#172C4C"');
 s+=studentName(w,548,r.studentName,63);
 s+=chip(55,585,280,'Student ID',r.studentCode)+chip(360,585,280,'Class',r.course)+chip(665,585,280,'Academic Year',r.academicYear);
 s+=T(w/2,749,r.examTitle||'Annual Examination',32,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#4E165F"');
 s+=T(w/2,791,(r.examDate||'')+'  •  Page '+(page+1)+' of '+totalPages,21,'font-family="Georgia,serif" text-anchor="middle" fill="#243453"');
 const tableY=829;
 s+=`<rect x="69" y="${tableY}" width="863" height="62" rx="10" fill="url(#purple)" stroke="#D6A34D" stroke-width="4"/>`;
 s+=T(121,tableY+41,'S.NO.',24,'font-family="Georgia,serif" fill="#FBE4A2" font-weight="bold"');
 s+=T(274,tableY+41,'SUBJECT',24,'font-family="Georgia,serif" fill="#FBE4A2" font-weight="bold"');
 s+=T(790,tableY+41,'MARKS',24,'font-family="Georgia,serif" fill="#FBE4A2" font-weight="bold"');
 rows.forEach((item,i)=>{
  const y=tableY+62+i*47;
  s+=`<rect x="70" y="${y}" width="862" height="47" fill="${i%2?'#FFF8ED':'#FFFFFA'}" stroke="#D6B577" stroke-width="1.6"/>`;
  s+=T(151,y+31,page*7+i+1,23,'font-family="Georgia,serif" text-anchor="middle" fill="#182C4A"');
  s+=T(270,y+31,String(item.name||'Subject').slice(0,48),25,'font-family="Georgia,serif" fill="#182C4A"');
  s+=T(823,y+31,(item.score??0)+' / '+(item.max??0),24,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#182C4A"');
 });
 if(page===totalPages-1){
  const y=1261;
  s+=`<rect x="69" y="${y}" width="862" height="85" rx="13" fill="#FFF7E9" stroke="#C99D47" stroke-width="4"/>`;
  [['TOTAL',(r.total??0)+' / '+(r.maxTotal??0)],['PERCENT',(Number(r.percent)||0).toFixed(2)+'%'],['GRADE',r.grade||'—'],['RESULT',r.passed?'PASS':'NEEDS IMPROVEMENT']].forEach(([label,value],i)=>{
   const x=180+i*215;
   s+=T(x,y+27,label,17,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#03523D"')+
      T(x,y+61,value,String(value).length>13?15:26,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#112649"');
  });
 }
 s+=T(w/2,h-83,'RESULT REFERENCE: '+String(r.id||'ALIA-DEMO').slice(0,53),17,'text-anchor="middle" font-family="Arial,sans-serif" fill="#213656"');
 return `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${s}</svg>`;
}
function previewWatermark(markup,portrait){
 const w=portrait?1000:1414,h=portrait?1414:1000;
 const warning='<g opacity=".28" transform="translate('+w/2+' '+h/2+') rotate(-21)"><text x="0" y="0" font-size="'+(portrait?89:100)+'" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="#7D2444">SAMPLE - NOT VALID</text></g>';
 const tag='<g><rect x="42" y="38" width="'+(portrait?214:232)+'" height="42" rx="10" fill="#6B193D" stroke="#E8BD77" stroke-width="3"/><text x="'+(portrait?149:158)+'" y="66" font-size="21" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="#FFF5DA">SAMPLE PREVIEW</text></g>';
 return markup.replace('</svg>',warning+tag+'</svg>');
}
export function premiumCertificatePages(type,record={}){
 let pages=[];
 if(type==='results'){
  const items=Array.isArray(record.subjects)?record.subjects:[];
  const count=Math.max(1,Math.ceil(items.length/7));
  pages=Array.from({length:count},(_,i)=>resultPage(record,items,i,count));
 }else{
  if(!['exam','winner','participation','event'].includes(type))throw Error('Unknown certificate type');
  pages=[certificate(type,record)];
 }
 return record.previewMode?pages.map(s=>previewWatermark(s,type==='results')):pages;
}
export function classifyCompetitionAward(award){return String(award||'') .startsWith('Event ')?'event':award==='Participation'?'participation':'winner'}
export function sampleCertificate(type='exam'){
 const base={previewMode:true,id:'ALIA-SAMPLE-001',studentName:'Muhsin A',studentCode:'ALIA00037',course:'Muallama',academicYear:'2026-2027',examTitle:'Annual Examination',examDate:'2026-03-15',passed:true,published:true,total:183,maxTotal:200,percent:91.5,grade:'A+',subjects:[{name:'Arabic Language',score:46,max:50},{name:"Qur'an Tajweed",score:48,max:50},{name:'Hadith',score:44,max:50},{name:'Deeniyat',score:45,max:50}]};
 if(type==='winner')return {...base,id:'COMP-SAMPLE-001',studentName:'Farhana B',studentCode:'ALIA00021',award:'First Prize',eventName:"Qur'an Recitation Competition",eventDate:'2026-03-20'};
 if(type==='participation')return {...base,id:'COMP-SAMPLE-002',studentName:'Aakifa S',studentCode:'ALIA00018',award:'Participation',eventName:'Islamic Quiz Competition',eventDate:'2026-03-18'};
 if(type==='event')return {...base,id:'COMP-SAMPLE-003',studentName:'Syed T',studentCode:'ALIA00015',award:'Event Volunteer',eventName:'Ramadan Programme',eventDate:'2026-02-08'};
 return base;
}
let libraries=null;
function include(src){
 return new Promise((resolve,reject)=>{let s=[...document.scripts].find(x=>x.src===src);if(s?.dataset.ready==='yes')return resolve();
  if(!s){s=document.createElement('script');s.src=src;s.async=true;document.head.append(s)}
  s.addEventListener('load',()=>{s.dataset.ready='yes';resolve()},{once:true});
  s.addEventListener('error',()=>reject(Error('Cannot load vector PDF library')),{once:true});
 });
}
async function library(){
 if(window.jspdf?.jsPDF?.API?.svg)return window.jspdf.jsPDF;
 if(!libraries)libraries=(async()=>{
  if(!window.jspdf?.jsPDF)await include('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
  await include('https://cdn.jsdelivr.net/npm/svg2pdf.js@2.8.1/dist/svg2pdf.umd.min.js');
  if(typeof window.jspdf?.jsPDF?.API?.svg!=='function')throw Error('Vector PDF engine not available');
  return window.jspdf.jsPDF;
 })().catch(e=>{libraries=null;throw e});
 return libraries;
}
async function logoData(){
 const response=await fetch(LOGO);if(!response.ok)throw Error('Official Academy logo missing. Certificate not issued.');
 const blob=await response.blob();
 return await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(String(f.result));f.onerror=reject;f.readAsDataURL(blob)});
}
export async function createPremiumVectorPdf(type,record){
 const J=await library(),logo=await logoData(),pages=premiumCertificatePages(type,record),landscape=type!=='results';
 const pdf=new J({orientation:landscape?'landscape':'portrait',unit:'mm',format:'a4',precision:12,compress:true});
 for(let i=0;i<pages.length;i++){
  if(i)pdf.addPage('a4',landscape?'landscape':'portrait');
  const svgText=pages[i].replaceAll('href="'+LOGO+'"','href="'+logo+'"');
  const svg=new DOMParser().parseFromString(svgText,'image/svg+xml').documentElement;
  if(svg.querySelector('parsererror'))throw Error('Certificate vector layout is invalid');
  await pdf.svg(svg,{x:0,y:0,width:landscape?297:210,height:landscape?210:297});
 }
 const blob=pdf.output('blob');
 if(!(blob instanceof Blob)||blob.size<1000)throw Error('Generated vector PDF is invalid');
 return blob;
}
