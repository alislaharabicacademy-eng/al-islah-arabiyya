/* Admin-only careers editor: private drafts; explicit, atomic public publication. */
import {doc, getDoc, setDoc, writeBatch, serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {MAX_HIRING_POSTS, normalizeHiringBoard, normalizeHiringPost, validatedHiringBoard} from './hiring-board-utils.js';

export function initHiringBoardAdmin({db, auth}) {
  const byId = id => document.getElementById(id);
  const rows = byId('hiringPositions');
  const status = byId('hiringBoardStatus');
  const add = byId('hiringAddPosition');
  const draftButton = byId('hiringSaveDraft');
  const publishButton = byId('hiringPublish');
  const hideButton = byId('hiringUnpublish');
  if (!rows || !status || !add || !draftButton || !publishButton || !hideButton) return {load: async () => {}};
  const privateRef = doc(db, 'hiringBoardAdmin', 'current');
  const publicRef = doc(db, 'hiringBoard', 'current');
  let published = false;
  let busy = false;
  const fields = [
    ['title', 'Position / Job Title *', 'text', 110, 'e.g. Female Arabic Teacher'],
    ['mode', 'Work Location / Mode', 'select', 0, ['Online', 'On-site', 'Hybrid']],
    ['type', 'Employment Type', 'select', 0, ['Part-time', 'Full-time', 'Contract', 'Volunteer']],
    ['openings', 'Number of Vacancies', 'text', 20, 'e.g. 2'],
    ['description', 'Responsibilities / Role Description', 'textarea', 1200, 'Explain what the teacher or staff member will do.'],
    ['criteria', 'Eligibility Criteria * — ONE POINT PER LINE', 'textarea', 2400, 'Qualified in Arabic or Islamic Studies\nAble to teach online\nRelevant teaching experience'],
    ['deadline', 'Last Date to Apply (optional)', 'date', 0, ''],
    ['applyLink', 'Application Link (HTTPS or mailto:)', 'text', 500, 'https://... or mailto:academy@example.com'],
    ['instructions', 'How to Apply / Contact Instructions', 'textarea', 700, 'Send your CV and qualifications through the link above.']
  ];
  function say(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }
  function setBusy(value) {
    busy = value;
    for (const button of [add, draftButton, publishButton, hideButton]) button.disabled = value;
    rows.querySelectorAll('button').forEach(button => { button.disabled = value; });
    updateNumbers();
  }
  function updateNumbers() {
    [...rows.children].forEach((row, index) => {
      row.querySelector('.hiring-editor-number').textContent = 'Position ' + (index + 1);
    });
    add.disabled = busy || rows.children.length >= MAX_HIRING_POSTS;
  }
  function addRow(data = {}) {
    if (rows.children.length >= MAX_HIRING_POSTS) return;
    const post = normalizeHiringPost(data);
    const card = document.createElement('article');
    card.className = 'hiring-editor-card';
    const top = document.createElement('div');
    top.className = 'hiring-editor-top';
    const title = document.createElement('h4');
    title.className = 'hiring-editor-number';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary hiring-remove';
    remove.textContent = '✕ Remove Position';
    remove.addEventListener('click', () => {
      if (busy || !confirm('Remove this position from the draft? Published listings change only when you click Publish.')) return;
      card.remove(); updateNumbers(); say('Position removed from editor. Publish to update the public website.');
    });
    top.append(title, remove);
    const grid = document.createElement('div');
    grid.className = 'site-settings-fields hiring-fields';
    for (const [key, labelText, kind, max, placeholder] of fields) {
      const label = document.createElement('label');
      label.className = ['description', 'criteria', 'applyLink', 'instructions'].includes(key) ? 'wide' : '';
      label.textContent = labelText;
      const el = document.createElement(kind === 'select' ? 'select' : kind === 'textarea' ? 'textarea' : 'input');
      el.dataset.hiringField = key;
      if (kind === 'select') {
        for (const option of placeholder) el.add(new Option(option, option));
      } else if (kind !== 'textarea') el.type = kind;
      if (max) el.maxLength = max;
      if (typeof placeholder === 'string' && kind !== 'date') el.placeholder = placeholder;
      el.value = post[key] || '';
      label.append(el); grid.append(label);
    }
    card.append(top, grid); rows.append(card); updateNumbers();
  }
  function values() {
    return {
      heading: byId('hiringHeading').value,
      subtitle: byId('hiringSubtitle').value,
      positions: [...rows.children].map(card => {
        const row = {};
        card.querySelectorAll('[data-hiring-field]').forEach(el => { row[el.dataset.hiringField] = el.value; });
        return row;
      })
    };
  }
  function fill(raw) {
    const board = normalizeHiringBoard(raw);
    byId('hiringHeading').value = board.heading;
    byId('hiringSubtitle').value = board.subtitle;
    rows.replaceChildren();
    for (const post of board.positions) addRow(post);
    updateNumbers();
  }
  async function load() {
    if (busy || !auth.currentUser?.emailVerified) return;
    say('Loading saved hiring drafts and current publication status…');
    try {
      const [draftSnap, publicSnap] = await Promise.all([getDoc(privateRef), getDoc(publicRef)]);
      const live = publicSnap.exists() ? publicSnap.data() : {};
      published = live.visible === true;
      fill(draftSnap.exists() ? draftSnap.data() : published ? live : {});
      say(published ? '🟢 Hiring is PUBLISHED on the homepage. Edit and click Publish to update it; Save Draft does not change the live listing.' :
        '⚪ Hiring is UNPUBLISHED. Save a private draft or publish a vacancy when ready.');
    } catch (error) {
      say('Could not load hiring settings: ' + error.message, true);
    }
  }
  async function saveDraft() {
    if (busy) return;
    setBusy(true); say('Saving private hiring draft…');
    try {
      await setDoc(privateRef, {...normalizeHiringBoard(values()), updatedAt: serverTimestamp()});
      say('✓ Draft saved privately. Homepage publication remains ' + (published ? 'ON' : 'OFF') + '.');
    } catch (error) { say('Draft save failed: ' + error.message, true); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (busy) return;
    let board;
    try { board = validatedHiringBoard(values()); }
    catch (error) { say(error.message, true); return; }
    setBusy(true); say('Publishing vacancies to the homepage…');
    try {
      const batch = writeBatch(db);
      batch.set(privateRef, {...board, updatedAt: serverTimestamp()});
      batch.set(publicRef, {...board, visible: true, updatedAt: serverTimestamp()});
      await batch.commit();
      published = true;
      say('✓ ' + board.positions.length + ' hiring position(s) PUBLISHED. Refresh the homepage to see the Careers section.');
    } catch (error) { say('Publishing failed: ' + error.message, true); }
    finally { setBusy(false); }
  }
  async function unpublish() {
    if (busy) return;
    if (published && !confirm('Unpublish ALL hiring vacancies from the public homepage now? Your saved draft will remain available.')) return;
    setBusy(true); say('Removing all public hiring vacancies…');
    try {
      await setDoc(publicRef, {visible: false, heading: '', subtitle: '', positions: [], updatedAt: serverTimestamp()});
      published = false;
      say('✓ Hiring UNPUBLISHED. Public position and eligibility details are cleared; private draft is preserved. Refresh the homepage.');
    } catch (error) { say('Could not unpublish hiring: ' + error.message, true); }
    finally { setBusy(false); }
  }
  add.addEventListener('click', () => {
    addRow();
    say('Position added to draft. Enter the details and Save Draft or Publish.');
  });
  draftButton.addEventListener('click', saveDraft);
  publishButton.addEventListener('click', publish);
  hideButton.addEventListener('click', unpublish);
  return {load};
}
