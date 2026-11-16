/* Student/teacher self-service ID downloads: only server-approved, issued cards.
 * Requires a verified account already authorized by the respective portal.
 * Owner-specific Firestore rules, not UI, protect direct /idCards/{id} reads.
 */
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {
 cardDocumentId,isCurrentCard,renderCardCanvas,createIdCardPdf,safeCardFilename
} from './id-card-utils.js';
export async function attachPersonalIdCard({db,kind,holderId,container,isCurrent=()=>true}){
 if(!db||!container||!holderId||!['student','teacher'].includes(kind))return;
 const section=document.createElement('section');
 section.className='exam-card';
 section.style.cssText='margin-top:18px;padding:17px;border:1px solid #d5c18f;background:#fffef8;border-radius:12px';
 const heading=document.createElement('h4');heading.textContent='🪪 My Official Academy ID Card';
 heading.style.marginTop='0';
 const msg=document.createElement('p');msg.textContent='Checking issued Academy ID card…';
 section.append(heading,msg);container.append(section);
 let card;
 try{
  const snap=await getDoc(doc(db,'idCards',cardDocumentId(kind,holderId)));
  if(snap.exists())card=snap.data();
 }catch(error){
  // A missing, disabled, revoked or unapproved card may be denied by
  // Firestore; never leak its existence or any other person's account.
 }
 if(!isCurrent()){section.remove();return;}
 if(!card||!isCurrentCard(card)||card.kind!==kind||card.holderId!==holderId){
  msg.textContent='Your official ID card is not issued or is no longer active. Contact the Academy administrator.';
  return;
 }
 msg.textContent='✅ Issued card '+String(card.displayId||'')+' · Valid until '+String(card.validUntil||'')+'.';
 const controls=document.createElement('div');controls.className='actions';
 const download=document.createElement('button');download.type='button';download.className='secondary';
 download.textContent='⬇ Download My ID Card PDF';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';
 toggle.textContent='👁 Preview Front & Back';
 controls.append(download,toggle);section.append(controls);
 const preview=document.createElement('div');preview.hidden=true;
 preview.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:16px';
 section.append(preview);
 let loaded=false;
 toggle.onclick=async()=>{
  if(!preview.hidden){preview.hidden=true;toggle.textContent='👁 Preview Front & Back';return}
  preview.hidden=false;toggle.textContent='Hide Preview';
  if(loaded)return;
  toggle.disabled=true;
  try{
   const panels=await Promise.all(['front','back'].map(async side=>{
    const canvas=await renderCardCanvas(card,side,{settings:card.printSettings||{}});
    canvas.style.cssText='width:100%;height:auto;border-radius:9px;box-shadow:0 6px 19px #172f211b';
    canvas.setAttribute('aria-label',side+' side of official ID card');
    return canvas;
   }));
   preview.replaceChildren(...panels);loaded=true;
  }catch(error){msg.textContent='Card preview is temporarily unavailable. You can still try the PDF download.'}
  finally{toggle.disabled=false}
 };
 download.onclick=async()=>{
  download.disabled=true;msg.textContent='Preparing official ID card PDF…';
  try{
   const pdf=await createIdCardPdf([card],{layout:'pvc',settings:card.printSettings||{}});
   pdf.save('ALIA_'+safeCardFilename(card.displayId)+'_ID_Card.pdf');
   msg.textContent='✓ Official front/back ID card PDF ready. Print at 100% actual size (85.6 × 54 mm).';
  }catch(error){msg.textContent='Unable to download card: '+error.message}
  finally{download.disabled=false}
 };
}
