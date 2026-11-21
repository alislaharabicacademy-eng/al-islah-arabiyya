import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const screen=readFileSync(new URL('../launch-day-welcome.js',import.meta.url),'utf8');
const style=readFileSync(new URL('../launch-day-welcome.css',import.meta.url),'utf8');
const official=readFileSync(new URL('../grand-launch.js',import.meta.url),'utf8');
const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');

test('Homepage keeps the entire inauguration welcome hidden by default',()=>{
 assert.match(home,/id="launchDayBanner" hidden/);
 assert.match(home,/id="launchWelcomeOverlay"[^>]*hidden/);
 assert.match(style,/#launchDayBanner\[hidden\],#launchWelcomeOverlay\[hidden\]\{display:none!important\}/);
 assert.match(home,/src="\.\/launch-day-welcome\.js"/);
 assert.match(home,/href="\.\/launch-day-welcome\.css"/);
 assert.match(home,/id="launchWelcomeSkip"/);
 assert.match(home,/id="launchWelcomeEnter"/);
 assert.match(home,/1_20261112_080707_0000\.png/); // original logo
});
test('Welcome is a one-day event in India and shown once after verified launch',()=>{
 assert.match(screen,/const EVENT_DATE='2026-11-21'/);
 assert.match(screen,/timeZone:'Asia\/Kolkata'/);
 assert.match(screen,/grandLaunchPublic','opening'/);
 assert.match(screen,/opening\.phase==='launched'/);
 assert.match(screen,/opening\.dateLocal===EVENT_DATE/);
 assert.match(screen,/date instanceof Date/);
 assert.match(screen,/indiaDate\(date\)===EVENT_DATE/);
 assert.match(screen,/if\(complete\|\|indiaDate\(\)!==EVENT_DATE\)return/);
 assert.match(screen,/localStorage\.getItem\(SHOW_ONCE_KEY\)/);
 assert.match(screen,/if\(alreadyShown\(\)\)return/);
 assert.match(screen,/skip\?\.addEventListener\('click',closeIntro\)/);
 assert.match(screen,/enter\?\.addEventListener\('click',closeIntro\)/);
 assert.doesNotMatch(screen,/grandLaunch','trial'/);
 assert.doesNotMatch(screen,/grandLaunch','official'/);
});
test('Immutable official launch and public signal are one atomic transaction',()=>{
 assert.match(official,/const batch=writeBatch\(db\)/);
 assert.match(official,/batch\.set\(doc\(db,'grandLaunch','official'\)/);
 assert.match(official,/batch\.set\(doc\(db,'grandLaunchPublic','opening'\)/);
 assert.match(official,/await batch\.commit\(\)/);
 assert.match(rules,/match \/grandLaunchPublic\/\{documentId\}/);
 assert.match(rules,/getAfter\(\/databases\/\$\(database\)\/documents\/grandLaunch\/official\)/);
 assert.match(rules,/allow list, update, delete: if false/);
 assert.match(rules,/request\.resource\.data\.keys\(\)\.hasOnly\(\['phase','dateLocal','launchedAt'\]\)/);
 assert.doesNotMatch(rules,/allow get: if documentId == 'official'/);
});
test('No music and respectful reduced-motion alternative',()=>{
 assert.doesNotMatch(home,/id="launchWelcomeOverlay"[\s\S]*?<audio/i);
 assert.doesNotMatch(screen,/new Audio\(/);
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.match(home,/class="launch-welcome-arabic" lang="ar" dir="rtl"/);
});
