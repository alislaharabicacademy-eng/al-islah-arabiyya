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
   award:'Students who successfully complete both the 1st and 2nd years will receive the Muballiga Sanad.'
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
  // Generated copy from previous website versions can remain in Firestore and
  // in an already-saved Admin description. Remove those passages instead of
  // showing both the long text and the new short description.
  const oldGenerated=[
   'Students who successfully complete both the 1st and 2nd years of the Muballiga course will be awarded the Muballiga Sanad.',
   'Students who complete both years of the Muballiga course and then successfully complete the 3rd year of Aalima will be awarded the Aalima Sanad.',
   "New admissions are accepted for Muballiga 1st Year only. Students who successfully complete both the 1st and 2nd years of the Muballiga course may finish their studies and receive the Muballiga Sanad. Students who wish to continue may apply for Aalima 3rd Year separately, after paying the additional Aalima admission fee and receiving Academy approval.",
   'Two-year programme for continued Islamic study.',
   'Two-year programme for continued Islamic Studies.'
  ];
  let existing=String(savedDescription??'');
  if(courseId==='muballigha'){
   for(const passage of oldGenerated)existing=existing.split(passage).join(' ');
   // Retain independent Admin-written information, but remove the default
   // placeholder to keep the homepage card compact.
   existing=existing.replace(/^Islamic learning programme\.\s*/i,'');
   existing=existing.split(required).join(' ').replace(/\s+/g,' ').trim();
   return ['Two-year programme for continued Islamic Studies.',existing,required].filter(Boolean).join(' ');
  }
  if(!required)return existing.trim();
  for(const passage of oldGenerated.slice(0,2))existing=existing.split(passage).join(' ');
  existing=existing.replace(/\s+/g,' ').trim();
  if(existing.includes(required))return existing;
  return [existing,required].filter(Boolean).join(' ');
 }
 root.AcademyCurriculum={years,books,award,description};
})(window);
