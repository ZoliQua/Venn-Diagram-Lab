import { useState, useCallback } from 'react';
import type { GeneSetFormat } from '../utils/csvParser.ts';
import { detectGeneSetFormat } from '../utils/csvParser.ts';

interface UrlImportDialogProps {
  isOpen: boolean;
  onLoad: (rawText: string, filename: string, geneSetFormat?: GeneSetFormat) => void;
  onCancel: () => void;
}

const ALLOWED_EXT = ['.csv', '.tsv', '.txt', '.gmt', '.gmx', '.tab'];

interface ValidationStep {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'pending' | 'idle';
  detail?: string;
}

export function UrlImportDialog({ isOpen, onLoad, onCancel }: UrlImportDialogProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [fetchedText, setFetchedText] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ lines: number; bytes: number; detectedType: string } | null>(null);
  const [previewLines, setPreviewLines] = useState<string[]>([]);
  const [steps, setSteps] = useState<ValidationStep[]>([]);

  const updateStep = (index: number, update: Partial<ValidationStep>) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  };

  const handleFetch = useCallback(async () => {
    setFetchedText(null);
    setFileInfo(null);
    setPreviewLines([]);

    const initialSteps: ValidationStep[] = [
      { label: 'URL format', status: 'pending' },
      { label: 'Protocol', status: 'idle' },
      { label: 'File extension', status: 'idle' },
      { label: 'Fetching', status: 'idle' },
      { label: 'Content validation', status: 'idle' },
    ];
    setSteps(initialSteps);

    // 1. URL format
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      initialSteps[0] = { label: 'URL format valid', status: 'ok' };
    } catch {
      initialSteps[0] = { label: 'Invalid URL format', status: 'error', detail: 'Must start with http:// or https://' };
      setSteps([...initialSteps]);
      setStatus('error');
      return;
    }

    // 2. Protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      initialSteps[1] = { label: 'Unsupported protocol', status: 'error', detail: 'Only HTTP and HTTPS are supported' };
      setSteps([...initialSteps]);
      setStatus('error');
      return;
    }
    initialSteps[1] = { label: `${parsed.protocol.replace(':', '').toUpperCase()} protocol`, status: 'ok' };

    // 3. Extension
    const pathParts = parsed.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1] || 'data.txt';
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop()!.toLowerCase() : '';
    const knownExt = ALLOWED_EXT.includes(ext);
    initialSteps[2] = knownExt
      ? { label: `Known extension (${ext})`, status: 'ok' }
      : { label: `Unknown extension (${ext || 'none'})`, status: 'warn', detail: 'May still work' };

    // 4. Fetch
    initialSteps[3] = { label: 'Fetching...', status: 'pending' };
    setSteps([...initialSteps]);
    setStatus('fetching');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url.trim(), { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        initialSteps[3] = { label: `HTTP ${response.status}`, status: 'error', detail: response.statusText };
        setSteps([...initialSteps]);
        setStatus('error');
        return;
      }

      const text = await response.text();
      const bytes = new Blob([text]).size;

      if (bytes > 50 * 1024 * 1024) {
        initialSteps[3] = { label: 'File too large', status: 'error', detail: `${(bytes / 1024 / 1024).toFixed(1)} MB (max 50 MB)` };
        setSteps([...initialSteps]);
        setStatus('error');
        return;
      }

      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        initialSteps[3] = { label: 'Fetched', status: 'ok' };
        initialSteps[4] = { label: 'Too few lines', status: 'error', detail: `${lines.length} line(s) — need at least 2` };
        setSteps([...initialSteps]);
        setStatus('error');
        return;
      }

      const sizeLabel = bytes > 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${(bytes / 1024).toFixed(0)} KB`;
      initialSteps[3] = { label: `Fetched: ${lines.length.toLocaleString()} lines, ${sizeLabel}`, status: 'ok' };

      // 5. Detect format
      const firstLine = lines[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const detectedType = tabCount > commaCount ? 'TSV' : commaCount > 0 ? 'CSV' : 'Text';
      initialSteps[4] = { label: `Detected format: ${detectedType}`, status: 'ok' };

      setSteps([...initialSteps]);
      setFetchedText(text);
      setFileInfo({ lines: lines.length, bytes, detectedType });
      setPreviewLines(lines.slice(0, 5));
      setStatus('success');

    } catch (err: unknown) {
      let detail: string;
      if (err instanceof DOMException && err.name === 'AbortError') {
        detail = 'Request timed out (30s). Server may be slow or unreachable.';
      } else if (err instanceof TypeError && String(err).includes('fetch')) {
        detail = 'Network error — the server may not allow cross-origin requests (CORS). Try downloading the file manually.';
      } else {
        detail = String(err);
      }
      initialSteps[3] = { label: 'Fetch failed', status: 'error', detail };
      setSteps([...initialSteps]);
      setStatus('error');
    }
  }, [url]);

  const handleImport = useCallback(() => {
    if (!fetchedText) return;
    const urlObj = new URL(url.trim());
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1] || 'url-data.txt';
    const geneSetFormat = detectGeneSetFormat(filename);
    onLoad(fetchedText, filename, geneSetFormat ?? undefined);
  }, [fetchedText, url, onLoad]);

  if (!isOpen) return null;

  const statusIcon = (s: ValidationStep['status']) => {
    switch (s) {
      case 'ok': return '\u2713';
      case 'warn': return '\u26a0';
      case 'error': return '\u2717';
      case 'pending': return '\u21bb';
      default: return '\u00b7';
    }
  };
  const statusColor = (s: ValidationStep['status']) => {
    switch (s) {
      case 'ok': return '#6a8';
      case 'warn': return '#da6';
      case 'error': return '#e55';
      case 'pending': return '#88c';
      default: return '#666';
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        onClick={e => e.stopPropagation()}
        style={{ minWidth: 500, maxWidth: 600, maxHeight: '85vh', overflow: 'auto', padding: 20 }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Load Data from URL</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#888' }}>
          Enter a direct link to a CSV, TSV, GMT, or GMX file.
        </p>

        {/* URL input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setStatus('idle'); setSteps([]); }}
            placeholder="https://example.com/data.tsv"
            style={{
              flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 4,
              border: '1px solid #555', background: '#2a2a3a', color: '#ddd',
              fontFamily: 'monospace',
            }}
            onKeyDown={e => { if (e.key === 'Enter' && url.trim()) handleFetch(); }}
          />
          <button
            className="btn btn-accent"
            onClick={handleFetch}
            disabled={!url.trim() || status === 'fetching'}
          >
            {status === 'fetching' ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        {/* Validation steps */}
        {steps.length > 0 && (
          <div style={{
            marginBottom: 12, padding: '8px 10px', borderRadius: 6,
            border: '1px solid #3a3a4a', background: '#1e1e2e',
          }}>
            {steps.map((step, i) => (
              step.status !== 'idle' && (
                <div key={i} style={{ fontSize: 11, marginBottom: 2, display: 'flex', gap: 6 }}>
                  <span style={{ color: statusColor(step.status), minWidth: 12 }}>{statusIcon(step.status)}</span>
                  <span style={{ color: '#ccc' }}>{step.label}</span>
                  {step.detail && <span style={{ color: '#888' }}>— {step.detail}</span>}
                </div>
              )
            ))}
          </div>
        )}

        {/* Preview */}
        {previewLines.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Preview (first 5 lines):</div>
            <div style={{
              padding: 8, borderRadius: 4, border: '1px solid #3a3a4a',
              background: '#1a1a2a', fontFamily: 'monospace', fontSize: 10,
              overflow: 'auto', maxHeight: 120, whiteSpace: 'pre', color: '#bbb',
            }}>
              {previewLines.map((line, i) => (
                <div key={i} style={{ color: i === 0 ? '#8af' : '#bbb' }}>
                  {line.length > 120 ? line.slice(0, 120) + '...' : line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-accent"
            onClick={handleImport}
            disabled={status !== 'success'}
          >
            Import{fileInfo ? ` (${fileInfo.lines.toLocaleString()} lines)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
