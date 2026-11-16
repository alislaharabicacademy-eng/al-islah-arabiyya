/* Academy ID card renderer: print-sharp 85.6 x 54 mm, two-sided cards.
 * No student/teacher personal data is sent to a third-party renderer.
 * QRCode and jsPDF are vendored locally under /vendor with their licenses.
 */
export const CARD_WIDTH_MM=85.6;
export const CARD_HEIGHT_MM=54;
export const CARD_SETTINGS_DEFAULTS=Object.freeze({
 studentTheme:'emerald',
 teacherTheme:'plum',
 academicYear:'2026–2027',
 showDob:false,
 showGuardian:true,
 showEmergencyPhone:true,
 showBloodGroup:false,
 showAddress:false,
 showSignature:false,
 defaultValidUntil:''
});
const PALETTES={
 emerald:{dark:'#0a3426',mid:'#155e43',accent:'#d4b66f'},
 sapphire:{dark:'#102848',mid:'#245781',accent:'#dbbf7a'},
 plum:{dark:'#3b1832',mid:'#702e56',accent:'#dfbd79'}
};
export function normalizedCardSettings(value={}){
 const result={...CARD_SETTINGS_DEFAULTS};
 for(const item of ['studentTheme','teacherTheme']){
  if(value[item] in PALETTES)result[item]=value[item];
 }
 for(const item of ['showDob','showGuardian','showEmergencyPhone','showBloodGroup','showAddress','showSignature'])
  result[item]=value[item]===true;
 if(typeof value.academicYear==='string')result.academicYear=value.academicYear.slice(0,24);
 if(typeof value.defaultValidUntil==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(value.defaultValidUntil))
  result.defaultValidUntil=value.defaultValidUntil;
 return result;
}
export function cardDocumentId(kind,holderId){
 if(!['student','teacher'].includes(kind)||typeof holderId!=='string'||!holderId||holderId.includes('/'))
  throw Error('Invalid card subject ID.');
 return kind+'__'+holderId;
}
export function validVerificationCode(value){return /^[a-f0-9]{32}$/.test(String(value||''))}
export function newVerificationCode(){
 if(!globalThis.crypto?.randomUUID)throw Error('Secure ID card tokens require HTTPS.');
 return crypto.randomUUID().replace(/-/g,'');
}
export function isCurrentCard(card,now=new Date()){
 if(!card||card.status!=='active'||!validVerificationCode(card.verificationCode))return false;
 const date=String(card.validUntil||'');
 return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date>=now.toISOString().slice(0,10);
}
export function verificationUrl(code){
 if(!validVerificationCode(code))return '';
 return new URL('verify-id.html?code='+code,import.meta.url).href;
}
export async function teacherDisplayId(teacherId){
 const bytes=new TextEncoder().encode('al-islah-teacher-card:'+String(teacherId));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const short=[...new Uint8Array(digest)].slice(0,5).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
 return 'ALIT-'+short;
}
function rgba(hex,alpha){
 const v=hex.slice(1),r=parseInt(v.slice(0,2),16),g=parseInt(v.slice(2,4),16),b=parseInt(v.slice(4,6),16);
 return 'rgba('+r+','+g+','+b+','+alpha+')';
}
const font=(size,weight=600)=>weight+' '+size+'px Arial, sans-serif';
function fitted(ctx,text,x,y,maxWidth,{size=30,minSize=15,color='#142f25',weight=700,align='left'}={}){
 const raw=String(text||'—').replace(/\s+/g,' ').trim()||'—';
 ctx.save();ctx.fillStyle=color;ctx.textAlign=align;
 let s=size;
 while(s>minSize){ctx.font=font(s,weight);if(ctx.measureText(raw).width<=maxWidth)break;s-=1}
 ctx.font=font(s,weight);
 let value=raw;
 while(ctx.measureText(value).width>maxWidth&&value.length>1)value=value.slice(0,-2)+'…';
 ctx.fillText(value,x,y);ctx.restore();
}
function rounded(ctx,x,y,w,h,r){
 const radius=Math.min(r,h/2,w/2);ctx.beginPath();
 ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);
 ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);
 ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function imgReady(src){
 return new Promise(resolve=>{
  if(!src)return resolve(null);
  const img=new Image();img.decoding='async';
  img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
  img.src=src;
  if(img.complete&&img.naturalWidth)resolve(img);
 });
}
function cover(ctx,img,x,y,w,h){
 ctx.save();rounded(ctx,x,y,w,h,14);ctx.clip();
 if(img?.naturalWidth){
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
  ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
 }else{
  ctx.fillStyle='#dce7dc';ctx.fillRect(x,y,w,h);
  ctx.textAlign='center';ctx.fillStyle='#65816d';ctx.font=font(55,700);
  ctx.fillText('◉',x+w/2,y+h/2+15);
 }
 ctx.restore();
}
let libraries={};
async function addScript(url){
 const key=url.href;
 if(libraries[key])return libraries[key];
 libraries[key]=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=key;script.async=true;
  script.onload=resolve;script.onerror=()=>reject(Error('Cannot load local print library.'));
  document.head.append(script);
 });
 return libraries[key];
}
async function getQrCanvas(url){
 if(!url)return null;
 if(!window.QRCode)await addScript(new URL('./vendor/qrcode.min.js',import.meta.url));
 if(!window.QRCode)throw Error('QR code generator unavailable.');
 const holder=document.createElement('div');
 holder.style.cssText='position:fixed;left:-10000px;top:-10000px;width:210px;height:210px;visibility:hidden';
 document.body.append(holder);
 try{
  new window.QRCode(holder,{text:url,width:210,height:210,correctLevel:window.QRCode.CorrectLevel.M});
  const canvas=holder.querySelector('canvas');
  if(canvas)return canvas;
  const img=holder.querySelector('img');
  if(img?.complete&&img.naturalWidth)return img;
  if(img)await new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;setTimeout(resolve,1100)});
  if(img?.naturalWidth)return img;
  throw Error('QR code could not be generated.');
 }finally{holder.remove()}
}
function labelLine(ctx,label,value,y,opts){
 if(!value)return y;
 fitted(ctx,label.toUpperCase(),65,y,280,{size:14,minSize:13,weight:800,color:'#658171'});
 fitted(ctx,value,65,y+27,opts.maxWidth||570,{size:25,minSize:16,weight:650,color:'#173f31'});
 return y+62;
}
export async function renderCardCanvas(card,side='front',{settings={},draft=false}={}){
 if(!['front','back'].includes(side))throw Error('Invalid card side.');
 const options=normalizedCardSettings(settings);
 const palette=PALETTES[card.kind==='teacher'?options.teacherTheme:options.studentTheme];
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=750;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas print processing unavailable.');
 ctx.scale(1190/856,750/540);
 const isFront=side==='front';
 const logoPromise=imgReady(new URL('./1_20261112_080707_0000.png',import.meta.url).href);
 const photoPromise=imgReady(card.photoData||'');
 if(isFront){
  const g=ctx.createLinearGradient(0,0,856,540);g.addColorStop(0,palette.dark);g.addColorStop(1,palette.mid);
  ctx.fillStyle=g;ctx.fillRect(0,0,856,540);
  ctx.strokeStyle=rgba(palette.accent,.28);ctx.lineWidth=2;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(830,-20,90+i*74,0,2*Math.PI);ctx.stroke()}
  ctx.fillStyle=palette.accent;ctx.fillRect(0,0,856,12);ctx.fillRect(0,529,856,11);
  const logo=await logoPromise;
  cover(ctx,logo,52,35,80,80);
  fitted(ctx,'MADRASA AL ISLAHUL ARABIYA',148,72,653,{size:30,minSize:19,color:'#fff9e9',weight:800});
  fitted(ctx,'OFFICIAL '+(card.kind==='student'?'STUDENT':'TEACHER')+' IDENTITY CARD',150,103,635,{size:17,minSize:13,color:palette.accent,weight:800});
  ctx.fillStyle=rgba('#ffffff',.17);rounded(ctx,46,142,764,345,20);ctx.fill();
  ctx.fillStyle=palette.accent;rounded(ctx,67,167,201,247,16);ctx.fill();
  const photo=await photoPromise;cover(ctx,photo,74,174,187,233);
  fitted(ctx,card.kind==='student'?'STUDENT NAME':'TEACHER NAME',306,219,460,{size:20,minSize:16,color:palette.accent,weight:800});
  fitted(ctx,card.name,305,268,485,{size:36,minSize:19,color:'#ffffff',weight:800});
  fitted(ctx,card.kind==='student'?'STUDENT ID':'TEACHER ID',306,325,460,{size:18,minSize:14,color:palette.accent,weight:800});
  fitted(ctx,card.displayId,305,364,480,{size:31,minSize:18,color:'#ffffff',weight:800});
  fitted(ctx,card.kind==='student'?'CLASS / COURSE':'SUBJECT / DEPARTMENT',306,414,450,{size:16,minSize:13,color:palette.accent,weight:800});
  fitted(ctx,card.course||'Islamic Studies',305,451,472,{size:26,minSize:17,color:'#ffffff',weight:650});
  fitted(ctx,'ACADEMIC YEAR  '+(options.academicYear||'—'),52,511,560,{size:17,minSize:13,color:'#f2e4be',weight:700});
  fitted(ctx,'VALID TO  '+String(card.validUntil||'—'),806,511,248,{size:18,minSize:13,color:'#f2e4be',weight:700,align:'right'});
 }else{
  ctx.fillStyle='#f9f8ef';ctx.fillRect(0,0,856,540);
  ctx.fillStyle=palette.dark;ctx.fillRect(0,0,856,81);
  ctx.fillStyle=palette.accent;ctx.fillRect(0,81,856,6);ctx.fillRect(0,530,856,10);
  fitted(ctx,'OFFICIAL ACADEMY ID  •  BACK',35,52,695,{size:24,minSize:17,color:'#fff8e4',weight:800});
  ctx.strokeStyle=rgba(palette.mid,.24);ctx.lineWidth=2;
  rounded(ctx,25,108,806,397,17);ctx.stroke();
  let y=155;
  const kind=card.kind==='student';
  if(kind&&options.showGuardian)y=labelLine(ctx,'FATHER / GUARDIAN',card.guardian||'',y,{maxWidth:560});
  if(options.showEmergencyPhone)y=labelLine(ctx,'EMERGENCY CONTACT',card.emergencyPhone||'',y,{maxWidth:560});
  if(options.showBloodGroup)y=labelLine(ctx,'BLOOD GROUP',card.bloodGroup||'',y,{maxWidth:300});
  if(options.showDob&&kind)y=labelLine(ctx,'DATE OF BIRTH',card.dob||'',y,{maxWidth:300});
  if(options.showAddress&&card.address)y=labelLine(ctx,'ADDRESS',card.address,y,{maxWidth:520});
  if(!kind&&card.subject)y=labelLine(ctx,'SPECIALIZATION',card.subject,y,{maxWidth:535});
  if(y===155)y=labelLine(ctx,'ACADEMY',card.institution||'Madrasa Al Islahul Arabiya',y,{maxWidth:560});
  fitted(ctx,'CARD VERIFICATION',600,154,225,{size:17,minSize:14,color:palette.dark,weight:800,align:'center'});
  const code=validVerificationCode(card.verificationCode)?card.verificationCode:'';
  if(code&&!draft){
   const qr=await getQrCanvas(verificationUrl(code));
   ctx.fillStyle='#ffffff';rounded(ctx,500,163,208,215,10);ctx.fill();
   if(qr)ctx.drawImage(qr,511,174,186,186);
  }else{
   ctx.strokeStyle='#a5b7ab';rounded(ctx,500,167,208,205,9);ctx.stroke();
   fitted(ctx,'NOT ISSUED',606,269,190,{size:21,minSize:17,color:'#8b8b85',align:'center'});
  }
  fitted(ctx,code&&!draft?'SCAN TO VERIFY':'ISSUE CARD TO ACTIVATE',606,400,220,{size:15,minSize:11,color:'#596a5c',align:'center'});
  fitted(ctx,'VALID UNTIL  '+String(card.validUntil||'—'),600,430,225,{size:16,minSize:12,color:palette.dark,weight:800,align:'center'});
  ctx.strokeStyle='#526c59';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,466);ctx.lineTo(330,466);ctx.stroke();
  fitted(ctx,'AUTHORIZED SIGNATURE',195,484,290,{size:15,minSize:12,color:palette.dark,align:'center'});
  fitted(ctx,'Property of '+(card.institution||'Madrasa Al Islahul Arabiya'),37,522,770,{size:14,minSize:11,color:'#67816f'});
 }
 if(draft){
  ctx.save();ctx.translate(428,270);ctx.rotate(-Math.PI/7);
  ctx.fillStyle='rgba(180,65,65,0.20)';ctx.font=font(125,900);ctx.textAlign='center';ctx.fillText('PREVIEW',0,0);ctx.restore();
 }
 return canvas;
}
export async function createIdCardPdf(cards,{layout='pvc',settings={},onProgress}={}){
 if(!Array.isArray(cards)||!cards.length)throw Error('Select issued ID cards first.');
 if(!['pvc','a4'].includes(layout))throw Error('Invalid printing layout.');
 if(!window.jspdf?.jsPDF)await addScript(new URL('./vendor/jspdf.umd.min.js',import.meta.url));
 if(!window.jspdf?.jsPDF)throw Error('Local PDF library unavailable.');
 const {jsPDF}=window.jspdf;
 if(layout==='pvc'){
  const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:[CARD_WIDTH_MM,CARD_HEIGHT_MM],compress:true});
  let page=0;
  for(const card of cards){
   for(const side of ['front','back']){
    if(page++)pdf.addPage([CARD_WIDTH_MM,CARD_HEIGHT_MM],'landscape');
    const image=await renderCardCanvas(card,side,{settings:card.printSettings||settings});
    pdf.addImage(image.toDataURL('image/jpeg',.93),'JPEG',0,0,CARD_WIDTH_MM,CARD_HEIGHT_MM);
   }
   onProgress?.(Math.round(100*page/(cards.length*2)));
  }
  return pdf;
 }
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 const cols=[12,112.4],rows=[15,78,141,204];
 const groups=Math.ceil(cards.length/8);
 let first=true;
 for(let group=0;group<groups;group++){
  const members=cards.slice(group*8,group*8+8);
  for(const side of ['front','back']){
   if(!first)pdf.addPage('a4','portrait');first=false;
   for(let i=0;i<members.length;i++){
    const row=Math.floor(i/2),col=i%2;
    // Mirror back columns when printing double-sided, flipping on long edge.
    const drawnCol=side==='back'?1-col:col;
    const image=await renderCardCanvas(members[i],side,{settings});
    pdf.addImage(image.toDataURL('image/jpeg',.92),'JPEG',cols[drawnCol],rows[row],CARD_WIDTH_MM,CARD_HEIGHT_MM);
    pdf.setDrawColor(195,197,178);pdf.setLineWidth(.2);
    pdf.rect(cols[drawnCol],rows[row],CARD_WIDTH_MM,CARD_HEIGHT_MM);
   }
  }
  onProgress?.(Math.round(100*(group+1)/groups));
 }
 return pdf;
}
export function safeCardFilename(text){
 return String(text||'Card').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,54);
}
