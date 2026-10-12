import React from 'react';

export function fillEveryField(values, variant = 0, choices = {}) {
  const names = ['Property deed review', 'Affidavit review', 'Power of attorney review'];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (['id', 'created_at', 'updated_at', 'user_id', 'id_number', 'document_number'].includes(key) || /(?:^|_)id$/.test(key) || /file|upload/i.test(key)) return [key, value];
    if (key === 'ai_suggestions') return [key, {}];
    if (choices[key]) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`${names[variant]} example`, 'Check signatures, identity evidence, and jurisdiction requirements']];
    if (value && typeof value === 'object') return [key, fillEveryField(value, variant, choices[key] || {})];
    if (typeof value === 'boolean') return [key, true];
    if (/date|deadline|valid_until/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, key === 'scheduled_date' ? 16 : 10)];
    if (/email/.test(key)) return [key, `client${variant + 1}@example.com`];
    if (/filename/.test(key)) return [key, value];
    if (/budget|price|cost|amount/.test(key)) return [key, [2400, 650, 4200][variant]];
    if (/duration/.test(key)) return [key, [6, 2, 8][variant]];
    if (/crew|party_size/.test(key)) return [key, [3, 2, 5][variant]];
    if (/travel/.test(key)) return [key, [25, 8, 40][variant]];
    if (/deliverables/.test(key)) return [key, [250, 35, 80][variant]];
    if (/experience/.test(key)) return [key, [6, 4, 8][variant]];
    if (typeof value === 'number') return [key, [3, 2, 5][variant]];
    if (/location|address|market/.test(key)) return [key, ['Albany, New York', 'Boston, Massachusetts', 'Chicago, Illinois'][variant]];
    if (/status/.test(key)) return [key, 'Pending'];
    if (/tone/.test(key)) return [key, ['Warm and polished', 'Friendly and concise', 'Confident and professional'][variant]];
    if (/type/.test(key)) return [key, ['Deed', 'Affidavit', 'Power of Attorney'][variant]];
    if (/title|name/.test(key)) return [key, names[variant]];
    return [key, `${names[variant]} example: confirm signer identity, document scope, required witnesses, and notarial wording. Flag missing evidence and jurisdiction specific requirements before proceeding.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Deed example', 'Affidavit example', 'Power of attorney example'];
  const mergeKeepingReferences = (current, sample) => Object.fromEntries(Object.entries(current).map(([key, original]) => {
    if (/(?:^|_)id$/.test(key) || ['id_number', 'document_number'].includes(key) || /file|upload/i.test(key)) return [key, original];
    if (original && typeof original === 'object' && !Array.isArray(original)) return [key, mergeKeepingReferences(original, sample?.[key] || {})];
    return [key, sample?.[key] ?? original];
  }));
  return <div className="ai-preset-bar"><div><strong>Fill sample fields</strong><p>Examples fill the brief and optional context. Genuine record references, identity numbers, and uploaded files must be supplied or stay selected.</p></div><div className="ai-actions">{labels.map((label, index) => <button type="button" className="btn btn-secondary" key={label} disabled={disabled} onClick={() => onChange(presets ? mergeKeepingReferences(value, presets[index].values) : fillEveryField(value, index, choices))}>{label}</button>)}</div></div>;
}
