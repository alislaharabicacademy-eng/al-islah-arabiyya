
import {loadSiteSettings} from './site-settings.js';
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

function cornerPanel(x,y,mirror=1,scale=1){
 return `<g transform="translate(${x} ${y}) scale(${mirror*scale} ${scale})" stroke="#F5C861" fill="none" stroke-width="3.6">
 <path d="M0 8H195Q170 39 141 45Q94 50 84 94Q78 145 8 185V8Z" fill="#33114B" stroke="#E7C268" stroke-width="5"/>
 <path d="M22 13Q50 40 87 24Q137 8 172 24M14 21Q33 79 17 128Q65 103 72 64Q79 32 114 43Q143 50 143 83Q139 113 109 114Q91 115 92 92Q95 77 108 79"/>
 <path d="M33 160Q68 116 62 86Q57 63 38 59M85 23Q110 50 103 75M42 109Q72 108 99 126"/>
 <path d="M38 59Q24 27 45 25Q72 33 60 60Z M62 87Q67 55 91 55Q108 70 89 89Z M93 124Q122 118 127 141Q109 157 93 124Z" fill="#D8A243" stroke="#F8DF9C" stroke-width="2"/>
 <circle cx="144" cy="39" r="5" fill="#F9D682"/><circle cx="18" cy="153" r="4" fill="#F9D682"/></g>`;
}
function sideLattice(x,y,height){
 let stars='';
 for(let row=0;row<Math.floor(height/56);row++){
  const xx=x+25,yy=y+row*56;
  stars+=`<path d="M${xx} ${yy-12}l12 12l-12 12l-12-12Z" fill="none" stroke="#DBB769" stroke-width="1.7"/>`;
 }
 return `<rect x="${x}" y="${y}" width="50" height="${height}" fill="#064536" stroke="#C99A42" stroke-width="4"/>${stars}`;
}
function leafWreath(cx,cy,s=1){
 let out=`<g transform="translate(${cx} ${cy}) scale(${s})" fill="none" stroke="#E6B455" stroke-width="4">`;
 for(const side of [-1,1]){
  out+=`<g transform="scale(${side} 1)"><path d="M45 76Q10 33 16-40" stroke-width="5"/>`;
  for(let i=0;i<6;i++){
   const y=62-i*19,x=43-i*4;
   out+=`<ellipse cx="${x-19}" cy="${y-9}" rx="9" ry="19" transform="rotate(-27 ${x-19} ${y-9})" fill="#E0AB45" stroke-width="2"/>`;
  }
  out+='</g>';
 }
 return out+'</g>';
}
function eventCrescent(cx,cy){
 return `<g transform="translate(${cx} ${cy})">
 <circle cx="0" cy="0" r="82" fill="#F6D88B" stroke="#B57F28" stroke-width="7"/>
 <path d="M42-69A73 73 0 1 0 42 69A64 64 0 1 1 42-69Z" fill="#1D5D44" stroke="#C29346" stroke-width="4"/>
 <path d="M34-24l7 17 18 2-14 12 5 18-16-9-15 9 5-18-15-12 19-2Z" fill="#D6A74F"/>
 ${lantern(45,16,.63)}</g>`;
}
function participationRosette(cx,cy,label='PARTICIPANT'){
 let petals='';
 for(let i=0;i<18;i++)petals+=`<path d="M0-105Q-21-76 0-52Q21-76 0-105Z" fill="${i%2?'#B99036':'#ECD387'}" stroke="#7D274F" stroke-width="2" transform="rotate(${i*20})"/>`;
 return `<g transform="translate(${cx} ${cy}) scale(.72)">${petals}
 <circle r="61" fill="url(#purple)" stroke="#D8AB50" stroke-width="8"/>
 <circle r="43" fill="#F7D37A" stroke="#F6E6BA" stroke-width="3"/>
 ${diamond(0,-14,19)}
 <path d="M-55 39l-21 93 31-15 19 25 17-76M55 39l21 93-31-15-19 25-17-76" fill="url(#purple)" stroke="#CE9D42" stroke-width="5"/>
 ${T(0,75,label,16,'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" fill="#FFE7B1"')}</g>`;
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
 ${sideLattice(36,235,h-326)}${sideLattice(w-86,235,h-326)}
 ${skyline(w,h)}
 ${cornerPanel(23,22,1,a?.95:.67)}${cornerPanel(w-23,22,-1,a?.95:.67)}
 ${flowers(24,h-134,.69,1)}${flowers(w-24,h-134,.69,-1)}
 ${lantern(w*.108,292,a?1:.78)}${lantern(w*.892,292,a?1:.78)}
 ${diamond(w/2,h-37,10)}
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
 const x=w*.19,width=w*.62,words=String(title||'');
 const line1=words==='OFFICIAL EXAM RESULT STATEMENT'?'OFFICIAL EXAM':words.startsWith('CERTIFICATE OF')?'CERTIFICATE OF':words.split(' ').slice(0,2).join(' ');
 const line2=words.replace(line1,'').trim();
 const titleSize=small?38:45;
 return `<g>
 <path d="M${x+44} ${y}H${x+width-44}Q${x+width-8} ${y} ${x+width} ${y+28}L${x+width+24} ${y+61}L${x+width} ${y+94}Q${x+width-8} ${y+121} ${x+width-44} ${y+121}H${x+44}Q${x+8} ${y+121} ${x} ${y+94}L${x-24} ${y+61}L${x} ${y+28}Q${x+8} ${y} ${x+44} ${y}Z" fill="url(#purple)" stroke="url(#gold)" stroke-width="7"/>
 <path d="M${x+45} ${y+7}H${x+width-45}M${x+45} ${y+114}H${x+width-45}" stroke="#D9AE5F" stroke-width="1.6"/>
 ${leafWreath(x+83,y+65,.46)}${leafWreath(x+width-83,y+65,.46)}
 ${T(w/2,y+49,line1,41,'font-family="Georgia,serif" font-weight="bold" text-anchor="middle" fill="#FFE8AD" letter-spacing="1.6"')}
 ${T(w/2,y+96,line2,line2.length>23?titleSize-8:titleSize,'font-family="Georgia,serif" font-weight="bold" text-anchor="middle" fill="#FFE8AD" letter-spacing="1.7"')}
 ${diamond(w/2,y+116,5)}
 </g>`;
}
// Estimate ink width conservatively: Tamil/Arabic letters cannot use Latin character counts.
function textUnits(value){
 return [...String(value??'')].reduce((n,ch)=>n+(/[\u0600-\u06FF\u0B80-\u0BFF\u2E80-\u9FFF]/u.test(ch)?1:/[MW@#%]/.test(ch)?.9:.58),0);
}
function fitFont(value,maxSize,maxWidth,minSize=9){
 return Math.max(minSize,Math.min(maxSize,maxWidth/Math.max(1,textUnits(value))));
}
function studentName(w,y,name,fontSize=79){
 const n=String(name||'Student Name').trim(),size=fitFont(n,fontSize,Math.min(1030,w*.77),9);
 return T(w/2,y,n,size,'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-style="italic" fill="#07503D"')+
 `<path d="M${w*.25} ${y+21}H${w*.75}" fill="none" stroke="#D5A44B" stroke-width="2"/>${diamond(w/2,y+21,7)}`;
}
// Up to three readable rows in a metadata card. Never silently truncate IDs or events.
function chipLines(value){
 let remaining=String(value??'—').replace(/\s+/g,' ').trim()||'—';
 const count=Math.min(3,Math.max(1,Math.ceil(textUnits(remaining)/21)));
 const rows=[];
 for(let i=0;i<count-1;i++){
  const target=Math.ceil(remaining.length/(count-i));
  const space=remaining.lastIndexOf(' ',target+6);
  const cut=space>=target-7?space:target;
  rows.push(remaining.slice(0,cut).trim());remaining=remaining.slice(cut).trim();
 }
 rows.push(remaining);return rows;
}
function chip(x,y,w,label,value){
 const lines=chipLines(value),size=fitFont(lines.reduce((a,b)=>textUnits(a)>textUnits(b)?a:b,''),lines.length===1?27:20,w-26,8);
 const baselines=lines.length===1?[80]:lines.length===2?[69,90]:[63,79,95];
 return `<rect x="${x}" y="${y}" width="${w}" height="102" rx="17" fill="#FFFCF6" stroke="#CFA04B" stroke-width="4"/>
 <path d="M${x+3} ${y+16}Q${x+3} ${y+3} ${x+18} ${y+3}H${x+w-18}Q${x+w-3} ${y+3} ${x+w-3} ${y+16}V${y+50}H${x+3}Z" fill="url(#green)"/>
 ${T(x+w/2,y+36,label,21,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#FFE2A0"')}
 ${lines.map((line,i)=>T(x+w/2,y+baselines[i],line,size,'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#0B2649"')).join('')}`;
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
 const w=1414,h=1000,competition=!['exam','exam-achievement','exam-participation'].includes(kind);
 const title=kind==='exam'?'CERTIFICATE OF ACADEMIC EXCELLENCE':kind==='exam-achievement'?'CERTIFICATE OF ACHIEVEMENT':kind==='exam-participation'?'CERTIFICATE OF EXAMINATION PARTICIPATION':kind==='winner'?'CERTIFICATE OF EXCELLENCE':kind==='participation'?'CERTIFICATE OF PARTICIPATION':'CERTIFICATE OF APPRECIATION';
 const event=competition?r.eventName:r.examTitle,dt=competition?r.eventDate:r.examDate;
 const award=r.award||'First Prize';
 const desc=kind==='exam'?'for excellent academic performance in the Academy Examination':
 kind==='exam-achievement'?'for successfully passing the Academy Examination':
 kind==='exam-participation'?'for participation in the Academy Examination':
 kind==='winner'?'for securing '+award+' in the':
 kind==='participation'?'for active participation and sincere effort in the':
 'for dedication and valuable service in the';
 let s=frame(w,h)+brand(w,90,.95)+banner(w,288,title,title.length>34);
 s+=T(w/2,452,'This certificate is proudly presented to',30,'text-anchor="middle" font-family="Georgia,serif" font-style="italic" fill="#1F3152"');
 s+=studentName(w,551,r.studentName);
 s+=T(w/2,624,desc,29,'text-anchor="middle" font-family="Georgia,serif" font-style="italic" fill="#222B50"');
 s+=T(w/2,677,event||'Academy Programme',fitFont(event||'Academy Programme',35,1050,11),'text-anchor="middle" font-family="Georgia,serif" font-weight="bold" fill="#4F1764"');
 const cards=!competition?
 [['Student ID',r.studentCode],['Class',r.course],['Academic Year',r.academicYear],['Exam Date',dt],['Result',r.passed?'PASS':'PARTICIPATED']]:
 [['Student ID',r.studentCode],['Class',r.course],['Event',event||'Academy Event'],['Date',dt],
 ['Award / Role',kind==='winner'?award:kind==='event'?award.replace('Event ',''):'PARTICIPANT']];
 // Decorative medals sit BEHIND the data cards; no award covers printed student details.
 if(kind==='winner')s+=trophy(w*.23,812,award);
 else if(kind==='event')s+=eventCrescent(w*.22,851);
 else if(kind==='participation'||kind==='exam-participation')s+=participationRosette(w*.22,854,'PARTICIPANT');
 else s+=participationRosette(w*.22,854,'EXCELLENCE');
 s+=stamp(w/2,875,64);
 cards.forEach(([label,value],i)=>s+=chip(44+i*267,712,255,label,value||'—'));
 const signer=r.principal&&typeof r.principal==='object'?r.principal:{};
 const signed=typeof signer.signatureData==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signer.signatureData);
 if(signed&&!r.previewMode)s+=`<image x="${w*.652}" y="822" width="${w*.205}" height="64" preserveAspectRatio="xMidYMid meet" href="${E(signer.signatureData)}" />`;
 s+=`<path d="M${w*.65} 891h${w*.21}" stroke="#1C2D50" stroke-width="3"/>
 ${T(w*.755,922,signer.name||'AUTHORIZED SIGNATORY',String(signer.name||'').length>30?17:22,'font-family="Georgia,serif" text-anchor="middle" fill="#1B2A50"')}
 ${T(w*.755,947,signer.name?(signer.designation||'Principal'):'Principal Signature',17,'font-family="Georgia,serif" font-style="italic" text-anchor="middle" fill="#425572"')}
 ${T(100,947,'CERTIFICATE ID: '+String(r.id||'ALIA-DEMO').slice(0,55),14,'font-family="Arial,sans-serif" text-anchor="start" fill="#263D56"')}`;
 return `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${s}</svg>`;
}
function resultPage(r,subjects,page,totalPages){
 const w=1000,h=1414,rows=subjects.slice(page*7,page*7+7);
 let s=frame(w,h)+brand(w,86,.82)+banner(w,281,'OFFICIAL EXAM RESULT STATEMENT',true);
 s+=T(w/2,457,'EXAMINATION RESULTS',28,'font-family="Georgia,serif" text-anchor="middle" fill="#172C4C"');
 s+=studentName(w,548,r.studentName,63);
 s+=chip(55,585,280,'Student ID',r.studentCode)+chip(360,585,280,'Class',r.course)+chip(665,585,280,'Academic Year',r.academicYear);
 s+=T(w/2,749,r.examTitle||'Annual Examination',fitFont(r.examTitle||'Annual Examination',32,750,11),'font-family="Georgia,serif" text-anchor="middle" font-weight="bold" fill="#4E165F"');
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
  s+=T(270,y+31,String(item.name||'Subject'),fitFont(item.name||'Subject',25,470,10),'font-family="Georgia,serif" fill="#182C4A"');
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
  if(!['exam','exam-achievement','exam-participation','winner','participation','event'].includes(type))throw Error('Unknown certificate type');
  pages=[certificate(type,record)];
 }
 return record.previewMode?pages.map(s=>previewWatermark(s,type==='results')):pages;
}
export function classifyCompetitionAward(award){return String(award||'') .startsWith('Event ')?'event':award==='Participation'?'participation':'winner'}
export function sampleCertificate(type='exam'){
 const base={previewMode:true,id:'ALIA-SAMPLE-001',studentName:'Muhsin A',studentCode:'ALIA00037',course:'Muallama',academicYear:'2026-2027',examTitle:'Annual Examination',examDate:'2026-03-15',passed:true,published:true,total:320,maxTotal:350,percent:91.43,grade:'A+',subjects:[{name:'Arabic Language',score:46,max:50},{name:"Qur'an Tajweed",score:48,max:50},{name:'Hadith',score:44,max:50},{name:'Deeniyat',score:45,max:50},{name:'Hifz',score:46,max:50},{name:'Seerah',score:48,max:50},{name:'Islamic Studies',score:43,max:50}]};
 if(type==='winner')return {...base,id:'COMP-SAMPLE-001',studentName:'Farhana B',studentCode:'ALIA00021',award:'First Prize',eventName:"Qur'an Recitation Competition",eventDate:'2026-03-20'};
 if(type==='participation')return {...base,id:'COMP-SAMPLE-002',studentName:'Aakifa S',studentCode:'ALIA00018',award:'Participation',eventName:'Islamic Quiz Competition',eventDate:'2026-03-18'};
 if(type==='event')return {...base,id:'COMP-SAMPLE-003',studentName:'Syed T',studentCode:'ALIA00015',award:'Event Volunteer',eventName:'Ramadan Programme',eventDate:'2026-02-08'};
 return base;
}
let libraries=null;
const scriptLoads=new Map();
function include(src){
 const url=new URL(src,document.baseURI).href;
 if(scriptLoads.has(url))return scriptLoads.get(url);
 const promise=new Promise((resolve,reject)=>{
  const prior=[...document.scripts].find(x=>x.src===url);
  if(prior?.dataset.ready==='yes')return resolve();
  const script=prior||document.createElement('script');
  script.src=url;script.async=true;
  script.addEventListener('load',()=>{script.dataset.ready='yes';resolve()},{once:true});
  script.addEventListener('error',()=>reject(Error('PDF library not available: '+src)),{once:true});
  if(!prior)document.head.append(script);
 }).catch(e=>{scriptLoads.delete(url);throw e});
 scriptLoads.set(url,promise);return promise;
}
async function library(){
 if(typeof window.jspdf?.jsPDF?.API?.svg==='function')return window.jspdf.jsPDF;
 if(!libraries)libraries=(async()=>{
  // Root cause confirmed in real Chrome: public CDN returned 404/ERR_BLOCKED_BY_ORB.
  // Host pinned open-source libraries WITH the Academy website.
  if(!window.jspdf?.jsPDF)await include('./vendor/jspdf.umd.min.js');
  await include('./vendor/svg2pdf.umd.min.js');
  if(typeof window.jspdf?.jsPDF?.API?.svg!=='function')
   throw Error('Vector PDF engine did not initialize. Use Print / Save as PDF in Chrome.');
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
 const branding=record?.previewMode?null:await loadSiteSettings({fresh:true}).catch(err=>{console.warn('Published principal settings unavailable:',err);return null});
 const documentRecord={...record,principal:record?.previewMode?{}:(branding?.principal||{})};
 const J=await library(),logo=await logoData(),pages=premiumCertificatePages(type,documentRecord),landscape=type!=='results';
 const pdf=new J({orientation:landscape?'landscape':'portrait',unit:'mm',format:'a4',precision:12,compress:true});
 for(let i=0;i<pages.length;i++){
  if(i)pdf.addPage('a4',landscape?'landscape':'portrait');
  const svgText=pages[i].replaceAll('href="'+LOGO+'"','href="'+logo+'"');
  const parsed=new DOMParser().parseFromString(svgText,'image/svg+xml');
  if(parsed.querySelector('parsererror'))throw Error('Certificate vector layout is invalid');
  const svg=document.importNode(parsed.documentElement,true);
  const mount=document.createElement('div');
  mount.style.cssText='position:fixed;left:-15000px;top:0;pointer-events:none;width:1414px;height:1414px;overflow:hidden';
  mount.append(svg);document.body.append(mount);
  try{
   await pdf.svg(svg,{x:0,y:0,width:landscape?297:210,height:landscape?210:297});
  }finally{mount.remove()}
 }
 const blob=pdf.output('blob');
 if(!(blob instanceof Blob)||blob.size<1000)throw Error('Generated vector PDF is invalid');
 return blob;
}


/* Browser-native SVG print path: no svg2pdf CDN required. Chrome preserves
 * vector borders and text when Print -> Save as PDF is selected.
 * Opens a window immediately from the user's click (avoids popup blockers).
 */
export function openPremiumPrintWindow(type,record={}){
 const win=window.open('','_blank');
 if(!win)throw Error('Popup blocked. Allow popups for this Academy website and click Print again.');
 const portrait=type==='results';
 win.document.open();
 win.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Academy Certificate - Print to PDF</title></head><body style="font:16px Arial,sans-serif;padding:24px">Preparing the original vector certificate for printing…</body></html>');
 win.document.close();
 (async()=>{
  try{
   const branding=record.previewMode?null:await loadSiteSettings({fresh:true}).catch(()=>null);
   const r={...record,principal:record.previewMode?{}:(branding?.principal||{})};
   const original=premiumCertificatePages(type,r);
   // These print SVG pages use the exact SVG source as the visual preview.
   const logoUrl=new URL(LOGO,location.href).href;
   const pages=original.map(svg=>svg.replaceAll('href="'+LOGO+'"','href="'+logoUrl+'"'));
   const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Al Islah Arabic Academy - Official PDF Print</title>'+
   '<style>*{box-sizing:border-box}body{margin:0;background:#e4e8e4;font:16px Arial,sans-serif}header{padding:14px;background:#123f31;color:#fff;text-align:center}button{background:#f0cb82;border:0;border-radius:8px;padding:13px 22px;font-weight:bold;font-size:17px;cursor:pointer}.sheet{width:'+(portrait?'210':'297')+'mm;height:'+(portrait?'297':'210')+'mm;background:white;margin:10px auto;break-after:page}.sheet:last-child{break-after:auto}.sheet svg{display:block;width:100%;height:100%}@media print{@page{size:A4 '+(portrait?'portrait':'landscape')+';margin:0}html,body{margin:0!important;background:white!important}header{display:none!important}.sheet{margin:0!important;page-break-after:always}.sheet:last-child{page-break-after:auto}}</style></head><body>'+
   '<header><strong>Original Premium Vector Certificate · A4</strong><p>Choose Print, then select <b>Save as PDF</b> on Chrome/Android. Keep scale 100% and margins None.</p><button onclick="window.print()">🖨 Print / Save as PDF</button></header>'+
   pages.map(markup=>'<div class="sheet">'+markup+'</div>').join('')+'</body></html>';
   if(win.closed)return;
   win.document.open();win.document.write(html);win.document.close();
  }catch(e){if(!win.closed){win.document.body.textContent='Unable to prepare certificate print: '+e.message}}
 })();
 return win;
}
