import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../academy-course-story.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../academy-course-story.js',import.meta.url),'utf8');

test('Three featured courses remain Firestore-driven: Muallama, Muballigha and Alima',()=>{
  assert.match(home,/href="\.\/academy-course-story\.css"/);
  assert.match(home,/src="\.\/academy-course-story\.js"/);
  assert.match(home,/id="homepageCourseGrid"/);
  assert.match(home,/id="academy-live-course-catalog"/);
  assert.match(home,/const featuredCourseIds=new Set\(base\.map\(course=>course\.id\)\)/);
  assert.match(home,/\{id:'muallama',name:'Muallama'/);
  assert.match(home,/\{id:'muballigha',name:'Muballigha'/);
  assert.match(home,/\{id:'alima',name:'Alima'/);
  assert.match(home,/duration:'3rd Year · Continuation'/);
  assert.match(home,/const featuredCourseIds=new Set\(base\.map\(course=>course\.id\)\)/);
  assert.match(home,/displayCourses\(base\.map\(course=>byId\.get\(course\.id\)\)\)/);
  assert.match(js,/const cards=\[\.\.\.grid\.children\]\.filter\(el=>el\.matches\('article\.course-card'\)\)/);
  assert.match(js,/new MutationObserver\(\(\)=>\{/);
  assert.match(js,/const previousId=currentId/);
});

test('Reference design: single central 3D book, circular orbit, no side previews and counter',()=>{
  assert.match(js,/class="academy-collection-orbit academy-collection-orbit-back"/);
  assert.match(js,/class="academy-collection-orbit academy-collection-orbit-front"/);
  assert.match(js,/class="academy-hero-course"/);
  assert.match(js,/class="academy-main-book"/);
  assert.doesNotMatch(js,/class="academy-side-course academy-side-left"/);
  assert.doesNotMatch(js,/class="academy-side-course academy-side-right"/);
  assert.doesNotMatch(js,/view\.left\.textContent|view\.right\.textContent/);
  assert.match(js,/academy-book-entering/);
  assert.match(css,/@keyframes academyBookDropIn/);
  assert.match(css,/@keyframes academyBookLeaveLeft/);
  assert.match(css,/@keyframes academyBookLeaveRight/);
  assert.match(js,/class="academy-collection-counter" aria-live="polite"/);
  assert.match(js,/01 \/ 03/);
  assert.match(css,/#homepageCourseGrid \.academy-main-book\{/);
  assert.match(css,/transform-style:preserve-3d/);
  assert.match(css,/@keyframes academyCourseFloat/);
  assert.match(css,/@keyframes academyCourseSlideIn/);
  assert.match(js,/src="1_20261112_080707_0000\.png"/);
});

test('Next course appears as a draggable miniature book on the upper-right circular rail',()=>{
  assert.match(js,/class="academy-orbit-preview"/);
  assert.match(js,/class="academy-book-course academy-preview-course"/);
  assert.match(js,/class="academy-preview-caption"/);
  assert.match(js,/view\.previewTitle\.textContent=next\.name/);
  assert.match(js,/view\.previewCaption\.textContent=next\.name/);
  assert.match(js,/function positionPreview\(progress\)/);
  assert.match(js,/function dragPreview\(event\)/);
  assert.match(js,/function promoteNext\(index\)/);
  assert.match(js,/view\.preview\.addEventListener\('pointerdown'/);
  assert.match(js,/view\.preview\.addEventListener\('pointermove'/);
  assert.match(js,/view\.preview\.addEventListener\('pointerup'/);
  assert.match(js,/view\.preview\.setPointerCapture/);
  assert.match(css,/touch-action:none/);
  assert.match(css,/academy-preview-promoting/);
  assert.match(css,/academy-is-preview-dragging/);
  assert.match(js,/view\.hero\.style\.opacity=/);
  assert.match(js,/positionPreview\(1\)/);
  assert.doesNotMatch(js,/class="academy-side-course academy-side-right"/);
});

test('Book interaction has arrows, real-time horizontal pointer drags and details below',()=>{
  assert.match(js,/DRAG SMALL BOOK ↙/);
  assert.match(js,/aria-label="Previous course"/);
  assert.match(js,/aria-label="Next course"/);
  assert.match(js,/academy-carousel-prev'\)\.addEventListener\('click',\(\)=>move\(-1\)\)/);
  assert.match(js,/academy-carousel-next'\)\.addEventListener\('click',\(\)=>move\(1\)\)/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/pointerup/);
  assert.match(js,/pointercancel/);
  assert.match(js,/setPointerCapture/);
  assert.match(js,/dragStart\.dx/);
  assert.match(js,/if\(last\.active&&Math\.abs\(last\.dx\)>=threshold\)/);
  assert.match(css,/academy-is-dragging/);
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
  assert.match(js,/view\.apply\.hidden=alimaContinuation/);
  assert.match(js,/view\.continuation\.hidden=!alimaContinuation/);
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

test('Alima is a 3rd-year continuation, not an open direct-admission course',()=>{
  assert.match(home,/if\(d\.id!=='alima'\)/);
  assert.match(home,/courses\.html\?course=alima/);
  assert.match(home,/Optional third-year continuation after completing both Muballigha years/);
  assert.match(home,/duration:item\.id==='alima'\?'3rd Year · Continuation'/);
  assert.match(js,/const alimaContinuation=c\.id==='alima'/);
  assert.match(js,/view\.continuation\.hidden=!alimaContinuation/);
  assert.match(js,/view\.apply\.hidden=alimaContinuation/);
  assert.match(js,/Separate admission fee and Academy approval are required/);
  assert.match(css,/\.academy-course-apply\[hidden\]\{display:none!important\}/);
});
