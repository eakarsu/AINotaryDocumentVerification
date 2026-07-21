module.exports={
 caseType:'versioned_notary_verification_matter',initialState:'matter_opened',
 states:['matter_opened','sources_locked','identity_evidence_review','jurisdiction_review','document_review','notary_approval','signature_delivery_pending','completed','adverse_hold','legal_hold'],
 createRoles:['notary_staff','notary'],assessmentRoles:['notary_staff','notary','identity_reviewer','compliance_reviewer'],auditRoles:['notary','compliance_reviewer','auditor'],connectorRoles:['integration_operator','notary'],
 evidenceKinds:['source_document_digest','document_version','jurisdiction_rule','identity_registry_receipt','background_check_receipt','redaction_manifest','privilege_classification','deadline_record','consent_receipt','notary_review','electronic_signature','filing_receipt','delivery_receipt','adverse_record','legal_hold_record','notification_receipt'],
 requiredSignals:['documentVersion','ruleVersion','jurisdiction','ruleEffectiveAt','identityStatus','sourceConflictStatus','privilegeStatus','redactionStatus','deadlineStatus','policyVersion'],
 professionalBoundary:'This workflow preserves administrative verification evidence; it is not legal advice, identity adjudication, notarization, filing, or a substitute for a commissioned notary and counsel.',
 connectors:[{name:'trusted_registry',purpose:'signed identity/status receipts'},{name:'filing_esignature',purpose:'signed delivery receipts'},{name:'matter_system',purpose:'matter/deadline versions'},{name:'document_system',purpose:'controlled documents'},{name:'identity_provider',purpose:'verification receipts only'},{name:'notification',purpose:'delivery acknowledgement'}],
 transitions:[
  {from:'matter_opened',action:'lock_sources',to:'sources_locked',roles:['notary_staff'],requiresEvidence:true},
  {from:'sources_locked',action:'review_identity',to:'identity_evidence_review',roles:['identity_reviewer','notary'],requiresEvidence:true,dualControl:true},
  {from:'identity_evidence_review',action:'review_jurisdiction',to:'jurisdiction_review',roles:['compliance_reviewer','notary'],requiresEvidence:true},
  {from:'jurisdiction_review',action:'review_document',to:'document_review',roles:['notary'],requiresEvidence:true,dualControl:true},
  {from:'document_review',action:'approve_notarial_step',to:'notary_approval',roles:['notary'],requiresEvidence:true,dualControl:true},
  {from:'notary_approval',action:'queue_signed_delivery',to:'signature_delivery_pending',roles:['notary'],requiresEvidence:true},
  {from:'signature_delivery_pending',action:'record_completion',to:'completed',roles:['integration_operator','notary'],requiresEvidence:true,dualControl:true},
  {from:'matter_opened',action:'open_adverse_hold',to:'adverse_hold',roles:['notary','compliance_reviewer'],requiresEvidence:true},
  {from:'matter_opened',action:'apply_legal_hold',to:'legal_hold',roles:['notary','compliance_reviewer'],requiresEvidence:true,dualControl:true}
 ],
 assess:x=>{const jurisdiction=['US_STATE','US_FEDERAL','OTHER_REVIEWED'].includes(x.jurisdiction);const effective=!Number.isNaN(Date.parse(x.ruleEffectiveAt));const ready=jurisdiction&&effective&&x.identityStatus==='verified_receipt'&&x.sourceConflictStatus==='resolved'&&x.privilegeStatus==='cleared'&&x.redactionStatus==='verified'&&x.deadlineStatus==='open';return{disposition:ready?'qualified_notary_review_required':'identity_source_privilege_or_deadline_hold',notarialDecision:null,legalAdvice:null,versions:{document:x.documentVersion,rules:x.ruleVersion}};}
};
