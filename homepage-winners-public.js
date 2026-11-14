/* Small, privacy-scoped homepage achiever display: public document has only explicitly selected rankings. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const root=document.getElementById('home-winners');
if(root){
 const labels={1:'FIRST PLACE',2:'SECOND PLACE',3:'THIRD PLACE'};
 const honours={1:'🥇',2:'🥈',3:'🥉'};
 const isPhoto=str=>typeof str==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(str)&&str.length<=110000;
 try{
  const config=await fetch('firebase-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuration unavailable');return r.json()});
  const app=getApps().find(x=>x.name==='academy-public-winners')||initializeApp(config,'academy-public-winners');
  const result=await getDoc(doc(getFirestore(app),'homepageWinners','current'));
  const data=result.exists()?result.data():null;
  const items=Array.isArray(data?.entries)?data.entries:[];
  const byRank=new Set(),rows=[];
  for(const entry of items){
   const rank=Number(entry?.rank);
   if(![1,2,3].includes(rank)||byRank.has(rank))continue;
   const name=String(entry?.name||'').trim().slice(0,120);
   if(!name||!isPhoto(entry.photoData))continue;
   byRank.add(rank);rows.push({...entry,name,rank});
  }
  if(data?.visible===true&&rows.length){
   rows.sort((a,b)=>a.rank-b.rank);
   const grid=document.getElementById('homeWinnersGrid');grid.replaceChildren();
   const title=document.getElementById('homeWinnersTitle');
   const subtitle=document.getElementById('homeWinnersSubtitle');
   title.textContent=String(data.title||'Our Top Achievers').slice(0,90);
   subtitle.textContent=String(data.subtitle||'Celebrating excellence in Islamic learning').slice(0,160);
   for(const item of rows){
    const card=document.createElement('article');card.className='home-winner-card home-winner-rank-'+item.rank;
    const medal=document.createElement('div');medal.className='home-winner-medal';medal.textContent=honours[item.rank];medal.setAttribute('aria-hidden','true');
    const img=document.createElement('img');img.src=item.photoData;img.alt='Portrait of '+item.name;img.width=126;img.height=126;img.loading='lazy';img.decoding='async';
    const frame=document.createElement('div');frame.className='home-winner-photo';frame.append(img);
    const position=document.createElement('div');position.className='home-winner-position';position.textContent=labels[item.rank];
    const name=document.createElement('h3');name.textContent=item.name;
    const detail=document.createElement('p');detail.textContent=[item.examTitle,item.course,item.academicYear].filter(Boolean).join(' · ').slice(0,230);
    card.append(medal,frame,position,name,detail);grid.append(card);
   }
   root.hidden=false;
  }
 }catch(error){
  // Fail closed: when the panel is hidden or Firestore is offline, do not show student photos.
  console.warn('Homepage top achievers unavailable; section remains hidden.',error);
 }
}
