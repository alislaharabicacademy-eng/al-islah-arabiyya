/* Visitor-only ribbon welcome. No account, Firebase write, or official launch.
 * The welcome is recorded at first display, so returning visitors never get
 * trapped in a repeat ceremony in the same browser/site storage profile.
 */
(() => {
  'use strict';
  const KEY='alia-visitor-ribbon-seen-v1';
  const overlay=document.getElementById('vrOpeningOverlay');
  const cut=document.getElementById('vrCutRibbon');
  const skip=document.getElementById('vrSkipOpening');
  const status=document.getElementById('vrOpeningStatus');
  const particles=document.getElementById('vrParticles');
  if(!overlay||!cut||!skip||!status)return;

  let phase='ready', closeTimer=null, celebrateTimer=null;
  const storageRead=()=>{
    try{return localStorage.getItem(KEY)==='1'}catch(_){
      try{return sessionStorage.getItem(KEY)==='1'}catch(__){return false}
    }
  };
  const storageWrite=()=>{
    try{localStorage.setItem(KEY,'1')}catch(_){
      try{sessionStorage.setItem(KEY,'1')}catch(__){}
    }
  };
  if(storageRead())return;

  const reducedMotion=()=>{
    try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}
    catch(_){return true}
  };
  const moveFocusHome=()=>{
    const target=document.querySelector('main .hero h1')||document.querySelector('main h1');
    if(target){
      target.setAttribute('tabindex','-1');
      try{target.focus({preventScroll:true})}catch(_){}
    }
  };
  function close(){
    if(phase==='closed')return;
    phase='closed';
    clearTimeout(closeTimer);
    clearTimeout(celebrateTimer);
    overlay.hidden=true;
    document.body.classList.remove('vr-opening-active');
    particles?.replaceChildren();
    moveFocusHome();
  }
  function sprinkle(){
    if(!particles||reducedMotion())return;
    for(let i=0;i<30;i++){
      const item=document.createElement('i');
      item.style.setProperty('--vr-x',((i*41)%95+2)+'%');
      item.style.setProperty('--vr-delay',((i%7)*.08)+'s');
      item.style.setProperty('--vr-drift',((i%2?1:-1)*(12+i%6*12))+'px');
      item.style.setProperty('--vr-time',(1.7+(i%4)*.22)+'s');
      particles.append(item);
    }
  }
  function cutRibbon(){
    if(phase!=='ready')return;
    phase='cutting';
    cut.disabled=true;
    overlay.classList.add('vr-is-cut');
    status.textContent='Welcome! Opening our academy website…';
    sprinkle();
    if(reducedMotion()){close();return}
    celebrateTimer=setTimeout(()=>{overlay.classList.add('vr-is-celebrating')},800);
    closeTimer=setTimeout(close,2500);
  }
  cut.addEventListener('click',cutRibbon);
  skip.addEventListener('click',close);
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      event.preventDefault();close();return;
    }
    if(event.key==='Tab'){
      const first=skip,last=cut;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  });
  window.addEventListener('storage',event=>{
    if(event.key===KEY&&event.newValue==='1'&&phase!=='closed')close();
  });

  // A previous visit is counted when the opening screen appears, even if
  // someone closes the tab without pressing the ribbon-cut button.
  storageWrite();
  overlay.hidden=false;
  document.body.classList.add('vr-opening-active');
  skip.focus({preventScroll:true});
})();
