/* Public careers section. Reads only the explicitly published document, never private drafts. */
import {initializeApp, getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getFirestore, doc, getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {normalizeHiringBoard, criteriaLines, safeApplyLink} from './hiring-board-utils.js';

const root = document.getElementById('careers');
function node(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined && value !== null && String(value).trim()) el.textContent = value;
  return el;
}
async function renderHiring() {
  if (!root) return;
  root.hidden = true;
  try {
    const response = await fetch('./firebase-config.json', {cache: 'no-store'});
    if (!response.ok) return;
    const config = await response.json();
    if (!config.apiKey || !config.projectId || !config.appId) return;
    const app = getApps().find(item => item.name === 'academy-public-hiring') ||
      initializeApp(config, 'academy-public-hiring');
    const snap = await getDoc(doc(getFirestore(app), 'hiringBoard', 'current'));
    if (!snap.exists() || snap.data().visible !== true) return;
    const board = normalizeHiringBoard(snap.data());
    const vacancies = board.positions.filter(post => post.title && criteriaLines(post.criteria).length);
    if (!vacancies.length) return;
    const grid = document.getElementById('hiringPublicGrid');
    const heading = document.getElementById('hiringPublicHeading');
    const subtitle = document.getElementById('hiringPublicSubtitle');
    heading.textContent = board.heading;
    subtitle.textContent = board.subtitle;
    grid.replaceChildren();
    for (const post of vacancies) {
      const card = node('article', 'hiring-public-card');
      card.append(node('span', 'hiring-card-label', '✦ WE ARE HIRING'),
        node('h3', '', post.title));
      const chips = node('div', 'hiring-card-chips');
      chips.append(node('span', '', post.mode), node('span', '', post.type));
      if (post.openings) chips.append(node('span', '', 'Vacancies: ' + post.openings));
      card.append(chips);
      if (post.description) card.append(node('p', 'hiring-card-description', post.description));
      const elig = node('div', 'hiring-card-criteria');
      elig.append(node('h4', '', 'Eligibility Criteria'));
      const list = node('ol', '');
      for (const item of criteriaLines(post.criteria)) list.append(node('li', '', item));
      elig.append(list); card.append(elig);
      if (post.deadline) card.append(node('p', 'hiring-card-deadline', 'Last date to apply: ' + post.deadline));
      if (post.instructions) card.append(node('p', 'hiring-card-instructions', post.instructions));
      const link = safeApplyLink(post.applyLink);
      if (link) {
        const action = node('a', 'hiring-apply', 'Apply / Contact →');
        action.href = link;
        action.target = '_blank';
        action.rel = 'noopener noreferrer';
        card.append(action);
      }
      grid.append(card);
    }
    root.hidden = false;
    const menuLink = document.querySelector('[data-careers-nav]');
    if (menuLink) menuLink.hidden = false;
  } catch (error) {
    console.warn('Published hiring board unavailable. Hidden until it can be verified.', error);
  }
}
renderHiring();
