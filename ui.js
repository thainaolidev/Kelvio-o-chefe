import { menuItems } from './data/menu.js';
import { contactEmail, socialLinks } from './config.js';
import { calculatePackTotals, localDateISO, orderTypes } from './lib/order.js';
import { pageCopy, translateMarkup } from './data/i18n.js';
import { siteImages } from './data/images.js';
import { mealPacks } from './data/menu.js';

const internalLinks = [
  ['Marmitas & serviços', '/marmitas-e-servicos'],
  ['O Chefe', '/o-chefe'],
  ['Conteúdo', '/conteudo']
];
let activeLanguage = 'pt';

function localizedPath(path) {
  if (activeLanguage !== 'en') return path;
  const [route, query = ''] = path.split('?');
  const localized = route === '/' ? '/en' : `/en${route}`;
  return query ? `${localized}?${query}` : localized;
}

function link(href, label, className = '') {
  if (href.startsWith('/')) href = localizedPath(href);
  const external = /^https:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="${className}" href="${href}"${external}>${label}</a>`;
}

function button(href, label, className = 'button') {
  return link(href, `${label}<span aria-hidden="true"> ↗</span>`, className);
}

function logo(className = '') {
  return `<a class="brand ${className}" href="${localizedPath('/')}" aria-label="Kelvio, O Chefe — início"><img src="/images/logo-wordmark.png" width="420" height="130" alt="Kelvio, O Chefe"></a>`;
}

function header(pathname, language = 'pt') {
  const navLinks = internalLinks.map(([label, href]) => `<a href="${localizedPath(href)}"${href === pathname ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<a class="skip-link" href="#main-content">Saltar para o conteúdo</a><header class="header"><div class="nav-wrap">${logo()}<button class="menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="primary-navigation"><span aria-hidden="true">☰</span></button><nav class="nav" id="primary-navigation" aria-label="Navegação principal">${navLinks}<div class="language-switch" role="group" aria-label="Language / Idioma"><button type="button" data-language="pt" aria-pressed="${language === 'pt'}">PT</button><span aria-hidden="true">|</span><button type="button" data-language="en" aria-pressed="${language === 'en'}">EN</button></div>${button('/fazer-pedido', 'Pedir agora', 'button button-small')}</nav></div></header>`;
}

function footer() {
  const socials = [socialLinks.instagram && link(socialLinks.instagram, 'Instagram'), socialLinks.tiktok && link(socialLinks.tiktok, 'TikTok'), socialLinks.youtube && link(socialLinks.youtube, 'YouTube')].filter(Boolean).join('');
  const footerLinks = [...internalLinks, ['Fazer pedido', '/fazer-pedido']].map(([label, href]) => link(href, label)).join('');
  return `<footer class="footer"><div class="footer-top">${logo()}<p>Comida. Personalidade.<br>Profissionalismo.</p>${button('/fazer-pedido', 'Fazer um pedido', 'text-link')}</div><nav class="footer-links" aria-label="Navegação do rodapé">${footerLinks}${link(`mailto:${contactEmail}`, 'Email')}</nav><div class="footer-bottom"><span>© ${new Date().getFullYear()} Kelvio, O Chefe</span><span>Como deve ser.</span><div>${socials}</div></div></footer>${link('/fazer-pedido', 'Pedir agora <span aria-hidden="true">↗</span>', 'mobile-cta')}`;
}

function image(src, alt, className = '', loading = 'lazy') {
  const priority = loading === 'eager' ? ' fetchpriority="high"' : '';
  const dimensions = src.includes('/assets/eventos/') || src.includes('/assets/encomendas/') ? 'width="1145" height="1374"' : src.includes('/assets/') ? 'width="1024" height="1536"' : src.includes('chef-portrait') ? 'width="215" height="270"' : 'width="225" height="188"';
  return `<img class="${className}" src="${src}" alt="${alt}" ${dimensions} loading="${loading}" decoding="async"${priority}>`;
}

function productCard(item, index) {
  const price = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(item.price);
  return `<article class="product"><div class="product-image">${image(item.image, 'Marmitas do Chef em caixas individuais', '', 'lazy')}<span class="index" aria-hidden="true">0${index + 1}</span></div><div class="product-info"><div><p class="eyebrow">SABOR DISPONÍVEL EM PACK</p><h3>${item.name}</h3><p>Indica quantas queres deste sabor ao montar o teu pack.</p></div><div class="product-bottom"><span>${price} <small>por marmita no pack</small></span>${link(`/fazer-pedido?tipo=Marmitas&sabor=${index + 1}`, 'Montar um pack ↗', 'text-link')}</div><small>Só disponível em packs</small></div></article>`;
}

const services = [
  ['Marmitas', 'Comida de Chef para os dias em que queres comer bem.', siteImages.meals],
  ['Encomendas', 'Diz para quantos. O Chefe trata da comida.', siteImages.customOrders],
  ['Eventos', 'Tu tratas do momento. O Chefe trata da comida.', siteImages.events],
  ['Catering', 'O teu evento. A comida fica com o Chefe.', siteImages.catering]
];

function serviceCard([name, description, photo], index) {
  const type = { Marmitas: 'Marmitas', Encomendas: 'Encomenda', Eventos: 'Evento', Catering: 'Catering' }[name];
  const cta = { Marmitas: 'Ver marmitas', Encomendas: 'Pedir encomenda', Eventos: 'Falar de um evento', Catering: 'Pedir orçamento' }[name];
  return `<article class="category"><a class="category-main" href="${localizedPath('/marmitas-e-servicos')}"><div class="category-image service-image-${index + 1}">${image(photo.src, photo.alt)}<span aria-hidden="true">0${index + 1}</span></div><h3>${name}</h3><p>${description}</p></a>${link(`/fazer-pedido?tipo=${encodeURIComponent(type)}`, `${cta} ↗`, 'text-link')}</article>`;
}

function home() {
  return `<main><section class="hero"><div class="hero-copy"><p class="eyebrow">KELVIO, O CHEFE <span>·</span> COMO DEVE SER.</p><h1>À mesa,<br><em>como deve ser.</em></h1><p class="lead">Marmitas, encomendas, eventos e catering para quem gosta de comer bem.</p><div class="actions">${button('/fazer-pedido', 'Pedir agora')}${button('/marmitas-e-servicos', 'Ver o que há para comer', 'button button-outline')}</div><p class="hero-note">MARMITAS <i>·</i> ENCOMENDAS <i>·</i> EVENTOS</p></div><div class="hero-photo">${image(siteImages.hero.src, siteImages.hero.alt, 'hero-board', 'eager')}<span>COZINHA DE VERDADE. SABOR COM HISTÓRIA.</span></div></section><section class="section categories-section"><div class="section-heading"><div><p class="eyebrow">PARA A TUA MESA</p><h2>O que te apetece<br><em>hoje?</em></h2></div>${link('/marmitas-e-servicos', 'Explorar serviços ↗', 'text-link')}</div><div class="category-grid">${services.map(serviceCard).join('')}</div></section><section class="feature"><div class="feature-image">${image(siteImages.feature.src, siteImages.feature.alt)}</div><div class="feature-copy"><p class="eyebrow">MARMITAS DO CHEFE</p><h2>Comer bem durante a semana<br><em>sem complicar.</em></h2><p>Marmitas para quando o dia pede praticidade e a refeição continua a merecer atenção.</p>${button('/fazer-pedido?tipo=Marmitas', 'Pedir marmitas', 'button button-outline')}</div></section><section class="manifesto"><p class="eyebrow">KELVIO, O CHEFE</p><h2>Comida.<br><em>Como deve ser.</em></h2><p>Marmitas, encomendas, eventos e catering. Tu escolhes a ocasião; o Chefe trata da comida.</p>${link('/o-chefe', 'Conhecer o Chef ↗', 'text-link')}</section><section class="closing"><div><p class="eyebrow">JÁ SABES O QUE TE APETECE?</p><h2>Está na hora<br><em>de comer bem.</em></h2></div>${button('/fazer-pedido', 'Pedir agora')}</section></main>`;
}

function servicesPage() {
  return `<main class="inner"><section class="page-intro"><p class="eyebrow">MARMITAS · ENCOMENDAS · EVENTOS · CATERING</p><h1>Boa comida,<br><em>à tua maneira.</em></h1><p class="lead">Para o dia a dia, para partilhar, ou para pôr mais gente à mesa.</p>${button('/fazer-pedido', 'Fazer um pedido')}</section><section class="section"><div class="category-grid">${services.map(serviceCard).join('')}</div></section><section class="section menu-preview"><div class="section-heading"><div><p class="eyebrow">SABORES DO CHEFE</p><h2>Marmitas<br><em>em pack.</em></h2></div><p>Escolhe o tamanho do pack, distribui os sabores e vê logo o total e o sinal de 50%.</p></div><div class="products">${menuItems.map(productCard).join('')}</div><p class="note">Marmitas disponíveis apenas em packs de 5, 10, 20, 30 ou 40 unidades. O desconto depende do tamanho do pack.</p></section><section class="closing"><div><p class="eyebrow">ENCOMENDAS · EVENTOS · CATERING</p><h2>Tens uma ideia?<br><em>Conta-nos.</em></h2></div>${button('/fazer-pedido', 'Pedir agora')}</section></main>`;
}

function chefPage() {
  return `<main class="inner"><section class="chef-page"><div class="chef-photo">${image(siteImages.chef.src, siteImages.chef.alt, '', 'eager')}</div><div class="chef-copy"><p class="eyebrow">O CHEFE POR TRÁS DA COMIDA</p><h1>Kelvio,<br><em>O Chefe.</em></h1><p class="lead">Por trás do prato, está o Chefe.</p><p>A comida fala primeiro. Aqui encontras marmitas, encomendas e comida para eventos — feita para quem gosta de comer bem.</p><p>Sem complicar. Como deve ser.</p>${button('/marmitas-e-servicos', 'Descobrir a comida', 'button button-outline')}</div></section><section class="manifesto"><p class="eyebrow">A IDEIA É SIMPLES</p><h2>Comida bem feita,<br><em>sem complicar.</em></h2>${button('/fazer-pedido', 'Pedir agora')}</section></main>`;
}

function contentPage() {
  const instagram = socialLinks.instagram || 'https://instagram.com/kelvio.antunes';
  const editorialCards = [
    ['MARMITAS DO CHEFE', siteImages.meals, 'editorial-card-food'],
    ['POR TRÁS DO PRATO', siteImages.chef, 'editorial-card-chef']
  ].map(([label, photo, className]) => `<a class="editorial-card ${className}" href="${instagram}" target="_blank" rel="noopener noreferrer"><div class="editorial-card-image">${image(photo.src, photo.alt)}<span class="editorial-card-shade" aria-hidden="true"></span></div><span class="editorial-card-label">${label}<span aria-hidden="true"> ↗</span></span></a>`).join('');
  return `<main class="inner"><section class="page-intro"><p class="eyebrow">DO ECRÃ À TUA MESA</p><h1>Da tua For You<br><em>para a tua mesa.</em></h1><p class="lead">Viste o Kelvio no feed. Agora podes conhecer o que acontece fora dele.</p></section><section class="editorial-section"><div class="section-heading"><div><p class="eyebrow">KELVIO, A COMIDA, A COZINHA</p><h2>Mais do que<br><em>um feed.</em></h2></div><p class="editorial-intro">Um olhar sobre a comida e o homem por trás dela.</p></div><div class="editorial-grid">${editorialCards}</div>${link(instagram, 'Ver no Instagram ↗', 'text-link editorial-link')}</section><section class="social-follow"><div class="social-panel"><p class="eyebrow">ACOMPANHA O CHEFE</p><h2>Mais comida.<br><em>Mais Kelvio.</em></h2><p>Segue o Kelvio, acompanha a cozinha e guarda espaço para provar.</p>${socialLinks.instagram ? link(socialLinks.instagram, 'Instagram · 32,8 M ↗', 'text-link') : ''}${socialLinks.tiktok ? link(socialLinks.tiktok, 'TikTok · 48,5 mil ↗', 'text-link') : ''}${socialLinks.youtube ? link(socialLinks.youtube, 'YouTube ↗', 'text-link') : ''}${link('https://www.rtp.pt/play/p16229/e922152/bem-vindos', 'Ver participação no RTP Play ↗', 'text-link')}</div></section><section class="closing"><div><p class="eyebrow">QUERES LEVAR O SABOR CONTIGO?</p><h2>Vamos fazer<br><em>um pedido.</em></h2></div>${button('/fazer-pedido', 'Pedir agora')}</section></main>`;
}

function field(name, label, control, required = false) {
  const requiredMark = required ? ' <span class="required-mark" aria-hidden="true">*</span>' : '';
  return `<label class="form-field">${label}${requiredMark}${control}<small class="field-error" id="${name}-error" hidden></small></label>`;
}

function orderPage(selectedType = '', selectedFlavor = '') {
  const resolvedType = orderTypes.includes(selectedType) ? selectedType : '';
  const typeOptions = orderTypes.map((type) => `<option value="${type}"${resolvedType === type ? ' selected' : ''}>${type}</option>`).join('');
  const packOptions = mealPacks.map((pack) => `<option value="${pack.size}">Pack ${pack.size} marmitas — ${pack.discount}% de desconto</option>`).join('');
  const flavorFields = menuItems.map((item, index) => `<label class="flavour-option"><span>${item.name}<small>${item.price} € / marmita</small></span><input name="flavour_${index + 1}" type="number" min="0" max="40" step="1" value="${selectedFlavor === String(index + 1) ? '1' : '0'}" inputmode="numeric" aria-label="Quantidade de ${item.name}" aria-describedby="flavours-error"></label>`).join('');
  return `<main class="inner"><section class="order-layout"><div class="order-intro"><p class="eyebrow">MARMITAS · ENCOMENDAS · EVENTOS</p><h1>Vamos fazer<br><em>o teu pedido.</em></h1><p>Diz-nos o que queres e quando. O Chefe entra em contacto para confirmar os detalhes.</p><p class="order-email">Preferes falar por email? <a href="mailto:${contactEmail}">${contactEmail}</a></p></div><form class="order-form" id="order-form" novalidate enctype="multipart/form-data"><div class="honeypot" aria-hidden="true"><label>Deixa este campo vazio<input name="botcheck" tabindex="-1" autocomplete="off"></label></div><ol class="form-progress full" aria-label="Etapas do pedido"><li data-step-indicator="1" aria-current="step">1 <span>Os teus dados</span></li><li data-step-indicator="2">2 <span>O que queres</span></li><li data-step-indicator="3">3 <span>Quando e onde</span></li><li data-step-indicator="4">4 <span>Pagamento</span></li></ol><section class="form-step full" data-form-step="1" aria-labelledby="step-1-title"><h2 class="form-intro full" id="step-1-title">1 · Os teus dados</h2>${field('name', 'O teu nome', '<input id="name" name="name" autocomplete="name" minlength="2" maxlength="80" required aria-describedby="name-error" placeholder="Como te chamamos?">', true)}${field('phone', 'WhatsApp', '<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" pattern="[+()0-9 .-]{7,25}" required aria-describedby="phone-error" placeholder="O teu contacto">', true)}${field('email', 'O teu email', '<input id="email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="email-error" placeholder="nome@email.com">', true)}<button class="button full" type="button" data-next-step>Continuar para o pedido <span aria-hidden="true">↗</span></button></section><section class="form-step full" data-form-step="2" aria-labelledby="step-2-title" hidden><h2 class="form-intro full" id="step-2-title">2 · O que queres?</h2>${field('type', 'O que procuras?', `<select id="type" name="type" required aria-describedby="type-error"><option value="">Escolhe uma opção</option>${typeOptions}</select>`, true)}<div id="meal-fields" class="full meal-fields" hidden><p class="form-help">Marmitas disponíveis apenas em packs — sem unidades individuais.</p>${field('pack', 'Escolhe o teu pack', `<select id="pack" name="pack" aria-describedby="pack-error"><option value="">Escolhe o tamanho do pack</option>${packOptions}</select>`, true)}<fieldset class="flavour-fieldset" id="flavours-fields" aria-describedby="flavours-error"><legend>Escolhe os sabores e as quantidades</legend><p class="form-help">No pack de 5, podes escolher um só sabor ou misturar. Nos packs maiores, pelo menos 5 marmitas têm de ser do mesmo sabor; as restantes podem ser diferentes.</p><div class="flavour-list">${flavorFields}</div><small class="field-error" id="flavours-error" hidden></small></fieldset><p id="pack-progress" class="form-help full" role="status" aria-live="polite"></p>${field('allergies', 'Alergias ou intolerâncias <span class="optional">(opcional)</span>', '<textarea id="allergies" name="allergies" rows="2" maxlength="500" aria-describedby="allergies-error" placeholder="Indica se tens alguma alergia ou intolerância alimentar."></textarea>')}</div>${field('quantity', 'Número de pessoas / unidades <span class="optional">(se aplicável)</span>', '<input id="quantity" name="quantity" type="number" inputmode="numeric" min="1" max="100" step="1" aria-describedby="quantity-error">')}${field('message', 'Observações <span class="optional">(opcional)</span>', '<textarea id="message" name="message" rows="3" maxlength="1500" aria-describedby="message-error" placeholder="Algum detalhe importante para o teu pedido…"></textarea>')}<div class="step-actions full"><button class="button button-outline" type="button" data-previous-step>Voltar</button><button class="button" type="button" data-next-step>Continuar para data e local <span aria-hidden="true">↗</span></button></div></section><section class="form-step full" data-form-step="3" aria-labelledby="step-3-title" hidden><h2 class="form-intro full" id="step-3-title">3 · Quando e onde?</h2>${field('date', 'Data pretendida', `<input id="date" name="date" type="date" min="${localDateISO()}" required aria-describedby="date-error">`, true)}${field('time', 'Horário pretendido', '<input id="time" name="time" type="time" required aria-describedby="time-error">', true)}${field('fulfilment', 'Como preferes receber?', '<select id="fulfilment" name="fulfilment" required aria-describedby="fulfilment-error"><option value="">Escolhe uma opção</option><option value="Entrega">Entrega</option><option value="Recolha">Recolha</option><option value="A combinar">A combinar</option></select>', true)}${field('address', 'Morada de entrega, local de recolha ou evento', '<input id="address" name="address" autocomplete="street-address" maxlength="200" required aria-describedby="address-error" placeholder="Morada, código-postal e localidade">', true)}<div class="step-actions full"><button class="button button-outline" type="button" data-previous-step>Voltar</button><button class="button" type="button" data-next-step>Continuar para pagamento <span aria-hidden="true">↗</span></button></div></section><section class="form-step full" data-form-step="4" aria-labelledby="step-4-title" hidden><h2 class="form-intro full" id="step-4-title">4 · Pagamento</h2><section id="payment-fields" class="payment-panel full" hidden aria-labelledby="payment-title"><p class="eyebrow">SINAL DE 50%</p><h3 id="payment-title">Reserva o teu pack</h3><p>Para confirmar o pedido, transfere 50% do total abaixo e anexa o comprovativo. O Chefe entra em contacto para acertar os detalhes. Se o pedido não avançar por uma questão da marca, o valor pago será devolvido.</p><dl class="payment-totals"><div><dt>Total antes do desconto</dt><dd id="subtotal-value">—</dd></div><div><dt>Desconto do pack</dt><dd id="discount-value">—</dd></div><div class="payment-total"><dt>Total do pack</dt><dd id="total-value">—</dd></div><div class="payment-deposit"><dt>Sinal de 50% a pagar agora</dt><dd id="deposit-value">—</dd></div></dl><div class="bank-details"><h3>Transferência bancária</h3><p><strong>Beneficiário</strong><br>KELVIO SALBANY ANTUNES JANUARIO</p><p><strong>IBAN</strong><br><span class="iban">PT50 0035 0726 00695582630 18</span></p><p><strong>Conta</strong><br>0726695582630</p><p><strong>BIC / SWIFT</strong><br>CGDIPTPL</p></div>${field('attachment', 'Comprovativo de pagamento', '<input id="attachment" name="attachment" type="file" accept="image/*,application/pdf" required aria-describedby="attachment-hint attachment-error"><small id="attachment-hint" class="form-help">JPG, PNG ou PDF · até 5 MB</small>', true)}</section><p id="quote-payment" class="form-help full" hidden>Pedido sem pack de marmitas: envia os teus dados e o Chefe entra em contacto para acertar o orçamento e o sinal.</p><label class="consent full"><input id="consent" type="checkbox" name="consent" required aria-describedby="consent-error"><span>Autorizo o contacto para responder a este pedido.<small class="field-error" id="consent-error" hidden></small></span></label><div class="step-actions full"><button class="button button-outline" type="button" data-previous-step>Voltar</button><button class="button" type="submit">Enviar pedido <span aria-hidden="true">↗</span></button></div><p class="form-status full" role="status" aria-live="polite"></p></section></form></section></main>`;
}

function notFound() {
  return `<main class="not-found"><p class="eyebrow">KELVIO, O CHEFE</p><h1>Esta página<br><em>não está no menu.</em></h1><p>O endereço pode ter mudado. A mesa continua posta na página inicial.</p>${button('/', 'Voltar ao início')}</main>`;
}

const pages = {
  '/': { render: home, title: 'Kelvio, O Chefe — Como deve ser.', description: 'Marmitas, encomendas, eventos e catering para quem gosta de comer bem.' },
  '/marmitas-e-servicos': { render: servicesPage, title: 'Marmitas & serviços — Kelvio, O Chefe', description: 'Descobre marmitas, encomendas, eventos e catering do Kelvio, O Chefe.' },
  '/o-chefe': { render: chefPage, title: 'O Chefe — Kelvio, O Chefe', description: 'Conhece Kelvio, o Chef por trás da comida.' },
  '/conteudo': { render: contentPage, title: 'Conteúdo — Kelvio, O Chefe', description: 'Acompanha o trabalho do Chef e descobre o que acontece à mesa.' },
  '/fazer-pedido': { render: orderPage, title: 'Fazer pedido — Kelvio, O Chefe', description: 'Conta-nos o que procuras e pede uma marmita, encomenda, evento ou catering.' }
};

export function renderSite(pathname, search = '', language = '') {
  const routeLanguage = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'pt';
  pathname = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  language = language || routeLanguage;
  activeLanguage = language;
  const page = pages[pathname];
  if (!page) {
    const html = `${header(pathname, language)}${notFound()}${footer()}`.replace('<main', '<main id="main-content"');
    return { html: language === 'en' ? translateMarkup(html) : html, title: language === 'en' ? 'Page not found — Kelvio, O Chefe' : 'Página não encontrada — Kelvio, O Chefe', description: language === 'en' ? 'This page is not on the menu.' : 'Esta página não está no menu.', notFound: true };
  }
  const params = new URLSearchParams(search);
  const content = pathname === '/fazer-pedido' ? orderPage(params.get('tipo') ?? '', params.get('sabor') ?? '') : page.render();
  const html = `${header(pathname, language)}${content}${footer()}`.replace('<main', '<main id="main-content"');
  const [title, description] = language === 'en' ? pageCopy[pathname] : [page.title, page.description];
  return { html: language === 'en' ? translateMarkup(html) : html, title, description, notFound: false };
}
