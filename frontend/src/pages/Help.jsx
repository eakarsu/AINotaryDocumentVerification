import { useState } from 'react'

const faqs = [
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I create a new notarization?', a: 'Navigate to E-Notarizations from the sidebar, click "+ Add New", fill in the details including document, client, and scheduled date, then submit.' },
      { q: 'How do I add a new client?', a: 'Go to Clients from the sidebar, click "+ Add New", enter the client\'s information including name, email, and identification details.' },
      { q: 'How do I upload a document?', a: 'Navigate to Documents, click "+ Add New", provide the document title, type, and details. Documents can be associated with specific clients.' },
    ]
  },
  {
    category: 'Notarization Process',
    items: [
      { q: 'What are the steps in the notarization workflow?', a: 'The typical workflow is: 1) Upload document, 2) Verify signer identity, 3) Schedule notarization, 4) Perform notarial act, 5) Apply digital seal, 6) Record in journal, 7) Process payment.' },
      { q: 'How do I record a notarial act in the journal?', a: 'Go to Notary Journal, click "+ Add New", and fill in the required details including document type, signer information, notarial act type, and fee.' },
      { q: 'How do I manage my notary seal?', a: 'Navigate to Seal Management to view, add, or update your digital notary seals. Track commission numbers, expiry dates, and seal status.' },
    ]
  },
  {
    category: 'Identity & Security',
    items: [
      { q: 'How does identity verification work?', a: 'Identity verification checks the signer\'s government-issued ID against provided information. Results include confidence scores and verification status.' },
      { q: 'What do fraud detection risk levels mean?', a: 'Risk levels are: Low (minimal concerns), Medium (some flags detected), High (significant concerns - manual review recommended), Critical (likely fraudulent - do not proceed).' },
      { q: 'How is the audit trail maintained?', a: 'Every significant action is automatically logged in the Audit Trail with timestamps, user info, and action details for complete accountability.' },
    ]
  },
  {
    category: 'Payments & Fees',
    items: [
      { q: 'How do I calculate notary fees?', a: 'Use the Fee Calculator to look up state-specific notary fees. Select your state, notarial act type, and number of signatures to get an instant calculation.' },
      { q: 'How do I record a payment?', a: 'Navigate to Payments, click "+ Add New", select the associated notarization, enter the amount, payment method, and status.' },
      { q: 'Can I export payment records?', a: 'Yes, use the Export feature available on any data page to download records as CSV files for accounting purposes.' },
    ]
  },
  {
    category: 'Templates & Documents',
    items: [
      { q: 'How do I create a document template?', a: 'Go to Templates, click "+ Add New", provide a name, category, and the template content. Templates can be state-specific and toggled active/inactive.' },
      { q: 'What document types are supported?', a: 'Common types include acknowledgments, jurats, oaths/affirmations, depositions, power of attorney, affidavits, deeds, and more.' },
      { q: 'How do I use compliance checks?', a: 'Compliance checks verify that notarizations meet state-specific regulatory requirements. Results show any issues found and recommendations.' },
    ]
  },
  {
    category: 'Account & Settings',
    items: [
      { q: 'How do I update my profile?', a: 'Click on your avatar or go to Profile & Settings from the sidebar to update your name, email, or change your password.' },
      { q: 'How do I change my password?', a: 'Go to Profile & Settings, click "Change Password", enter your current password and the new password twice to confirm.' },
      { q: 'How do I use bookmarks?', a: 'Bookmark frequently accessed records for quick access. View all your bookmarks from the Bookmarks page in the sidebar.' },
    ]
  },
]

const shortcuts = [
  { keys: 'Sidebar', desc: 'Use the sidebar to navigate between features' },
  { keys: 'Search', desc: 'Use Global Search to find anything across the system' },
  { keys: 'Calendar', desc: 'View scheduled notarizations on the calendar' },
  { keys: 'Reports', desc: 'View analytics and activity in Reports' },
  { keys: 'Export', desc: 'Download data as CSV from any list page' },
]

export default function Help() {
  const [openFaq, setOpenFaq] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const toggleFaq = (key) => setOpenFaq(openFaq === key ? null : key)

  const filteredFaqs = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0)

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>Help Center</h1>
        <p className="page-subtitle">Find answers to common questions</p>
      </div>

      <input type="text" className="search-input" placeholder="Search help topics..."
        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        style={{ maxWidth: '500px', marginBottom: '24px' }} />

      <div className="help-layout">
        <div className="help-main">
          {filteredFaqs.map((cat, ci) => (
            <div key={ci} className="help-category">
              <h3 className="help-category-title">{cat.category}</h3>
              {cat.items.map((item, ii) => {
                const key = `${ci}-${ii}`
                return (
                  <div key={key} className={`faq-item ${openFaq === key ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleFaq(key)}>
                      <span>{item.q}</span>
                      <span className="faq-toggle">{openFaq === key ? '\u2212' : '+'}</span>
                    </div>
                    {openFaq === key && <div className="faq-answer">{item.a}</div>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="help-sidebar-card">
          <h3>Quick Tips</h3>
          <div className="shortcuts-list">
            {shortcuts.map((s, i) => (
              <div key={i} className="shortcut-item">
                <span className="shortcut-key">{s.keys}</span>
                <span className="shortcut-desc">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
