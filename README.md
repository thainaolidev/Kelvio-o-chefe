# Kelvio, O Chefe

Static, responsive restaurant and chef website built with native JavaScript and CSS. Public pages are rendered into HTML during the build, then hydrated for the mobile menu, language switcher and order form.

## Fotografias do site

Os assets fotográficos aprovados ficam organizados em `public/assets/chef`, `public/assets/marmitas`, `public/assets/eventos` e `public/assets/encomendas`. Os papéis, caminhos e textos alternativos são definidos centralmente em `data/images.js`. O build copia automaticamente a árvore `public/assets` para `dist/assets`.

## Run locally

```sh
npm run dev
```

The development server prints the local URL. It serves the Portuguese site and its English routes at `/en`, `/en/marmitas-e-servicos`, `/en/o-chefe`, `/en/conteudo` and `/en/fazer-pedido`.

## Build and checks

```sh
npm run lint
npm test
npm run build
```

The production site is written to `dist/`. Configure `PUBLIC_SITE_URL` to generate canonical links, language alternates and the sitemap.

## Order form configuration

The order form posts directly to Web3Forms. Set `WEB3FORMS_ACCESS_KEY` in the local `.env` file for development and as a Vercel environment variable for deployment. This provider access key is used in the browser and is public by design; do not put private credentials in the frontend. The form displays a clear configuration message until a key is set.

The form collects a customer’s contact details and order information and sends those fields to Web3Forms. The website does not retain them in local storage or log them.

## Replacing photography

Image roles and alt text are centralized in `data/images.js`. Replace the corresponding approved image files and update that map when professional photographs are ready. Product information lives in `data/menu.js`; the current generic meal description avoids inventing a menu, price or ingredients. Official social links can be configured with `INSTAGRAM_URL` and `TIKTOK_URL` and are empty until confirmed.

## Project structure

- `ui.js`: reusable page sections and route rendering.
- `data/menu.js`, `data/images.js`, `data/i18n.js`: content, image roles and PT/EN copy.
- `lib/order.js`, `lib/order-form.js`: validation and form behavior.
- `server.mjs`: local development server with allowlisted assets and security headers.
- `scripts/build.mjs`: prerenders PT and EN routes and SEO files.
