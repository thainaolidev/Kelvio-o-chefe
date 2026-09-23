import { mealPacks, menuItems } from '../data/menu.js';

export const orderTypes = ['Marmitas', 'Encomenda', 'Evento', 'Catering', 'Outro'];
const fulfilmentTypes = ['Recolha', 'Entrega', 'A combinar'];

function localDateISO(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateOrder(input, today = localDateISO()) {
  const values = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, String(value ?? '').trim()]));
  const errors = {};
  const name = values.name ?? '';
  const email = values.email ?? '';
  const phone = values.phone ?? '';
  const type = values.type ?? '';
  const address = values.address ?? '';
  const time = values.time ?? '';
  const message = values.message ?? '';

  if (name.length < 2 || name.length > 80) errors.name = 'Indica um nome entre 2 e 80 caracteres.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Indica um email válido.';
  if (!phone) errors.phone = 'Indica o teu WhatsApp.';
  else if (!/^[+()\d .-]{7,25}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) {
    errors.phone = 'Confirma o número de telefone (7 a 15 algarismos).';
  }
  if (!orderTypes.includes(type)) errors.type = 'Escolhe o tipo de pedido.';
  const quantity = values.quantity ?? '';
  if (quantity && (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 100)) {
    errors.quantity = 'A quantidade deve ser um número inteiro entre 1 e 100.';
  }
  if (type === 'Marmitas') {
    const pack = mealPacks.find((option) => String(option.size) === values.pack);
    if (!pack) errors.pack = 'Escolhe um pack de marmitas.';
    const counts = menuItems.map((_, index) => values[`flavour_${index + 1}`] ?? '0');
    if (counts.some((count) => !/^\d+$/.test(count) || Number(count) > (pack?.size ?? 40))) {
      errors.flavours = 'Indica uma quantidade válida para cada sabor.';
    } else {
      const numericCounts = counts.map(Number);
      const total = numericCounts.reduce((sum, count) => sum + count, 0);
      if (pack && total !== pack.size) errors.flavours = `O pack de ${pack.size} marmitas tem de incluir exatamente ${pack.size} unidades.`;
      if (pack && pack.size > 5 && Math.max(...numericCounts) < 5) errors.flavours = 'Nos packs maiores, pelo menos cinco marmitas têm de ser do mesmo sabor.';
    }
  }
  if (values.allergies && values.allergies.length > 500) errors.allergies = 'As alergias devem ter até 500 caracteres.';
  if (values.date && (!isISODate(values.date) || values.date < today)) {
    errors.date = 'Escolhe uma data de hoje ou futura.';
  } else if (!values.date) {
    errors.date = 'Indica a data pretendida.';
  }
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = 'Indica um horário válido.';
  else if (!time) errors.time = 'Indica o horário pretendido.';
  if (!fulfilmentTypes.includes(values.fulfilment)) errors.fulfilment = 'Escolhe como preferes receber.';
  if (!address) errors.address = 'Indica a morada de entrega ou o local.';
  if (address.length > 200) errors.address = 'A morada deve ter até 200 caracteres.';
  if (message.length > 1500) errors.message = 'A mensagem deve ter até 1 500 caracteres.';
  if (!values.consent) errors.consent = 'É necessário autorizar o contacto para responder ao pedido.';

  return { values, errors, valid: Object.keys(errors).length === 0 };
}

export { localDateISO };

export function calculatePackTotals(packSize, counts) {
  const pack = mealPacks.find((option) => option.size === Number(packSize));
  if (!pack || counts.length !== menuItems.length || counts.some((count) => !Number.isInteger(Number(count)) || Number(count) < 0)) return null;
  const units = counts.map(Number).reduce((sum, count) => sum + count, 0);
  if (units !== pack.size || (pack.size > 5 && Math.max(...counts.map(Number)) < 5)) return null;
  const subtotalCents = counts.map(Number).reduce((sum, count, index) => sum + count * menuItems[index].price * 100, 0);
  const discountCents = Math.round(subtotalCents * pack.discount / 100);
  const totalCents = subtotalCents - discountCents;
  return { subtotalCents, discountCents, totalCents, depositCents: Math.round(totalCents / 2), discount: pack.discount };
}
