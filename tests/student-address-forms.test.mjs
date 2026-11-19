/* Run: node --test tests/student-address-forms.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../student-address-fields.js',import.meta.url),'utf8');
const context={};
runInNewContext(source,context);
const {read,format,validate,attach}=context.AcademyStudentAddress;
const address={
 doorNumber:'12/3',
 addressLine1:'North Street',
 addressLine2:'Panruti, Cuddalore, Tamil Nadu',
 landmark:'Near Bus Stand',
 pinCode:'607106'
};
function formFor(partial={}){
 const elements={};
 for(const [key,value] of Object.entries({...address,...partial})){
  elements[key]={
   value,
   validityMessage:'',
   addEventListener(event,handler){this.onInput=handler;},
   setCustomValidity(message){this.validityMessage=message;},
   reportValidity(){this.reported=true;return !this.validityMessage;}
  };
 }
 return {elements};
}

test('Address stores every required field with labels as the same legacy address string',()=>{
 const s=format(address);
 assert.equal(typeof s,'string');
 for(const field of ['Door Number','Address Line 1','Address Line 2','Landmark','PIN Code']) {
  assert.ok(s.includes(field+':'),field);
 }
 assert.match(s,/PIN Code: 607106$/);
 assert.ok(s.length<=500);
});

test('Blank or whitespace-only fields cannot be submitted',()=>{
 for(const key of Object.keys(address)){
  const form=formFor({[key]:'  '});
  assert.equal(validate(form),false,'blank '+key);
  assert.ok(form.elements[key].validityMessage,'error for '+key);
  assert.throws(()=>format(read(form)),/required/i);
 }
});

test('PIN code must be exactly six Indian digits and not begin with zero',()=>{
 for(const value of ['012345','12345','1234567','1234ab','60 106','000000']){
  const form=formFor({pinCode:value});
  assert.equal(validate(form),false,value);
  assert.throws(()=>format(read(form)),/6-digit/);
 }
 assert.equal(validate(formFor()),true);
});

test('An excessively long address is rejected before the Firestore size cap',()=>{
 const form=formFor({addressLine2:'a'.repeat(470)});
 assert.equal(validate(form),false);
 assert.match(form.elements.addressLine2.validityMessage,/too long/i);
});

test('Editing a previously invalid input clears the browser custom error',()=>{
 const form=formFor({landmark:'  '});
 attach(form);
 assert.equal(validate(form),false);
 form.elements.landmark.value='Near Mosque';
 form.elements.landmark.onInput({currentTarget:form.elements.landmark});
 assert.equal(form.elements.landmark.validityMessage,'');
 assert.equal(validate(form),true);
});

test('Both public forms have all five required inputs, and keep existing address payload',()=>{
 const admissions=readFileSync(new URL('../admission.html',import.meta.url),'utf8');
 const existing=readFileSync(new URL('../existing-student-registration.html',import.meta.url),'utf8');
 for(const html of [admissions,existing]){
  for(const id of ['doorNumber','addressLine1','addressLine2','landmark','pinCode']){
   assert.match(html,new RegExp('id="'+id+'"[^>]*\\brequired\\b'),id);
  }
  assert.match(html,/student-address-fields\.js/);
  assert.match(html,/AcademyStudentAddress\.validate\(form\)/);
  assert.match(html,/AcademyStudentAddress\.format\(AcademyStudentAddress\.read\(form\)\)/);
  assert.doesNotMatch(html,/id="address"/);
 }
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.match(admin,/id:'address',label:'Residential Address \(5 required fields\)'/);
 assert.match(admin,/chk\.disabled=field\.id==='address'/);
 assert.match(admin,/const fixedAddress=admissionDefaults\.find/);
});
