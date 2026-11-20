/* Featured Academy courses: motion-rich, accessible, progressive presentation.
 * Existing Firestore-published two-course homepage catalogue remains the
 * single source of truth. This script only decorates those DOM cards.
 */
(()=>{
 'use strict';
 const grid=document.getElementById('homepageCourseGrid');
 if(!grid)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const canObserve='IntersectionObserver' in window;
 const observer=canObserve?new IntersectionObserver(entries=>{
   for(const entry of entries){
     if(!entry.isIntersecting)continue;
     entry.target.classList.add('course-story-inview');
     observer.unobserve(entry.target);
   }
 },{threshold:.12,rootMargin:'0px 0px -24px 0px'}):null;

 function shortOverview(description){
   // Full saved text is still available on More Details; the homepage
   // shows only a concise first-sentence preview.
   const value=String(description||'').replace(/\s+/g,' ').trim();
   if(!value)return 'Discover course subjects, duration, eligibility and how to join.';
   const sentenceEnd=value.search(/[.!?](?=\s|$)/);
   if(sentenceEnd>=0&&sentenceEnd<185)return value.slice(0,sentenceEnd+1);
   if(value.length<=182)return value;
   return value.slice(0,178).replace(/\s+\S*$/,'').trim()+'…';
 }

 function decorate(article,index,total){
   if(article.classList.contains('course-story-card'))return;
   article.classList.add('course-story-card');
   article.id='featured-course-'+(index+1);
   article.setAttribute('aria-label','Featured course '+(index+1)+' of '+total);
   const existing=[...article.childNodes];
   const copy=document.createElement('div');
   copy.className='course-story-copy';
   const visual=document.createElement('div');
   visual.className='course-story-visual';
   visual.setAttribute('aria-hidden','true');
   const icon=article.querySelector('.course-icon');
   if(icon)visual.append(icon);
   else{
     const symbol=document.createElement('div');
     symbol.className='course-icon';symbol.textContent='✦';visual.append(symbol);
   }
   const visualCaption=document.createElement('span');
   visualCaption.className='story-visual-label';
   visualCaption.textContent='FAITH · LEARNING · KNOWLEDGE';
   visual.append(visualCaption);

   const kicker=document.createElement('span');
   kicker.className='story-programme-label';
   kicker.textContent='FEATURED PROGRAMME · '+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
   copy.append(kicker);
   for(const node of existing){
     if(node!==icon)copy.append(node);
   }

   const summary=copy.querySelector('p:not(.course-tamil)');
   if(summary){
     summary.classList.add('course-story-description');
     summary.textContent=shortOverview(summary.textContent);
   }
   const links=[...copy.querySelectorAll('a[href]')];
   if(links.length){
     const actions=document.createElement('div');
     actions.className='course-story-actions';
     for(const link of links){
       if(link.href.includes('courses.html?course=')){
         link.textContent='More Details ↗';
         link.setAttribute('aria-label','More details about '+(copy.querySelector('h3')?.textContent||'this course'));
       }
       if(link.href.includes('admission.html?course='))link.textContent='Apply Now →';
       link.style.removeProperty('margin-left');
       actions.append(link);
     }
     copy.append(actions);
   }

   // Human-controlled scrolling: no forced page scroll, timed carousel
   // switch, automatic redirect, or interference with mobile gestures.
   const next=document.createElement('a');
   next.className='course-story-next';
   if(index<total-1){
     next.href='#featured-course-'+(index+2);
     next.textContent='SCROLL TO NEXT COURSE ↓';
     next.setAttribute('aria-label','Scroll down to the next featured course');
   }else{
     next.href='all-courses.html';
     next.textContent='EXPLORE ALL COURSES ↗';
   }
   copy.append(next);
   article.append(visual,copy);

   // Ensure DOM content is readable on devices without animation support.
   if(!observer||reduced.matches)article.classList.add('course-story-inview');
   else observer.observe(article);
 }

 function refresh(){
   const cards=[...grid.children].filter(el=>el.matches('article.course-card'));
   if(!cards.length)return;
   grid.classList.add('academy-course-story-grid');
   for(let i=0;i<cards.length;i++)decorate(cards[i],i,cards.length);
   // Only enable initial hidden/entrance states after cards are decorated
   // and their IntersectionObserver has been installed.
   grid.dataset.courseStoryEnhanced='true';
 }

 refresh();
 if('MutationObserver' in window){
   new MutationObserver(refresh).observe(grid,{childList:true});
 }
 if(reduced.addEventListener){
   reduced.addEventListener('change',event=>{
     if(event.matches){
       observer?.disconnect();
       grid.querySelectorAll('.course-story-card').forEach(card=>card.classList.add('course-story-inview'));
     }else{
       // Existing cards stay visible; any new Firestore cards will animate.
       refresh();
     }
   });
 }
})();
