// Confidential result lookup key derived locally from a private student UUID and DOB.
// No names, dates of birth, contact details or credentials are written to public lookup documents.
export async function examStudentLookupKey(studentId,dateOfBirth){
 const id=String(studentId||'').trim().toLowerCase(),dob=String(dateOfBirth||'').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))throw Error('Enter a valid Student ID issued by the Madrasa.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||!Number.isFinite(Date.parse(dob))||new Date(dob+'T00:00:00Z').toISOString().slice(0,10)!==dob)throw Error('Enter the correct date of birth.');
 if(!globalThis.crypto?.subtle)throw Error('Secure lookup is only supported on HTTPS browsers.');
 const payload=new TextEncoder().encode('AL-ISLAH-RESULT-LOOKUP-v1|'+id+'|'+dob);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',payload));
 return [...hash].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
