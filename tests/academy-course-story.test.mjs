import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../academy-course-story.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../academy-course-story.js',import.meta.url),'utf8');

test('Featured courses remain Firestore-driven and only Muallama/Muballigha appear on homepage',()=>{
  assert.match(home,/href="\.\/academy-course-story\.css"/);
  assert.match(home,/src="\.\/academy-course-story\.js"/);
  assert.match(home,/id="homepageCourseGrid"/);
  assert.match(home,/id="academy-live-course-catalog"/);
  assert.match(home,/const featuredCourseIds=new Set\(base\.map\(course=>course\.id\)\)/);
  assert.match(home,/\{id:'muallama',name:'Muallama'/);
  assert.match(home,/\{id:'muballigha',name:'Muballigha'/);
  assert.match(home,/displayCourses\(base\.map\(course=>byId\.get\(course\.id\)\)\)/);
  assert.match(js,/const cards=\[\.\.\.grid\.children\]\.filter\(el=>el\.matches\('article\.course-card'\)\)/);
  assert.match(js,/new MutationObserver\(\(\)=>\{/);
  assert.match(js,/const previousId=currentId/);
});

test('Reference design: large central 3D book, circular orbit, side previews and counter',()=>{
  assert.match(js,/class="academy-collection-orbit academy-collection-orbit-back"/);
  assert.match(js,/class="academy-collection-orbit academy-collection-orbit-front"/);
  assert.match(js,/class="academy-hero-course"/);
  assert.match(js,/class="academy-main-book"/);
  assert.match(js,/class="academy-side-course academy-side-left"/);
  assert.match(js,/class="academy-side-course academy-side-right"/);
  assert.match(js,/class="academy-collection-counter" aria-live="polite"/);
  assert.match(css,/#homepageCourseGrid \.academy-main-book\{/);
  assert.match(css,/transform-style:preserve-3d/);
  assert.match(css,/@keyframes academyCourseFloat/);
  assert.match(css,/@keyframes academyCourseSlideIn/);
  assert.match(js,/src="1_20261112_080707_0000\.png"/);
});

test('Screenshot-style interaction has arrows, mobile horizontal swipes and details below',()=>{
  assert.match(js,/SWIPE TO EXPLORE/);
  assert.match(js,/aria-label="Previous course"/);
  assert.match(js,/aria-label="Next course"/);
  assert.match(js,/academy-carousel-prev'\)\.addEventListener\('click',\(\)=>move\(-1\)\)/);
  assert.match(js,/academy-carousel-next'\)\.addEventListener\('click',\(\)=>move\(1\)\)/);
  assert.match(js,/touchstart/);
  assert.match(js,/touchend/);
  assert.match(js,/Math\.abs\(dx\)>45&&Math\.abs\(dx\)>Math\.abs\(dy\)\*1\.35/);
  assert.match(js,/event\.key==='ArrowRight'/);
  assert.match(js,/event\.key==='ArrowLeft'/);
  assert.match(js,/class="academy-course-info" aria-live="polite"/);
  assert.match(js,/class="academy-course-title"/);
  assert.match(js,/class="academy-course-duration"/);
  assert.match(js,/class="academy-course-summary"/);
  assert.match(js,/class="academy-more-details" href="all-courses\.html">More Details ↗/);
  assert.match(js,/class="academy-course-apply" href="admission\.html">Apply Now →/);
  assert.match(js,/view\.details\.setAttribute\('href',c\.detailsHref\)/);
  assert.match(js,/view\.apply\.setAttribute\('href',c\.applyHref\)/);
  assert.match(js,/view\.summary\.textContent=c\.summary/);
  assert.match(css,/background:linear-gradient\(135deg,#fffcf0,#f8f1da/);
});

test('Short preview retains full details route, avoids backend edits and respects reduced motion',()=>{
  assert.match(js,/function courseSummary\(raw\)/);
  assert.match(js,/return text\.slice\(0,first\+1\)/);
  assert.match(js,/summary:courseSummary\(/);
  assert.match(js,/const detailsHref=details\?\.getAttribute\('href'\)/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/touch-action:pan-y/);
  assert.match(js,/reduced\.matches/);
  assert.match(js,/dot\.setAttribute\('aria-pressed',String\(i===idx\)\)/);
  assert.doesNotMatch(js,/(?:getFirestore|setDoc|updateDoc|deleteDoc|signInWith|fetch\()/);
  assert.doesNotMatch(js,/setInterval\(|scrollIntoView\(|window\.location\.assign\(/);
  for(const route of ['admin.html','student-login.html','teacher-login.html','exam-results.html','all-courses.html','admission.html']){
    assert.ok(home.includes(route),'Existing academy route disappeared: '+route);
  }
});
