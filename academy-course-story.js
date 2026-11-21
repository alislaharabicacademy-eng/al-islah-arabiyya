/* Academy featured courses — reference-inspired circular showcase.
 * Swipes and arrow buttons switch the active course; the information card
 * updates with the central 3D book. Firestore's featured three-course feed
 * remains the only source of course titles and descriptions.
 */
(()=>{
 'use strict';
 const grid=document.getElementById('homepageCourseGrid');
 if(!grid)return;

 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let currentId='';
 let records=[];
 let view=null;
 let dragStart=null;
 let exitTimer=0;
 let settleTimer=0;
 let transitioning=false;
 let previewGesture=null;
 let outgoingAnimation=null;

 function courseSummary(raw){
   const text=String(raw||'').replace(/\s+/g,' ').trim();
   if(!text)return 'Explore course subjects, eligibility, duration and admission details.';
   const first=text.search(/[.!?](?=\s|$)/);
   if(first>=0&&first<183)return text.slice(0,first+1);
   if(text.length<=184)return text;
   return text.slice(0,180).replace(/\s+\S*$/,'').trim()+'…';
 }

 function readCourse(article){
   const details=article.querySelector('a[href*="courses.html?course="]');
   const apply=article.querySelector('a[href*="admission.html?course="]');
   const title=article.querySelector('h3')?.textContent?.trim()||'Islamic Studies';
   const detailsHref=details?.getAttribute('href')||'all-courses.html';
   const applyHref=apply?.getAttribute('href')||'admission.html';
   let id='';
   try{id=new URL(detailsHref,document.baseURI).searchParams.get('course')||''}catch(_){}
   return {
     id:id||title.toLowerCase(),
     name:title,
     tamil:article.querySelector('.course-tamil')?.textContent?.trim()||'',
     duration:article.querySelector('.duration')?.textContent?.trim()||'',
     summary:courseSummary(article.querySelector('p:not(.course-tamil)')?.textContent),
     detailsHref,applyHref
   };
 }

 function createShowcase(){
   grid.classList.remove('academy-course-story-grid');
   grid.classList.add('academy-course-carousel');
   const shell=document.createElement('section');
   shell.className='academy-collection';
   shell.setAttribute('aria-label','Featured Academy course collection');
   // Template is static/trusted; every course value below is inserted via
   // textContent or setAttribute, never from HTML templates.
   shell.innerHTML=`
     <div class="academy-collection-heading">
       <span>✦ THE ACADEMY COLLECTION</span>
       <span class="academy-collection-counter" aria-live="polite">01 / 03</span>
     </div>
     <div class="academy-collection-stage" tabindex="0" role="group"
          aria-roledescription="carousel" aria-label="Featured course carousel; drag the small book on the upper right into the centre or use arrows">
       <div class="academy-collection-watermark" aria-hidden="true">AL ISLAH</div>
       <div class="academy-collection-orbit academy-collection-orbit-back" aria-hidden="true"></div>
       <div class="academy-collection-orbit academy-collection-orbit-front" aria-hidden="true"></div>
       <div class="academy-collection-star star-one" aria-hidden="true">✧</div>
       <div class="academy-collection-star star-two" aria-hidden="true">✦</div>
       <div class="academy-hero-course" aria-hidden="true">
         <div class="academy-main-book">
           <div class="academy-main-book-spine"></div>
           <div class="academy-main-book-pages"></div>
           <div class="academy-main-book-cover">
             <div class="academy-book-border"></div>
             <span class="academy-book-kicker">MADRASA AL ISLAHUL ARABIYA</span>
             <img class="academy-book-logo" src="1_20261112_080707_0000.png" alt="" decoding="async">
             <strong class="academy-book-course"></strong>
             <small>WOMEN'S ONLINE MADRASA</small>
           </div>
         </div>
         <div class="academy-book-shadow"></div>
       </div>
       <button type="button" class="academy-orbit-preview" aria-label="Drag next course into the centre">
         <div class="academy-main-book" aria-hidden="true">
           <div class="academy-main-book-spine"></div>
           <div class="academy-main-book-pages"></div>
           <div class="academy-main-book-cover">
             <div class="academy-book-border"></div>
             <span class="academy-book-kicker">MADRASA AL ISLAHUL ARABIYA</span>
             <img class="academy-book-logo" src="1_20261112_080707_0000.png" alt="" decoding="async">
             <strong class="academy-book-course academy-preview-course"></strong>
             <small>WOMEN'S ONLINE MADRASA</small>
           </div>
         </div>
         <span class="academy-preview-caption" aria-hidden="true"></span>
       </button>
       <div class="academy-collection-controls">
         <button type="button" class="academy-carousel-prev" aria-label="Previous course">←</button>
         <span class="academy-swipe-text">DRAG SMALL BOOK ↙</span>
         <button type="button" class="academy-carousel-next" aria-label="Next course">→</button>
       </div>
     </div>
     <article class="academy-course-info" aria-live="polite" aria-atomic="true">
       <div class="academy-course-info-top">
         <span class="academy-course-eyebrow">FEATURED ONLINE PROGRAMME</span>
         <span class="academy-course-duration"></span>
       </div>
       <h3 class="academy-course-title"></h3>
       <p class="academy-course-tamil"></p>
       <p class="academy-course-summary"></p>
       <p class="academy-continuation-note" hidden>✦ Alima is an optional 3rd-year continuation for students who completed Muballigha Years 1 &amp; 2. Separate admission fee and Academy approval are required.</p>
       <div class="academy-course-links">
         <a class="academy-more-details" href="all-courses.html">More Details ↗</a>
         <a class="academy-course-apply" href="admission.html">Apply Now →</a>
       </div>
     </article>
     <div class="academy-collection-dots" role="group" aria-label="Choose featured course"></div>
   `;
   grid.replaceChildren(shell);
   return {
     shell,
     stage:shell.querySelector('.academy-collection-stage'),
     hero:shell.querySelector('.academy-hero-course'),
     preview:shell.querySelector('.academy-orbit-preview'),
     previewTitle:shell.querySelector('.academy-preview-course'),
     previewCaption:shell.querySelector('.academy-preview-caption'),
     title:shell.querySelector('.academy-course-title'),
     info:shell.querySelector('.academy-course-info'),
     bookTitle:shell.querySelector('.academy-book-course'),
     count:shell.querySelector('.academy-collection-counter'),
     tamil:shell.querySelector('.academy-course-tamil'),
     duration:shell.querySelector('.academy-course-duration'),
     summary:shell.querySelector('.academy-course-summary'),
     continuation:shell.querySelector('.academy-continuation-note'),
     details:shell.querySelector('.academy-more-details'),
     apply:shell.querySelector('.academy-course-apply'),
     dots:shell.querySelector('.academy-collection-dots')
   };
 }

 function showCourse(index,animate=true){
   if(!records.length||!view)return;
   const len=records.length;
   const idx=(index+len)%len;
   const c=records[idx];
   currentId=c.id;
   view.count.textContent=String(idx+1).padStart(2,'0')+' / '+String(len).padStart(2,'0');
   view.stage.setAttribute('aria-label','Featured course '+(idx+1)+' of '+len+': '+c.name+'. Drag the small next-course book into the centre, or use the arrows.');
   view.stage.dataset.courseStyle=c.id==='muballigha'?'muballigha':'muallama';
   view.bookTitle.textContent=c.name;
   const next=records[(idx+1)%len];
   view.previewTitle.textContent=next.name;
   view.previewCaption.textContent=next.name;
   view.preview.dataset.courseStyle=next.id==='muballigha'?'muballigha':'muallama';
   view.preview.setAttribute('aria-label','Next course: '+next.name+'. Drag this small book along the circle into the centre, or tap to open.');
   view.preview.hidden=len<2;
   positionPreview(0);
   view.title.textContent=c.name;
   view.tamil.textContent=c.tamil;
   view.tamil.hidden=!c.tamil;
   view.duration.textContent=c.duration||'Online learning';
   view.summary.textContent=c.summary;
   // Alima is an existing-student continuation; never imply that new
   // applicants can use the direct admission form for this course.
   const alimaContinuation=c.id==='alima';
   view.continuation.hidden=!alimaContinuation;
   view.apply.hidden=alimaContinuation;
   view.details.setAttribute('href',c.detailsHref);
   view.details.setAttribute('aria-label','More details about '+c.name);
   view.apply.setAttribute('href',c.applyHref);
   view.apply.setAttribute('aria-label','Apply for '+c.name);
   view.dots.replaceChildren();
   for(let i=0;i<len;i++){
     const dot=document.createElement('button');
     dot.type='button';
     dot.className='academy-collection-dot';
     dot.setAttribute('aria-label','Show '+records[i].name);
     dot.setAttribute('aria-pressed',String(i===idx));
     dot.addEventListener('click',()=>navigate(i));
     view.dots.append(dot);
   }
   if(animate&&!reduced.matches){
     view.info.classList.remove('academy-course-changed');
     void view.info.offsetWidth;
     view.info.classList.add('academy-course-changed');
   }
 }

 // Clear in-progress gestures and timers when Firebase rebuilds the showcase.
 function stopAnimation(){
   window.clearTimeout(exitTimer);
   window.clearTimeout(settleTimer);
   transitioning=false;
   dragStart=null;
   previewGesture=null;
   if(outgoingAnimation){outgoingAnimation.cancel();outgoingAnimation=null}
   if(!view)return;
   view.stage.classList.remove('academy-is-dragging');
   view.hero.classList.remove('academy-book-entering','academy-book-leaving-left','academy-book-leaving-right');
   view.hero.style.removeProperty('--drag-x');
   view.hero.style.removeProperty('--drag-start');
   view.hero.style.removeProperty('transform');
   view.hero.style.removeProperty('opacity');
   view.preview.classList.remove('academy-preview-promoting','academy-preview-no-transition');
   positionPreview(0);
 }

 // Preview rests on the upper-right arc of the visible circular track.
 // Its scaled 3D cover is the real next course, never a generic star icon.
 function orbit(){
   if(!view)return {x:115,y:-125};
   const w=view.stage.clientWidth, h=view.stage.clientHeight;
   // Place the miniature on the outer right arc, outside the main cover.
   // Keep the small cover's right edge in frame even on narrow phones.
   const x=Math.min(w/2-18,Math.max(115,w*.40),190);
   const y=-Math.min(h*.30,137);
   return {x:Math.max(78,x),y};
 }
 function positionPreview(progress){
   if(!view)return;
   const p=Math.max(0,Math.min(1,Number(progress)||0));
   const {x,y}=orbit();
   const wave=Math.sin(p*Math.PI);
   const px=x*(1-p)+wave*9;
   const py=y*(1-p)-wave*12;
   const scale=.26+.74*p;
   const rotate=11*(1-p);
   view.preview.style.transform='translate(calc(-50% + '+px.toFixed(1)+'px),calc(-50% + '+py.toFixed(1)+'px)) scale('+scale.toFixed(3)+') rotate('+rotate.toFixed(1)+'deg)';
 }
 function resetPreviewGesture(){
   previewGesture=null;
   if(!view)return;
   view.stage.classList.remove('academy-is-preview-dragging');
   view.hero.style.removeProperty('transform');
   view.hero.style.removeProperty('opacity');
   positionPreview(0);
 }
 function dragPreview(event){
   if(!previewGesture||event.pointerId!==previewGesture.id||transitioning)return;
   const g=previewGesture;
   const dx=event.clientX-g.x,dy=event.clientY-g.y;
   if(!g.active&&Math.hypot(dx,dy)<7)return;
   g.active=true;
   view.stage.classList.add('academy-is-preview-dragging');
   event.preventDefault();
   // Project the finger motion toward the centre. A subtle curved path
   // follows the circle, so this is an actual draggable book, not a button.
   const {x,y}=orbit();
   const p=Math.max(0,Math.min(1,(-x*dx-y*dy)/(x*x+y*y)));
   g.progress=p;
   positionPreview(p);
   // The centre book simultaneously moves toward the left side and fades.
   view.hero.style.transform='translate(calc(-50% - '+(view.stage.clientWidth*.80*p).toFixed(1)+'px),calc(-50% - '+(view.stage.clientHeight*.12*p).toFixed(1)+'px)) scale('+(1-.48*p).toFixed(3)+')';
   view.hero.style.opacity=String(Math.max(0,1-p*2.65));
 }

 // Promoting the small right-side course enlarges that exact book into
 // the main stage while the old centre book disappears to the left.
 function promoteNext(index){
   if(!view||transitioning||records.length<2)return;
   const idx=(index+records.length)%records.length;
   transitioning=true;
   const oldView=view;
   const hero=view.hero;
   const preview=view.preview;
   const transform=getComputedStyle(hero).transform;
   const opacity=getComputedStyle(hero).opacity;
   view.stage.classList.remove('academy-is-preview-dragging','academy-is-dragging');
   preview.classList.add('academy-preview-promoting');
   hero.style.removeProperty('--drag-x');
   // The Web Animations API preserves the current position if already
   // partially dragged, avoiding a jump to the centre on release.
   if(typeof hero.animate==='function'){
     outgoingAnimation=hero.animate([
       {transform,opacity},
       {transform:'translate(calc(-50% - '+(view.stage.clientWidth+260)+'px),calc(-50% - 95px)) scale(.19) rotate(-18deg)',opacity:0}
     ],{duration:680,easing:'cubic-bezier(.3,.68,.28,1)',fill:'forwards'});
   }else{
     hero.classList.add('academy-book-leaving-left');
   }
   previewGesture=null;
   // Next frame ensures a transition from wherever the small book was
   // released, including a direct tap from its upper-right resting point.
   requestAnimationFrame(()=>{if(view===oldView)positionPreview(1)});
   exitTimer=window.setTimeout(()=>{
     if(view!==oldView)return;
     if(outgoingAnimation){outgoingAnimation.cancel();outgoingAnimation=null}
     hero.classList.remove('academy-book-leaving-left');
     hero.style.removeProperty('transform');
     hero.style.removeProperty('opacity');
     // Swap at the exact instant the preview arrives. The new miniature
     // appears at the upper-right start of the orbit without flying back.
     preview.classList.add('academy-preview-no-transition');
     preview.classList.remove('academy-preview-promoting');
     showCourse(idx,true);
     void preview.offsetWidth;
     preview.classList.remove('academy-preview-no-transition');
     transitioning=false;
   },700);
 }

 function resetDrag(){
   if(!view)return;
   view.stage.classList.remove('academy-is-dragging');
   view.hero.style.removeProperty('--drag-x');
 }

 // One visible book only: dragged book exits entirely off-stage; the new
 // course drops in from above and settles at exactly the same centre point.
 function navigate(index,direction=0,dragOffset=0){
   if(!records.length||!view||transitioning)return;
   const len=records.length;
   const idx=(index+len)%len;
   const from=records.findIndex(c=>c.id===currentId);
   if(idx===from){resetDrag();resetPreviewGesture();return}
   if(reduced.matches){resetDrag();resetPreviewGesture();showCourse(idx,false);return}
   // Advancing uses the real small book on the top-right orbit.
   if(idx===(from+1)%len){promoteNext(idx);return}

   transitioning=true;
   const oldView=view;
   const outgoing=view.hero;
   const toRight=direction<0||(direction===0&&idx<from);
   outgoing.style.setProperty('--drag-start',Math.round(dragOffset)+'px');
   outgoing.style.removeProperty('--drag-x');
   view.stage.classList.remove('academy-is-dragging');
   outgoing.classList.add(toRight?'academy-book-leaving-right':'academy-book-leaving-left');

   exitTimer=window.setTimeout(()=>{
     if(view!==oldView){transitioning=false;return}
     outgoing.classList.remove('academy-book-leaving-left','academy-book-leaving-right');
     outgoing.style.removeProperty('--drag-start');
     showCourse(idx,true);
     outgoing.classList.add('academy-book-entering');
     settleTimer=window.setTimeout(()=>{
       if(view===oldView){
         outgoing.classList.remove('academy-book-entering');
         transitioning=false;
       }
     },760);
   },330);
 }

 function move(delta){
   const index=records.findIndex(c=>c.id===currentId);
   navigate((index<0?0:index)+delta,delta);
 }

 function connect(){
   if(!view)return;
   view.shell.querySelector('.academy-carousel-prev').addEventListener('click',()=>move(-1));
   view.shell.querySelector('.academy-carousel-next').addEventListener('click',()=>move(1));
   view.stage.addEventListener('keydown',event=>{
     if(event.key==='ArrowRight'){event.preventDefault();move(1)}
     if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
   });

   // Pointer events provide real-time horizontal dragging on phones,
   // tablets, and desktops. Vertical page scrolling remains native.
   view.stage.addEventListener('pointerdown',event=>{
     if(transitioning||event.button!==0||event.target.closest('button,a'))return;
     dragStart={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,active:false};
   });
   view.stage.addEventListener('pointermove',event=>{
     if(!dragStart||event.pointerId!==dragStart.id||transitioning)return;
     const dx=event.clientX-dragStart.x;
     const dy=event.clientY-dragStart.y;
     if(!dragStart.active){
       if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){dragStart=null;return}
       if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.15)return;
       dragStart.active=true;
       view.stage.classList.add('academy-is-dragging');
       try{view.stage.setPointerCapture(event.pointerId)}catch(_){}
     }
     event.preventDefault();
     const limit=Math.max(110,view.stage.clientWidth*.85);
     dragStart.dx=Math.max(-limit,Math.min(limit,dx));
     view.hero.style.setProperty('--drag-x',Math.round(dragStart.dx)+'px');
   });
   view.stage.addEventListener('pointerup',event=>{
     if(!dragStart||event.pointerId!==dragStart.id)return;
     const last=dragStart;
     dragStart=null;
     const threshold=Math.min(70,Math.max(46,view.stage.clientWidth*.16));
     if(last.active&&Math.abs(last.dx)>=threshold){
       const direction=last.dx<0?1:-1;
       const index=records.findIndex(c=>c.id===currentId);
       navigate((index<0?0:index)+direction,direction,last.dx);
     }else resetDrag();
   });
   view.stage.addEventListener('pointercancel',()=>{dragStart=null;resetDrag()});
   view.stage.addEventListener('lostpointercapture',()=>{
     if(dragStart){dragStart=null;resetDrag()}
   });
   // Separate gesture surface: the small NEXT course itself follows the
   // finger along the circular track and grows into the main book.
   view.preview.addEventListener('pointerdown',event=>{
     if(transitioning||event.button!==0)return;
     event.stopPropagation();
     previewGesture={id:event.pointerId,x:event.clientX,y:event.clientY,active:false,progress:0};
     try{view.preview.setPointerCapture(event.pointerId)}catch(_){}
   });
   view.preview.addEventListener('pointermove',event=>{
     if(previewGesture&&event.pointerId===previewGesture.id){
       event.stopPropagation();
       dragPreview(event);
     }
   });
   view.preview.addEventListener('pointerup',event=>{
     if(!previewGesture||event.pointerId!==previewGesture.id)return;
     event.stopPropagation();
     const progress=previewGesture.progress;
     const active=previewGesture.active;
     previewGesture=null;
     if(!active||progress>=.38){
       const index=records.findIndex(c=>c.id===currentId);
       navigate((index<0?0:index)+1,1);
     }else resetPreviewGesture();
   });
   view.preview.addEventListener('pointercancel',event=>{
     event.stopPropagation();
     resetPreviewGesture();
   });
   view.preview.addEventListener('lostpointercapture',()=>{
     if(previewGesture)resetPreviewGesture();
   });
   view.preview.addEventListener('click',event=>{
     // Pointer-up already performs a single transition; this also permits
     // Enter/Space activation for keyboards and assistive technologies.
     if(event.detail===0){
       const index=records.findIndex(c=>c.id===currentId);
       navigate((index<0?0:index)+1,1);
     }
   });
 }

 function refreshFromPublishedCards(){
   // The original inline module replaces these articles after Firebase fetch;
   // preserve the active course ID while rebuilding a fresh showcase.
   const cards=[...grid.children].filter(el=>el.matches('article.course-card'));
   if(!cards.length)return;
   const previousId=currentId;
   stopAnimation();
   records=cards.map(readCourse);
   view=createShowcase();
   connect();
   const selected=records.findIndex(c=>c.id===previousId);
   showCourse(selected<0?0:selected,false);
   if(!reduced.matches){
     transitioning=true;
     view.hero.classList.add('academy-book-entering');
     const initialView=view;
     settleTimer=window.setTimeout(()=>{
       if(view===initialView){
         view.hero.classList.remove('academy-book-entering');
         transitioning=false;
       }
     },760);
   }
 }

 window.addEventListener('resize',()=>{
   if(view&&!transitioning&&!previewGesture)positionPreview(0);
 },{passive:true});

 refreshFromPublishedCards();
 if('MutationObserver' in window){
   new MutationObserver(()=>{
     if([...grid.children].some(el=>el.matches('article.course-card')))refreshFromPublishedCards();
   }).observe(grid,{childList:true});
 }
})();
