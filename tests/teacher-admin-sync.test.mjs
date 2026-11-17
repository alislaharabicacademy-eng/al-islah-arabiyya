import test from 'node:test';
import assert from 'node:assert/strict';
import {directoryPatchFromApprovedRegistration} from '../teacher-admin-sync.js';

test('an approved teacher details edit maps visible login and directory fields',()=>{
 const before={fullName:'Old Name',phone:'111',email:'old@example.com',subjects:'Arabic',academicEducation:'B.A.',notes:'Old'};
 const next={...before,fullName:'New Name',phone:'222',email:'new@example.com',subjects:'Tajweed',academicEducation:'M.A.',notes:'New'};
 assert.deepEqual(directoryPatchFromApprovedRegistration(before,next),{
  name:'New Name',phone:'222',email:'new@example.com',subject:'Tajweed'
 });
});
test('changing biography does not overwrite class assignments or access',()=>{
 const before={fullName:'Teacher',email:'name@example.com',subjects:'Quran',notes:'Old'};
 const after={...before,notes:'New',academicEducation:'Alima'};
 assert.deepEqual(directoryPatchFromApprovedRegistration(before,after),{});
});
test('unmodified details produce no directory updates',()=>{
 const data={fullName:'Teacher',email:'abc@example.com',phone:'123',subjects:'Arabic'};
 assert.deepEqual(directoryPatchFromApprovedRegistration(data,{...data}),{});
});
