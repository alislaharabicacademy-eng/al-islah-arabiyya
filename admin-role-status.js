/* Server-verified role probe. Normal admins cannot read this reserved path.
 * Never infer elevated privileges merely from an admin login or local UI.
 * The master address is never put in any public-facing JavaScript/HTML.
 */
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
export async function isVerifiedMasterAdmin(db,user){
 if(!user?.emailVerified||!user?.email)return false;
 try{
  // Successful read of a missing sentinel still confirms the server rule:
  // only a verified Master Admin is permitted to query this document.
  await getDoc(doc(db,'adminRoleChecks','master'));
  return true;
 }catch(error){
  return false;
 }
}
