import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Notarizations from './pages/Notarizations'
import IdentityVerifications from './pages/IdentityVerifications'
import FraudDetections from './pages/FraudDetections'
import Signatures from './pages/Signatures'
import Clients from './pages/Clients'
import Templates from './pages/Templates'
import AuditTrail from './pages/AuditTrail'
import Payments from './pages/Payments'
import AIAnalyses from './pages/AIAnalyses'
import ComplianceChecks from './pages/ComplianceChecks'
import NotaryJournal from './pages/NotaryJournal'
import Seals from './pages/Seals'
import Profile from './pages/Profile'
import Reports from './pages/Reports'
import Calendar from './pages/Calendar'
import Search from './pages/Search'
import FeeCalculator from './pages/FeeCalculator'
import Witnesses from './pages/Witnesses'
import Bookmarks from './pages/Bookmarks'
import Help from './pages/Help'
import AIHistory from './pages/AIHistory'
import JurisdictionRules from './pages/JurisdictionRules'
import AIRiskAnalysis from './pages/AIRiskAnalysis'

// // === Batch 06 Gaps & Frontend Mounts ===
import CFAgenticComplianceMonitoringPage from './pages/CFAgenticComplianceMonitoringPage';
import CFMultiDocumentCorrelationPage from './pages/CFMultiDocumentCorrelationPage';
import CFESignatureIntegrationPage from './pages/CFESignatureIntegrationPage';
import CFVideoAttestationPage from './pages/CFVideoAttestationPage';
import CFNotaryMarketplacePage from './pages/CFNotaryMarketplacePage';
import GapWitnessesTrackedButNoWitnessPage from './pages/GapWitnessesTrackedButNoWitnessPage';
import GapPaymentsRecordedButNoFeePage from './pages/GapPaymentsRecordedButNoFeePage';
import GapClientsExistWithoutClientPage from './pages/GapClientsExistWithoutClientPage';
import GapNoTemplatePage from './pages/GapNoTemplatePage';
import GapLimitedEPage from './pages/GapLimitedEPage';
import GapNoBackgroundCheckServiceConnectorForIdentityPage from './pages/GapNoBackgroundCheckServiceConnectorForIdentityPage';
import GapNoBulkImportOfDocumentsPdfBatchProcessingPage from './pages/GapNoBulkImportOfDocumentsPdfBatchProcessingPage';
import GapLimitedIntegrationWithStateNotaryBoardsNoLiPage from './pages/GapLimitedIntegrationWithStateNotaryBoardsNoLiPage';
import GapNoWebhooksForExternalTriggersEGNewClientCPage from './pages/GapNoWebhooksForExternalTriggersEGNewClientCPage';
import GapNoMobilePage from './pages/GapNoMobilePage';
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="ai-spinner" /><p>Loading...</p></div>
  return isAuthenticated ? children : <Navigate to="/login" />
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-compliance-monitoring" element={<CFAgenticComplianceMonitoringPage />} />
          <Route path="/cf-multi-document-correlation" element={<CFMultiDocumentCorrelationPage />} />
          <Route path="/cf-e-signature-integration" element={<CFESignatureIntegrationPage />} />
          <Route path="/cf-video-attestation" element={<CFVideoAttestationPage />} />
          <Route path="/cf-notary-marketplace" element={<CFNotaryMarketplacePage />} />
          <Route path="/gap-witnesses-tracked-but-no-witness" element={<GapWitnessesTrackedButNoWitnessPage />} />
          <Route path="/gap-payments-recorded-but-no-fee" element={<GapPaymentsRecordedButNoFeePage />} />
          <Route path="/gap-clients-exist-without-client" element={<GapClientsExistWithoutClientPage />} />
          <Route path="/gap-no-template" element={<GapNoTemplatePage />} />
          <Route path="/gap-limited-e" element={<GapLimitedEPage />} />
          <Route path="/gap-no-background-check-service-connector-for-identity" element={<GapNoBackgroundCheckServiceConnectorForIdentityPage />} />
          <Route path="/gap-no-bulk-import-of-documents-pdf-batch-processing" element={<GapNoBulkImportOfDocumentsPdfBatchProcessingPage />} />
          <Route path="/gap-limited-integration-with-state-notary-boards-no-li" element={<GapLimitedIntegrationWithStateNotaryBoardsNoLiPage />} />
          <Route path="/gap-no-webhooks-for-external-triggers-e-g-new-client-c" element={<GapNoWebhooksForExternalTriggersEGNewClientCPage />} />
          <Route path="/gap-no-mobile" element={<GapNoMobilePage />} />
        </Routes>
    )
  }

  return (
    <div className="app-layout">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="app-body">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/notarizations" element={<ProtectedRoute><Notarizations /></ProtectedRoute>} />
            <Route path="/identity-verifications" element={<ProtectedRoute><IdentityVerifications /></ProtectedRoute>} />
            <Route path="/fraud-detections" element={<ProtectedRoute><FraudDetections /></ProtectedRoute>} />
            <Route path="/signatures" element={<ProtectedRoute><Signatures /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/ai-analyses" element={<ProtectedRoute><AIAnalyses /></ProtectedRoute>} />
            <Route path="/compliance-checks" element={<ProtectedRoute><ComplianceChecks /></ProtectedRoute>} />
            <Route path="/notary-journal" element={<ProtectedRoute><NotaryJournal /></ProtectedRoute>} />
            <Route path="/seals" element={<ProtectedRoute><Seals /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/fee-calculator" element={<ProtectedRoute><FeeCalculator /></ProtectedRoute>} />
            <Route path="/witnesses" element={<ProtectedRoute><Witnesses /></ProtectedRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            <Route path="/ai-history" element={<ProtectedRoute><AIHistory /></ProtectedRoute>} />
            <Route path="/jurisdiction-rules" element={<ProtectedRoute><JurisdictionRules /></ProtectedRoute>} />
            <Route path="/ai-risk-analysis" element={<ProtectedRoute><AIRiskAnalysis /></ProtectedRoute>} />
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
