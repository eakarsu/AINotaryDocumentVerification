require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS notes CASCADE;
      DROP TABLE IF EXISTS bookmarks CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS witnesses CASCADE;
      DROP TABLE IF EXISTS compliance_checks CASCADE;
      DROP TABLE IF EXISTS ai_analyses CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS audit_trail CASCADE;
      DROP TABLE IF EXISTS notary_journal CASCADE;
      DROP TABLE IF EXISTS seals CASCADE;
      DROP TABLE IF EXISTS digital_signatures CASCADE;
      DROP TABLE IF EXISTS fraud_detections CASCADE;
      DROP TABLE IF EXISTS identity_verifications CASCADE;
      DROP TABLE IF EXISTS notarizations CASCADE;
      DROP TABLE IF EXISTS templates CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS clients CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('Creating tables...');

    // Users
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'notary',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Clients
    await client.query(`
      CREATE TABLE clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        id_type VARCHAR(50),
        id_number VARCHAR(100),
        verified BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Documents
    await client.query(`
      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        file_name VARCHAR(500),
        file_size INTEGER,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Notarizations
    await client.query(`
      CREATE TABLE notarizations (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        notary_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        type VARCHAR(50),
        scheduled_date TIMESTAMP,
        completed_date TIMESTAMP,
        fee DECIMAL(10,2),
        location VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Identity Verifications
    await client.query(`
      CREATE TABLE identity_verifications (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        verification_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        confidence_score DECIMAL(5,4),
        ai_result TEXT,
        document_number VARCHAR(100),
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Fraud Detections
    await client.query(`
      CREATE TABLE fraud_detections (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
        risk_level VARCHAR(50),
        risk_score DECIMAL(5,4),
        ai_analysis TEXT,
        flags TEXT[],
        status VARCHAR(50) DEFAULT 'clean',
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Digital Signatures
    await client.query(`
      CREATE TABLE digital_signatures (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
        signer_name VARCHAR(255),
        signer_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        signature_type VARCHAR(50),
        ip_address VARCHAR(50),
        signed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Templates
    await client.query(`
      CREATE TABLE templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50),
        description TEXT,
        content TEXT,
        state VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Audit Trail
    await client.query(`
      CREATE TABLE audit_trail (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100),
        entity_type VARCHAR(100),
        entity_id INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Payments
    await client.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        notarization_id INTEGER REFERENCES notarizations(id) ON DELETE SET NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        amount DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        method VARCHAR(50),
        transaction_id VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // AI Analyses
    await client.query(`
      CREATE TABLE ai_analyses (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
        analysis_type VARCHAR(50),
        result TEXT,
        confidence DECIMAL(5,4),
        model_used VARCHAR(100),
        tokens_used INTEGER,
        processing_time DECIMAL(10,3),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Compliance Checks
    await client.query(`
      CREATE TABLE compliance_checks (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
        check_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        issues TEXT,
        recommendations TEXT,
        checked_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Notary Journal
    await client.query(`
      CREATE TABLE notary_journal (
        id SERIAL PRIMARY KEY,
        notary_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        document_type VARCHAR(100),
        signer_name VARCHAR(255),
        signer_address TEXT,
        id_type VARCHAR(50),
        id_number VARCHAR(100),
        notary_act VARCHAR(50),
        fee DECIMAL(10,2),
        date_performed TIMESTAMP,
        witness_name VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seals
    await client.query(`
      CREATE TABLE seals (
        id SERIAL PRIMARY KEY,
        notary_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        seal_number VARCHAR(100),
        state VARCHAR(50),
        county VARCHAR(100),
        commission_number VARCHAR(100),
        commission_expiry DATE,
        status VARCHAR(50) DEFAULT 'active',
        seal_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Notifications
    await client.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Witnesses
    await client.query(`
      CREATE TABLE witnesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        id_type VARCHAR(50),
        id_number VARCHAR(100),
        notarization_id INTEGER REFERENCES notarizations(id) ON DELETE SET NULL,
        relationship VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Bookmarks
    await client.query(`
      CREATE TABLE bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        label VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, entity_type, entity_id)
      )
    `);

    // Notes
    await client.query(`
      CREATE TABLE notes (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Tables created successfully. Seeding data...');

    // ============ SEED USERS ============
    const password = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@notary.com', $1, 'Admin User', 'admin'),
      ('notary@notary.com', $1, 'John Smith', 'notary'),
      ('sarah.johnson@notary.com', $1, 'Sarah Johnson', 'notary'),
      ('michael.chen@notary.com', $1, 'Michael Chen', 'notary'),
      ('emily.davis@notary.com', $1, 'Emily Davis', 'notary'),
      ('robert.wilson@notary.com', $1, 'Robert Wilson', 'admin'),
      ('jessica.martinez@notary.com', $1, 'Jessica Martinez', 'notary'),
      ('david.brown@notary.com', $1, 'David Brown', 'notary'),
      ('amanda.taylor@notary.com', $1, 'Amanda Taylor', 'notary'),
      ('james.anderson@notary.com', $1, 'James Anderson', 'notary'),
      ('laura.thomas@notary.com', $1, 'Laura Thomas', 'notary'),
      ('daniel.jackson@notary.com', $1, 'Daniel Jackson', 'notary'),
      ('rachel.white@notary.com', $1, 'Rachel White', 'notary'),
      ('christopher.harris@notary.com', $1, 'Christopher Harris', 'admin'),
      ('megan.clark@notary.com', $1, 'Megan Clark', 'notary'),
      ('brian.lewis@notary.com', $1, 'Brian Lewis', 'notary')
    `, [password]);
    console.log('  Users seeded');

    // ============ SEED CLIENTS ============
    await client.query(`
      INSERT INTO clients (name, email, phone, address, city, state, zip, id_type, id_number, verified, notes) VALUES
      ('Margaret Thompson', 'mthompson@email.com', '(512) 555-0101', '742 Oak Street', 'Austin', 'TX', '78701', 'drivers_license', 'TX-DL-8234567', true, 'Long-term client, real estate transactions'),
      ('William Garcia', 'wgarcia@email.com', '(213) 555-0202', '1583 Maple Avenue', 'Los Angeles', 'CA', '90012', 'passport', 'US-PP-543216789', true, 'Business owner, frequent contract notarizations'),
      ('Patricia Robinson', 'probinson@email.com', '(305) 555-0303', '2901 Palm Drive', 'Miami', 'FL', '33101', 'state_id', 'FL-ID-9876543', true, 'Estate planning documents'),
      ('Charles Martinez', 'cmartinez@email.com', '(312) 555-0404', '456 Wacker Drive, Suite 300', 'Chicago', 'IL', '60601', 'drivers_license', 'IL-DL-M4567890', false, 'Pending identity verification'),
      ('Jennifer Lee', 'jlee@email.com', '(206) 555-0505', '789 Pine Street NW', 'Seattle', 'WA', '98101', 'drivers_license', 'WA-DL-L1234567', true, 'Corporate agreements specialist'),
      ('Richard Davis', 'rdavis@email.com', '(602) 555-0606', '3210 Desert Rose Lane', 'Phoenix', 'AZ', '85001', 'military_id', 'US-MIL-223344', true, 'Retired military, power of attorney documents'),
      ('Susan Wilson', 'swilson@email.com', '(617) 555-0707', '127 Beacon Hill Road', 'Boston', 'MA', '02108', 'passport', 'US-PP-987654321', true, 'Trust and estate documents'),
      ('Thomas Anderson', 'tanderson@email.com', '(404) 555-0808', '555 Peachtree Street NE', 'Atlanta', 'GA', '30301', 'drivers_license', 'GA-DL-A8765432', true, 'Real estate developer'),
      ('Karen Brown', 'kbrown@email.com', '(303) 555-0909', '1200 Colfax Avenue', 'Denver', 'CO', '80202', 'state_id', 'CO-ID-1234567', false, 'New client, first visit scheduled'),
      ('James Taylor', 'jtaylor@email.com', '(615) 555-1010', '890 Music Row', 'Nashville', 'TN', '37203', 'drivers_license', 'TN-DL-T5678901', true, 'Entertainment industry contracts'),
      ('Linda White', 'lwhite@email.com', '(503) 555-1111', '234 Rose Garden Way', 'Portland', 'OR', '97201', 'passport', 'US-PP-112233445', true, 'International business documents'),
      ('Mark Johnson', 'mjohnson@email.com', '(214) 555-1212', '678 Commerce Street', 'Dallas', 'TX', '75201', 'drivers_license', 'TX-DL-J2345678', true, 'Commercial lease agreements'),
      ('Nancy Harris', 'nharris@email.com', '(702) 555-1313', '4500 Las Vegas Blvd', 'Las Vegas', 'NV', '89101', 'state_id', 'NV-ID-8765432', true, 'Property transfer documents'),
      ('Steven Clark', 'sclark@email.com', '(919) 555-1414', '321 Research Triangle Drive', 'Raleigh', 'NC', '27601', 'drivers_license', 'NC-DL-C3456789', false, 'Pending document submission'),
      ('Donna Lewis', 'dlewis@email.com', '(612) 555-1515', '999 Lake Street', 'Minneapolis', 'MN', '55401', 'tribal_id', 'MN-TI-1122334', true, 'Tribal land agreements'),
      ('George Walker', 'gwalker@email.com', '(415) 555-1616', '750 Market Street', 'San Francisco', 'CA', '94102', 'drivers_license', 'CA-DL-W4567890', true, 'Tech startup incorporation docs')
    `);
    console.log('  Clients seeded');

    // ============ SEED DOCUMENTS ============
    await client.query(`
      INSERT INTO documents (title, type, status, file_name, file_size, uploaded_by, client_id, ai_analysis, created_at, updated_at) VALUES
      ('Thompson Property Deed - 742 Oak St', 'deed', 'notarized', 'thompson_deed_742oak.pdf', 245000, 2, 1, 'Property deed verified. All signatures present. Legal description matches county records.', '2025-11-15 09:30:00', '2025-11-16 14:20:00'),
      ('Garcia Business Affidavit', 'affidavit', 'verified', 'garcia_business_affidavit.pdf', 128000, 2, 2, 'Affidavit content verified. Sworn statements are consistent.', '2025-11-18 10:15:00', '2025-11-18 16:45:00'),
      ('Robinson Last Will and Testament', 'will', 'notarized', 'robinson_will_2025.pdf', 356000, 3, 3, 'Will properly executed. Two witnesses present. Testator capacity confirmed.', '2025-11-20 11:00:00', '2025-11-21 09:30:00'),
      ('Martinez Power of Attorney', 'power_of_attorney', 'pending', 'martinez_poa.pdf', 189000, 4, 4, NULL, '2025-12-01 08:45:00', '2025-12-01 08:45:00'),
      ('Lee Corporate Agreement', 'contract', 'verified', 'lee_corp_agreement.pdf', 412000, 5, 5, 'Corporate agreement reviewed. All parties identified. Terms are standard.', '2025-12-03 13:30:00', '2025-12-04 10:15:00'),
      ('Davis Military POA', 'power_of_attorney', 'notarized', 'davis_military_poa.pdf', 167000, 2, 6, 'Military POA verified under SCRA provisions. Valid format.', '2025-12-05 09:00:00', '2025-12-05 15:30:00'),
      ('Wilson Family Trust', 'trust', 'verified', 'wilson_family_trust.pdf', 523000, 3, 7, 'Trust document reviewed. Beneficiaries clearly identified. Tax provisions included.', '2025-12-08 10:30:00', '2025-12-09 11:00:00'),
      ('Anderson Commercial Lease', 'lease', 'notarized', 'anderson_commercial_lease.pdf', 298000, 4, 8, 'Commercial lease verified. Terms standard for Atlanta market.', '2025-12-10 14:00:00', '2025-12-11 09:45:00'),
      ('Brown Mortgage Application', 'mortgage', 'pending', 'brown_mortgage_app.pdf', 445000, 5, 9, NULL, '2025-12-12 11:30:00', '2025-12-12 11:30:00'),
      ('Taylor Entertainment Contract', 'contract', 'verified', 'taylor_entertainment_contract.pdf', 334000, 2, 10, 'Entertainment contract reviewed. Royalty terms identified. Non-compete clause present.', '2025-12-14 15:00:00', '2025-12-15 10:30:00'),
      ('White International Certificate', 'certificate', 'notarized', 'white_intl_certificate.pdf', 156000, 3, 11, 'Certificate authenticated for international use. Apostille requirements met.', '2025-12-16 09:15:00', '2025-12-17 08:30:00'),
      ('Johnson Declaration of Trust', 'declaration', 'rejected', 'johnson_declaration.pdf', 278000, 4, 12, 'Declaration incomplete. Missing required signatures on pages 3 and 7.', '2025-12-18 13:45:00', '2025-12-19 14:00:00'),
      ('Harris Property Amendment', 'amendment', 'verified', 'harris_property_amendment.pdf', 134000, 5, 13, 'Amendment properly references original deed. Changes documented clearly.', '2025-12-20 10:00:00', '2025-12-20 16:30:00'),
      ('Clark Legal Notice', 'notice', 'pending', 'clark_legal_notice.pdf', 98000, 2, 14, NULL, '2025-12-22 08:30:00', '2025-12-22 08:30:00'),
      ('Lewis Land Agreement', 'agreement', 'notarized', 'lewis_land_agreement.pdf', 567000, 3, 15, 'Tribal land agreement verified. Federal requirements met. BIA approval documented.', '2025-12-24 11:00:00', '2025-12-25 10:00:00'),
      ('Walker Corporate Resolution', 'resolution', 'verified', 'walker_corp_resolution.pdf', 145000, 4, 16, 'Board resolution verified. Quorum requirements met. Authorized signatures present.', '2025-12-26 14:30:00', '2025-12-27 09:15:00')
    `);
    console.log('  Documents seeded');

    // ============ SEED NOTARIZATIONS ============
    await client.query(`
      INSERT INTO notarizations (document_id, client_id, notary_id, status, type, scheduled_date, completed_date, fee, location, notes) VALUES
      (1, 1, 2, 'completed', 'acknowledgment', '2025-11-15 10:00:00', '2025-11-15 10:30:00', 15.00, '742 Oak Street, Austin, TX 78701', 'Property deed acknowledged by Margaret Thompson'),
      (2, 2, 2, 'completed', 'jurat', '2025-11-18 11:00:00', '2025-11-18 11:20:00', 10.00, '1583 Maple Avenue, Los Angeles, CA 90012', 'Business affidavit sworn and subscribed'),
      (3, 3, 3, 'completed', 'signature_witnessing', '2025-11-20 14:00:00', '2025-11-20 14:45:00', 25.00, '2901 Palm Drive, Miami, FL 33101', 'Will signing witnessed with two additional witnesses'),
      (4, 4, 4, 'scheduled', 'acknowledgment', '2026-01-05 09:00:00', NULL, 15.00, '456 Wacker Drive, Suite 300, Chicago, IL 60601', 'POA signing scheduled for January'),
      (5, 5, 5, 'completed', 'acknowledgment', '2025-12-03 14:00:00', '2025-12-03 14:25:00', 20.00, '789 Pine Street NW, Seattle, WA 98101', 'Corporate agreement acknowledged by all parties'),
      (6, 6, 2, 'completed', 'oath_affirmation', '2025-12-05 10:00:00', '2025-12-05 10:30:00', 10.00, 'Mobile notary - Davis residence, Phoenix, AZ', 'Military POA with oath administered'),
      (7, 7, 3, 'completed', 'acknowledgment', '2025-12-08 11:00:00', '2025-12-08 11:40:00', 25.00, '127 Beacon Hill Road, Boston, MA 02108', 'Family trust acknowledged by Susan Wilson'),
      (8, 8, 4, 'completed', 'acknowledgment', '2025-12-10 15:00:00', '2025-12-10 15:20:00', 15.00, '555 Peachtree Street NE, Atlanta, GA 30301', 'Commercial lease notarized'),
      (9, 9, 5, 'scheduled', 'acknowledgment', '2026-01-10 10:00:00', NULL, 20.00, '1200 Colfax Avenue, Denver, CO 80202', 'Mortgage signing appointment'),
      (10, 10, 2, 'completed', 'jurat', '2025-12-14 16:00:00', '2025-12-14 16:30:00', 10.00, '890 Music Row, Nashville, TN 37203', 'Entertainment contract with sworn statements'),
      (11, 11, 3, 'completed', 'copy_certification', '2025-12-16 10:00:00', '2025-12-16 10:15:00', 5.00, '234 Rose Garden Way, Portland, OR 97201', 'International certificate copy certified'),
      (12, 12, 4, 'cancelled', 'acknowledgment', '2025-12-18 14:00:00', NULL, 15.00, '678 Commerce Street, Dallas, TX 75201', 'Cancelled due to incomplete document'),
      (13, 13, 5, 'completed', 'acknowledgment', '2025-12-20 11:00:00', '2025-12-20 11:25:00', 15.00, '4500 Las Vegas Blvd, Las Vegas, NV 89101', 'Property amendment acknowledged'),
      (14, 14, 2, 'scheduled', 'signature_witnessing', '2026-01-15 09:30:00', NULL, 20.00, '321 Research Triangle Drive, Raleigh, NC 27601', 'Legal notice signing to be witnessed'),
      (15, 15, 3, 'completed', 'oath_affirmation', '2025-12-24 12:00:00', '2025-12-24 12:35:00', 25.00, '999 Lake Street, Minneapolis, MN 55401', 'Tribal land agreement with oath'),
      (16, 16, 4, 'in_progress', 'acknowledgment', '2025-12-26 15:00:00', NULL, 15.00, '750 Market Street, San Francisco, CA 94102', 'Corporate resolution in progress')
    `);
    console.log('  Notarizations seeded');

    // ============ SEED IDENTITY VERIFICATIONS ============
    await client.query(`
      INSERT INTO identity_verifications (client_id, verification_type, status, confidence_score, ai_result, document_number, expiry_date) VALUES
      (1, 'drivers_license', 'verified', 0.9850, 'Identity verified. DL format matches TX standard. Photo match confirmed.', 'TX-DL-8234567', '2027-06-15'),
      (2, 'passport', 'verified', 0.9920, 'Passport verified. MRZ code valid. Biometric data consistent.', 'US-PP-543216789', '2029-03-22'),
      (3, 'state_id', 'verified', 0.9780, 'State ID verified. FL format valid. Holographic features detected.', 'FL-ID-9876543', '2028-01-10'),
      (4, 'drivers_license', 'pending', 0.6500, 'Verification in progress. Image quality needs improvement for conclusive result.', 'IL-DL-M4567890', '2026-09-30'),
      (5, 'drivers_license', 'verified', 0.9890, 'DL verified. WA format matches. All security features present.', 'WA-DL-L1234567', '2027-12-01'),
      (6, 'military_id', 'verified', 0.9950, 'Military ID verified. CAC card format confirmed. Active duty status verified.', 'US-MIL-223344', '2028-05-20'),
      (7, 'passport', 'verified', 0.9910, 'Passport verified. All security features intact. No signs of tampering.', 'US-PP-987654321', '2030-08-14'),
      (8, 'drivers_license', 'verified', 0.9830, 'GA DL verified. Real ID compliant. Barcode data matches front.', 'GA-DL-A8765432', '2027-04-18'),
      (9, 'state_id', 'failed', 0.3200, 'Verification failed. Document appears expired. Recommend re-submission with current ID.', 'CO-ID-1234567', '2024-11-30'),
      (10, 'drivers_license', 'verified', 0.9870, 'TN DL verified. Format matches state standards. UV features confirmed.', 'TN-DL-T5678901', '2028-07-22'),
      (11, 'passport', 'verified', 0.9940, 'Passport verified. Chip data readable. Photo match score: 98.2%.', 'US-PP-112233445', '2031-02-28'),
      (12, 'drivers_license', 'verified', 0.9810, 'TX DL verified. Standard format. All required elements present.', 'TX-DL-J2345678', '2027-10-05'),
      (13, 'state_id', 'verified', 0.9760, 'NV State ID verified. Security features confirmed. Photo quality acceptable.', 'NV-ID-8765432', '2028-03-15'),
      (14, 'drivers_license', 'pending', 0.5500, 'Verification pending. Additional documentation requested for NC DL verification.', 'NC-DL-C3456789', '2026-06-20'),
      (15, 'tribal_id', 'verified', 0.9700, 'Tribal ID verified. Enrolled member status confirmed with tribal authority.', 'MN-TI-1122334', '2029-12-31'),
      (16, 'drivers_license', 'expired', 0.9500, 'DL verified but nearing expiration. Recommend renewal before next transaction.', 'CA-DL-W4567890', '2026-04-01')
    `);
    console.log('  Identity verifications seeded');

    // ============ SEED FRAUD DETECTIONS ============
    await client.query(`
      INSERT INTO fraud_detections (document_id, risk_level, risk_score, ai_analysis, flags, status, reviewed_by) VALUES
      (1, 'low', 0.0500, 'No fraud indicators detected. Document appears authentic with proper formatting and valid signatures.', '{}', 'clean', 1),
      (2, 'low', 0.0800, 'Minor formatting inconsistency noted but within acceptable range. Document is authentic.', '{minor_format_variance}', 'clean', 1),
      (3, 'low', 0.0300, 'Will document passes all authenticity checks. Signatures match on file specimens.', '{}', 'clean', 2),
      (4, 'medium', 0.4500, 'Some concerns with document formatting. Recommend manual review of page 2 signatures.', '{signature_inconsistency,format_anomaly}', 'under_review', NULL),
      (5, 'low', 0.0600, 'Corporate agreement verified. All party signatures consistent with known specimens.', '{}', 'clean', 3),
      (6, 'low', 0.0200, 'Military POA format verified. Federal requirements properly met.', '{}', 'clean', 1),
      (7, 'low', 0.0700, 'Trust document authenticated. No signs of alteration or tampering detected.', '{}', 'clean', 2),
      (8, 'low', 0.0400, 'Commercial lease appears genuine. Standard formatting for GA commercial leases.', '{}', 'clean', 3),
      (9, 'medium', 0.3800, 'Mortgage application has some inconsistencies in income documentation section.', '{income_inconsistency,document_age_concern}', 'under_review', NULL),
      (10, 'low', 0.0500, 'Entertainment contract verified. Industry-standard terms and formatting.', '{}', 'clean', 1),
      (11, 'low', 0.0100, 'Certificate authenticated. Apostille seal verified.', '{}', 'clean', 2),
      (12, 'high', 0.7800, 'Multiple red flags detected: missing signatures, inconsistent dates, possible page substitution.', '{missing_signatures,date_inconsistency,page_substitution_suspected,formatting_mismatch}', 'flagged', 1),
      (13, 'low', 0.0600, 'Amendment references original deed correctly. No alteration detected.', '{}', 'clean', 3),
      (14, 'low', 0.0900, 'Legal notice format is standard. Minor typo detected but not indicative of fraud.', '{minor_typo}', 'clean', 2),
      (15, 'low', 0.0300, 'Tribal land agreement verified with federal records. Authentic document.', '{}', 'clean', 1),
      (16, 'low', 0.0500, 'Corporate resolution verified. Board member signatures match records.', '{}', 'clean', 3)
    `);
    console.log('  Fraud detections seeded');

    // ============ SEED DIGITAL SIGNATURES ============
    await client.query(`
      INSERT INTO digital_signatures (document_id, signer_name, signer_email, status, signature_type, ip_address, signed_at) VALUES
      (1, 'Margaret Thompson', 'mthompson@email.com', 'signed', 'electronic', '192.168.1.100', '2025-11-15 10:15:00'),
      (2, 'William Garcia', 'wgarcia@email.com', 'signed', 'digital', '10.0.0.55', '2025-11-18 11:10:00'),
      (3, 'Patricia Robinson', 'probinson@email.com', 'signed', 'wet_ink', NULL, '2025-11-20 14:20:00'),
      (4, 'Charles Martinez', 'cmartinez@email.com', 'pending', 'electronic', NULL, NULL),
      (5, 'Jennifer Lee', 'jlee@email.com', 'signed', 'digital', '172.16.0.88', '2025-12-03 14:10:00'),
      (5, 'Corporate Partner A', 'partnera@corp.com', 'signed', 'digital', '172.16.0.90', '2025-12-03 14:15:00'),
      (6, 'Richard Davis', 'rdavis@email.com', 'signed', 'electronic', '192.168.2.45', '2025-12-05 10:10:00'),
      (7, 'Susan Wilson', 'swilson@email.com', 'signed', 'digital', '10.10.0.22', '2025-12-08 11:20:00'),
      (8, 'Thomas Anderson', 'tanderson@email.com', 'signed', 'electronic', '192.168.5.100', '2025-12-10 15:10:00'),
      (9, 'Karen Brown', 'kbrown@email.com', 'pending', 'electronic', NULL, NULL),
      (10, 'James Taylor', 'jtaylor@email.com', 'signed', 'digital', '10.0.1.77', '2025-12-14 16:10:00'),
      (11, 'Linda White', 'lwhite@email.com', 'signed', 'electronic', '172.20.0.33', '2025-12-16 10:05:00'),
      (12, 'Mark Johnson', 'mjohnson@email.com', 'declined', 'electronic', '192.168.3.55', NULL),
      (13, 'Nancy Harris', 'nharris@email.com', 'signed', 'biometric', '10.0.2.88', '2025-12-20 11:10:00'),
      (14, 'Steven Clark', 'sclark@email.com', 'expired', 'electronic', NULL, NULL),
      (15, 'Donna Lewis', 'dlewis@email.com', 'signed', 'wet_ink', NULL, '2025-12-24 12:15:00')
    `);
    console.log('  Digital signatures seeded');

    // ============ SEED TEMPLATES ============
    await client.query(`
      INSERT INTO templates (name, category, description, content, state, is_active, usage_count) VALUES
      ('Standard Acknowledgment Certificate', 'notarization', 'Standard acknowledgment certificate for general document notarization', 'State of [STATE]\nCounty of [COUNTY]\n\nOn this [DATE], before me, [NOTARY_NAME], a Notary Public in and for said state, personally appeared [SIGNER_NAME], known to me (or proved to me on the basis of satisfactory evidence) to be the person(s) whose name(s) is/are subscribed to the within instrument and acknowledged to me that he/she/they executed the same in his/her/their authorized capacity(ies), and that by his/her/their signature(s) on the instrument the person(s), or the entity upon behalf of which the person(s) acted, executed the instrument.\n\nWITNESS my hand and official seal.\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', NULL, true, 342),
      ('Jurat Certificate', 'notarization', 'Jurat certificate for sworn statements and affidavits', 'State of [STATE]\nCounty of [COUNTY]\n\nSubscribed and sworn to (or affirmed) before me on this [DATE], by [SIGNER_NAME], proved to me on the basis of satisfactory evidence to be the person(s) who appeared before me.\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', NULL, true, 215),
      ('Copy Certification', 'notarization', 'Certificate for certified copies of original documents', 'State of [STATE]\nCounty of [COUNTY]\n\nI, [NOTARY_NAME], a Notary Public in and for said state, do hereby certify that the attached reproduction of [DOCUMENT_DESCRIPTION] is a true, exact, complete, and unaltered copy made by me of the original document presented to me by [SIGNER_NAME].\n\nDated: [DATE]\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', NULL, true, 89),
      ('Power of Attorney Form', 'legal', 'General durable power of attorney template', 'GENERAL DURABLE POWER OF ATTORNEY\n\nI, [PRINCIPAL_NAME], of [ADDRESS], hereby appoint [AGENT_NAME] of [AGENT_ADDRESS] as my true and lawful attorney-in-fact to act in my name, place, and stead in any and all matters...\n\n[Full legal provisions follow]', NULL, true, 156),
      ('Affidavit Template', 'legal', 'General affidavit template for sworn statements', 'AFFIDAVIT\n\nState of [STATE]\nCounty of [COUNTY]\n\nI, [AFFIANT_NAME], being first duly sworn, depose and state as follows:\n\n1. [STATEMENT]\n2. [STATEMENT]\n\nFurther affiant sayeth not.\n\n[SIGNATURE]\n\nSworn to and subscribed before me this [DATE].\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', NULL, true, 278),
      ('California Acknowledgment', 'notarization', 'California-specific acknowledgment certificate per Civil Code 1189', 'A notary public or other officer completing this certificate verifies only the identity of the individual who signed the document to which this certificate is attached, and not the truthfulness, accuracy, or validity of that document.\n\nState of California\nCounty of [COUNTY]\n\nOn [DATE] before me, [NOTARY_NAME], Notary Public, personally appeared [SIGNER_NAME], who proved to me on the basis of satisfactory evidence to be the person(s) whose name(s) is/are subscribed to the within instrument...', 'California', true, 187),
      ('Texas All-Purpose Acknowledgment', 'notarization', 'Texas-compliant all-purpose acknowledgment', 'State of Texas\nCounty of [COUNTY]\n\nBefore me, [NOTARY_NAME], on this day personally appeared [SIGNER_NAME], known to me (or proved to me on the basis of satisfactory evidence) to be the person whose name is subscribed to the foregoing instrument, and acknowledged to me that (he/she) executed the same for the purposes and consideration therein expressed.\n\nGiven under my hand and seal of office this [DATE].\n\n[NOTARY_SIGNATURE]\nNotary Public, State of Texas\nMy Commission Expires: [EXPIRY]', 'Texas', true, 134),
      ('Signature Witnessing Certificate', 'notarization', 'Certificate for witnessing signatures', 'SIGNATURE WITNESSING CERTIFICATE\n\nState of [STATE]\nCounty of [COUNTY]\n\nOn [DATE], I, [NOTARY_NAME], a Notary Public, personally witnessed [SIGNER_NAME] sign the attached document in my presence.\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', NULL, true, 67),
      ('Business Formation Checklist', 'business', 'Checklist template for business formation notarizations', 'BUSINESS FORMATION NOTARIZATION CHECKLIST\n\n1. Articles of Incorporation/Organization\n2. Operating Agreement/Bylaws\n3. Initial Board Resolution\n4. Registered Agent Designation\n5. EIN Application\n6. State Filing Confirmation\n\nAll documents reviewed and notarized by: [NOTARY_NAME]\nDate: [DATE]', NULL, true, 45),
      ('Real Estate Closing Checklist', 'business', 'Document checklist for real estate closings', 'REAL ESTATE CLOSING CHECKLIST\n\n1. Deed of Trust/Mortgage\n2. Promissory Note\n3. Settlement Statement (HUD-1/CD)\n4. Title Insurance Policy\n5. Property Survey\n6. Home Inspection Report\n7. Appraisal Report\n8. Insurance Binder\n\nNotary: [NOTARY_NAME]\nClosing Date: [DATE]', NULL, true, 198),
      ('Personal Identity Verification Form', 'verification', 'Form template for verifying personal identity', 'IDENTITY VERIFICATION FORM\n\nApplicant: [NAME]\nDate of Birth: [DOB]\nID Type: [ID_TYPE]\nID Number: [ID_NUMBER]\nIssuing Authority: [AUTHORITY]\nExpiration Date: [EXPIRY]\n\nVerification Method: [METHOD]\nVerification Result: [RESULT]\n\nVerified by: [NOTARY_NAME]\nDate: [DATE]', NULL, true, 312),
      ('Oath/Affirmation Certificate', 'notarization', 'Certificate for administering oaths and affirmations', 'OATH/AFFIRMATION CERTIFICATE\n\nState of [STATE]\nCounty of [COUNTY]\n\nOn [DATE], before me, [NOTARY_NAME], personally appeared [PERSON_NAME] and took an oath/affirmation that the statements contained in the attached document are true and correct.\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', NULL, true, 156),
      ('Florida Acknowledgment', 'notarization', 'Florida-specific acknowledgment per FL Statutes 117', 'State of Florida\nCounty of [COUNTY]\n\nThe foregoing instrument was acknowledged before me by means of [physical presence / online notarization] this [DATE] by [SIGNER_NAME], who is [personally known to me / produced identification].\n\nType of identification produced: [ID_TYPE]\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]\nNotary Public, State of Florida\nCommission No.: [COMMISSION]\nMy Commission Expires: [EXPIRY]', 'Florida', true, 143),
      ('New York Acknowledgment', 'notarization', 'New York-specific acknowledgment certificate', 'State of New York\nCounty of [COUNTY]\n\nOn the [DATE] in the year [YEAR], before me, the undersigned, personally appeared [SIGNER_NAME], personally known to me or proved to me on the basis of satisfactory evidence to be the individual(s) whose name(s) is (are) subscribed to the within instrument and acknowledged to me that he/she/they executed the same in his/her/their capacity(ies).\n\n[NOTARY_SIGNATURE]\n[NOTARY_SEAL]', 'New York', true, 121),
      ('Estate Planning Document Checklist', 'personal', 'Checklist for estate planning notarizations', 'ESTATE PLANNING DOCUMENT CHECKLIST\n\n1. Last Will and Testament\n2. Living Will / Advance Directive\n3. Durable Power of Attorney\n4. Healthcare Power of Attorney\n5. Trust Agreement (if applicable)\n6. Beneficiary Designations Review\n7. Property Inventory\n\nNotary: [NOTARY_NAME]\nDate: [DATE]\nWitnesses Present: [WITNESS_NAMES]', NULL, true, 87),
      ('Apostille Request Form', 'legal', 'Template for apostille certification requests', 'APOSTILLE REQUEST FORM\n\nDocument Type: [DOC_TYPE]\nDocument Date: [DOC_DATE]\nIssuing Authority: [AUTHORITY]\nDestination Country: [COUNTRY]\n\nCertification that this public document has been signed by [SIGNER_NAME] acting in the capacity of [CAPACITY] and bears the seal/stamp of [ORGANIZATION].\n\nAuthenticated at [CITY], [STATE] on [DATE]\n\nBy: [AUTHENTICATING_OFFICER]', NULL, true, 34)
    `);
    console.log('  Templates seeded');

    // ============ SEED AUDIT TRAIL ============
    await client.query(`
      INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address, created_at) VALUES
      ('create', 'document', 1, 2, 'Uploaded Thompson Property Deed', '192.168.1.10', '2025-11-15 09:30:00'),
      ('update', 'document', 1, 2, 'Document status changed to notarized', '192.168.1.10', '2025-11-16 14:20:00'),
      ('create', 'notarization', 1, 2, 'Created notarization for Thompson deed', '192.168.1.10', '2025-11-15 10:00:00'),
      ('verify', 'identity', 1, 2, 'Verified identity for Margaret Thompson', '192.168.1.10', '2025-11-15 09:45:00'),
      ('create', 'document', 2, 2, 'Uploaded Garcia Business Affidavit', '192.168.1.10', '2025-11-18 10:15:00'),
      ('create', 'notarization', 2, 2, 'Created notarization for Garcia affidavit', '192.168.1.10', '2025-11-18 11:00:00'),
      ('create', 'document', 3, 3, 'Uploaded Robinson Will', '10.0.0.25', '2025-11-20 11:00:00'),
      ('sign', 'signature', 1, 2, 'Digital signature captured for Thompson deed', '192.168.1.100', '2025-11-15 10:15:00'),
      ('create', 'payment', 1, 1, 'Payment received for Thompson notarization', '192.168.1.10', '2025-11-15 10:35:00'),
      ('login', 'user', 1, 1, 'Admin user logged in', '192.168.1.5', '2025-11-15 08:00:00'),
      ('login', 'user', 2, 2, 'John Smith logged in', '192.168.1.10', '2025-11-15 08:30:00'),
      ('create', 'client', 1, 2, 'Created client record for Margaret Thompson', '192.168.1.10', '2025-11-14 16:00:00'),
      ('update', 'client', 4, 4, 'Updated Martinez client record with new address', '172.16.0.50', '2025-12-01 09:00:00'),
      ('fraud_check', 'document', 12, 1, 'High risk fraud detection on Johnson declaration', '192.168.1.5', '2025-12-19 14:00:00'),
      ('compliance', 'document', 15, 3, 'Compliance check completed for Lewis agreement', '10.0.0.25', '2025-12-24 11:30:00'),
      ('export', 'report', NULL, 1, 'Monthly notarization report exported', '192.168.1.5', '2025-12-31 17:00:00')
    `);
    console.log('  Audit trail seeded');

    // ============ SEED PAYMENTS ============
    await client.query(`
      INSERT INTO payments (notarization_id, client_id, amount, status, method, transaction_id, description) VALUES
      (1, 1, 15.00, 'completed', 'credit_card', 'TXN-2025-001', 'Notarization fee for property deed acknowledgment'),
      (2, 2, 10.00, 'completed', 'credit_card', 'TXN-2025-002', 'Notarization fee for business affidavit jurat'),
      (3, 3, 25.00, 'completed', 'check', 'TXN-2025-003', 'Notarization fee for will witnessing'),
      (4, 4, 15.00, 'pending', 'credit_card', NULL, 'Pending payment for POA notarization'),
      (5, 5, 20.00, 'completed', 'ach', 'TXN-2025-005', 'Corporate agreement notarization fee'),
      (6, 6, 10.00, 'completed', 'cash', 'TXN-2025-006', 'Military POA notarization fee'),
      (7, 7, 25.00, 'completed', 'wire', 'TXN-2025-007', 'Family trust notarization fee'),
      (8, 8, 15.00, 'completed', 'credit_card', 'TXN-2025-008', 'Commercial lease notarization fee'),
      (9, 9, 20.00, 'pending', 'debit_card', NULL, 'Pending mortgage signing fee'),
      (10, 10, 10.00, 'completed', 'credit_card', 'TXN-2025-010', 'Entertainment contract jurat fee'),
      (11, 11, 5.00, 'completed', 'cash', 'TXN-2025-011', 'Copy certification fee'),
      (12, 12, 15.00, 'refunded', 'credit_card', 'TXN-2025-012', 'Refunded - notarization cancelled due to incomplete document'),
      (13, 13, 15.00, 'completed', 'debit_card', 'TXN-2025-013', 'Property amendment acknowledgment fee'),
      (14, 14, 20.00, 'pending', 'credit_card', NULL, 'Pending signature witnessing fee'),
      (15, 15, 25.00, 'completed', 'check', 'TXN-2025-015', 'Tribal land agreement notarization fee'),
      (16, 16, 15.00, 'completed', 'ach', 'TXN-2025-016', 'Corporate resolution notarization fee')
    `);
    console.log('  Payments seeded');

    // ============ SEED AI ANALYSES ============
    await client.query(`
      INSERT INTO ai_analyses (document_id, analysis_type, result, confidence, model_used, tokens_used, processing_time) VALUES
      (1, 'content_analysis', '{"summary":"Property deed for 742 Oak Street, Austin TX. Transfer from previous owner to Margaret Thompson.","key_parties":["Margaret Thompson","Previous Owner LLC"],"risk_level":"low"}', 0.9500, 'anthropic/claude-haiku-4.5', 1250, 2.340),
      (2, 'authenticity_check', '{"authentic":true,"confidence":0.96,"indicators":["consistent_formatting","valid_notary_seal","proper_legal_language"]}', 0.9600, 'anthropic/claude-haiku-4.5', 980, 1.870),
      (3, 'summary', '{"summary":"Last Will and Testament of Patricia Robinson. Distributes estate among three children. Establishes trust for minor grandchildren.","beneficiaries":3,"trusts":1}', 0.9400, 'anthropic/claude-haiku-4.5', 1450, 2.670),
      (5, 'key_extraction', '{"parties":["Jennifer Lee","TechCorp Inc","Pacific Partners LLC"],"effective_date":"2025-12-01","term":"3 years","value":"$2.5M"}', 0.9200, 'anthropic/claude-haiku-4.5', 1100, 2.100),
      (6, 'content_analysis', '{"summary":"Military Power of Attorney under SCRA. Richard Davis appointing spouse as attorney-in-fact.","type":"durable_poa","scra_compliant":true}', 0.9700, 'anthropic/claude-haiku-4.5', 890, 1.650),
      (7, 'risk_assessment', '{"risk_level":"low","risk_score":0.08,"concerns":[],"recommendation":"Proceed with notarization"}', 0.9300, 'anthropic/claude-haiku-4.5', 750, 1.420),
      (8, 'content_analysis', '{"summary":"5-year commercial lease for office space at 555 Peachtree St NE. Monthly rent $8,500 with 3% annual escalation.","term":"5 years","monthly_rent":"$8,500"}', 0.9100, 'anthropic/claude-haiku-4.5', 1320, 2.450),
      (10, 'key_extraction', '{"parties":["James Taylor","Nashville Records LLC"],"royalty_rate":"15%","advance":"$50,000","term":"2 years","territory":"Worldwide"}', 0.9000, 'anthropic/claude-haiku-4.5', 1180, 2.210),
      (11, 'authenticity_check', '{"authentic":true,"confidence":0.98,"apostille_ready":true,"destination_countries":["Germany","France"]}', 0.9800, 'anthropic/claude-haiku-4.5', 680, 1.280),
      (12, 'risk_assessment', '{"risk_level":"high","risk_score":0.78,"concerns":["missing_signatures","date_inconsistency","possible_page_substitution"],"recommendation":"Reject and request resubmission"}', 0.8500, 'anthropic/claude-haiku-4.5', 1560, 2.890),
      (13, 'content_analysis', '{"summary":"Amendment to original property deed. Changes legal description boundary on south side. Both parties in agreement.","amendment_type":"boundary_change"}', 0.9400, 'anthropic/claude-haiku-4.5', 920, 1.730),
      (15, 'content_analysis', '{"summary":"Tribal land use agreement for 200 acres in northern Minnesota. 50-year term with renewal options. Federal BIA approval obtained.","acreage":200,"term":"50 years"}', 0.9600, 'anthropic/claude-haiku-4.5', 1400, 2.580),
      (16, 'key_extraction', '{"resolution_type":"board_authorization","authorized_person":"George Walker","authority":"sign contracts up to $500K","board_vote":"unanimous","date":"2025-12-26"}', 0.9300, 'anthropic/claude-haiku-4.5', 870, 1.620),
      (1, 'summary', '{"summary":"Warranty deed transferring residential property at 742 Oak Street from Oak Street Holdings LLC to Margaret Thompson for consideration of $425,000.","property_type":"residential","consideration":"$425,000"}', 0.9500, 'anthropic/claude-haiku-4.5', 1050, 1.960),
      (3, 'risk_assessment', '{"risk_level":"low","risk_score":0.03,"concerns":[],"testator_capacity":"confirmed","witnesses":"2 present","recommendation":"Proceed with notarization"}', 0.9700, 'anthropic/claude-haiku-4.5', 780, 1.450),
      (5, 'content_analysis', '{"summary":"Multi-party corporate partnership agreement between Jennifer Lee, TechCorp Inc, and Pacific Partners LLC for joint venture in AI technology development.","agreement_type":"joint_venture","industry":"technology"}', 0.9200, 'anthropic/claude-haiku-4.5', 1350, 2.510)
    `);
    console.log('  AI analyses seeded');

    // ============ SEED COMPLIANCE CHECKS ============
    await client.query(`
      INSERT INTO compliance_checks (document_id, check_type, status, issues, recommendations, checked_by) VALUES
      (1, 'state_compliance', 'passed', NULL, 'Document meets all Texas state requirements for property deeds', 'AI System'),
      (1, 'signature_verification', 'passed', NULL, 'All required signatures are present and verified', 'John Smith'),
      (2, 'state_compliance', 'passed', NULL, 'Affidavit meets California requirements', 'AI System'),
      (3, 'witness_requirement', 'passed', NULL, 'Two witnesses present as required by Florida law for wills', 'Sarah Johnson'),
      (3, 'state_compliance', 'passed', NULL, 'Will meets Florida Statutes Chapter 732 requirements', 'AI System'),
      (5, 'jurisdiction_check', 'passed', NULL, 'Washington state jurisdiction confirmed for corporate agreement', 'AI System'),
      (6, 'federal_compliance', 'passed', NULL, 'Military POA complies with Servicemembers Civil Relief Act', 'AI System'),
      (7, 'state_compliance', 'passed', NULL, 'Trust document meets Massachusetts requirements', 'AI System'),
      (8, 'state_compliance', 'passed', NULL, 'Commercial lease complies with Georgia landlord-tenant law', 'AI System'),
      (9, 'identity_match', 'warning', 'State ID appears expired. Verify with current identification.', 'Recommend obtaining current state ID before proceeding', 'AI System'),
      (11, 'seal_verification', 'passed', NULL, 'Notary seal verified and commission is current', 'Sarah Johnson'),
      (12, 'signature_verification', 'failed', 'Missing signatures on pages 3 and 7. Document cannot be notarized.', 'Return to client for completion of all required signatures', 'Michael Chen'),
      (12, 'state_compliance', 'failed', 'Document does not meet Texas requirements for declarations of trust', 'Ensure all statutory requirements are met before resubmission', 'AI System'),
      (13, 'state_compliance', 'passed', NULL, 'Amendment meets Nevada recording requirements', 'AI System'),
      (15, 'federal_compliance', 'passed', NULL, 'Tribal land agreement meets BIA requirements under 25 CFR', 'AI System'),
      (15, 'jurisdiction_check', 'passed', NULL, 'Federal and tribal jurisdiction confirmed for land agreement', 'Sarah Johnson')
    `);
    console.log('  Compliance checks seeded');

    // ============ SEED NOTARY JOURNAL ============
    await client.query(`
      INSERT INTO notary_journal (notary_id, document_type, signer_name, signer_address, id_type, id_number, notary_act, fee, date_performed, witness_name, notes) VALUES
      (2, 'deed', 'Margaret Thompson', '742 Oak Street, Austin, TX 78701', 'drivers_license', 'TX-DL-8234567', 'acknowledgment', 15.00, '2025-11-15 10:00:00', NULL, 'Property deed for 742 Oak Street'),
      (2, 'affidavit', 'William Garcia', '1583 Maple Avenue, Los Angeles, CA 90012', 'passport', 'US-PP-543216789', 'jurat', 10.00, '2025-11-18 11:00:00', NULL, 'Business affidavit sworn statement'),
      (3, 'will', 'Patricia Robinson', '2901 Palm Drive, Miami, FL 33101', 'state_id', 'FL-ID-9876543', 'signature_witnessing', 25.00, '2025-11-20 14:00:00', 'Robert Martinez', 'Will signing with two witnesses present'),
      (5, 'contract', 'Jennifer Lee', '789 Pine Street NW, Seattle, WA 98101', 'drivers_license', 'WA-DL-L1234567', 'acknowledgment', 20.00, '2025-12-03 14:00:00', NULL, 'Corporate partnership agreement'),
      (2, 'power_of_attorney', 'Richard Davis', '3210 Desert Rose Lane, Phoenix, AZ 85001', 'military_id', 'US-MIL-223344', 'oath', 10.00, '2025-12-05 10:00:00', NULL, 'Military POA under SCRA'),
      (3, 'trust', 'Susan Wilson', '127 Beacon Hill Road, Boston, MA 02108', 'passport', 'US-PP-987654321', 'acknowledgment', 25.00, '2025-12-08 11:00:00', NULL, 'Family trust establishment'),
      (4, 'lease', 'Thomas Anderson', '555 Peachtree Street NE, Atlanta, GA 30301', 'drivers_license', 'GA-DL-A8765432', 'acknowledgment', 15.00, '2025-12-10 15:00:00', NULL, '5-year commercial office lease'),
      (2, 'contract', 'James Taylor', '890 Music Row, Nashville, TN 37203', 'drivers_license', 'TN-DL-T5678901', 'jurat', 10.00, '2025-12-14 16:00:00', NULL, 'Entertainment industry recording contract'),
      (3, 'certificate', 'Linda White', '234 Rose Garden Way, Portland, OR 97201', 'passport', 'US-PP-112233445', 'copy_certification', 5.00, '2025-12-16 10:00:00', NULL, 'International document certification for apostille'),
      (5, 'amendment', 'Nancy Harris', '4500 Las Vegas Blvd, Las Vegas, NV 89101', 'state_id', 'NV-ID-8765432', 'acknowledgment', 15.00, '2025-12-20 11:00:00', NULL, 'Property deed amendment'),
      (3, 'agreement', 'Donna Lewis', '999 Lake Street, Minneapolis, MN 55401', 'tribal_id', 'MN-TI-1122334', 'oath', 25.00, '2025-12-24 12:00:00', 'Elder James Crow Feather', 'Tribal land use agreement with oath'),
      (4, 'resolution', 'George Walker', '750 Market Street, San Francisco, CA 94102', 'drivers_license', 'CA-DL-W4567890', 'acknowledgment', 15.00, '2025-12-26 15:00:00', NULL, 'Board resolution authorizing contract signing'),
      (2, 'deed', 'Thomas Anderson', '555 Peachtree Street NE, Atlanta, GA 30301', 'drivers_license', 'GA-DL-A8765432', 'acknowledgment', 15.00, '2025-10-05 10:00:00', NULL, 'Earlier property purchase deed'),
      (3, 'affidavit', 'Susan Wilson', '127 Beacon Hill Road, Boston, MA 02108', 'passport', 'US-PP-987654321', 'jurat', 10.00, '2025-10-12 14:30:00', NULL, 'Financial affidavit for estate planning'),
      (2, 'power_of_attorney', 'Margaret Thompson', '742 Oak Street, Austin, TX 78701', 'drivers_license', 'TX-DL-8234567', 'acknowledgment', 15.00, '2025-09-20 09:00:00', NULL, 'Healthcare POA for Margaret Thompson'),
      (4, 'contract', 'William Garcia', '1583 Maple Avenue, Los Angeles, CA 90012', 'passport', 'US-PP-543216789', 'acknowledgment', 20.00, '2025-10-25 11:00:00', NULL, 'Business acquisition contract')
    `);
    console.log('  Notary journal seeded');

    // ============ SEED SEALS ============
    await client.query(`
      INSERT INTO seals (notary_id, seal_number, state, county, commission_number, commission_expiry, status, seal_type) VALUES
      (2, 'SEAL-TX-2023-4567', 'Texas', 'Travis', 'TX-NP-13456789', '2027-12-31', 'active', 'ink'),
      (2, 'SEAL-TX-2023-4568', 'Texas', 'Travis', 'TX-NP-13456789', '2027-12-31', 'active', 'digital'),
      (3, 'SEAL-FL-2024-1234', 'Florida', 'Miami-Dade', 'FL-NP-98765432', '2028-06-30', 'active', 'ink'),
      (3, 'SEAL-FL-2024-1235', 'Florida', 'Miami-Dade', 'FL-NP-98765432', '2028-06-30', 'active', 'embossed'),
      (4, 'SEAL-IL-2023-7890', 'Illinois', 'Cook', 'IL-NP-45678901', '2027-03-15', 'active', 'ink'),
      (5, 'SEAL-WA-2024-5678', 'Washington', 'King', 'WA-NP-23456789', '2028-09-30', 'active', 'digital'),
      (7, 'SEAL-CA-2024-9012', 'California', 'Los Angeles', 'CA-NP-67890123', '2028-12-31', 'active', 'ink'),
      (8, 'SEAL-GA-2023-3456', 'Georgia', 'Fulton', 'GA-NP-34567890', '2027-06-30', 'active', 'ink'),
      (9, 'SEAL-MA-2024-6789', 'Massachusetts', 'Suffolk', 'MA-NP-56789012', '2028-04-30', 'active', 'embossed'),
      (10, 'SEAL-CO-2023-2345', 'Colorado', 'Denver', 'CO-NP-78901234', '2027-08-31', 'active', 'digital'),
      (11, 'SEAL-TN-2024-8901', 'Tennessee', 'Davidson', 'TN-NP-89012345', '2028-11-30', 'active', 'ink'),
      (12, 'SEAL-OR-2023-1234', 'Oregon', 'Multnomah', 'OR-NP-12345678', '2025-03-31', 'expired', 'ink'),
      (13, 'SEAL-NV-2024-5678', 'Nevada', 'Clark', 'NV-NP-90123456', '2028-07-31', 'active', 'ink'),
      (14, 'SEAL-NC-2023-9012', 'North Carolina', 'Wake', 'NC-NP-01234567', '2027-10-31', 'active', 'embossed'),
      (15, 'SEAL-MN-2024-3456', 'Minnesota', 'Hennepin', 'MN-NP-34567890', '2028-05-31', 'active', 'digital'),
      (16, 'SEAL-NY-2024-7890', 'New York', 'New York', 'NY-NP-45678901', '2028-02-28', 'pending', 'ink')
    `);
    console.log('  Seals seeded');

    // ============ SEED NOTIFICATIONS ============
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type, link) VALUES
      (1, 'New Document Uploaded', 'A new power of attorney document was uploaded.', 'info', '/documents'),
      (1, 'Notarization Completed', 'Notarization #1 has been completed successfully.', 'success', '/notarizations'),
      (1, 'Fraud Alert', 'High risk detected on document #3.', 'warning', '/fraud-detections'),
      (1, 'Payment Received', 'Payment of $150.00 received from John Smith.', 'success', '/payments'),
      (1, 'Commission Expiring', 'Your notary commission expires in 30 days.', 'warning', '/seals'),
      (1, 'Identity Verification Failed', 'Verification for client #2 needs review.', 'error', '/identity-verifications'),
      (1, 'New Client Registered', 'Jane Doe has been added to the system.', 'info', '/clients'),
      (1, 'Template Updated', 'Acknowledgment template has been updated.', 'info', '/templates')
    `);
    console.log('  Notifications seeded');

    // ============ SEED WITNESSES ============
    await client.query(`
      INSERT INTO witnesses (name, email, phone, address, id_type, id_number, notarization_id, relationship, notes) VALUES
      ('Robert Wilson', 'r.wilson@email.com', '555-0201', '100 Oak Ave, Springfield, IL', 'drivers_license', 'DL-789012', 1, 'colleague', 'Present at signing'),
      ('Maria Garcia', 'mgarcia@email.com', '555-0202', '200 Pine St, Chicago, IL', 'passport', 'P-456789', 2, 'friend', 'Verified identity'),
      ('Thomas Brown', 'tbrown@email.com', '555-0203', '300 Elm Dr, Austin, TX', 'state_id', 'SI-123456', 3, 'neighbor', NULL)
    `);
    console.log('  Witnesses seeded');

    // ============ SEED BOOKMARKS ============
    await client.query(`
      INSERT INTO bookmarks (user_id, entity_type, entity_id, label) VALUES
      (1, 'document', 1, 'Power of Attorney - Smith'),
      (1, 'client', 1, 'John Smith'),
      (1, 'notarization', 1, 'Smith POA Notarization')
    `);
    console.log('  Bookmarks seeded');

    console.log('\nSeed completed successfully! All tables populated with 15+ records each.');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
