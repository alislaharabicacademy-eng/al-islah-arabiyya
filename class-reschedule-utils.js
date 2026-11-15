/* Pure helpers shared by teacher and admin reschedule screens. */
export const classDate = date => {
  const value = String(date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
export const classKey = (course, batch, subject) =>
  String(course || '') + '__' + (['maktab', 'childrens-quran-maktab'].includes(course) ? String(batch || '') + '__' : '') + String(subject || '');
export const makeupKey = (request, requestId) =>
  classKey(request.course, request.batch, request.subject) + '__makeup__' + String(requestId || '');
export const isLockedRequest = request => ['pending', 'approved', 'date_change_requested'].includes(request?.status);
export const isSameClass = (request, assignment) =>
  request?.course === assignment?.course &&
  String(request.batch || '') === String(assignment.batch || '') &&
  request?.subject === assignment?.subject;
export function originalAlreadyMarked(subjects, request) {
  if (!request || !subjects) return false;
  const key = classKey(request.course, request.batch, request.subject);
  return Boolean(subjects[key] || (!['maktab', 'childrens-quran-maktab'].includes(request.course) && subjects[request.subject]));
}
export function findMakeupRecord(subjects, request, requestId) {
  const value = subjects?.[makeupKey(request, requestId)];
  return value?.classType === 'makeup' && value?.rescheduleRequestId === requestId &&
    isSameClass(value, request) ? value : null;
}
export const canConfirmDate = (original, proposed) =>
  classDate(original) && classDate(proposed) && proposed > original;
export const displayAttendanceSubject = (key, record) =>
  String(record?.subject || (String(key).includes('__makeup__')
    ? String(key).split('__makeup__')[0].split('__').pop()
    : String(key).split('__').pop()));
