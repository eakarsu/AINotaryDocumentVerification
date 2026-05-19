// === Custom Views Page ===
// Hosts the four custom view components (2 VIZ + 2 NON-VIZ).
import React from 'react';
import VerificationVolumeChart from '../components/VerificationVolumeChart';
import DocTypeStateHeatmap from '../components/DocTypeStateHeatmap';
import NotarizationCertificatePDF from '../components/NotarizationCertificatePDF';
import VerificationRulesEditor from '../components/VerificationRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 24, color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Notary Views</h1>
      <p style={{ color: '#9ca3af', marginBottom: 20 }}>
        Custom operational views for the notary document verification platform: volume trends,
        coverage heatmap, certificate generation, and rules administration.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <VerificationVolumeChart />
        <DocTypeStateHeatmap />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <NotarizationCertificatePDF />
        <VerificationRulesEditor />
      </div>
    </div>
  );
}
