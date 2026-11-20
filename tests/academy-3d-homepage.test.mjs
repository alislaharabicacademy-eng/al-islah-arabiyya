import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../academy-3d-experience.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../academy-3d-experience.js',import.meta.url),'utf8');

test('Cinematic 3D design is linked only on the academy public homepage',()=>{
  assert.match(home,/<link rel="stylesheet" href="\.\/academy-3d-experience\.css"\/>/);
  assert.match(home,/<script defer src="\.\/academy-3d-experience\.js"><\/script>/);
  assert.match(home,/id="academy3dScene"/);
  assert.match(home,/id="academy3dCamera"/);
  assert.match(home,/academy-3d-book-face/);
  assert.match(home,/academy-3d-book-pages/);
  assert.match(home,/academy-3d-book-back/);
  assert.match(home,/academy-3d-book-seal/);
  assert.match(home,/1_20261112_080707_0000\.png/);
  assert.match(css,/perspective:1250px/);
  assert.match(css,/transform-style:preserve-3d/);
  assert.match(css,/@keyframes academy3dBookHover/);
  assert.match(js,/function placeScene\(\)/);
  assert.match(js,/scene\.dataset\.bookOpen='true'/);
});

test('Preserve every essential website operation and dynamically managed hero copy',()=>{
  for(const link of ['admission.html','student-login.html','teacher-login.html','exam-results.html','admin.html','all-courses.html']){
    assert.ok(home.includes(link),'Missing existing route '+link);
  }
  for(const id of ['homeMenuToggle','homeMenuPanel','homepageCourseGrid','academy-exam-announcement','courses','about']){
    assert.ok(home.includes('id="'+id+'"'),'Missing public UI '+id);
  }
  assert.match(home,/madrasa_video_no_gemini\.mp4/);
  assert.match(home,/class="wrap hero-grid"/);
  assert.match(home,/class="hero-bismillah"/);
  assert.match(home,/class="actions"><a class="btn" href="admission.html"/);
  assert.match(js,/if\(!scene\|\|!camera\|\|!grid\)return/);
  assert.doesNotMatch(js,/firebase|localStorage|sessionStorage|fetch\(|setDoc\(|updateDoc\(/i);
});

test('3D works as decoration without trapping gestures, autoplay or reduced motion',()=>{
  assert.match(home,/role="img" aria-label="A three-dimensional gold-bound book/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(js,/reduceMotion\.matches/);
  assert.match(js,/\{passive:true\}/);
  assert.match(js,/requestAnimationFrame\(renderScroll\)/);
  assert.match(js,/max-width: 850px/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.doesNotMatch(home,/id="academy3dScene"[\s\S]{0,2300}<canvas/i);
  assert.doesNotMatch(js,/preventDefault\(|stopPropagation\(/);
  assert.match(js,/new MutationObserver\(\(\)=>enhanceCards\(courseGrid\)\)/);
});

test('Styles remain scoped to Academy presentation surfaces and not admin/fees/auth forms',()=>{
  assert.doesNotMatch(css,/(?:^|\n)\s*(?:button|input|select|form|header|\.btn)\s*\{/m);
  assert.match(css,/\.hero \.academy-3d-scene/);
  assert.match(css,/\.academy-depth-card/);
  assert.match(js,/\.course-card,\.tile,\.vm-panel,\.about-visual/);
  assert.doesNotMatch(js,/(?:^|\n)\s*(?:document\.body\.innerHTML|window\.location\.replace)/);
});
