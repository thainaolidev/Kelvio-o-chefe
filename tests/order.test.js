import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePackTotals, validateOrder } from '../lib/order.js';

const valid = {
  name: 'Ana Silva', email: 'ana@example.pt', phone: '+351 912 345 678', type: 'Encomenda',
  date: '2026-09-24', time: '13:30', fulfilment: 'Entrega', address: 'Rua de teste, Lisboa', message: '', allergies: '', consent: 'on', botcheck: ''
};
const mealPack = { ...valid, type: 'Marmitas', pack: '10', flavour_1: '5', flavour_2: '5', flavour_3: '0', flavour_4: '0', flavour_5: '0' };

test('accepts a valid request with mandatory date, time, fulfilment and location', () => {
  assert.equal(validateOrder(valid, '2026-09-23').valid, true);
});

test('trims contact fields and rejects invalid email, name, and phone', () => {
  const result = validateOrder({ ...valid, name: ' A ', email: 'not-an-email', phone: '12' }, '2026-09-23');
  assert.equal(result.valid, false);
  assert.match(result.errors.name, /nome/i);
  assert.match(result.errors.email, /email/i);
  assert.match(result.errors.phone, /telefone/i);
});

test('requires exact pack counts and at least five of a single flavour for larger packs', () => {
  assert.equal(validateOrder(mealPack, '2026-09-23').valid, true);
  assert.ok(validateOrder({ ...mealPack, flavour_1: '4', flavour_2: '4', flavour_3: '2' }, '2026-09-23').errors.flavours);
  assert.ok(validateOrder({ ...mealPack, flavour_1: '4', flavour_2: '5', flavour_3: '0' }, '2026-09-23').errors.flavours);
  assert.ok(validateOrder({ ...valid, type: 'Marmitas', flavour_1: '1' }, '2026-09-23').errors.pack);
});

test('allows a mixed pack of five and blocks an individual meal order', () => {
  const pack = { ...mealPack, pack: '5', flavour_1: '2', flavour_2: '3' };
  assert.equal(validateOrder(pack, '2026-09-23').valid, true);
  assert.ok(validateOrder({ ...pack, pack: '', flavour_1: '1', flavour_2: '0' }, '2026-09-23').errors.pack);
});

test('calculates pack discounts and the 50 percent deposit from selected flavours', () => {
  assert.deepEqual(calculatePackTotals(5, [5, 0, 0, 0, 0]), {
    subtotalCents: 9000, discountCents: 450, totalCents: 8550, depositCents: 4275, discount: 5
  });
  assert.equal(calculatePackTotals(10, [4, 4, 2, 0, 0]), null);
});

test('requires a future date, time, fulfilment method and delivery or event location', () => {
  for (const patch of [{ date: '' }, { date: '2026-09-22' }, { time: '' }, { fulfilment: '' }, { address: '' }]) {
    assert.ok(Object.keys(validateOrder({ ...valid, ...patch }, '2026-09-23').errors).length);
  }
});

test('requires a future event date and event venue', () => {
  const result = validateOrder({ ...valid, type: 'Evento', date: '', address: '' }, '2026-09-23');
  assert.ok(result.errors.date);
  assert.ok(result.errors.address);
  assert.equal(validateOrder({ ...valid, type: 'Catering' }, '2026-09-23').valid, true);
});

test('validates optional allergies and caps event quantity and message length', () => {
  assert.ok(validateOrder({ ...valid, allergies: 'x'.repeat(501) }, '2026-09-23').errors.allergies);
  assert.ok(validateOrder({ ...valid, quantity: '101' }, '2026-09-23').errors.quantity);
  assert.ok(validateOrder({ ...valid, message: 'x'.repeat(1501) }, '2026-09-23').errors.message);
  assert.ok(validateOrder({ ...valid, consent: '' }, '2026-09-23').errors.consent);
});
