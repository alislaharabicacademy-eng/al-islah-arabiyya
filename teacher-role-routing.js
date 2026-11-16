/** Choose a visible, non-impersonating Teacher Login destination by approvals.
 * This is a UI decision only. Firebase Security Rules still enforce access.
 */
export function teacherPortalLanding(isAdmin,hasLinkedTeacher){
 if(isAdmin&&hasLinkedTeacher)return 'choose-role';
 if(isAdmin)return 'admin-preview';
 if(hasLinkedTeacher)return 'my-teacher-dashboard';
 return 'unauthorized';
}
