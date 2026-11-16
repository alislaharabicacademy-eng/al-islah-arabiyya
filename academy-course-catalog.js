/* Live Academy course selections come from Course Management, not
 * hardcoded legacy lists. Public users see published course names only. */
import {collection,getDocs,query,where} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {normaliseAcademyCourseList} from './academy-course-catalog-core.js';
export {academyCourseLabel,validAcademyCourseId,normaliseAcademyCourseList} from './academy-course-catalog-core.js';
export async function fetchPublishedAcademyCourses(db){
 const snap=await getDocs(query(collection(db,'courses'),where('published','==',true)));
 return normaliseAcademyCourseList(snap.docs.map(doc=>({id:doc.id,data:doc.data()})));
}
