import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const I18N_DIR = join(__dirname);
const FILES = ['en.json', 'fr.json'];

// UTF-8 double-encoding signature: © (U+00A9, UTF-8: 0xC2 0xA9) read as Latin-1
// produces "Â©". Any occurrence in an i18n file means the file was written with
// wrong encoding (the Write tool reading UTF-8 as Latin-1 then re-encoding).
const MOJIBAKE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /Â©/, description: 'Â© (mojibake of ©)' },
  { pattern: /Ã©/, description: 'Ã© (mojibake of é)' },
  { pattern: /Ã¨/, description: 'Ã¨ (mojibake of è)' },
  { pattern: /Ã /, description: 'Ã  (mojibake of à)' },
  { pattern: /Ãê/, description: 'Ãê (mojibake of ê)' },
  { pattern: /Ã®/, description: 'Ã® (mojibake of î)' },
  { pattern: /Ã´/, description: 'Ã´ (mojibake of ô)' },
  { pattern: /Ã»/, description: 'Ã» (mojibake of û)' },
  { pattern: /Ã¹/, description: 'Ã¹ (mojibake of ù)' },
  { pattern: /Ã§/, description: 'Ã§ (mojibake of ç)' },
];

describe('i18n encoding integrity', () => {
  for (const file of FILES) {
    const content = readFileSync(join(I18N_DIR, file), 'utf-8');

    it(`${file} is valid UTF-8 JSON`, () => {
      expect(() => JSON.parse(content)).not.toThrow();
    });

    for (const { pattern, description } of MOJIBAKE_PATTERNS) {
      it(`${file} contains no mojibake: ${description}`, () => {
        const matches = content.match(new RegExp(pattern.source, 'g'));
        expect(
          matches,
          `Found UTF-8 double-encoding in ${file}: "${description}" appears ${matches?.length ?? 0} time(s). ` +
          `Root cause: file was rewritten with wrong encoding. Fix with Edit tool, not Write.`
        ).toBeNull();
      });
    }
  }
});
