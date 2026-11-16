/* Canonical course naming shared by the Admin and student-facing forms.
 * No hardcoded extra courses are silently added to the public registry.
 */
export function academyCourseLabel(input){
 return String(input??'').replace(/[\u2018\u2019]/g,"'")
  .replace(/\s*[\u2013\u2014-]\s*\d+\s*years?\s*$/i,'')
  .replace(/\s+/g,' ').trim().slice(0,120);
}
export function validAcademyCourseId(id){
 return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(id||'')) &&
  id!=='admission-form-config';
}
export function normaliseAcademyCourseList(rows){
 const used=new Set(),result=[];
 for(const row of rows||[]){
  const id=String(row.id||''),data=row.data||{};
  const name=academyCourseLabel(data.name);
  if(!validAcademyCourseId(id)||!name||data.published!==true||used.has(id))continue;
  used.add(id);result.push({id,name});
 }
 return result.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
}
