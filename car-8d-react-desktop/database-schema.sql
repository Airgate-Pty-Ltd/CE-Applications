-- ====================================================
-- CAR 8D Desktop Application — SQLite Schema
-- ====================================================
-- Database: app.db
-- Location: ./data/app.db
-- Version: 1.0
-- Created: 2026-07-18

-- ====================================================
-- TABLES
-- ====================================================

-- CARS: Main 8D records
-- Stores metadata for each Corrective Action Report
CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  owner TEXT,
  email TEXT,
  created_date TEXT,
  updated_date TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DISCIPLINES: D0-D8 data for each CAR
-- Stores the content and status of each discipline
CREATE TABLE IF NOT EXISTS disciplines (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  discipline_id TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_email TEXT,
  verified_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(car_id, discipline_id)
);

-- OWNERS: Team members assigned to disciplines
-- Tracks who is responsible for each discipline
CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discipline_id TEXT NOT NULL,
  car_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  date_added TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- AUDIT_LOG: Complete change history
-- Every action logged with timestamp and details
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL,
  car_id TEXT NOT NULL,
  discipline_id TEXT,
  details JSON,
  user_id TEXT,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- ====================================================
-- INDEXES (for performance)
-- ====================================================

CREATE INDEX IF NOT EXISTS idx_disciplines_car_id ON disciplines(car_id);
CREATE INDEX IF NOT EXISTS idx_owners_car_id ON owners(car_id);
CREATE INDEX IF NOT EXISTS idx_owners_discipline_id ON owners(discipline_id);
CREATE INDEX IF NOT EXISTS idx_audit_car_id ON audit_log(car_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

-- ====================================================
-- VIEWS (for analysis)
-- ====================================================

-- CAR Summary: Progress at a glance
CREATE VIEW IF NOT EXISTS vw_car_summary AS
SELECT
  c.id,
  c.title,
  c.owner,
  c.created_date,
  COUNT(DISTINCT CASE WHEN d.status = 'complete' THEN d.id END) as completed_disciplines,
  COUNT(DISTINCT CASE WHEN d.verified = 1 THEN d.id END) as verified_disciplines,
  COUNT(DISTINCT d.id) as total_disciplines,
  CAST(COUNT(DISTINCT CASE WHEN d.status = 'complete' THEN d.id END) AS FLOAT) /
    NULLIF(COUNT(DISTINCT d.id), 0) * 100 as completion_percentage
FROM cars c
LEFT JOIN disciplines d ON c.id = d.car_id
WHERE c.status = 'active'
GROUP BY c.id;

-- Discipline Summary: Owners and verification status
CREATE VIEW IF NOT EXISTS vw_discipline_summary AS
SELECT
  d.car_id,
  d.discipline_id,
  d.status,
  d.verified,
  d.verified_by,
  COUNT(o.id) as owner_count,
  GROUP_CONCAT(o.name, ', ') as owner_names,
  LENGTH(d.notes) as notes_length
FROM disciplines d
LEFT JOIN owners o ON d.id = o.discipline_id
GROUP BY d.car_id, d.discipline_id;

-- Audit Trail: Recent changes
CREATE VIEW IF NOT EXISTS vw_recent_changes AS
SELECT
  a.timestamp,
  a.action,
  a.car_id,
  a.discipline_id,
  a.details,
  c.title as car_title
FROM audit_log a
LEFT JOIN cars c ON a.car_id = c.id
ORDER BY a.timestamp DESC
LIMIT 100;

-- ====================================================
-- SAMPLE DATA (for testing)
-- ====================================================

-- Insert a sample CAR
INSERT OR IGNORE INTO cars
  (id, title, owner, email, created_date, updated_date)
VALUES
  ('CAR-SAMPLE-001', 'Sample CAR - Quality Issue', 'John Doe', 'john@example.com', '2026-07-18', '2026-07-18');

-- Initialize D0-D8 disciplines
INSERT OR IGNORE INTO disciplines
  (id, car_id, discipline_id, status, notes)
VALUES
  ('CAR-SAMPLE-001-d0', 'CAR-SAMPLE-001', 'd0', 'new', ''),
  ('CAR-SAMPLE-001-d1', 'CAR-SAMPLE-001', 'd1', 'new', ''),
  ('CAR-SAMPLE-001-d2', 'CAR-SAMPLE-001', 'd2', 'new', ''),
  ('CAR-SAMPLE-001-d3', 'CAR-SAMPLE-001', 'd3', 'new', ''),
  ('CAR-SAMPLE-001-d4', 'CAR-SAMPLE-001', 'd4', 'new', ''),
  ('CAR-SAMPLE-001-d5', 'CAR-SAMPLE-001', 'd5', 'new', ''),
  ('CAR-SAMPLE-001-d6', 'CAR-SAMPLE-001', 'd6', 'new', ''),
  ('CAR-SAMPLE-001-d7', 'CAR-SAMPLE-001', 'd7', 'new', ''),
  ('CAR-SAMPLE-001-d8', 'CAR-SAMPLE-001', 'd8', 'new', '');

-- ====================================================
-- DATA DICTIONARY
-- ====================================================
/*

TABLE: cars
├── id (TEXT, PRIMARY KEY)
│   └── Format: "CAR-{timestamp}"
│   └── Example: "CAR-1689688800000"
├── title (TEXT, NOT NULL)
│   └── Problem description
├── owner (TEXT, optional)
│   └── Primary CAR owner name
├── email (TEXT, optional)
│   └── Owner email address
├── created_date (TEXT)
│   └── ISO 8601 date (YYYY-MM-DD)
├── updated_date (TEXT)
│   └── Last modification date
├── status (TEXT, DEFAULT 'active')
│   └── Values: 'active' | 'deleted'
├── created_at (DATETIME)
│   └── System timestamp
└── updated_at (DATETIME)
    └── System timestamp

TABLE: disciplines
├── id (TEXT, PRIMARY KEY)
│   └── Format: "{car_id}-{discipline_id}"
│   └── Example: "CAR-1689688800000-d0"
├── car_id (TEXT, FOREIGN KEY)
│   └── References cars.id (cascade delete)
├── discipline_id (TEXT)
│   └── Values: 'd0' | 'd1' | 'd2' | ... | 'd8'
├── status (TEXT, DEFAULT 'new')
│   └── Values: 'new' | 'in-progress' | 'complete'
├── notes (TEXT)
│   └── Discipline content/details
├── verified (BOOLEAN, DEFAULT FALSE)
│   └── True if approved by verifier
├── verified_by (TEXT)
│   └── Approver name
├── verified_email (TEXT)
│   └── Approver email
├── verified_date (TEXT)
│   └── Approval date (YYYY-MM-DD)
├── created_at (DATETIME)
│   └── When discipline created
└── updated_at (DATETIME)
    └── When discipline last edited

TABLE: owners
├── id (INTEGER, PRIMARY KEY AUTO)
│   └── Auto-incrementing identifier
├── discipline_id (TEXT)
│   └── References discipline.id
├── car_id (TEXT, FOREIGN KEY)
│   └── References cars.id (cascade delete)
├── name (TEXT, NOT NULL)
│   └── Owner/team member name
├── email (TEXT)
│   └── Owner email address
├── date_added (TEXT)
│   └── Date assigned (YYYY-MM-DD)
└── created_at (DATETIME)
    └── System timestamp

TABLE: audit_log
├── id (INTEGER, PRIMARY KEY AUTO)
│   └── Auto-incrementing log entry ID
├── timestamp (DATETIME)
│   └── When action occurred
├── action (TEXT, NOT NULL)
│   └── Examples: 'create-car', 'update-discipline', 'add-owner', 'verify-discipline'
├── car_id (TEXT, FOREIGN KEY)
│   └── References cars.id (cascade delete)
├── discipline_id (TEXT)
│   └── Which discipline was changed
├── details (JSON)
│   └── {"field": "value", "changed_from": "old", "changed_to": "new"}
└── user_id (TEXT)
    └── Future: user who made change

*/

-- ====================================================
-- QUERIES FOR ANALYSIS
-- ====================================================

-- Get all CARs with progress
-- SELECT * FROM vw_car_summary ORDER BY created_date DESC;

-- Get specific CAR's disciplines
-- SELECT * FROM vw_discipline_summary WHERE car_id = 'CAR-1689688800000';

-- Get recent changes for audit
-- SELECT * FROM vw_recent_changes;

-- Count CARs by status
-- SELECT status, COUNT(*) as count FROM cars GROUP BY status;

-- Find incomplete disciplines
-- SELECT car_id, discipline_id, status FROM disciplines WHERE status != 'complete';

-- Disciplines with no owners
-- SELECT DISTINCT d.car_id, d.discipline_id FROM disciplines d
-- LEFT JOIN owners o ON d.id = o.discipline_id
-- WHERE o.id IS NULL;

-- ====================================================
-- MAINTENANCE QUERIES
-- ====================================================

-- Delete specific CAR and all related data
-- DELETE FROM cars WHERE id = 'CAR-1689688800000';
-- (Note: cascade deletes all disciplines, owners, audit entries)

-- Archive old audit entries (keep last 1000)
-- DELETE FROM audit_log WHERE id NOT IN (
--   SELECT id FROM audit_log ORDER BY timestamp DESC LIMIT 1000
-- );

-- Export CAR as JSON (SQLite CLI)
-- .mode json
-- SELECT c.*, json_group_object(d.discipline_id, json_object(
--   'status', d.status, 'notes', d.notes, 'verified', d.verified
-- )) as disciplines FROM cars c
-- JOIN disciplines d ON c.id = d.car_id
-- WHERE c.id = 'CAR-1689688800000'
-- GROUP BY c.id;

-- ====================================================
-- CONFIGURATION
-- ====================================================

-- Enable foreign keys (important!)
PRAGMA foreign_keys = ON;

-- ====================================================
-- END OF SCHEMA
-- ====================================================
-- Version: 1.0
-- Last Updated: 2026-07-18
-- Auto-created by: backend/database.js
-- Ready for: Production use
