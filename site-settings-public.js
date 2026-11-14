/* Shared, read-only published Academy customisations for all public pages. */
import {loadSiteSettings} from './site-settings.js';
const $=selector=>document.querySelector(selector);
function setText(el,text){if(el&&typeof text==='string'&&text.trim())el.textContent=text.trim()}
function setTheme(name){
 document.body.dataset.siteTheme=name;
 if($('#siteThemePalette'))return;
 const css=document.createElement('style');css.id='siteThemePalette';
 css.textContent=`
 body[data-site-theme="sapphire"]{--green:#102b49;--green2:#1a4569;--ink:#173348;--gold:#c2a76d}
 body[data-site-theme="sapphire"] .hero{background:radial-gradient(ellipse at 45% 24%,#174d78 0%,#0d3158 55%,#06182e 100%)!important}
 body[data-site-theme="sapphire"] .admissions{background-color:#102f52!important;background-image:linear-gradient(rgba(9,32,60,.85),rgba(9,32,60,.85)),url('./4_20261112_132613_0003.png')!important}
 body[data-site-theme="sapphire"] footer{background:#0b2039}
 body[data-site-theme="sapphire"] .about-visual{background:linear-gradient(135deg,#1c4e75,#0b233f)}
 body[data-site-theme="sapphire"] .band{color:#153e68}
 body[data-site-theme="plum"]{--green:#3c193d;--green2:#622b5f;--ink:#442747;--gold:#c7a66d}
 body[data-site-theme="plum"] .hero{background:radial-gradient(ellipse at 45% 24%,#663568 0%,#3d1d43 55%,#22112b 100%)!important}
 body[data-site-theme="plum"] .admissions{background-color:#412345!important;background-image:linear-gradient(rgba(51,19,56,.85),rgba(51,19,56,.85)),url('./4_20261112_132613_0003.png')!important}
 body[data-site-theme="plum"] footer{background:#26142f}
 body[data-site-theme="plum"] .about-visual{background:linear-gradient(135deg,#5b2a5d,#2b1639)}
 body[data-site-theme="plum"] .band{color:#5c2b5d}
 .site-principal-profile{padding:76px 0;background:linear-gradient(135deg,#f8f5e9,#e8efea);position:relative}
 .site-principal-shell{display:grid;grid-template-columns:210px minmax(0,1fr);gap:38px;max-width:820px;margin:auto;align-items:center;background:#fffdf7;border:1px solid #d2b77c;border-radius:22px;padding:35px;box-shadow:0 22px 52px rgba(16,48,30,.09)}
 .site-principal-portrait{width:210px;height:235px;border-radius:14px;object-fit:cover;border:4px solid #e8d7a7;box-shadow:0 10px 28px rgba(22,48,29,.16)}
 .site-principal-monogram{width:210px;height:210px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#144532,#0b261e);font:600 94px Georgia,serif;color:#e6cd93;border:2px solid #d6bb80}
 .site-principal-kicker{color:#a48348;letter-spacing:.2em;font-size:11px;font-weight:800}
 .site-principal-name{font:600 clamp(27px,4vw,40px) 'Playfair Display',Georgia,serif;color:#143d2e;margin:12px 0 5px}
 .site-principal-designation{font-size:15px;font-weight:750;color:#79643c}
 .site-principal-qualification{margin:12px 0;color:#536d60}
 .site-principal-message{color:#52685c;line-height:1.85;margin:16px 0 0;white-space:pre-wrap}
 @media(max-width:650px){.site-principal-profile{padding:45px 16px}.site-principal-shell{grid-template-columns:1fr;gap:20px;padding:24px;text-align:center}.site-principal-portrait,.site-principal-monogram{margin:auto}}
 `;
 document.head.append(css);
 const meta=$('meta[name="theme-color"]');
 if(meta)meta.content=name==='sapphire'?'#102b49':name==='plum'?'#3c193d':'#102b20';
}
function contact(s){
 const tel=s.phone.replace(/[^+\d]/g,'');
 const whats='https://wa.me/'+s.whatsapp+'?text='+encodeURIComponent('Assalamu Alaikum, I would like to enquire about admission.');
 const apply=$('#contact .btn[href^="https://wa.me/"]');
 if(apply){apply.href=whats;apply.textContent='WhatsApp Admissions · '+s.phone+' ↗'}
 const call=$('#contact a[href^="tel:"]');
 if(call){call.href='tel:'+tel;call.textContent=s.phone}
 for(const a of document.querySelectorAll('footer a[aria-label]')){
  if(a.getAttribute('aria-label')==='WhatsApp')a.href=whats;
  if(a.getAttribute('aria-label')==='Call')a.href='tel:'+tel;
  if(a.getAttribute('aria-label')==='Email')a.href='mailto:'+s.email+'?subject=Academy%20Enquiry';
  if(a.getAttribute('aria-label')==='Instagram')a.href=s.instagram;
 }
}
function principalCard(p){
 const old=$('#sitePrincipalProfile');if(old)old.remove();
 if(!p?.showOnHome||!p.name)return;
 const after=$('#about');if(!after)return;
 const section=document.createElement('section');
 section.id='sitePrincipalProfile';section.className='site-principal-profile';section.setAttribute('aria-label','Academy principal profile');
 const box=document.createElement('div');box.className='site-principal-shell';
 const visual=p.photoData?document.createElement('img'):document.createElement('div');
 if(p.photoData){visual.src=p.photoData;visual.alt=p.name+' portrait';visual.className='site-principal-portrait';visual.loading='lazy'}
 else {visual.className='site-principal-monogram';visual.setAttribute('aria-hidden','true');visual.textContent='✦'}
 const copy=document.createElement('div');
 function add(tag,cls,value){if(!value)return;const el=document.createElement(tag);el.className=cls;el.textContent=value;copy.append(el)}
 add('div','site-principal-kicker','ACADEMY LEADERSHIP');
 add('h2','site-principal-name',p.name);
 add('div','site-principal-designation',p.designation||'Principal');
 add('p','site-principal-qualification',p.qualifications);
 add('p','site-principal-message',p.message);
 box.append(visual,copy);section.append(box);after.insertAdjacentElement('afterend',section);
}
function updateHome(s){
 const head=$('header .academy-wordmark');
 if(head){
  head.replaceChildren();
  const display=document.createElement('span');
  display.textContent=s.instituteName;
  const small=document.createElement('small');small.textContent=s.instituteSubtitle;
  head.append(display,small);
 }
 const title=$('.hero h1');
 if(title){title.replaceChildren();title.append(document.createTextNode(s.heroLine1),document.createElement('br'));const em=document.createElement('em');em.textContent=s.heroLine2;title.append(em)}
 setText($('.hero-grid>div:first-child>p'),s.heroDescription);
 setText($('#courses h2'),s.programmesHeading);
 setText($('#courses .course-intro'),s.programmesDescription);
 setText($('#about .about-copy h2'),s.aboutHeading);
 setText($('#about .about-copy>p'),s.aboutParagraph);
 setText($('#contact h2'),s.contactHeading);
 if(s.contactDescription){
  let desc=$('#siteCustomContactDescription');
  if(!desc){desc=document.createElement('p');desc.id='siteCustomContactDescription';$('#contact h2')?.insertAdjacentElement('afterend',desc)}
  desc.textContent=s.contactDescription;
 }
 setText($('footer strong'),s.instituteName);
 setText($('footer .wrap>div:not(.contact-social-bar):not(#visitorCounter)'),s.instituteSubtitle+' • Islamic Education');
 contact(s);
 principalCard(s.principal);
}
function secondaryPage(s){
 const names=document.querySelectorAll('header h1,header strong,header .nav strong,header .brand strong,footer');
 names.forEach(el=>{
  if(el.children.length)return;
  const old=el.textContent.trim();
  if(old.toLowerCase()==='madrasa al islahul arabiya')el.textContent=old===old.toUpperCase()?s.instituteName.toUpperCase():s.instituteName;
  else if(el.tagName==='FOOTER'&&old.toLowerCase()==='© madrasa al islahul arabiya')el.textContent='© '+s.instituteName;
 });
 const tel=s.phone.replace(/[^+\d]/g,'');
 const whats='https://wa.me/'+s.whatsapp+'?text='+encodeURIComponent('Assalamu Alaikum, I would like to enquire about admission.');
 document.querySelectorAll('a[href^="tel:"]').forEach(a=>{a.href='tel:'+tel;if(/^\+?[0-9\s-]{7,}$/.test(a.textContent.trim()))a.textContent=s.phone});
 document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{a.href='mailto:'+s.email});
 document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a=>{a.href=whats});
}
try{
 const settings=await loadSiteSettings();
 if($('#home.hero')){setTheme(settings.theme);updateHome(settings)}
 else secondaryPage(settings);
 if(document.title.includes('Madrasa Al Islahul Arabiya'))document.title=document.title.replaceAll('Madrasa Al Islahul Arabiya',settings.instituteName);
}catch(error){console.warn('Published Academy website settings are not available; original site remains intact.',error)}
