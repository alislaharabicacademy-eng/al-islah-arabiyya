/** Choose a visible, non-impersonating Teacher Login destination by approvals.
 * This is a UI decision only. Firebase Security Rules still enforce access.
 */
export function teacherPortalLanding(isAdmin,hasLinkedTeacher){
 if(isAdmin&&hasLinkedTeacher)return 'choose-role';
 if(isAdmin)return 'admin-preview';
 if(hasLinkedTeacher)return 'my-teacher-dashboard';
 return 'unauthorized';
}

/** Archived teachers remain in Firestore for historical salary/attendance,
 * but must not appear in the Admin teacher-login preview picker.
 * Legacy active profiles may have no recordStatus.
 */
export function isTeacherVisibleInDirectory(profile){
 return !!profile&&String(profile.recordStatus||'').trim().toLowerCase()!=='archived';
}
