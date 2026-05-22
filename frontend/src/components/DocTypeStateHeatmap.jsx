// === Custom View component: DocTypeStateHeatmap ===
// Document type x client state count heatmap, pure SVG.
import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function DocTypeStateHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/custom-views/doc-type-state-heatmap');
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function color(value, max) {
    if (!max) return '#1f2937';
    const t = Math.min(1, value / max);
    // interpolate from dark blue to bright orange
    const r = Math.round(31 + (251 - 31) * t);
    const g = Math.round(41 + (146 - 41) * t);
    const b = Math.round(55 + (60 - 55) * t);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div style={{ background: '#111827', padding: 16, borderRadius: 8, color: '#e5e7eb' }}>
      <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Doc Type × State Heatmap</h3>
      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {error && <p style={{ color: '#fecaca' }}>Error: {error}</p>}
      {!loading && !error && data && data.doc_types && data.states && (() => {
        const cell = 38;
        const labelW = 110;
        const labelH = 28;
        const W = labelW + cell * data.states.length + 20;
        const H = labelH + cell * data.doc_types.length + 20;
        return (
          <div style={{ overflowX: 'auto' }}>
            <svg width={W} height={H} style={{ background: '#0b1220', borderRadius: 6 }}>
              {/* state headers */}
              {data.states.map((st, i) => (
                <text
                  key={`s-${i}`}
                  x={labelW + i * cell + cell / 2}
                  y={labelH - 6}
                  fontSize="11"
                  fill="#9ca3af"
                  textAnchor="middle"
                >
                  {st}
                </text>
              ))}
              {/* rows */}
              {data.doc_types.map((dt, r) => (
                <g key={`r-${r}`}>
                  <text
                    x={labelW - 8}
                    y={labelH + r * cell + cell / 2 + 4}
                    fontSize="11"
                    fill="#e5e7eb"
                    textAnchor="end"
                  >
                    {dt}
                  </text>
                  {data.states.map((st, c) => {
                    const v = data.matrix[r][c];
                    return (
                      <g key={`c-${r}-${c}`}>
                        <rect
                          x={labelW + c * cell + 1}
                          y={labelH + r * cell + 1}
                          width={cell - 2}
                          height={cell - 2}
                          fill={color(v, data.max)}
                          stroke="#0b1220"
                        />
                        {v > 0 && (
                          <text
                            x={labelW + c * cell + cell / 2}
                            y={labelH + r * cell + cell / 2 + 4}
                            fontSize="11"
                            fill="#fff"
                            textAnchor="middle"
                            fontWeight="600"
                          >
                            {v}
                          </text>
                        )}
                        <title>{`${dt} / ${st}: ${v}`}</title>
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
              Max cell: {data.max} · Types: {data.doc_types.length} · States: {data.states.length}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
