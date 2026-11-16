/* Academy course IDs and names come from the Admin-managed courses collection.
 * Public-facing registration forms show published courses only. We deliberately
 * do not merge hardcoded lists back in: hidden/unpublished courses stay hidden.
 * New Academy courses appear automatically after the Admin publishes them.
 */
import {collection,getDocs,query,where} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

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
  const id=String(row.id||'');
  const data=row.data||{};
  const name=academyCourseLabel(data.name);
  if(!validAcademyCourseId(id)||!name||data.published!==true||used.has(id))continue;
  used.add(id);result.push({id,name});
 }
 return result.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
}
export async function fetchPublishedAcademyCourses(db){
 const snap=await getDocs(query(collection(db,'courses'),where('published','==',true)));
 return normaliseAcademyCourseList(snap.docs.map(doc=>({id:doc.id,data:doc.data()})));
}
