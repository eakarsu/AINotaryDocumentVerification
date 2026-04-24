import { useState, useEffect } from 'react'
import api from '../api/axios'
import FeatureCard from '../components/FeatureCard'
import StatsCard from '../components/StatsCard'

const features = [
  {
    key: 'documents',
    title: 'Documents',
    description: 'Upload, verify and manage documents',
    icon: '\u{1F4C4}',
    path: '/documents',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    endpoint: '/documents',
  },
  {
    key: 'notarizations',
    title: 'E-Notarizations',
    description: 'Digital notarization sessions',
    icon: '\u{1F58B}',
    path: '/notarizations',
    gradient: 'linear-gradient(135deg, #3b1f6e 0%, #8b5cf6 100%)',
    endpoint: '/notarizations',
  },
  {
    key: 'identity',
    title: 'Identity Verification',
    description: 'AI-powered identity checks',
    icon: '\u{1F464}',
    path: '/identity-verifications',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)',
    endpoint: '/identity-verifications',
  },
  {
    key: 'fraud',
    title: 'Fraud Detection',
    description: 'AI fraud analysis and alerts',
    icon: '\u{1F6E1}',
    path: '/fraud-detections',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
    endpoint: '/fraud-detections',
  },
  {
    key: 'signatures',
    title: 'Digital Signatures',
    description: 'Signature management',
    icon: '\u{270D}',
    path: '/signatures',
    gradient: 'linear-gradient(135deg, #14532d 0%, #22c55e 100%)',
    endpoint: '/signatures',
  },
  {
    key: 'clients',
    title: 'Clients',
    description: 'Customer management',
    icon: '\u{1F465}',
    path: '/clients',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)',
    endpoint: '/clients',
  },
  {
    key: 'templates',
    title: 'Templates',
    description: 'Document templates',
    icon: '\u{1F4CB}',
    path: '/templates',
    gradient: 'linear-gradient(135deg, #164e63 0%, #06b6d4 100%)',
    endpoint: '/templates',
  },
  {
    key: 'audit',
    title: 'Audit Trail',
    description: 'Activity logs and tracking',
    icon: '\u{1F4CA}',
    path: '/audit-trail',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #64748b 100%)',
    endpoint: '/audit-trail',
  },
  {
    key: 'payments',
    title: 'Payments',
    description: 'Payment and billing',
    icon: '\u{1F4B3}',
    path: '/payments',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    endpoint: '/payments',
  },
  {
    key: 'ai',
    title: 'AI Analysis',
    description: 'AI-powered document analysis',
    icon: '\u{1F9E0}',
    path: '/ai-analyses',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #a78bfa 100%)',
    endpoint: '/ai-analyses',
  },
  {
    key: 'compliance',
    title: 'Compliance',
    description: 'Regulatory compliance checks',
    icon: '\u{2705}',
    path: '/compliance-checks',
    gradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)',
    endpoint: '/compliance-checks',
  },
  {
    key: 'journal',
    title: 'Notary Journal',
    description: 'Official notary records',
    icon: '\u{1F4D6}',
    path: '/notary-journal',
    gradient: 'linear-gradient(135deg, #881337 0%, #f43f5e 100%)',
    endpoint: '/notary-journal',
  },
  {
    key: 'seals',
    title: 'Seal Management',
    description: 'Digital notary seals',
    icon: '\u{1F3AB}',
    path: '/seals',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)',
    endpoint: '/seals',
  },
]

export default function Dashboard() {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    const fetchCounts = async () => {
      const results = {}
      await Promise.allSettled(
        features.map(async (f) => {
          try {
            const res = await api.get(f.endpoint)
            const data = res.data
            results[f.key] = Array.isArray(data) ? data.length : (data.data ? data.data.length : (data.total || 0))
          } catch {
            results[f.key] = 0
          }
        })
      )
      setCounts(results)
    }
    fetchCounts()
  }, [])

  const totalDocs = counts.documents || 0
  const activeNotar = counts.notarizations || 0
  const pendingVerif = counts.identity || 0
  const totalRevenue = counts.payments || 0

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">AI Notary Document Verification Platform</p>
      </div>

      <div className="stats-row">
        <StatsCard title="Total Documents" value={totalDocs} icon={'\u{1F4C4}'} color="#2563eb" />
        <StatsCard title="Active Notarizations" value={activeNotar} icon={'\u{1F58B}'} color="#8b5cf6" />
        <StatsCard title="Pending Verifications" value={pendingVerif} icon={'\u{1F464}'} color="#14b8a6" />
        <StatsCard title="Total Payments" value={totalRevenue} icon={'\u{1F4B3}'} color="#10b981" />
      </div>

      <div className="features-grid">
        {features.map((f) => (
          <FeatureCard
            key={f.key}
            title={f.title}
            description={f.description}
            icon={f.icon}
            count={counts[f.key]}
            path={f.path}
            gradient={f.gradient}
          />
        ))}
      </div>
    </div>
  )
}
