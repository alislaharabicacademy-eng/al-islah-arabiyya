/* All Academy admin UI gates must use this common role check.
 * The private Master Admin role is established only by Firestore rules;
 * do not put the private Master address into browser JavaScript or HTML.
 * Every server-side operation must separately be protected by isAdmin()
 * (or isMasterAdmin() for Master-only functions) in Firebase rules.
 */
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isVerifiedMasterAdmin} from './admin-role-status.js';

const academyContactEmail='alislaharabicacademy@gmail.com';

export async function isVerifiedAcademyAdmin(db,user){
 if(!db||!user?.emailVerified||!user?.email)return false;
 const address=String(user.email).trim().toLowerCase();
 if(address===academyContactEmail)return true;
 // Check before normal-admin grants; the Master account is intentionally
 // not represented in adminAccess and must not depend on that collection.
 if(await isVerifiedMasterAdmin(db,user))return true;
 try{
  const grant=await getDoc(doc(db,'adminAccess',address));
  return grant.exists()&&grant.data().enabled===true;
 }catch(error){
  return false;
 }
}
