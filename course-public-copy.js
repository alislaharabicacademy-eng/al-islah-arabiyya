/* Student-facing course copy for fields the Academy has not yet filled.
 * This is display-only: never write suggested text into Firestore.
 * Explicit saved descriptions, eligibility, duration, books, fees and timing
 * always take priority over these non-numeric, non-binding suggestions.
 */
(function(root){
 'use strict';
 const INFO=Object.freeze({
  muallama:{
   description:'Foundational Islamic learning with emphasis on everyday religious knowledge and practice.',
   eligibility:[
    'Learning Interest: Suitable for those seeking foundational Islamic knowledge.',
    'Study Readiness: Willingness to attend guided online lessons and practise regularly.',
    'Class Placement: Learning level and suitability are reviewed during admission.'
   ],
   syllabus:'Learning focus includes Deeniyath, everyday Islamic practices and guided study of essential duas.',
   materials:'Deeniyath and other foundational Islamic learning texts relevant to the class.'
  },
  muballigha:{
   description:'A two-year course for continued Islamic Studies and progressive Arabic learning.',
   eligibility:[
    'Learning Interest: Suitable for students wishing to continue structured Islamic Studies.',
    'Course Entry: New admission begins in Muballigha First Year.',
    'Study Readiness: Prepared to follow regular lessons, reading practice and class assignments.'
   ],
   syllabus:'Subjects include Qur’an reading, Hadith, Seerah, surah memorisation, Arabic grammar and Islamic jurisprudence across the two years.',
   materials:'Reading and revision materials aligned with the First Year and Second Year subject lists.'
  },
  alima:{
   description:'An optional third-year continuation for students who have completed the two-year Muballigha programme.',
   eligibility:[
    'Previous Study: Successful completion of Muballigha First Year and Second Year.',
    'Academic Verification: Completion is checked against the Academy’s Year Two final assessment and records.',
    'Admission Approval: Separate Aalima admission and fee verification are required before joining.'
   ],
   syllabus:'Advanced learning focus includes Qur’an translation, Tafseer, Fiqh and the prescribed third-year Islamic Studies subjects.',
   materials:'Reading materials are aligned with the third-year subjects and the Academy’s saved curriculum.'
  },
  'boys-hifz':{
   description:'Guided Qur’an memorisation, recitation and revision for boys.',
   eligibility:[
    'Learning Interest: For boys who wish to study Qur’an memorisation.',
    'Recitation Readiness: Current Qur’an reading ability is reviewed for appropriate class placement.',
    'Regular Practice: Commitment to memorisation, revision and teacher-guided learning.'
   ],
   syllabus:'Learning focus includes accurate Qur’an recitation, memorisation and consistent revision.',
   materials:'The Holy Qur’an and recitation or revision exercises used in guided memorisation.'
  },
  'childrens-quran-maktab':{
   description:'A beginner-friendly introduction to Qur’an reading and everyday Islamic learning for children.',
   eligibility:[
    'Learning Interest: Suitable for children beginning Qur’an and basic Islamic learning.',
    'Guardian Support: A parent or guardian can assist with online learning arrangements.',
    'Learning Level: The student’s reading ability is reviewed for suitable instruction.'
   ],
   syllabus:'Learning focus includes Arabic letters, Qur’an reading practice, selected short surahs and daily duas.',
   materials:'Beginner Qur’an reading practice and introductory Islamic learning materials.'
  },
  'tajweed-for-girls':{
   description:'Guided Qur’an recitation with attention to pronunciation and Tajweed for girls.',
   eligibility:[
    'Learning Interest: For girls seeking to improve Qur’an recitation and pronunciation.',
    'Reading Practice: Willingness to practise Arabic letters and Qur’an recitation regularly.',
    'Class Placement: Recitation level may be reviewed to guide instruction.'
   ],
   syllabus:'Learning focus includes correct pronunciation, Makharij, essential Tajweed rules and guided recitation.',
   materials:'Qur’an reading practice and exercises for pronunciation and Tajweed.'
  }
 });
 const PLACEHOLDER=/^(?:to be announced|coming soon|details? (?:will be announced|coming soon)|(?:full )?course details will be published soon|eligibility (?:details|criteria) will be (?:announced|published) (?:soon|by the madrasa)\.?|kitab list will be announced soon\.?|not available yet)\.?$/i;
 function missing(value){
  if(Array.isArray(value))return !value.some(item=>String(item??'').trim());
  const s=String(value??'').trim();
  if(!s||PLACEHOLDER.test(s))return true;
  // Historical hard-coded Hifz placeholder, not text entered by the Academy.
  return /^Qur['’]an memorisation \(Hifz\) programme for boys\. Full course details will be published soon\.$/i.test(s);
 }
 function enrich(courseId,record){
  const data={...(record||{})};
  const info=INFO[courseId]||null;
  const name=String(data.name||'Islamic Studies').trim().slice(0,100);
  if(missing(data.description))data.description=info?.description||'A guided programme exploring '+name+' through structured learning and practice.';
  if(missing(data.eligibility))data.eligibility=(info?.eligibility||[
   'Learning Interest: Suitable for students interested in '+name+'.',
   'Participation: Prepared to follow lessons and practise the course material.',
   'Class Placement: Previous learning and suitability are reviewed during admission.'
  ]).join('\n');
  if(missing(data.syllabus))data.syllabus=info?.syllabus||'Learning focus covers introductory concepts, guided lessons and course-related practice.';
  if(missing(data.fees))data.fees='For the current fee structure, contact Academy Admissions.';
  if(missing(data.timings))data.timings='Online class timings are confirmed with the Academy during admission.';
  // Never invent a duration or a kitab title when it has not been approved.
  if(missing(data.duration))data.duration='';
  data.publicLearningMaterials=info?.materials||'Learning resources and reading practice are selected according to the course topics.';
  return data;
 }
 root.AcademyCoursePublicCopy=Object.freeze({enrich,missing});
})(typeof window!=='undefined'?window:globalThis);
