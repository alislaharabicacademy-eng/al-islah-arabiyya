import test from 'node:test';
import assert from 'node:assert/strict';
import {
 directoryPatchFromApprovedRegistration,
 registrationPatchFromDirectoryChanges
} from '../teacher-admin-sync.js';

test('registration name case-only change overrides old displayed directory spelling',()=>{
 const oldDirectory={name:'Jasmine Farvin',phone:'123',email:'jasmine@example.com',subject:'Quran'};
 const savedRegistration={fullName:'JASMINE FARVIN',phone:'123',email:'jasmine@example.com',subjects:'Quran'};
 assert.deepEqual(directoryPatchFromApprovedRegistration(oldDirectory,savedRegistration),
  {name:'JASMINE FARVIN'});
});

test('older already-saved registration still reconciles without another edit',()=>{
 const official={name:'Jasmine Farvin',phone:'123',email:'jasmine@example.com',subject:'Arabic'};
 const saved={fullName:'JASMINE FARVIN',phone:'123',email:'jasmine@example.com',subjects:'Arabic'};
 assert.deepEqual(directoryPatchFromApprovedRegistration(official,saved),{name:'JASMINE FARVIN'});
});

test('registration sync maps all fields while preserving unrelated directory values',()=>{
 const official={name:'Old Name',phone:'111',email:'old@example.com',subject:'Arabic',salary:1000,assignments:[{course:'alima'}]};
 const saved={fullName:'NEW NAME',phone:'222',email:'new@example.com',subjects:'Tajweed'};
 assert.deepEqual(directoryPatchFromApprovedRegistration(official,saved),
  {name:'NEW NAME',phone:'222',email:'new@example.com',subject:'Tajweed'});
});

test('no changes when saved registration matches published teacher directory',()=>{
 assert.deepEqual(directoryPatchFromApprovedRegistration(
  {name:'JASMINE FARVIN',phone:'123',email:'x@example.com',subject:'Arabic'},
  {fullName:'JASMINE FARVIN',phone:'123',email:'x@example.com',subjects:'Arabic'}),{});
});

test('directory name and email corrections update original registration too',()=>{
 assert.deepEqual(registrationPatchFromDirectoryChanges({name:'JASMINE FARVIN',email:'x@example.com',salary:'5000'}),
  {fullName:'JASMINE FARVIN',email:'x@example.com'});
});

test('directory class assignment edits do not overwrite stated registration qualifications',()=>{
 assert.deepEqual(registrationPatchFromDirectoryChanges({assignments:[{course:'muallama'}],salary:'5000'}),{});
});
