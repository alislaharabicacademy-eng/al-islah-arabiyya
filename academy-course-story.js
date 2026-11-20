/* Academy featured courses — reference-inspired circular showcase.
 * Swipes and arrow buttons switch the active course; the information card
 * updates with the central 3D book. Firestore's published two-course feed
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
 let touchStart=null;

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
       <span class="academy-collection-counter" aria-live="polite">01 / 02</span>
     </div>
     <div class="academy-collection-stage" tabindex="0" role="group"
          aria-roledescription="carousel" aria-label="Featured course carousel; swipe or use arrows">
       <div class="academy-collection-watermark" aria-hidden="true">AL ISLAH</div>
       <div class="academy-collection-orbit academy-collection-orbit-back" aria-hidden="true"></div>
       <div class="academy-collection-orbit academy-collection-orbit-front" aria-hidden="true"></div>
       <div class="academy-collection-star star-one" aria-hidden="true">✧</div>
       <div class="academy-collection-star star-two" aria-hidden="true">✦</div>
       <div class="academy-side-course academy-side-left" aria-hidden="true">
         <div class="academy-side-book"><span>✦</span></div>
         <span class="academy-side-name"></span>
       </div>
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
       <div class="academy-side-course academy-side-right" aria-hidden="true">
         <div class="academy-side-book"><span>✦</span></div>
         <span class="academy-side-name"></span>
       </div>
       <div class="academy-collection-controls">
         <button type="button" class="academy-carousel-prev" aria-label="Previous course">←</button>
         <span class="academy-swipe-text">SWIPE TO EXPLORE</span>
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
     title:shell.querySelector('.academy-course-title'),
     info:shell.querySelector('.academy-course-info'),
     bookTitle:shell.querySelector('.academy-book-course'),
     count:shell.querySelector('.academy-collection-counter'),
     tamil:shell.querySelector('.academy-course-tamil'),
     duration:shell.querySelector('.academy-course-duration'),
     summary:shell.querySelector('.academy-course-summary'),
     details:shell.querySelector('.academy-more-details'),
     apply:shell.querySelector('.academy-course-apply'),
     left:shell.querySelector('.academy-side-left .academy-side-name'),
     right:shell.querySelector('.academy-side-right .academy-side-name'),
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
   view.stage.setAttribute('aria-label','Featured course '+(idx+1)+' of '+len+': '+c.name+'. Swipe or use the arrows to explore.');
   view.stage.dataset.courseStyle=c.id==='muballigha'?'muballigha':'muallama';
   view.bookTitle.textContent=c.name;
   view.title.textContent=c.name;
   view.tamil.textContent=c.tamil;
   view.tamil.hidden=!c.tamil;
   view.duration.textContent=c.duration||'Online learning';
   view.summary.textContent=c.summary;
   view.details.setAttribute('href',c.detailsHref);
   view.details.setAttribute('aria-label','More details about '+c.name);
   view.apply.setAttribute('href',c.applyHref);
   view.apply.setAttribute('aria-label','Apply for '+c.name);
   const previous=records[(idx-1+len)%len];
   const next=records[(idx+1)%len];
   view.left.textContent=previous?.name||'';
   view.right.textContent=next?.name||'';
   view.dots.replaceChildren();
   for(let i=0;i<len;i++){
     const dot=document.createElement('button');
     dot.type='button';
     dot.className='academy-collection-dot';
     dot.setAttribute('aria-label','Show '+records[i].name);
     dot.setAttribute('aria-pressed',String(i===idx));
     dot.addEventListener('click',()=>showCourse(i));
     view.dots.append(dot);
   }
   if(animate&&!reduced.matches){
     for(const element of [view.hero,view.info]){
       element.classList.remove('academy-course-changed');
       void element.offsetWidth;
       element.classList.add('academy-course-changed');
     }
   }
 }

 function move(delta){
   const index=records.findIndex(c=>c.id===currentId);
   showCourse((index<0?0:index)+delta);
 }

 function connect(){
   if(!view)return;
   view.shell.querySelector('.academy-carousel-prev').addEventListener('click',()=>move(-1));
   view.shell.querySelector('.academy-carousel-next').addEventListener('click',()=>move(1));
   view.stage.addEventListener('keydown',event=>{
     if(event.key==='ArrowRight'){event.preventDefault();move(1)}
     if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
   });
   view.stage.addEventListener('touchstart',event=>{
     if(event.touches.length!==1){touchStart=null;return}
     touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
   },{passive:true});
   view.stage.addEventListener('touchend',event=>{
     if(!touchStart||!event.changedTouches.length)return;
     const dx=event.changedTouches[0].clientX-touchStart.x;
     const dy=event.changedTouches[0].clientY-touchStart.y;
     touchStart=null;
     // Horizontal swipe switches courses; vertical touchscroll stays native.
     if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.35)move(dx<0?1:-1);
   },{passive:true});
   view.stage.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
 }

 function refreshFromPublishedCards(){
   // The original inline module replaces these articles after Firebase fetch;
   // preserve the active course ID while rebuilding a fresh showcase.
   const cards=[...grid.children].filter(el=>el.matches('article.course-card'));
   if(!cards.length)return;
   const previousId=currentId;
   records=cards.map(readCourse);
   view=createShowcase();
   connect();
   const selected=records.findIndex(c=>c.id===previousId);
   showCourse(selected<0?0:selected,false);
 }

 refreshFromPublishedCards();
 if('MutationObserver' in window){
   new MutationObserver(()=>{
     if([...grid.children].some(el=>el.matches('article.course-card')))refreshFromPublishedCards();
   }).observe(grid,{childList:true});
 }
})();
