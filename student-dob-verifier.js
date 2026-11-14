/* A DOB knowledge check for already Firebase-authenticated, admin-approved
 * student accounts. The five-digit ALIA ID is a public roll number, not a
 * password: ALWAYS enforce a verified-email Firebase session as well. */
const OFFICIAL_RE=/^ALIA[0-9]{5}$/;
const B64=/^[A-Za-z0-9_-]+$/;
function base64Url(bytes){
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function fromBase64Url(value){
 if(typeof value!=='string'||!B64.test(value)||value.length>128)throw Error('Invalid account verification salt.');
 const plain=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 return Uint8Array.from(plain,x=>x.charCodeAt(0));
}
export function normalizeStudentCode(raw){
 const code=String(raw||'').trim().toUpperCase();
 if(!OFFICIAL_RE.test(code)||Number(code.slice(4))<1)throw Error('Enter your official ALIA Student ID, for example ALIA00001.');
 return code;
}
export function validateStudentDOB(raw){
 const dob=String(raw||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dob))throw Error('Enter your date of birth.');
 const date=new Date(dob+'T00:00:00Z');
 if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==dob||date>new Date())throw Error('Enter a valid date of birth.');
 return dob;
}
async function proof(code,dob,salt){
 if(!crypto?.subtle)throw Error('Secure verification needs HTTPS and a modern browser.');
 const bytes=fromBase64Url(salt);
 if(bytes.length!==16)throw Error('Invalid student DOB verifier.');
 const secret=new TextEncoder().encode('ALIA-ACADEMY-STUDENT-DOB-v1|'+normalizeStudentCode(code)+'|'+validateStudentDOB(dob));
 const key=await crypto.subtle.importKey('raw',secret,'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes,hash:'SHA-256',iterations:210000},key,256);
 return base64Url(new Uint8Array(bits));
}
export async function makeStudentDobVerifier(code,dob){
 const salt=base64Url(crypto.getRandomValues(new Uint8Array(16)));
 return {dobSalt:salt,dobProof:await proof(code,dob,salt),dobProofVersion:1};
}
export async function matchStudentDobVerifier(code,dob,grant){
 if(!grant||grant.dobProofVersion!==1||!grant.dobSalt||!grant.dobProof)return false;
 const candidate=await proof(code,dob,grant.dobSalt);
 // Fixed-length comparison prevents easy per-character timing shortcuts.
 if(candidate.length!==grant.dobProof.length)return false;
 let different=0;
 for(let i=0;i<candidate.length;i++)different|=candidate.charCodeAt(i)^grant.dobProof.charCodeAt(i);
 return different===0;
}
