import test from 'node:test';
import assert from 'node:assert/strict';
import { sortDirectusItems } from './directusOrdering.js';

test('sortDirectusItems falls back to display_order and sort_order when sort is missing', () => {
  const items = [
    { id: 'b', title: 'Beta', sort_order: 2 },
    { id: 'a', title: 'Alpha', display_order: 1 },
    { id: 'c', title: 'Gamma' },
  ];

  const sorted = sortDirectusItems(items, ['sort', 'title']);

  assert.deepEqual(sorted.map((item) => item.id), ['a', 'b', 'c']);
});

test('sortDirectusItems handles descending date fields safely', () => {
  const items = [
    { id: 'older', date_published: '2024-01-01' },
    { id: 'newer', date_published: '2024-05-01' },
    { id: 'missing' },
  ];

  const sorted = sortDirectusItems(items, ['-date_published']);

  assert.deepEqual(sorted.map((item) => item.id), ['newer', 'older', 'missing']);
});
