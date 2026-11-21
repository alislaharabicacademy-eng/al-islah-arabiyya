import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base='https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/';
const image=base+'1_20261112_080707_0000.png';
const publicPages=['index.html','all-courses.html','admission.html','courses.html'];
const privatePages=[
 'admin.html','admin-access-setup.html','grand-launch.html','student-login.html',
 'teacher-login.html','teacher-attendance.html','existing-student-registration.html',
 'teacher-registration.html','student-update.html','certificate-studio.html',
 'id-card-studio.html','letterhead-studio.html','exam-results.html','verify-id.html'
];
const unescapeXml=s=>s.replace(/&amp;/g,'&');
function head(path){const text=read(path);const match=text.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);assert.ok(match,path+' must have a head');return match[1]}
function meta(h,kind,value){
 const escaped=value; // Attribute names here contain only letters and a colon.
 const pattern=new RegExp('<meta\\s+[^>]*'+kind+'="'+escaped+'"[^>]*content="([^"]+)"[^>]*>','i');
 const match=h.match(pattern);
 return match?.[1]??null;
}
for(const path of publicPages){
 test(path+' has descriptive SEO, canonical, Open Graph and social preview',()=>{
   const h=head(path);
   assert.match(h,/<title>[^<]{20,}<\/title>/i);
   const desc=meta(h,'name','description');
   assert.ok(desc&&desc.length>=80&&desc.length<=200,path+' description');
   assert.equal(meta(h,'name','robots'),'index,follow,max-image-preview:large');
   const loc=path==='index.html'?base:base+path;
   assert.ok(h.includes('<link rel="canonical" href="'+loc+'">'),path+' canonical must match sitemap URL');
   assert.equal(meta(h,'property','og:url'),loc);
   assert.equal(meta(h,'property','og:type'),'website');
   assert.equal(meta(h,'property','og:image'),image);
   assert.ok(meta(h,'property','og:title'));
   assert.ok(meta(h,'property','og:description'));
   assert.equal(meta(h,'name','twitter:card'),'summary');
   assert.ok(!/name="robots" content="noindex/i.test(h));
 });
}
test('Homepage's EducationalOrganization and actual courses are valid JSON-LD',()=>{
 const h=head('index.html');
 const hit=h.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
 assert.ok(hit,'JSON-LD must be in the static HTML head for Google');
 const schema=JSON.parse(hit[1]);
 assert.equal(schema['@context'],'https://schema.org');
 const graph=schema['@graph'];
 const org=graph.find(x=>x['@type']==='EducationalOrganization');
 assert.ok(org&&org.name==='Madrasa Al Islahul Arabiya');
 assert.equal(org.logo,image);
 assert.ok(!('streetAddress'in org)&&!('address'in org),'Do not invent Academy physical address');
 const courses=graph.find(x=>x['@type']==='ItemList').itemListElement.map(x=>x.item);
 assert.deepEqual(courses.map(x=>x.name),['Muallama','Muballigha','Alima']);
 for(const c of courses){assert.equal(c['@type'],'Course');assert.equal(c.provider['@id'],org['@id'])}
});
test('Sitemap lists ONLY canonical, public pages with no private student/admin URLs',()=>{
 const xml=read('sitemap.xml');
 assert.match(xml,/^<\?xml version="1.0" encoding="UTF-8"\?>/);
 const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>unescapeXml(x[1]));
 const expected=[base,...publicPages.filter(x=>x!=='index.html').map(x=>base+x)];
 assert.deepEqual(locs,expected);
 for(const url of locs){assert.ok(url.startsWith(base));const path=url.slice(base.length)||'index.html';assert.ok(existsSync(new URL('../'+path,import.meta.url)),path)}
 for(const path of privatePages)assert.ok(!xml.includes(path),'Private '+path+' cannot be in public sitemap');
 assert.match(read('robots.txt'),/Sitemap: https:\/\/alislaharabicacademy-eng\.github\.io\/al-islah-arabiyya\/sitemap\.xml/);
});
test('All confidential admin/teacher/student pages have static noindex in head',()=>{
 for(const path of privatePages){
   const h=head(path);
   assert.match(h,/<meta\s+[^>]*name="robots"[^>]*content="[^"]*noindex/i,'No index gate missing from '+path);
 }
});
