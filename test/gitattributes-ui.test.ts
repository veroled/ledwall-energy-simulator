import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

/*
 * La copia di veroled-ui (src/ui) e la scritta ufficiale (public/brand) si verificano BYTE PER
 * BYTE contro le loro impronte. Su Windows, con core.autocrlf=true, git estrae i file di testo
 * con fine riga CRLF: contenuto identico, impronta diversa, e `npm run verifica-ui` cade su un
 * file che nessuno ha toccato. Successo al CMS il 02/11/2026, al passo 0 del deploy.
 */
describe('.gitattributes: git non converte le righe dei file verificati per impronta', () => {
  const file = path.join(__dirname, '..', '.gitattributes');
  it('src/ui e public/brand sono -text', () => {
    expect(existsSync(file)).toBe(true);
    const righe = readFileSync(file, 'utf8').split('\n').map((r) => r.trim());
    expect(righe).toContain('src/ui/** -text');
    expect(righe).toContain('public/brand/** -text');
  });
});
