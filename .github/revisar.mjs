// Revisión antes de publicar: cada archivo que piden las páginas existe, no hay archivos internos ni llaves, y nada pesa de más.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const FUERA = new Set(['.git', '.github', 'node_modules']);
const PERMITIDOS = new Set(['.html', '.js', '.css', '.json', '.svg', '.png', '.woff2', '.mp3', '.webm', '']);
const TOPE = 2 * 1024 * 1024;
const errores = [];

const archivos = [];
const recorrer = dir => {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (FUERA.has(n.name)) continue;
    const p = path.join(dir, n.name);
    n.isDirectory() ? recorrer(p) : archivos.push(p);
  }
};
recorrer(RAIZ);

for (const f of archivos) {
  const rel = path.relative(RAIZ, f).replaceAll('\\', '/');
  if (rel === 'README.md') continue;
  if (!PERMITIDOS.has(path.extname(f))) errores.push(`tipo de archivo que no es del sitio: ${rel}`);
  if (/\.map$|\.env|\.pem$|\.key$/.test(rel)) errores.push(`archivo sensible: ${rel}`);
  if (fs.statSync(f).size > TOPE) errores.push(`pesa más de 2 MB: ${rel}`);
  if (/\.(html|js|css|json)$/.test(f) && /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(fs.readFileSync(f, 'utf8'))) errores.push(`llave privada en ${rel}`);
}

// Cada href o src local de las páginas apunta a un archivo que existe
for (const f of archivos.filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const [, ruta] of html.matchAll(/\s(?:href|src)="([^"#?]+)/g)) {
    if (/^(https?:|mailto:|tel:|data:|\/\/|javascript:)/.test(ruta) || ruta.endsWith('/')) continue;
    if (!fs.existsSync(path.resolve(path.dirname(f), ruta))) errores.push(`${path.relative(RAIZ, f)} pide ${ruta}, que no existe`);
  }
}

console.log(`${archivos.length} archivos revisados`);
if (errores.length) { console.error('No se publica:\n  ' + errores.join('\n  ')); process.exit(1); }
console.log('Todo en orden.');
