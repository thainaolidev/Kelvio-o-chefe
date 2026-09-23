import { calculatePackTotals, validateOrder } from './order.js';
import { translateMessage } from '../data/i18n.js';

const fieldNames = ['name', 'email', 'phone', 'type', 'pack', 'flavours', 'quantity', 'date', 'time', 'fulfilment', 'address', 'message', 'allergies', 'attachment', 'consent'];

function controlFor(form, name) {
  return form.elements.namedItem(name) ?? form.querySelector(`#${name}-fields`);
}

function clearFieldError(form, name) {
  const control = controlFor(form, name);
  const error = form.querySelector(`#${name}-error`);
  control?.setCustomValidity?.('');
  control?.removeAttribute?.('aria-invalid');
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
}

function showFieldErrors(form, errors, language) {
  for (const name of fieldNames) clearFieldError(form, name);
  for (const [name, message] of Object.entries(errors)) {
    const control = controlFor(form, name);
    const error = form.querySelector(`#${name}-error`);
    control?.setCustomValidity?.(translateMessage(message, language));
    control?.setAttribute?.('aria-invalid', 'true');
    if (error) {
      error.textContent = translateMessage(message, language);
      error.hidden = false;
    }
  }
}

export function attachOrderForm(form, accessKey, fetchImpl = fetch, language = 'pt') {
  if (!form) return;
  const status = form.querySelector('.form-status');
  const submitButton = form.querySelector('[type="submit"]');
  const typeControl = form.elements.namedItem('type');
  const fulfilment = form.elements.namedItem('fulfilment');
  const mealFields = form.querySelector('#meal-fields');
  const payment = form.querySelector('#payment-fields');
  const progress = form.querySelector('#pack-progress');
  const pack = form.elements.namedItem('pack');
  const attachment = form.elements.namedItem('attachment');
  const flavorControls = Array.from(form.querySelectorAll('[name^="flavour_"]'));
  const steps = Array.from(form.querySelectorAll('[data-form-step]'));
  const indicators = Array.from(form.querySelectorAll('[data-step-indicator]'));
  const quotePayment = form.querySelector('#quote-payment');
  const errorsByStep = [
    ['name', 'phone', 'email'],
    ['type', 'pack', 'flavours', 'allergies', 'quantity', 'message'],
    ['date', 'time', 'fulfilment', 'address'],
    ['consent', 'attachment']
  ];
  let activeStep = 0;
  let submitting = false;

  function showStep(index) {
    activeStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== activeStep; });
    indicators.forEach((indicator, stepIndex) => {
      if (stepIndex === activeStep) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
      indicator.classList.toggle('is-complete', stepIndex < activeStep);
    });
    const heading = steps[activeStep]?.querySelector('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    steps[activeStep]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(index) {
    const submitted = new FormData(form);
    const textEntries = Array.from(submitted.entries()).filter(([, value]) => typeof value === 'string');
    const { errors } = validateOrder(Object.fromEntries(textEntries));
    const allowed = new Set(errorsByStep[index] ?? []);
    const stepErrors = Object.fromEntries(Object.entries(errors).filter(([name]) => allowed.has(name)));
    if (index === 3 && typeControl?.value === 'Marmitas') {
      const file = attachment?.files?.[0];
      if (updatePackSummary() && !file) stepErrors.attachment = 'Anexa o comprovativo do sinal de 50%.';
      else if (file && file.size > 5 * 1024 * 1024) stepErrors.attachment = 'O comprovativo tem de ter até 5 MB.';
      else if (file && !(file.type.startsWith('image/') || file.type === 'application/pdf')) stepErrors.attachment = 'Anexa uma imagem ou um PDF do comprovativo.';
    }
    showFieldErrors(form, stepErrors, language);
    if (Object.keys(stepErrors).length) {
      const firstError = Object.keys(stepErrors)[0];
      status.textContent = translateMessage(stepErrors[firstError], language);
      status.className = 'form-status full error';
      (form.elements.namedItem(firstError) ?? form.querySelector('#flavours-fields'))?.focus?.();
      return false;
    }
    if (index === 1 && typeControl?.value === 'Marmitas' && !updatePackSummary()) {
      status.textContent = translateMessage('Indica as quantidades para completar o pack.', language);
      status.className = 'form-status full error';
      pack?.focus();
      return false;
    }
    status.textContent = '';
    status.className = 'form-status full';
    return true;
  }

  function updatePackSummary(isMeals = typeControl?.value === 'Marmitas') {
    const selectedPack = Number(pack?.value);
    const counts = flavorControls.map((control) => Number(control.value || 0));
    const totals = isMeals ? calculatePackTotals(selectedPack, counts) : null;
    if (payment) payment.hidden = !totals;
    if (quotePayment) quotePayment.hidden = isMeals;
    if (attachment) {
      attachment.disabled = !totals;
      attachment.required = Boolean(totals);
      const marker = attachment.closest?.('.form-field')?.querySelector('.required-mark');
      if (marker) marker.hidden = !totals;
    }
    if (progress) {
      if (!isMeals) progress.textContent = '';
      else if (!selectedPack) progress.textContent = language === 'en' ? 'Choose a pack size to see its price and deposit.' : 'Escolhe o tamanho do pack para veres o total e o sinal.';
      else if (totals) progress.textContent = language === 'en' ? 'Pack ready. Review the total and 50% deposit below.' : 'Pack completo. Confere abaixo o total e o sinal de 50%.';
      else if (selectedPack > 5 && Math.max(...counts) < 5) progress.textContent = language === 'en' ? `Choose exactly ${selectedPack} meals; at least 5 must be the same flavour.` : `Escolhe exatamente ${selectedPack} marmitas; pelo menos 5 têm de ser do mesmo sabor.`;
      else progress.textContent = language === 'en' ? `Choose exactly ${selectedPack} meals (${counts.reduce((sum, count) => sum + count, 0)} selected).` : `Escolhe exatamente ${selectedPack} marmitas (${counts.reduce((sum, count) => sum + count, 0)} selecionadas).`;
    }
    if (totals) {
      const money = (cents) => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
      form.querySelector('#subtotal-value').textContent = money(totals.subtotalCents);
      form.querySelector('#discount-value').textContent = `${totals.discount}% · −${money(totals.discountCents)}`;
      form.querySelector('#total-value').textContent = money(totals.totalCents);
      form.querySelector('#deposit-value').textContent = money(totals.depositCents);
    }
    return totals;
  }

  function updateConditionalFields() {
    const isMeals = typeControl?.value === 'Marmitas';
    const delivery = fulfilment?.value === 'Entrega';
    const quantity = form.elements.namedItem('quantity');
    const date = form.elements.namedItem('date');
    const time = form.elements.namedItem('time');
    const address = form.elements.namedItem('address');
    const allergies = form.elements.namedItem('allergies');
    if (date) date.required = true;
    if (time) time.required = true;
    if (fulfilment) fulfilment.required = true;
    if (address) {
      address.required = true;
      address.autocomplete = delivery ? 'street-address' : 'off';
    }
    if (quantity) {
      quantity.disabled = isMeals;
      if (isMeals) quantity.value = '';
      const wrapper = quantity.closest?.('.form-field');
      if (wrapper) wrapper.hidden = isMeals;
    }
    if (mealFields) mealFields.hidden = !isMeals;
    if (pack) {
      pack.disabled = !isMeals;
      pack.required = isMeals;
    }
    for (const control of flavorControls) control.disabled = !isMeals;
    if (allergies) allergies.disabled = !isMeals;
    if (!isMeals && attachment) attachment.value = '';
    for (const [control, required] of [[date, true], [time, true], [fulfilment, true], [address, true], [pack, isMeals]]) {
      const marker = control?.closest?.('.form-field')?.querySelector('.required-mark');
      if (marker) marker.hidden = !required;
    }
    updatePackSummary(isMeals);
    for (const name of ['date', 'time', 'pack', 'flavours', 'attachment']) clearFieldError(form, name);
  }

  form.addEventListener('change', updateConditionalFields);
  form.addEventListener('input', (event) => {
    const name = event.target.name ?? '';
    if (fieldNames.includes(name)) clearFieldError(form, name);
    else if (name.startsWith('flavour_')) clearFieldError(form, 'flavours');
    updatePackSummary();
  });
  form.addEventListener('click', (event) => {
    const next = event.target.closest?.('[data-next-step]');
    const previous = event.target.closest?.('[data-previous-step]');
    if (next) {
      if (validateStep(activeStep)) showStep(activeStep + 1);
    } else if (previous) showStep(activeStep - 1);
  });
  updateConditionalFields();
  showStep(0);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (activeStep !== steps.length - 1) {
      if (validateStep(activeStep)) showStep(activeStep + 1);
      return;
    }
    const submittedData = new FormData(form);
    const textEntries = Array.from(submittedData.entries()).filter(([, value]) => typeof value === 'string');
    const { values, errors } = validateOrder(Object.fromEntries(textEntries));
    const file = attachment?.files?.[0];
    if (file && file.size > 5 * 1024 * 1024) errors.attachment = 'O comprovativo tem de ter até 5 MB.';
    else if (file && !(file.type.startsWith('image/') || file.type === 'application/pdf')) errors.attachment = 'Anexa uma imagem ou um PDF do comprovativo.';
    else if (values.type === 'Marmitas' && calculatePackTotals(Number(values.pack), flavorControls.map((control) => Number(control.value || 0))) && !file) errors.attachment = 'Anexa o comprovativo do sinal de 50%.';
    showFieldErrors(form, errors, language);
    if (Object.keys(errors).length) {
      const firstError = Object.values(errors)[0];
      status.textContent = translateMessage(firstError ?? 'Verifica os campos assinalados.', language);
      status.className = 'form-status full error';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (!form.reportValidity()) {
      status.textContent = translateMessage('Verifica os campos assinalados.', language);
      status.className = 'form-status full error';
      return;
    }
    if (values.botcheck) return;
    if (typeof accessKey !== 'string' || !accessKey.trim()) {
      status.textContent = translateMessage('O envio de pedidos ainda não está configurado. Tenta novamente mais tarde.', language);
      status.className = 'form-status full error';
      return;
    }

    submitting = true;
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.textContent;
    submitButton.textContent = language === 'en' ? 'Sending…' : 'A enviar…';
    status.textContent = translateMessage('A enviar o teu pedido…', language);
    status.className = 'form-status full';
    try {
      submittedData.append('access_key', accessKey);
      submittedData.append('from_name', values.name);
      submittedData.append('subject', language === 'en' ? 'New order — Kelvio, O Chefe' : 'Novo pedido — Kelvio, O Chefe');
      const response = await fetchImpl('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: submittedData,
        signal: AbortSignal.timeout(15_000)
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) throw new Error('Request failed');
      form.reset();
      updateConditionalFields();
      status.textContent = translateMessage('Pedido recebido. O Chefe recebeu os teus dados e vai falar contigo para fechar os detalhes.', language);
      status.className = 'form-status full success';
    } catch {
      status.textContent = translateMessage('Não foi possível enviar o pedido agora. Tenta novamente mais tarde.', language);
      status.className = 'form-status full error';
    } finally {
      submitting = false;
      form.removeAttribute('aria-busy');
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.originalText ?? (language === 'en' ? 'Send request' : 'Enviar pedido');
      delete submitButton.dataset.originalText;
    }
  });
}
