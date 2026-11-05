'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeList, calcTotal, calcTax } = require('../cart-utils');

test('mergeList appends a new SKU without changing existing lines', () => {
  const items = [{ sku: 'SKU-1', qty: 1, price: 10, subtotal: 10 }];
  const result = mergeList(items, { sku: 'SKU-2', qty: 2, price: 5, subtotal: 10 }, 2);
  assert.equal(result, items);
  assert.equal(result.length, 2);
  assert.deepEqual(result[1], { sku: 'SKU-2', qty: 2, price: 5, subtotal: 10 });
});

test('mergeList increments quantity and recalculates subtotal for an existing SKU', () => {
  const items = [{ sku: 'SKU-1', qty: 2, price: 12.5, subtotal: 25 }];
  const result = mergeList(items, { sku: 'SKU-1', qty: 3, price: 12.5, subtotal: 37.5 }, 3);
  assert.equal(result.length, 1);
  assert.equal(result[0].qty, 5);
  assert.equal(result[0].subtotal, 62.5);
});

test('calcTotal sums line subtotals and returns zero for an empty cart', () => {
  assert.equal(calcTotal([{ subtotal: 12.5 }, { subtotal: 7.5 }]), 20);
  assert.equal(calcTotal([]), 0);
});

test('calcTax applies the current 20 percent inclusive-tax formula', () => {
  assert.equal(calcTax(120), 20);
  assert.equal(calcTax(0), 0);
});
