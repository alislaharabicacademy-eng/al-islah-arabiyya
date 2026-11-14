/* Private, compact profile-photo thumbnails stored in admin-only Firestore records.
 * Firebase Storage is deliberately not required. No raw files are persisted. */
export function isProfilePhoto(value){
 return typeof value==='string'&&value.length<150000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
}
export function photoAvatar(data,label='Profile photo'){
 const img=document.createElement('img');img.className='academy-profile-avatar';
 img.alt=label;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 img.src=isProfilePhoto(data)?data:'1_20261112_080707_0000.png';
 return img;
}
export async function compressProfilePhoto(file){
 if(!file)throw Error('Select a photo first.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>8*1024*1024)throw Error('Photo must be smaller than 8 MB.');
 const url=URL.createObjectURL(file);
 let image;
 try{
  image=new Image();image.decoding='async';
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This image cannot be opened. Select another photo.'));image.src=url});
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo processing unavailable in this browser.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,320,320);
  const w=image.naturalWidth,h=image.naturalHeight;
  if(!w||!h||w*h>65000000)throw Error('Photo resolution is too large.');
  const scale=Math.max(320/w,320/h);
  ctx.drawImage(image,(320-w*scale)/2,(320-h*scale)/2,w*scale,h*scale);
  let quality=.76,data='';
  for(let i=0;i<6;i++){
   data=canvas.toDataURL('image/jpeg',quality);
   if(data.length<=105000)break;
   quality=Math.max(.35,quality-.10);
  }
  if(!isProfilePhoto(data)||data.length>105000)throw Error('Image is too detailed to save safely. Try another photo.');
  return data;
 }finally{URL.revokeObjectURL(url)}
}
