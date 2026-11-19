/* Shared class -> student picker. Grouping uses the saved Academy course,
 * verified study year and batch; class names remain admin-editable. No public
 * students are requested or exposed by this utility. */
export function classKeyForStudent(record){
 const course=String(record?.courseId||record?.course||'').trim();
 const stage=course==='muballigha'&&[1,2].includes(Number(record?.courseYear))?Number(record.courseYear)
  :course==='alima'?3:0;
 const batch=String(record?.batch||'').trim();
 return JSON.stringify([course,stage,batch]);
}
function prettyCourse(raw){
 return String(raw||'Course not assigned').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
export function buildClassFirstGroups(records,{courseLabels=new Map()}={}){
 const groups=new Map();
 for(const record of Array.isArray(records)?records:[]){
  if(!record||!record.id)continue;
  const course=String(record.courseId||record.course||'').trim();
  const key=classKeyForStudent(record);
  if(!groups.has(key)){
   const year=course==='muballigha'&&[1,2].includes(Number(record.courseYear))?Number(record.courseYear)
    :course==='alima'?3:0;
   const batch=String(record.batch||'').trim();
   const title=(courseLabels instanceof Map?courseLabels.get(course):courseLabels?.[course])||record.courseName||prettyCourse(course);
   const stage=year?' · Year '+year:course==='muballigha'?' · Year not verified':'';
   const label=String(title).trim()+stage+(batch?' · '+batch:'');
   groups.set(key,{key,course,year,batch,label,records:[]});
  }
  groups.get(key).records.push(record);
 }
 return [...groups.values()].map(g=>({
  ...g,records:g.records.slice().sort((a,b)=>String(a.name||a.studentName||'').localeCompare(String(b.name||b.studentName||''))||
   String(a.studentCode||'').localeCompare(String(b.studentCode||'')))
 })).sort((a,b)=>a.label.localeCompare(b.label));
}
export function createClassFirstStudentPicker({
 studentSelect,insertBefore=null,classLabel='Class / Course *',courseLabels=new Map(),
 optionLabel=record=>String(record.name||record.studentName||'Student')+' · '+String(record.studentCode||'ALIA ID pending')
}){
 if(!studentSelect||!studentSelect.id)throw Error('Provide an existing student selector with an id.');
 const anchor=insertBefore||studentSelect.closest('label')||studentSelect;
 const id=studentSelect.id+'Class';
 if(document.getElementById(id))throw Error('Class-first selector already attached: '+id);
 const label=document.createElement('label');
 label.className='class-first-picker-field';
 const hint=document.createElement('span');hint.textContent=classLabel;
 const classSelect=document.createElement('select');classSelect.id=id;
 classSelect.name=id;classSelect.setAttribute('aria-label','Select class before student');
 label.append(hint,classSelect);anchor.before(label);
 let currentGroups=[],byId=new Map(),labels=courseLabels;
 function renderStudentOptions(selectedId=''){
  const group=currentGroups.find(g=>g.key===classSelect.value);
  studentSelect.replaceChildren(new Option(group?'Select Student ('+group.records.length+')':'First select a class',''));
  studentSelect.disabled=!group;
  if(group){
   for(const record of group.records){
    const id=String(record.id);
    studentSelect.add(new Option(optionLabel(record),id));
   }
   if(group.records.some(x=>String(x.id)===String(selectedId)))studentSelect.value=String(selectedId);
  }
 }
 function setRecords(records,{selectedId,courseLabels:newLabels}={}){
  if(newLabels)labels=newLabels;
  const previousClass=classSelect.value;
  const wanted=selectedId===undefined?studentSelect.value:String(selectedId||'');
  currentGroups=buildClassFirstGroups(records,{courseLabels:labels});
  byId=new Map(currentGroups.flatMap(g=>g.records.map(r=>[String(r.id),g])));
  classSelect.replaceChildren(new Option('Select a Class / Course',''));
  for(const group of currentGroups){
   classSelect.add(new Option(group.label+' ('+group.records.length+' Students)',group.key));
  }
  const studentGroup=byId.get(wanted);
  if(studentGroup)classSelect.value=studentGroup.key;
  else if(currentGroups.some(g=>g.key===previousClass))classSelect.value=previousClass;
  renderStudentOptions(studentGroup?wanted:'');
 }
 function selectStudent(id){
  const g=byId.get(String(id||''));
  classSelect.value=g?g.key:'';
  renderStudentOptions(g?String(id):'');
  return Boolean(g);
 }
 function clear({keepClass=false,notify=true}={}){
  if(!keepClass)classSelect.value='';
  renderStudentOptions('');
  if(notify)studentSelect.dispatchEvent(new Event('change',{bubbles:true}));
 }
 classSelect.addEventListener('change',()=>clear({keepClass:true,notify:true}));
 renderStudentOptions('');
 return {classSelect,studentSelect,setRecords,selectStudent,clear,get groups(){return currentGroups}};
}
