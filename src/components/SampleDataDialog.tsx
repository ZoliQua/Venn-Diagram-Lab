import { useState } from 'react';

export interface SampleDataset {
  id: string;
  filename: string;
  name: string;
  type: 'real' | 'mock';
  dataFormat: 'binary' | 'aggregated';
  description: string;
  reference?: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'msigdb-cancer',
    filename: 'dataset_real_msigdb_cancer_pathways.tsv',
    name: 'MSigDB Hallmark gene collection - Cancer',
    type: 'real',
    dataFormat: 'binary',
    description: 'Curated cancer-related hallmark gene sets from the Molecular Signatures Database (MSigDB). Includes key oncogenic pathways such as P53, MYC targets, and cell cycle regulation.',
    reference: 'Liberzon A. et al., Cell Syst 2015; 1(6):417-425. DOI: 10.1016/j.cels.2015.12.004',
  },
  {
    id: 'msigdb-immune',
    filename: 'dataset_real_msigdb_immune_pathways.tsv',
    name: 'MSigDB Hallmark gene collection - Immune signaling',
    type: 'real',
    dataFormat: 'binary',
    description: 'Immune signaling hallmark gene sets from MSigDB. Covers interferon response, TNF-alpha signaling, inflammatory response, and complement pathways.',
    reference: 'Liberzon A. et al., Cell Syst 2015; 1(6):417-425. DOI: 10.1016/j.cels.2015.12.004',
  },
  {
    id: 'cancer-drivers',
    filename: 'dataset_real_cancer_drivers_4.tsv',
    name: 'Cancer dataset (COSMIC, OncoKB, IntOGen, Vogelstein)',
    type: 'real',
    dataFormat: 'binary',
    description: 'Cancer driver genes compiled from four major databases: COSMIC Cancer Gene Census, OncoKB, IntOGen, and Vogelstein et al. Useful for cross-database comparison of oncogene and tumor suppressor annotations.',
    reference: 'COSMIC CGC (Sondka et al. 2018); OncoKB (Chakravarty et al. 2017); IntOGen (Martinez-Jimenez et al. 2020); Vogelstein et al. 2013.',
  },
  {
    id: 'mock-pathways',
    filename: 'dataset_mock_gene_sets.csv',
    name: 'Test - Mock data - Pathways',
    type: 'mock',
    dataFormat: 'aggregated',
    description: 'Synthetic gene set data for testing the import and Venn calculation pipeline. Contains mock pathway memberships with controlled overlaps.',
  },
  {
    id: 'mock-streaming',
    filename: 'dataset_mock_streaming_platforms.csv',
    name: 'Test - Mock data - Streaming platforms',
    type: 'mock',
    dataFormat: 'binary',
    description: 'Fictional movie/show availability across streaming platforms. Binary format with controlled overlaps, ideal for quick demos and testing.',
  },
];

interface SampleDataDialogProps {
  isOpen: boolean;
  onSelect: (dataset: SampleDataset) => void;
  onClose: () => void;
}

export function SampleDataDialog({ isOpen, onSelect, onClose }: SampleDataDialogProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!isOpen) return null;

  const realDatasets = SAMPLE_DATASETS.filter(d => d.type === 'real');
  const mockDatasets = SAMPLE_DATASETS.filter(d => d.type === 'mock');

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ minWidth: 480, maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Select Sample Dataset</h3>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)' }}>Choose a dataset to load into the Venn Diagram calculator.</p>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Real datasets</div>
          {realDatasets.map(d => (
            <div
              key={d.id}
              className="sample-dataset-card"
              style={{
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 6,
                border: '1px solid var(--dialog-border)',
                cursor: 'pointer',
                background: hoveredId === d.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(d)}
            >
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 3 }}>
                {d.name}
                <span style={{
                  display: 'inline-block', fontSize: 9, fontWeight: 'bold', padding: '1px 5px',
                  borderRadius: 3, marginLeft: 8, verticalAlign: 'middle', letterSpacing: 0.5,
                  background: d.dataFormat === 'aggregated' ? '#66bb6a' : 'var(--accent)',
                  color: '#fff',
                }}>{d.dataFormat === 'aggregated' ? 'AGGREGATED' : 'BINARY'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{d.description}</div>
              {d.reference && (
                <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 3 }}>Ref: {d.reference}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Test / mock datasets</div>
          {mockDatasets.map(d => (
            <div
              key={d.id}
              className="sample-dataset-card"
              style={{
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 6,
                border: '1px solid var(--dialog-border)',
                cursor: 'pointer',
                background: hoveredId === d.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(d)}
            >
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 3 }}>
                {d.name}
                <span style={{
                  display: 'inline-block', fontSize: 9, fontWeight: 'bold', padding: '1px 5px',
                  borderRadius: 3, marginLeft: 8, verticalAlign: 'middle', letterSpacing: 0.5,
                  background: d.dataFormat === 'aggregated' ? '#66bb6a' : 'var(--accent)',
                  color: '#fff',
                }}>{d.dataFormat === 'aggregated' ? 'AGGREGATED' : 'BINARY'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{d.description}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
