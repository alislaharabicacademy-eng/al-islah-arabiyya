/* Shared lightweight reveal for non-homepage, non-admin Academy pages.
   Never changes form state, navigation, authentication or PDF rendering. */
(function(){
  'use strict';
  const body=document.body;
  if(!body||!body.classList.contains('academy-royal')||
     body.classList.contains('royal-home')||body.classList.contains('royal-admin')||
     body.classList.contains('royal-launch'))return;
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      entry.target.classList.add('royal-motion-inview');
      observer.unobserve(entry.target);
    });
  },{threshold:0.07,rootMargin:'0px 0px -10px 0px'});
  const selector=':scope > .intro,:scope > .hero,:scope > .card,:scope > .toolbar,:scope > .grid > .card,:scope > .wrap > .section-head';
  let queued=false;
  function register(){
    queued=false;
    const root=document.querySelector('main');
    if(!root)return;
    root.querySelectorAll(selector).forEach(function(el){
      if(el.dataset.royalMotionObserved==='1')return;
      el.dataset.royalMotionObserved='1';
      observer.observe(el);
    });
  }
  // Course tiles and approved dashboard content can arrive after Firebase completes.
  const main=document.querySelector('main');
  if(!main)return;
  register();
  if('MutationObserver' in window){
    const watcher=new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(register);
    });
    watcher.observe(main,{childList:true,subtree:true});
  }
})();