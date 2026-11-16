/* Academy ID card renderer: print-sharp PORTRAIT 54 x 85.6 mm, two-sided cards.
 * No student/teacher personal data is sent to a third-party renderer.
 * QRCode and jsPDF are vendored locally under /vendor with their licenses.
 */
export const CARD_WIDTH_MM=54;
export const CARD_HEIGHT_MM=85.6;
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
 if(typeof value.defaultValidUntil==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value.defaultValidUntil))
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

/* The ID card is intentionally VERTICAL, matching the Academy's staff-ID
 * references. A downloaded PDF page is the card itself — never an A4 sheet
 * containing a small card with surrounding whitespace.
 *
 * Logical artboard: 540 x 856. Pixel artboard: 750 x 1190 (≈353 DPI).
 * Both sides use the same artboard, orientation, bleed and corner treatment.
 */
function centered(ctx,value,y,{size=24,minSize=14,color='#173d2c',weight=700,width=470}={}){
 fitted(ctx,value,270,y,width,{size,minSize,color,weight,align:'center'});
}
function curvedTrim(ctx,palette){
 // Deep-green and metallic-gold waves inspired by the supplied ID reference.
 ctx.fillStyle=palette.dark;
 ctx.fillRect(0,0,540,87);
 ctx.beginPath();ctx.moveTo(0,78);
 ctx.bezierCurveTo(146,133,303,28,540,89);
 ctx.lineTo(540,0);ctx.lineTo(0,0);ctx.closePath();ctx.fill();
 ctx.strokeStyle=palette.accent;ctx.lineWidth=5;
 ctx.beginPath();ctx.moveTo(-4,111);
 ctx.bezierCurveTo(154,140,322,56,544,107);ctx.stroke();
 ctx.fillStyle=palette.dark;
 ctx.beginPath();ctx.moveTo(0,822);
 ctx.bezierCurveTo(134,803,341,859,540,819);
 ctx.lineTo(540,856);ctx.lineTo(0,856);ctx.closePath();ctx.fill();
 ctx.strokeStyle=palette.accent;ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(0,820);
 ctx.bezierCurveTo(137,797,333,852,540,817);ctx.stroke();
}
function textRows(card,options){
 const rows=[];
 const value=(label,entry)=>{
  const text=String(entry||'').replace(/\\s+/g,' ').trim();
  if(text)rows.push([label,text]);
 };
 if(card.kind==='student'&&options.showGuardian)
  value('PARENT / GUARDIAN',card.guardian);
 if(options.showDob)value('DATE OF BIRTH',card.dob);
 if(options.showEmergencyPhone)value('EMERGENCY CONTACT',card.emergencyPhone);
 if(options.showBloodGroup)value('BLOOD GROUP',card.bloodGroup);
 if(options.showAddress)value('ADDRESS',card.address);
 if(card.kind==='teacher')value('SPECIALIZATION',card.subject);
 if(!rows.length)value('ACADEMY',card.institution||card.instituteName||'Madrasa Al Islahul Arabiya');
 // Five lines fit above the motivational quotation and verification QR.
 return rows.slice(0,5);
}
function drawTextRows(ctx,card,options){
 const rows=textRows(card,options);
 const rowHeight=48;
 let y=202;
 for(const [label,value] of rows){
  ctx.fillStyle='rgba(16,58,38,.035)';
  rounded(ctx,31,y-28,478,42,8);ctx.fill();
  fitted(ctx,label,43,y-6,161,{size:13,minSize:10,weight:800,color:'#647e67'});
  fitted(ctx,value,214,y-5,277,{size:17,minSize:11,weight:700,color:'#183a29'});
  y+=rowHeight;
 }
 return y;
}
export async function renderCardCanvas(card,side='front',{settings={},draft=false}={}){
 if(!['front','back'].includes(side))throw Error('Invalid card side.');
 const options=normalizedCardSettings(settings);
 const palette=PALETTES[card.kind==='teacher'?options.teacherTheme:options.studentTheme];
 const canvas=document.createElement('canvas');
 canvas.width=750;canvas.height=1190;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas print processing unavailable.');
 ctx.scale(canvas.width/540,canvas.height/856);
 const logo=await imgReady(new URL('./1_20261112_080707_0000.png',import.meta.url).href);
 const institution=String(card.instituteName||card.institution||'Madrasa Al Islahul Arabiya');
 const background=ctx.createLinearGradient(0,0,300,856);
 background.addColorStop(0,'#ffffff');
 background.addColorStop(.65,'#fdfdf9');
 background.addColorStop(1,'#eaf3f3');
 ctx.fillStyle=background;ctx.fillRect(0,0,540,856);
 // Deliberately faint transparent academy seal, never a photo of the holder.
 if(logo?.naturalWidth){
  ctx.save();ctx.globalAlpha=.07;
  ctx.drawImage(logo,63,267,414,414);
  ctx.restore();
 }
 curvedTrim(ctx,palette);
 if(side==='front'){
  // Academy heading and logo are ABOVE the centered portrait photograph.
  if(logo?.naturalWidth)cover(ctx,logo,29,148,98,98);
  else{
   ctx.fillStyle='#eff5eb';rounded(ctx,29,148,98,98,17);ctx.fill();
  }
  fitted(ctx,institution.toUpperCase(),136,179,374,{
   size:29,minSize:17,color:palette.dark,weight:850
  });
  fitted(ctx,"WOMEN'S ONLINE MADRASA",138,208,371,{
   size:16,minSize:12,color:'#637764',weight:750
  });
  ctx.fillStyle=palette.accent;ctx.fillRect(138,222,341,3);
  centered(ctx,card.kind==='student'?'STUDENT ID CARD':'STAFF ID CARD',278,{
   size:29,minSize:21,color:palette.dark,width:485,weight:800
  });
  const photo=await imgReady(card.photoData||'');
  // Rounded portrait frame: no wide/sideways student photo card.
  ctx.fillStyle=palette.mid;
  rounded(ctx,141,301,258,279,25);ctx.fill();
  ctx.fillStyle=palette.accent;
  rounded(ctx,146,306,248,269,22);ctx.fill();
  cover(ctx,photo,152,312,236,257);
  centered(ctx,card.name,624,{size:30,minSize:16,color:palette.dark,weight:800,width:495});
  ctx.strokeStyle=palette.accent;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(112,638);ctx.lineTo(428,638);ctx.stroke();
  centered(ctx,card.kind==='student'?'STUDENT ID':'STAFF ID',664,{
   size:14,minSize:12,color:'#667f71',weight:800
  });
  centered(ctx,card.displayId,695,{size:26,minSize:17,color:palette.mid,weight:850});
  centered(ctx,card.course||'Islamic Studies',733,{size:20,minSize:14,color:palette.dark,weight:750});
  centered(ctx,'ACADEMIC YEAR  '+(options.academicYear||'—'),771,{
   size:17,minSize:12,color:'#516d5d',width:480
  });
  centered(ctx,'VALID UNTIL  '+String(card.validUntil||'—'),804,{
   size:16,minSize:12,color:'#506e5d',width:480
  });
 }else{
  // Back: private information remains on the card only, not in QR output.
  centered(ctx,'ACADEMY ID CARD',173,{size:29,minSize:19,color:palette.dark,weight:850});
  const lastRowY=drawTextRows(ctx,card,options);
  const dividerY=Math.max(456,lastRowY+3);
  ctx.strokeStyle=palette.accent;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(58,dividerY);ctx.lineTo(482,dividerY);ctx.stroke();
  // Reference's educational Hadith. Arabic is followed by English fallback.
  centered(ctx,'خيركم من تعلم القرآن وعلمه',492,{
   size:29,minSize:22,color:palette.dark,weight:750,width:482
  });
  centered(ctx,'The best of you learn the Qur’an and teach it.',519,{
   size:14,minSize:10,color:palette.mid,weight:700,width:485
  });
  const token=validVerificationCode(card.verificationCode)?card.verificationCode:'';
  // White QR quiet zone avoids patterns/watermarks interfering with scanning.
  ctx.fillStyle='#ffffff';rounded(ctx,181,540,178,187,15);ctx.fill();
  ctx.strokeStyle=palette.mid;ctx.lineWidth=3;
  rounded(ctx,181,540,178,187,15);ctx.stroke();
  if(token&&!draft){
   const qr=await getQrCanvas(verificationUrl(token));
   ctx.fillStyle='#fff';ctx.fillRect(194,554,152,152);
   if(qr)ctx.drawImage(qr,197,557,146,146);
  }else{
   centered(ctx,'NOT ISSUED',629,{size:21,minSize:16,color:'#8d9187',weight:800,width:160});
  }
  centered(ctx,token&&!draft?'SCAN TO VERIFY':'ACTIVATE AFTER ISSUANCE',751,{
   size:16,minSize:11,color:palette.dark,weight:800
  });
  centered(ctx,'KEEP YOUR ID CARD SAFE',783,{
   size:16,minSize:12,color:'#8b3f2d',weight:750
  });
  centered(ctx,'VALID UNTIL  '+String(card.validUntil||'—'),810,{
   size:14,minSize:11,color:'#526a59',weight:750
  });
 }
 if(draft){
  ctx.save();ctx.translate(270,460);ctx.rotate(-Math.PI/6);
  ctx.fillStyle='rgba(158,54,54,.18)';ctx.font=font(81,900);
  ctx.textAlign='center';ctx.fillText('PREVIEW',0,0);ctx.restore();
 }
 return canvas;
}
export async function createIdCardPdf(cards,{layout='pvc',settings={},onProgress}={}){
 if(!Array.isArray(cards)||!cards.length)throw Error('Select issued ID cards first.');
 // Only true card-sized, margin-free portrait pages are produced.
 if(layout!=='pvc')throw Error('Only exact-size portrait ID Card PDFs are supported.');
 if(!window.jspdf?.jsPDF)
  await addScript(new URL('./vendor/jspdf.umd.min.js',import.meta.url));
 if(!window.jspdf?.jsPDF)throw Error('Local PDF library unavailable.');
 const {jsPDF}=window.jspdf;
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',
  format:[CARD_WIDTH_MM,CARD_HEIGHT_MM],compress:true});
 let page=0;
 for(const card of cards){
  for(const side of ['front','back']){
   if(page++)pdf.addPage([CARD_WIDTH_MM,CARD_HEIGHT_MM],'portrait');
   const art=await renderCardCanvas(card,side,{
    settings:card.printSettings||settings
   });
   // Fill the complete ID card page, with no A4 canvas or white page margins.
   pdf.addImage(art.toDataURL('image/jpeg',.95),'JPEG',
    0,0,CARD_WIDTH_MM,CARD_HEIGHT_MM);
  }
  onProgress?.(Math.round(100*page/(cards.length*2)));
 }
 return pdf;
}

export function safeCardFilename(text){
 return String(text||'Card').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,54);
}
