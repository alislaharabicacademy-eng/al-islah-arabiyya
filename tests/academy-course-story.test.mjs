import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../academy-course-story.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../academy-course-story.js',import.meta.url),'utf8');

test('Homepage links the new vertical course story and keeps live two-course listing',()=>{
  assert.match(home,/href="\.\/academy-course-story\.css"/);
  assert.match(home,/src="\.\/academy-course-story\.js"/);
  assert.match(home,/id="homepageCourseGrid"/);
  assert.match(home,/id="academy-live-course-catalog"/);
  assert.match(home,/const featuredCourseIds=new Set\(base\.map\(course=>course\.id\)\)/);
  assert.match(home,/\{id:'muallama',name:'Muallama'/);
  assert.match(home,/\{id:'muballigha',name:'Muballigha'/);
  assert.match(home,/displayCourses\(base\.map\(course=>byId\.get\(course\.id\)\)\)/);
});

test('First course enters from upper right and subsequent course is lower on scroll',()=>{
  assert.match(css,/#homepageCourseGrid\.academy-course-story-grid\{\s*display:flex;flex-direction:column/);
  assert.match(css,/translate3d\(100px,-55px,0\) rotateY\(-9deg\)/);
  assert.match(css,/\.course-story-card:nth-child\(even\) \.course-story-visual\{order:2\}/);
  assert.match(js,/next\.href='#featured-course-'\+\(index\+2\)/);
  assert.match(js,/next\.textContent='SCROLL TO NEXT COURSE ↓'/);
  assert.match(js,/new IntersectionObserver/);
  assert.match(js,/observer\.observe\(article\)/);
  assert.match(js,/new MutationObserver\(refresh\)\.observe\(grid,\{childList:true\}\)/);
});

test('Course name arrives before compact details and More Details opens original course page',()=>{
  assert.match(js,/copy\.append\(kicker\)/);
  assert.match(js,/link\.textContent='More Details ↗'/);
  assert.match(js,/link\.href\.includes\('courses\.html\?course='\)/);
  assert.match(js,/link\.href\.includes\('admission\.html\?course='\)/);
  assert.match(js,/summary\.textContent=shortOverview\(summary\.textContent\)/);
  assert.match(js,/function shortOverview\(description\)/);
  assert.match(css,/transition-delay:\.15s/);
  assert.match(css,/transition-delay:\.48s/);
  assert.match(css,/transition-delay:\.68s/);
});

test('Lightweight motion remains optional, mobile-safe and does not mutate academy backend',()=>{
  assert.match(css,/@media\(max-width:750px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(js,/reduced\.matches/);
  assert.match(js,/if\(!observer\|\|reduced\.matches\)/);
  assert.match(js,/grid\.dataset\.courseStoryEnhanced='true'/);
  assert.doesNotMatch(js,/(?:getFirestore|setDoc|updateDoc|deleteDoc|signInWith|fetch\()/);
  for(const route of ['admin.html','student-login.html','teacher-login.html','exam-results.html','all-courses.html','admission.html']){
    assert.ok(home.includes(route),'Existing academy route disappeared: '+route);
  }
});
