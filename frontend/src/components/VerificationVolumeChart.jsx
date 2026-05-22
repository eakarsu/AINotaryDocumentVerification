// === Custom View component: VerificationVolumeChart ===
// Pure-SVG bar/line chart of notarization volume per day.
import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function VerificationVolumeChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(365);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/custom-views/verification-volume?days=${days}`);
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [days]);

  const W = 720, H = 260, PAD = 32;

  function renderChart() {
    if (!data || !data.series || data.series.length === 0) {
      return <p style={{ color: '#9ca3af' }}>No verification volume in the selected window.</p>;
    }
    const series = data.series;
    const maxV = Math.max(1, ...series.map(d => d.total));
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const barW = Math.max(2, innerW / series.length - 2);
    return (
      <svg width={W} height={H} style={{ background: '#0b1220', borderRadius: 6 }}>
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = PAD + innerH * (1 - t);
          return (
            <g key={i}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#1f2937" strokeDasharray="2 2" />
              <text x={PAD - 6} y={y + 3} fontSize="9" fill="#6b7280" textAnchor="end">
                {Math.round(maxV * t)}
              </text>
            </g>
          );
        })}
        {/* Bars: total in indigo, completed overlaid in emerald */}
        {series.map((d, i) => {
          const x = PAD + (innerW / series.length) * i + 1;
          const totalH = (d.total / maxV) * innerH;
          const compH = (d.completed / maxV) * innerH;
          return (
            <g key={i}>
              <rect x={x} y={PAD + innerH - totalH} width={barW} height={totalH} fill="#6366f1" rx="1" />
              <rect x={x} y={PAD + innerH - compH} width={barW} height={compH} fill="#10b981" rx="1" />
              <title>{`${d.day}: total=${d.total}, completed=${d.completed}, scheduled=${d.scheduled}`}</title>
            </g>
          );
        })}
        {/* X-axis label sparse */}
        {series.map((d, i) => {
          if (series.length > 14 && i % Math.ceil(series.length / 8) !== 0) return null;
          const x = PAD + (innerW / series.length) * i + barW / 2;
          return (
            <text key={`xl-${i}`} x={x} y={H - 10} fontSize="9" fill="#9ca3af" textAnchor="middle">
              {d.day.slice(5)}
            </text>
          );
        })}
      </svg>
    );
  }

  return (
    <div style={{ background: '#111827', padding: 16, borderRadius: 8, color: '#e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Verification Volume</h3>
        <div>
          <label style={{ fontSize: 12, color: '#9ca3af', marginRight: 6 }}>Window (days):</label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{ background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, padding: '4px 6px' }}
          >
            {[7, 14, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {error && <p style={{ color: '#fecaca' }}>Error: {error}</p>}
      {!loading && !error && (
        <>
          {renderChart()}
          {data?.summary && (
            <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#6366f1', marginRight: 4 }} /> Total: {data.summary.total}</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', marginRight: 4 }} /> Completed: {data.summary.completed}</span>
              <span>Scheduled: {data.summary.scheduled}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
