// === Custom View component: NotarizationCertificatePDF ===
// Lets the user enter a notarization ID and download/preview a PDF certificate.
import React, { useState } from 'react';
import api from '../api/axios';

export default function NotarizationCertificatePDF() {
  const [id, setId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [meta, setMeta] = useState(null);

  const fetchCert = async () => {
    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setMeta(null);
    try {
      const res = await api.get(`/custom-views/notarization-certificate/${id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setMeta({ size: blob.size, type: blob.type });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#111827', padding: 16, borderRadius: 8, color: '#e5e7eb' }}>
      <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Notarization Certificate (PDF)</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#9ca3af' }}>Notarization ID:</label>
        <input
          type="number"
          value={id}
          min="1"
          onChange={(e) => setId(e.target.value)}
          style={{ width: 90, background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, padding: '4px 6px' }}
        />
        <button
          onClick={fetchCert}
          disabled={loading || !id}
          style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontWeight: 600 }}
        >
          {loading ? 'Generating…' : 'Generate PDF'}
        </button>
        {blobUrl && (
          <a
            href={blobUrl}
            download={`notarization-${id}.pdf`}
            style={{ color: '#10b981', fontSize: 13, textDecoration: 'underline' }}
          >
            Download
          </a>
        )}
      </div>
      {error && <p style={{ color: '#fecaca' }}>Error: {error}</p>}
      {meta && (
        <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>
          {meta.type} · {meta.size.toLocaleString()} bytes
        </p>
      )}
      {blobUrl && (
        <iframe
          title="notarization-certificate"
          src={blobUrl}
          style={{ width: '100%', height: 420, background: '#fff', border: '1px solid #374151', borderRadius: 4 }}
        />
      )}
    </div>
  );
}
