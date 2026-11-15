import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../hiring-board-utils.js', import.meta.url), 'utf8');
const {MAX_HIRING_POSTS, criteriaLines, safeApplyLink, normalizeHiringBoard, validatedHiringBoard} =
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

test('eligibility remains individual numbered points, not a paragraph', () => {
  assert.deepEqual(criteriaLines('1. Arabic knowledge\n2) Tajweed\n- Online teaching\n\n'),
    ['Arabic knowledge', 'Tajweed', 'Online teaching']);
});
test('private drafts may contain no vacancies but cannot be published empty', () => {
  assert.equal(normalizeHiringBoard({positions: []}).positions.length, 0);
  assert.throws(() => validatedHiringBoard({positions: []}), /at least one vacancy/i);
});
test('each published position must have a title and eligibility', () => {
  assert.throws(() => validatedHiringBoard({positions: [{title: '', criteria: 'Tajweed'}]}), /title/i);
  assert.throws(() => validatedHiringBoard({positions: [{title: 'Arabic Teacher', criteria: ''}]}), /eligibility/i);
});
test('valid vacancies and eligibility can be published', () => {
  const result = validatedHiringBoard({heading: 'Vacancies', positions: [
    {title: 'Arabic Teacher', mode: 'Online', criteria: 'Arabic fluency\nTeaching experience', applyLink: 'mailto:jobs@example.com'},
    {title: 'Coordinator', mode: 'Hybrid', criteria: 'Communication skills', applyLink: 'https://example.com/jobs'}
  ]});
  assert.equal(result.positions.length, 2);
  assert.equal(result.positions[0].mode, 'Online');
});
test('unsafe links cannot become application actions', () => {
  assert.equal(safeApplyLink('javascript:alert(1)'), '');
  assert.equal(safeApplyLink('http://example.com'), '');
  assert.equal(safeApplyLink('https://name:password@example.com'), '');
  assert.ok(safeApplyLink('https://example.com/apply'));
  assert.ok(safeApplyLink('mailto:jobs@example.com'));
  assert.throws(() => validatedHiringBoard({positions: [{title: 'Teacher', criteria: 'Arabic', applyLink: 'javascript:alert(1)'}]}), /application link/i);
});
test('limits public and draft hiring entries to eight', () => {
  const result = normalizeHiringBoard({positions: Array.from({length: 20}, (_, i) => ({title: 'Position ' + i}))});
  assert.equal(result.positions.length, MAX_HIRING_POSTS);
});
