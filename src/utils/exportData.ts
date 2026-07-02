export * from '@venn-diagram-lab/core';
export { generatePythonScript, generateRScript, generateNpmScript, type ScriptExportParams } from './scriptExport.ts';

/** Download a text file. BOM is included by default for Excel UTF-8 compatibility. */
export function downloadFile(content: string, filename: string, mimeType = 'text/tab-separated-values', includeBom = true): void {
  const blob = new Blob([includeBom ? '﻿' + content : content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
