import assert from 'node:assert/strict';
import { openPage } from './browser.mjs';
import { auditLayout, compareImages } from './audit.mjs';

// Intentionally break small fixtures so an accidentally disabled audit cannot pass.
export async function verifyGuards(endpoint) {
  const page = await openPage(endpoint);
  try {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    for (const [name, html, expected] of [
      ['normal', '<button style="position:absolute;left:20px;top:20px;width:100px;height:44px">Normal</button>', null],
      ['overlap', '<button style="position:absolute;left:20px;top:20px;width:100px;height:44px">Um</button><button style="position:absolute;left:40px;top:25px;width:100px;height:44px">Dois</button>', 'Controles sobrepostos'],
      ['cut', '<button style="position:absolute;left:370px;top:20px;width:100px;height:44px">Cortado</button>', 'Controle cortado'],
      ['overflow', '<div style="width:1200px;height:20px">Transbordamento</div>', 'Rolagem horizontal'],
      ['text', '<button style="position:absolute;left:20px;top:20px;width:30px;white-space:nowrap">Texto muito longo</button>', 'Texto do controle transbordando'],
      ['heading', '<h2 style="position:absolute;top:-40px">Título cortado</h2>', 'Conteúdo cortado acima']
    ]) {
      await page.evaluate(`document.body.innerHTML=${JSON.stringify(html)}`);
      const result = await page.evaluate(`(${auditLayout.toString()})()`);
      if (expected) assert.ok(result.issues.some(issue => issue.includes(expected)), `A auditoria não detectou ${name}`);
      else assert.deepEqual(result.issues, [], 'A auditoria rejeitou uma interface válida');
    }
    const sources = await page.evaluate(`(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,100,100);const before=c.toDataURL('image/webp',0.95).split(',')[1];x.fillStyle='red';x.fillRect(10,10,60,60);return {before,after:c.toDataURL('image/webp',0.95).split(',')[1]};})()`);
    const same = await page.evaluate(`(${compareImages.toString()})(${JSON.stringify(sources.before)},${JSON.stringify(sources.before)})`);
    const changed = await page.evaluate(`(${compareImages.toString()})(${JSON.stringify(sources.before)},${JSON.stringify(sources.after)})`);
    assert.equal(same.ratio, 0); assert.ok(changed.ratio > 0.002, 'A comparação não detectou mudança visual');
    console.log('Guardas validadas: sobreposição, corte, rolagem, texto e diferença visual são detectados.');
  } finally { await page.close(); }
}
