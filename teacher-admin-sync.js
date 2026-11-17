/** Only explicit changes in an approved teacher registration are mirrored
 * into the official teacher directory. Class allocations remain directory-owned.
 */
export function directoryPatchFromApprovedRegistration(previous, updated){
 const fields={fullName:'name',phone:'phone',email:'email',subjects:'subject'};
 const patch={};
 for(const [source,destination] of Object.entries(fields)){
  if(String(updated[source]??'').trim()!==String(previous[source]??'').trim())
   patch[destination]=String(updated[source]??'').trim();
 }
 return patch;
}
