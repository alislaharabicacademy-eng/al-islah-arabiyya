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
   award:'Muballiga Sanad — after successful completion of the 2nd Year.'
  }),
  alima:Object.freeze({
   books:Object.freeze([]),
   years:Object.freeze([
    {year:3,title:'Aalima · 3rd Year',subjects:['Tarjuma','Tafseer','Janzani','Asharathul Mubashara','Qasas Nabiyeen','Zaad Thalibeen','Fikh Muyassar']}
   ]),
   award:'Aalima Sanad — after successful completion of the 3rd Year.'
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
 root.AcademyCurriculum={years,books,award};
})(window);
