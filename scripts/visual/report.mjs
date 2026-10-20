import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export async function writeReport(report, output) {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  for (const overview of [false, true]) {
    const entries = overview ? report.screenshots.filter(entry => ['menu', 'tutorial-05', 'fase-10', 'dijkstra-20', 'vitoria-tesouro', 'vitoria-acoes'].includes(entry.screen)) : report.screenshots;
    const cards = entries.map(entry => `<article><h3>${escape(entry.device)} / ${escape(entry.screen)}</h3><p>${entry.issues.map(escape).join('<br>') || 'OK'}</p><a href="${entry.file}"><img loading="lazy" src="${entry.file}" alt="${escape(entry.screen)}"></a>${entry.changedRatio !== undefined ? `<a href="../baselines/${entry.file}">Referência</a>` : ''} ${entry.changedRatio > 0.002 ? `<a href="${entry.file.replace('.webp', '.diff.png')}">Ver diferenças</a>` : ''}</article>`).join('');
    await writeFile(path.join(output, overview ? 'overview.html' : 'index.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Regressão visual — Tesouro</title><style>body{font:15px system-ui;background:#eef2f6;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}article{background:white;padding:12px;border-radius:8px}img{width:100%;max-height:400px;object-fit:contain}h3{font-size:14px;overflow-wrap:anywhere}p{color:#7c2929}input{padding:12px;width:min(90%,500px);margin:12px 0}</style><h1>${report.passed ? 'Aprovado' : 'Falhou'} — ${report.screenshots.length} capturas / ${report.devices.length} dispositivos</h1><a href="${overview ? 'index.html' : 'overview.html'}">${overview ? 'Todas as capturas' : 'Visão geral'}</a><p>${report.errors.map(error => escape(error.device + ': ' + error.message)).join('<br>')}</p><label>Filtrar por dispositivo ou tela <input type="search" oninput="document.querySelectorAll('article').forEach(e=>e.hidden=!e.textContent.toLowerCase().includes(this.value.toLowerCase()))"></label><main>${cards}</main></html>`);
  }
}
