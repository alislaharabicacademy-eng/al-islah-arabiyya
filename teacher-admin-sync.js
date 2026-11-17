/** Compute a case-sensitive synchronization patch against the current
 * official Teacher Directory values, not the older registration snapshot.
 * This also reconciles registrations edited before the sync feature existed.
 * Subject allocation / class-roster documents are left untouched.
 */
export function directoryPatchFromApprovedRegistration(directory, registration){
 const fields={fullName:'name',phone:'phone',email:'email',subjects:'subject'};
 const patch={};
 for(const [source,destination] of Object.entries(fields)){
  const requested=String(registration[source]??'').trim();
  const published=String(directory[destination]??'').trim();
  if(requested!==published)patch[destination]=requested;
 }
 return patch;
}
export function registrationPatchFromDirectoryChanges(changes){
 const reverse={name:'fullName',phone:'phone',email:'email',subject:'subjects'};
 const patch={};
 for(const [source,destination] of Object.entries(reverse)){
  if(Object.prototype.hasOwnProperty.call(changes,source))
   patch[destination]=String(changes[source]??'').trim();
 }
 return patch;
}
