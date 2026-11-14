/* Visual audit evidence for premium certificates. Node 22+ */
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{fileURLToPath}from'node:url';
import{resolve,dirname}from'node:path';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..'),out=resolve(root,'certificate-visual-proof');
mkdirSync(out,{recursive:true});
const content=readFileSync(resolve(root,'premium-certificate-svg.js'),'utf8')
 .replace(/^import\s.+$/gm,'').replace(/^export /gm,'');
const templates=new Function(content+'\nreturn {premiumCertificatePages,sampleCertificate,CERTIFICATE_TYPES};')();
const logo=readFileSync(resolve(root,'1_20261112_080707_0000.png')).toString('base64');
for(const [type] of templates.CERTIFICATE_TYPES){
 const record={...templates.sampleCertificate(type),previewMode:false};
 const pages=templates.premiumCertificatePages(type,record);
 const markup=pages.map(svg=>svg.replaceAll('href="1_20261112_080707_0000.png"','href="data:image/png;base64,'+logo+'"'));
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+type+' — print proof</title>'+
 '<style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9e9e9}svg{display:block;width:100%;height:auto}.page{width:'+(type==='results'?'210mm':'297mm')+';height:'+(type==='results'?'297mm':'210mm')+';break-after:page;margin:0}.page:last-child{break-after:auto}@media print{@page{size:A4 '+(type==='results'?'portrait':'landscape')+';margin:0}html,body{background:white!important}.page{margin:0}}</style></head><body>'+
 markup.map(x=>'<div class="page">'+x+'</div>').join('')+'</body></html>';
 writeFileSync(resolve(out,type+'.html'),html);
}
console.log('Certificate visual proofs generated in '+out);
