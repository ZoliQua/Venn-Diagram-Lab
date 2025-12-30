import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const SVG_DIR = resolve(__dirname, '../../models/svg');
const svgFiles = readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));

const STANDARD_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1',
};

describe('SVG format validation', () => {
  it('has 32 SVG files', () => {
    expect(svgFiles.length).toBe(32);
  });

  for (const file of svgFiles) {
    describe(file, () => {
      const content = readFileSync(resolve(SVG_DIR, file), 'utf-8');

      it('has XML declaration', () => {
        expect(content).toMatch(/^<\?xml/);
      });

      it('has author comment', () => {
        expect(content).toContain('Zoltan Dul');
      });

      it('has Shapes group', () => {
        expect(content).toContain('id="Shapes"');
      });

      it('has Texts group', () => {
        expect(content).toContain('id="Texts"');
      });

      it('has Group_Values', () => {
        expect(content).toContain('id="Group_Values"');
      });

      it('has Group_Names', () => {
        expect(content).toContain('id="Group_Names"');
      });

      it('has correct number of Count elements', () => {
        // Detect N from Shape elements
        const shapeMatches = content.match(/id="Shape[A-H]"/g) ?? [];
        const n = shapeMatches.length;
        const expectedCount = Math.pow(2, n) - 1;
        const countMatches = content.match(/id="Count_[A-H]+"/g) ?? [];
        expect(countMatches.length).toBe(expectedCount);
      });

      it('has standard colors on shapes', () => {
        const shapeRegex = /id="Shape([A-H])"[^>]*fill:\s*([#a-fA-F0-9]+)/g;
        let match;
        while ((match = shapeRegex.exec(content)) !== null) {
          const letter = match[1];
          const color = match[2].toUpperCase();
          const expected = STANDARD_COLORS[letter];
          if (expected) {
            expect(color).toBe(expected);
          }
        }
      });

      it('uses font-family Tahoma without Tahoma,Tahoma', () => {
        expect(content).not.toMatch(/font-family:\s*Tahoma,\s*Tahoma/);
      });

      it('has no px units on font-size', () => {
        expect(content).not.toMatch(/font-size:\d+px/);
      });
    });
  }
});
