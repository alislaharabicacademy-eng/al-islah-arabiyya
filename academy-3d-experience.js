/* Progressive, accessible 3D story motion for the Academy homepage.
 * CSS transforms only: no WebGL dependency, no Firebase, no DOM rewrites
 * outside the decorative model and existing presentation cards.
 */
(()=>{
  'use strict';
  const scene=document.getElementById('academy3dScene');
  const camera=document.getElementById('academy3dCamera');
  const grid=document.querySelector('.hero-grid');
  if(!scene||!camera||!grid)return;

  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=window.matchMedia('(max-width: 850px)');
  const hover=window.matchMedia('(hover:hover) and (pointer:fine)');
  const first=grid.firstElementChild;
  let frame=0;
  let sceneVisible=true;

  // On phones, lead with the dimensional Academy model after the heading
  // and introductory text, before the existing video and admission buttons.
  // On desktops it is the hero's right-hand art panel.
  function placeScene(){
    if(mobile.matches){
      const video=first?.querySelector('.intro-video');
      const actions=first?.querySelector('.actions');
      const anchor=video||actions;
      if(anchor && scene.nextElementSibling!==anchor)first.insertBefore(scene,anchor);
    }else if(scene.parentElement!==grid){
      grid.append(scene);
    }
  }
  placeScene();
  if(mobile.addEventListener)mobile.addEventListener('change',placeScene);
  else mobile.addListener(placeScene);

  // Background sparkle points use deterministic placement to avoid
  // random flashes and inconsistent screenshots across page visits.
  const starLayer=scene.querySelector('.academy-3d-stars');
  if(starLayer){
    const stars=[
      [10,14,3,4.3,.2],[87,17,3,6,.9],[19,38,2,4.8,1.6],
      [80,48,3,5.2,2],[13,71,4,5.7,.6],[88,79,3,4.6,1.4],
      [43,8,3,5.4,1.2],[67,12,2,4.2,.4],[27,89,3,6.2,1.7],
      [71,87,2,4.9,.5],[93,32,3,5.8,2.2],[6,54,2,4.6,1.8]
    ];
    const frag=document.createDocumentFragment();
    for(const [x,y,size,duration,delay] of stars){
      const point=document.createElement('i');
      point.style.setProperty('--sx',x+'%');
      point.style.setProperty('--sy',y+'%');
      point.style.setProperty('--ss',size+'px');
      point.style.setProperty('--sd',duration+'s');
      point.style.setProperty('--sa',(-delay)+'s');
      frag.append(point);
    }
    starLayer.append(frag);
  }

  function renderScroll(){
    frame=0;
    if(reduceMotion.matches||!sceneVisible){
      camera.style.setProperty('--scene-scroll','0px');
      return;
    }
    const rect=scene.getBoundingClientRect();
    const middle=rect.top+rect.height/2;
    const relative=(window.innerHeight*.5-middle)/Math.max(window.innerHeight,1);
    const shift=Math.max(-18,Math.min(18,relative*20));
    camera.style.setProperty('--scene-scroll',shift.toFixed(1)+'px');
    if(rect.top<window.innerHeight*.85){
      scene.dataset.bookOpen='true';
    }
  }
  function scheduleScroll(){
    if(!frame)frame=requestAnimationFrame(renderScroll);
  }
  window.addEventListener('scroll',scheduleScroll,{passive:true});
  window.addEventListener('resize',scheduleScroll,{passive:true});
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      sceneVisible=entries.some(entry=>entry.isIntersecting);
      if(sceneVisible)scheduleScroll();
    },{rootMargin:'250px'});
    io.observe(scene);
  }
  scheduleScroll();

  // Gentle desktop pointer parallax. The model is purely decorative, so no
  // gesture is captured and mobile scroll remains native.
  function resetCamera(){
    camera.style.setProperty('--pointer-x','0deg');
    camera.style.setProperty('--pointer-y','0deg');
  }
  scene.addEventListener('pointermove',event=>{
    if(reduceMotion.matches||!hover.matches)return;
    const bounds=scene.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/Math.max(bounds.width,1)-.5;
    const y=(event.clientY-bounds.top)/Math.max(bounds.height,1)-.5;
    camera.style.setProperty('--pointer-x',(x*10).toFixed(1)+'deg');
    camera.style.setProperty('--pointer-y',(-y*7).toFixed(1)+'deg');
  },{passive:true});
  scene.addEventListener('pointerleave',resetCamera,{passive:true});

  // Reference-inspired dimensional card transitions, scoped to aesthetic
  // cards only. No modifications to links, forms, auth or exam results.
  function enhanceCard(card){
    if(card.dataset.academyDepthReady)return;
    card.dataset.academyDepthReady='true';
    card.classList.add('academy-depth-card');
    card.addEventListener('pointermove',event=>{
      if(!hover.matches||reduceMotion.matches)return;
      const rect=card.getBoundingClientRect();
      const x=(event.clientX-rect.left)/Math.max(rect.width,1)-.5;
      const y=(event.clientY-rect.top)/Math.max(rect.height,1)-.5;
      card.style.setProperty('--tilt-x',(-y*4).toFixed(2)+'deg');
      card.style.setProperty('--tilt-y',(x*5).toFixed(2)+'deg');
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.setProperty('--tilt-x','0deg');
      card.style.setProperty('--tilt-y','0deg');
    },{passive:true});
  }
  function enhanceCards(root=document){
    root.querySelectorAll('.course-card,.tile,.vm-panel,.about-visual').forEach(enhanceCard);
  }
  enhanceCards();
  const courseGrid=document.getElementById('homepageCourseGrid');
  if(courseGrid&&'MutationObserver' in window){
    new MutationObserver(()=>enhanceCards(courseGrid)).observe(courseGrid,{childList:true});
  }
})();
