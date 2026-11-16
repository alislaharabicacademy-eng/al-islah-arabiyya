import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CARD_WIDTH_MM,CARD_HEIGHT_MM,CARD_SETTINGS_DEFAULTS,normalizedCardSettings,
 cardDocumentId,newVerificationCode,validVerificationCode,teacherDisplayId,isCurrentCard,
 verificationUrl
} from '../id-card-utils.js';
test('real PVC CR80 ID dimensions and safe privacy defaults',()=>{
 assert.equal(CARD_WIDTH_MM,54);
 assert.equal(CARD_HEIGHT_MM,85.6);
 assert.ok(CARD_HEIGHT_MM>CARD_WIDTH_MM,'Official PVC ID must be portrait, not landscape');
 assert.equal(CARD_SETTINGS_DEFAULTS.studentTheme,'emerald');
 assert.equal(CARD_SETTINGS_DEFAULTS.teacherTheme,'plum');
 for(const key of ['showDob','showBloodGroup','showAddress'])assert.equal(CARD_SETTINGS_DEFAULTS[key],false);
 assert.equal(normalizedCardSettings({studentTheme:'unknown',showDob:'true'}).studentTheme,'emerald');
 assert.equal(normalizedCardSettings({showDob:'true'}).showDob,false);
 assert.equal(normalizedCardSettings({defaultValidUntil:'2027-11-16'}).defaultValidUntil,'2027-11-16');
 assert.equal(normalizedCardSettings({defaultValidUntil:'invalid'}).defaultValidUntil,'');
});
test('Firestore card ids are stable and correctly scoped',()=>{
 assert.equal(cardDocumentId('student','student123'),'student__student123');
 assert.equal(cardDocumentId('teacher','t-abc'),'teacher__t-abc');
 assert.throws(()=>cardDocumentId('staff','abc'));
 assert.throws(()=>cardDocumentId('student','evil/path'));
});
test('verification links use random high-entropy tokens',()=>{
 const tokens=new Set(Array.from({length:24},newVerificationCode));
 assert.equal(tokens.size,24);
 for(const token of tokens){
  assert.equal(validVerificationCode(token),true);
  assert.match(verificationUrl(token),/verify-id\.html\?code=[a-f0-9]{32}$/);
 }
 assert.equal(validVerificationCode('1111'),false);
 assert.equal(verificationUrl('invalid'),'');
});
test('deterministic teacher display ids are different, not security secrets',async()=>{
 const a=await teacherDisplayId('teacher-doc-a'),b=await teacherDisplayId('teacher-doc-b');
 assert.match(a,/^ALIT-[A-F0-9]{10}$/);
 assert.notEqual(a,b);
 assert.equal(a,await teacherDisplayId('teacher-doc-a'));
});
test('revoked and expired cards cannot be downloaded as valid',()=>{
 const card={kind:'student',verificationCode:newVerificationCode(),validUntil:'2027-01-01',status:'active'};
 assert.equal(isCurrentCard(card,new Date('2026-11-16T10:00:00Z')),true);
 assert.equal(isCurrentCard({...card,status:'revoked'},new Date('2026-11-16T10:00:00Z')),false);
 assert.equal(isCurrentCard({...card,validUntil:'2025-11-15'},new Date('2026-11-16T10:00:00Z')),false);
});
