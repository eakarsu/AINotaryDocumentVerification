import { NavLink } from 'react-router-dom'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '\u{1F3E0}' },
  { path: '/documents', label: 'Documents', icon: '\u{1F4C4}' },
  { path: '/notarizations', label: 'E-Notarizations', icon: '\u{1F58B}' },
  { path: '/calendar', label: 'Calendar', icon: '\u{1F4C5}' },
  { path: '/identity-verifications', label: 'Identity Verification', icon: '\u{1F464}' },
  { path: '/fraud-detections', label: 'Fraud Detection', icon: '\u{1F6E1}' },
  { path: '/signatures', label: 'Digital Signatures', icon: '\u{270D}' },
  { path: '/clients', label: 'Clients', icon: '\u{1F465}' },
  { path: '/witnesses', label: 'Witnesses', icon: '\u{1F9D1}' },
  { path: '/templates', label: 'Templates', icon: '\u{1F4CB}' },
  { path: '/audit-trail', label: 'Audit Trail', icon: '\u{1F4CA}' },
  { path: '/payments', label: 'Payments', icon: '\u{1F4B3}' },
  { path: '/fee-calculator', label: 'Fee Calculator', icon: '\u{1F4B0}' },
  { path: '/reports', label: 'Reports', icon: '\u{1F4C8}' },
  { path: '/ai-analyses', label: 'AI Analysis', icon: '\u{1F9E0}' },
  { path: '/compliance-checks', label: 'Compliance', icon: '\u{2705}' },
  { path: '/notary-journal', label: 'Notary Journal', icon: '\u{1F4D6}' },
  { path: '/seals', label: 'Seal Management', icon: '\u{1F3AB}' },
  { path: '/bookmarks', label: 'Bookmarks', icon: '\u{2B50}' },
  { path: '/search', label: 'Search', icon: '\u{1F50D}' },
  { path: '/help', label: 'Help Center', icon: '\u{2753}' },
  { path: '/ai-history', label: 'AI History', icon: '\u{1F4CA}' },
  { path: '/jurisdiction-rules', label: 'Jurisdiction Rules', icon: '\u{2696}️' },
  { path: '/ai-risk-analysis', label: 'AI Risk Analysis', icon: '\u{1F50E}' },
]

export default function Sidebar({ collapsed }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
