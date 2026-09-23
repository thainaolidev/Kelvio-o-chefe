import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';

const run = promisify(execFile);
const files = ['app.js', 'ui.js', 'config.js', 'server.mjs', 'scripts/build.mjs', 'scripts/lint.mjs', 'lib/env.js', 'lib/order.js', 'lib/order-form.js', 'data/menu.js', 'data/i18n.js', 'data/images.js'];
for (const file of files) await run(process.execPath, ['--check', file]);

const sources = await Promise.all(['app.js', 'ui.js', 'lib/order.js', 'lib/order-form.js', 'data/i18n.js'].map((file) => readFile(file, 'utf8')));
const source = sources.join('\n');
for (const [pattern, message] of [
  [/\beval\s*\(/, 'eval() is not permitted in application code'],
  [/\bnew\s+Function\s*\(/, 'Dynamic function construction is not permitted'],
  [/console\.(?:log|debug|info)\s*\(/, 'Remove nonessential console output'],
  [/href\s*=\s*["']#["']/, 'A link must not use a placeholder target']
]) {
  if (pattern.test(source)) throw new Error(message);
}
console.log(`Static lint passed (${files.length} JavaScript modules checked).`);
