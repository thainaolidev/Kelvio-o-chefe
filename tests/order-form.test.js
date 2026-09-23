import test from 'node:test';
import assert from 'node:assert/strict';
import { attachOrderForm } from '../lib/order-form.js';

function makeHarness(overrides = {}) {
  const initialValues = {
    name: 'Ana Silva', email: 'ana@example.pt', phone: '+351 912 345 678', type: 'Encomenda', pack: '',
    flavour_1: '0', flavour_2: '0', flavour_3: '0', flavour_4: '0', flavour_5: '0', quantity: '',
    date: '2026-09-24', time: '13:30', fulfilment: 'Recolha', address: 'Lisboa', message: '', allergies: '',
    attachment: '', consent: 'on', botcheck: '', ...overrides
  };
  const values = { ...initialValues };
  const controls = Object.fromEntries(Object.keys(values).map((name) => [name, {
    name,
    get value() { return values[name]; },
    set value(value) { values[name] = value; },
    setCustomValidity(message) { this.validationMessage = message; },
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    closest() { return null; },
    focus() { this.focused = true; },
    files: []
  }]));
  const status = { textContent: '', className: '' };
  const submitButton = { disabled: false, textContent: 'Enviar pedido', dataset: {} };
  const errors = Object.fromEntries(Object.keys(values).map((name) => [`#${name}-error`, { textContent: '', hidden: true }]));
  const listeners = {};
  const form = {
    values,
    elements: { namedItem: (name) => controls[name] },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    querySelector(selector) {
      if (selector === '.form-status') return status;
      if (selector === '[type="submit"]') return submitButton;
      if (selector === '[aria-invalid="true"]') return Object.values(controls).find((control) => control['aria-invalid']) ?? null;
      return errors[selector] ?? null;
    },
    querySelectorAll() { return []; },
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    reportValidity: () => true,
    reset() { for (const name of Object.keys(values)) values[name] = initialValues[name] ?? ''; }
  };
  return { form, listeners, values, status, submitButton, controls };
}

function installFormDataMock(t) {
  const original = globalThis.FormData;
  globalThis.FormData = class MockFormData {
    constructor(form) { this.values = Object.entries(form.values); }
    entries() { return this.values[Symbol.iterator](); }
    append(name, value) { this.values.push([name, value]); }
  };
  t.after(() => { globalThis.FormData = original; });
}

const submitEvent = { preventDefault() {} };
const successfulResponse = { ok: true, async json() { return { success: true }; } };

test('blocks invalid form input before making a network request', async (t) => {
  installFormDataMock(t);
  const harness = makeHarness({ email: 'bad-email' });
  let requests = 0;
  attachOrderForm(harness.form, 'public-key', async () => { requests++; return successfulResponse; });
  await harness.listeners.submit(submitEvent);
  assert.equal(requests, 0);
  assert.match(harness.status.textContent, /email/i);
  assert.equal(harness.controls.email['aria-invalid'], 'true');
});

test('shows validation messages in the selected language', async (t) => {
  installFormDataMock(t);
  const harness = makeHarness({ type: '' });
  attachOrderForm(harness.form, 'public-key', undefined, 'en');
  await harness.listeners.submit(submitEvent);
  assert.match(harness.status.textContent, /Choose an order type/);
});

test('sends one multipart request when submit is activated repeatedly and reports success', async (t) => {
  installFormDataMock(t);
  const harness = makeHarness();
  let requests = 0;
  let release;
  attachOrderForm(harness.form, 'public-key', () => {
    requests++;
    return new Promise((resolve) => { release = () => resolve(successfulResponse); });
  });
  const first = harness.listeners.submit(submitEvent);
  const second = harness.listeners.submit(submitEvent);
  assert.equal(requests, 1);
  assert.equal(harness.submitButton.disabled, true);
  assert.equal(harness.submitButton.textContent, 'A enviar…');
  release();
  await Promise.all([first, second]);
  assert.equal(harness.status.className, 'form-status full success');
  assert.match(harness.status.textContent, /Pedido recebido/);
  assert.equal(harness.submitButton.disabled, false);
  assert.equal(harness.form['aria-busy'], undefined);
});

test('shows a friendly error and restores the submit button after a failed request', async (t) => {
  installFormDataMock(t);
  const harness = makeHarness();
  attachOrderForm(harness.form, 'public-key', async () => ({ ok: false, async json() { return {}; } }));
  await harness.listeners.submit(submitEvent);
  assert.equal(harness.status.className, 'form-status full error');
  assert.match(harness.status.textContent, /Não foi possível enviar/);
  assert.equal(harness.submitButton.disabled, false);
});

test('does not attempt to send when the public service key is not configured', async (t) => {
  installFormDataMock(t);
  const harness = makeHarness();
  let requests = 0;
  attachOrderForm(harness.form, '', async () => { requests++; return successfulResponse; });
  await harness.listeners.submit(submitEvent);
  assert.equal(requests, 0);
  assert.match(harness.status.textContent, /não está configurado/);
});
