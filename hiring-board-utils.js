/* Public vacancy data only; draft content lives in a separate admin-only Firestore collection. */
export const MAX_HIRING_POSTS = 8;
const cut = (value, max) => String(value ?? '').trim().slice(0, max);
export function criteriaLines(value) {
  return String(value ?? '').split(/\r?\n/).map(line => line.trim().replace(/^(?:[-*•]\s*|\d+[.)]\s*)/, ''))
    .filter(Boolean).slice(0, 20).map(line => line.slice(0, 240));
}
export function safeApplyLink(value) {
  const link = cut(value, 500);
  if (!link) return '';
  try {
    const parsed = new URL(link);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.hostname) return parsed.href;
    if (parsed.protocol === 'mailto:' && /^mailto:[^@\s?]+@[^@\s?]+\.[^@\s?]+(?:\?.*)?$/i.test(link)) return link;
  } catch (_) { /* Not a valid URL. */ }
  return '';
}
export function normalizeHiringPost(raw = {}) {
  const entry = raw && typeof raw === 'object' ? raw : {};
  return {
    title: cut(entry.title, 110),
    mode: ['Online', 'On-site', 'Hybrid'].includes(entry.mode) ? entry.mode : 'Online',
    type: ['Full-time', 'Part-time', 'Contract', 'Volunteer'].includes(entry.type) ? entry.type : 'Part-time',
    openings: cut(entry.openings, 20),
    description: cut(entry.description, 1200),
    criteria: cut(entry.criteria, 2400),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(entry.deadline || '') ? entry.deadline : '',
    applyLink: cut(entry.applyLink, 500),
    instructions: cut(entry.instructions, 700)
  };
}
export function normalizeHiringBoard(raw = {}) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    heading: cut(data.heading || 'Join Our Teaching Team', 100),
    subtitle: cut(data.subtitle || 'Explore current opportunities at our Academy.', 260),
    positions: (Array.isArray(data.positions) ? data.positions : []).slice(0, MAX_HIRING_POSTS).map(normalizeHiringPost)
  };
}
export function validatedHiringBoard(raw) {
  const value = normalizeHiringBoard(raw);
  if (!value.positions.length) throw Error('Add at least one vacancy before publishing.');
  for (const [index, post] of value.positions.entries()) {
    if (!post.title) throw Error('Position ' + (index + 1) + ': enter the job title.');
    if (!criteriaLines(post.criteria).length) throw Error('Position ' + (index + 1) + ': add eligibility criteria, one per line.');
    if (post.applyLink && !safeApplyLink(post.applyLink)) {
      throw Error('Position ' + (index + 1) + ': application link must be HTTPS or a valid mailto: address.');
    }
  }
  return value;
}
