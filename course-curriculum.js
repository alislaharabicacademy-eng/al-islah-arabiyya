/* Public curriculum defaults with admin-editable, course-specific year lists.
   Static defaults apply only until the academy saves an explicit yearlyCurriculum array. */
(function(root){
 'use strict';
 const CATALOG=Object.freeze({
  muallama:Object.freeze({
   books:Object.freeze(['Deeniyath – Part 1 & 2','Suvarka Nagaigal']),
   years:Object.freeze([]),
   award:''
  }),
  muballigha:Object.freeze({
   books:Object.freeze([]),
   years:Object.freeze([
    {year:1,title:'Muballiga · 1st Year',subjects:['Noorani Qaidha','Hadees','Prophet Story','Surah Hifz','Masnoon Duas','Durus Lugathul Arabiya','Meezan','1 Min Madrasa']},
    {year:2,title:'Muballiga · 2nd Year',subjects:['Noorani Qaidha','Hadees','Fikh Muyassar','Qasas','Surah Hifz','Ajnaas','Avaamil','Minhajul Arabiya Part 2','Tarjuma']}
   ]),
   award:'New admissions are accepted for Muballiga 1st Year only. Students who successfully complete both the 1st and 2nd years of the Muballiga course may finish their studies and receive the Muballiga Sanad. Students who wish to continue may apply for Aalima 3rd Year separately, after paying the additional Aalima admission fee and receiving Academy approval.'
  }),
  alima:Object.freeze({
   books:Object.freeze([]),
   years:Object.freeze([
    {year:3,title:'Aalima · 3rd Year',subjects:['Tarjuma','Tafseer','Janzani','Asharathul Mubashara','Qasas Nabiyeen','Zaad Thalibeen','Fikh Muyassar']}
   ]),
   award:'Aalima is an optional 3rd Year continuation, not a direct admission. Students who successfully complete both years of the Muballiga course may choose to continue only after the separate Aalima admission fee is paid and verified by the Academy. After successful completion of the 3rd year of Aalima, they will be awarded the Aalima Sanad.'
  })
 });
 function normaliseYears(years){
  return (Array.isArray(years)?years:[]).filter(x=>x&&typeof x==='object').map(x=>({
   year:Number(x.year)||0,
   title:String(x.title||'').trim().slice(0,100),
   subjects:(Array.isArray(x.subjects)?x.subjects:[]).map(s=>String(s).trim().slice(0,150)).filter(Boolean)
  })).filter(x=>x.year>0&&x.title&&x.subjects.length);
 }
 function years(courseId,record){
  if(record&&Array.isArray(record.yearlyCurriculum))return normaliseYears(record.yearlyCurriculum);
  return normaliseYears(CATALOG[courseId]?.years||[]);
 }
 function books(courseId,record){
  const custom=record?.kitabs;
  if(Array.isArray(custom)&&custom.length)return custom.map(String).map(x=>x.trim()).filter(Boolean);
  return [...(CATALOG[courseId]?.books||[])];
 }
 function award(courseId){return CATALOG[courseId]?.award||'';}
 function description(courseId,savedDescription){
  const required=award(courseId);
  const outdated=[
   'Students who successfully complete both the 1st and 2nd years of the Muballiga course will be awarded the Muballiga Sanad.',
   'Students who complete both years of the Muballiga course and then successfully complete the 3rd year of Aalima will be awarded the Aalima Sanad.'
  ];
  const existing=outdated.reduce((text,sentence)=>text.split(sentence).join(''),String(savedDescription??'')).replace(/\s+/g,' ').trim();
  if(!required)return existing;
  // Keep admin-written descriptions, while clearly stating the complete Sanad pathway.
  // An older generic description in Firestore must never hide this information.
  if(existing.includes(required))return existing;
  return [existing,required].filter(Boolean).join(' ');
 }
 root.AcademyCurriculum={years,books,award,description};
})(window);
