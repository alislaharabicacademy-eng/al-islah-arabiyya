/* Course Eligibility formatter. Preserve original Firestore text; display safe bullets.
   Admin: write one requirement per line. Legacy unbroken labels are recognized. */
(function(root){
 'use strict';
 const LABELS=[
 'Educational Qualification','Minimum Educational Qualification','Academic Qualification',
 'Language Proficiency','Tamil Language Proficiency','Arabic Language Proficiency',
 'Age Requirement','Age Limit','Minimum Age','Maximum Age',
 'Previous Qualification','Required Qualification','Basic Knowledge','Prior Knowledge',
 'Quran Reading Ability',"Qur'an Reading Ability",'Reading and Writing',
 'Entrance Examination','Entrance Test','Course Prerequisite','Admission Requirement',
 'Gender Eligibility','Eligibility Requirement'
 ];
 const pattern=LABELS.slice().sort((a,b)=>b.length-a.length).join('|');
 const headingRegex=new RegExp('(?:'+pattern+')\\b','gi');
 const headingStart=new RegExp('^('+pattern+')(?:\\s*[:：–—-]\\s*|\\s+)(.+)$','i');
 const headingOnly=new RegExp('^('+pattern+')\\s*[:：–—-]?\\s*$','i');
 function tidy(value){
  return String(value??'')
   .replace(/^\s*(?:(?:[•●▪◦*–—-]\s*)|(?:\d{1,2}[.)]\s*))+/, '')
   .replace(/\s+/g,' ').trim();
 }
 function splitHeadings(line){
  const found=[...line.matchAll(headingRegex)];
  if(found.length<2)return[line];
  const parts=[],starts=found.map(item=>item.index);
  if(starts[0]>0)parts.push(line.slice(0,starts[0]));
  for(let i=0;i<starts.length;i++)
   parts.push(line.slice(starts[i],i+1<starts.length?starts[i+1]:line.length));
  return parts.map(s=>s.trim()).filter(Boolean);
 }
 function parse(value){
  const source=Array.isArray(value)?value.join('\n'):String(value??'');
  let lines=source.replace(/\r\n?/g,'\n').replace(/<br\s*\/?>/gi,'\n')
   .replace(/[•●▪◦]/g,'\n').replace(/\s*;\s*/g,'\n')
   .replace(/\s+(?=\d{1,2}[.)]\s+[^0-9])/g,'\n')
   .split('\n').flatMap(s=>splitHeadings(s.trim())).map(tidy).filter(Boolean);
  if(lines.length===1&&/\.\s+[A-Z]/.test(lines[0])){
   const sentences=lines[0].split(/(?<=\.)\s+(?=[A-Z])/).map(tidy).filter(Boolean);
   if(sentences.length>1)lines=sentences;
  }
  const normalized=[];
  for(let i=0;i<lines.length;i++){
   const only=headingOnly.exec(lines[i]);
   if(only&&i+1<lines.length&&!headingOnly.test(lines[i+1]))
    normalized.push(only[1]+': '+lines[++i]);
   else normalized.push(lines[i]);
  }
  return normalized.map(raw=>{
   const known=headingStart.exec(raw);
   if(known)return{label:known[1],detail:known[2],text:raw};
   const colon=/^([^:：]{2,55})\s*[:：]\s*(.+)$/.exec(raw);
   if(colon)return{label:colon[1],detail:colon[2],text:raw};
   return{label:'',detail:raw,text:raw};
  });
 }
 function render(target,value){
  if(!target)return;
  const doc=target.ownerDocument||document;
  target.replaceChildren();
  const entries=parse(value);
  if(!entries.length){
   const item=doc.createElement('li');
   item.className='eligibility-placeholder';
   item.textContent='Eligibility details will be announced soon.';
   target.append(item);return;
  }
  for(const point of entries){
   const li=doc.createElement('li');
   if(point.label){
    const label=doc.createElement('strong');label.textContent=point.label;
    const detail=doc.createElement('span');detail.textContent=point.detail;
    li.append(label,detail);
   }else li.textContent=point.detail;
   target.append(li);
  }
 }
 root.AcademyEligibility=Object.freeze({parse,render});
})(typeof window!=='undefined'?window:globalThis);
