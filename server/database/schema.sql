-- PharmaOps Portal — PostgreSQL Schema
-- Run: psql -U postgres -d pharmaops -f schema.sql

CREATE DATABASE pharmaops;
\c pharmaops;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SEQUENCES
CREATE SEQUENCE IF NOT EXISTS quotation_req_seq START 1;
CREATE SEQUENCE IF NOT EXISTS po_seq START 1;
CREATE SEQUENCE IF NOT EXISTS dispatch_seq START 1;

-- USERS & AUTH
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'executive' CHECK (role IN ('admin','executive')),
  department    VARCHAR(50) CHECK (department IN ('purchase','gift','logistics')),
  avatar        VARCHAR(10),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE session_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  action      VARCHAR(50) DEFAULT 'login',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_logs (
  id                 SERIAL PRIMARY KEY,
  user_id            INT REFERENCES users(id),
  to_email           VARCHAR(200),
  subject            TEXT,
  quote_request_id   INT,
  sent_at            TIMESTAMP DEFAULT NOW()
);

-- APP SETTINGS
CREATE TABLE app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMP DEFAULT NOW()
);
INSERT INTO app_settings (key, value) VALUES
  ('company_name', 'PharmaOps Pvt. Ltd.'),
  ('portal_title', 'PharmaOps Portal'),
  ('primary_color', '#6366f1'),
  ('accent_color', '#8b5cf6');

-- MANUFACTURERS
CREATE TABLE manufacturers (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(150) NOT NULL,
  phone            VARCHAR(20),
  gst_number       VARCHAR(20),
  address          TEXT,
  contact_person   VARCHAR(100),
  product_category VARCHAR(100),
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- PURCHASE
CREATE TABLE quotation_requests (
  id               SERIAL PRIMARY KEY,
  req_no           VARCHAR(30) UNIQUE NOT NULL,
  manufacturer_id  INT REFERENCES manufacturers(id),
  product_name     VARCHAR(200) NOT NULL,
  product_type     VARCHAR(50),
  strength         VARCHAR(100),
  pack_size        VARCHAR(100),
  quantity         VARCHAR(100),
  unit             VARCHAR(50),
  due_date         DATE,
  notes            TEXT,
  status           VARCHAR(30) DEFAULT 'draft',
  sent_at          TIMESTAMP,
  created_by       INT REFERENCES users(id),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quotes (
  id                    SERIAL PRIMARY KEY,
  quotation_request_id  INT REFERENCES quotation_requests(id),
  unit_price            NUMERIC(12,2),
  total_price           NUMERIC(12,2),
  lead_time             VARCHAR(50),
  valid_until           DATE,
  payment_terms         VARCHAR(100),
  status                VARCHAR(20) DEFAULT 'pending',
  received_date         DATE DEFAULT CURRENT_DATE,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id                      SERIAL PRIMARY KEY,
  po_number               VARCHAR(30) UNIQUE NOT NULL,
  quote_id                INT REFERENCES quotes(id),
  manufacturer_id         INT REFERENCES manufacturers(id),
  product_description     TEXT NOT NULL,
  quantity                VARCHAR(100),
  unit_price              NUMERIC(12,2),
  total_amount            NUMERIC(14,2),
  advance_paid            NUMERIC(14,2) DEFAULT 0,
  status                  VARCHAR(30) DEFAULT 'po_raised',
  po_date                 DATE DEFAULT CURRENT_DATE,
  expected_delivery_date  DATE,
  actual_delivery_date    DATE,
  batch_no                VARCHAR(100),
  payment_terms           VARCHAR(100),
  proforma_doc_url        TEXT,
  created_by              INT REFERENCES users(id),
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_records (
  id             SERIAL PRIMARY KEY,
  po_id          INT REFERENCES purchase_orders(id),
  amount         NUMERIC(14,2) NOT NULL,
  payment_date   DATE DEFAULT CURRENT_DATE,
  payment_mode   VARCHAR(30),
  reference_no   VARCHAR(100),
  notes          TEXT,
  recorded_by    INT REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE batch_receipts (
  id             SERIAL PRIMARY KEY,
  po_id          INT REFERENCES purchase_orders(id),
  batch_no       VARCHAR(100) NOT NULL,
  qty_ordered    INT,
  qty_received   INT NOT NULL,
  qty_rejected   INT DEFAULT 0,
  mfg_date       DATE,
  exp_date       DATE,
  received_date  DATE DEFAULT CURRENT_DATE,
  qc_status      VARCHAR(20) DEFAULT 'pending',
  warehouse      VARCHAR(100),
  notes          TEXT,
  received_by    INT REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- GIFT MANAGEMENT
CREATE TABLE chemists (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  shop_name        VARCHAR(200) NOT NULL,
  drug_license_no  VARCHAR(50) UNIQUE,
  phone            VARCHAR(20),
  email            VARCHAR(150),
  territory        VARCHAR(100),
  zone             VARCHAR(100),
  assigned_rep     VARCHAR(100),
  total_purchase   NUMERIC(14,2) DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE schemes (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  description   TEXT,
  target_type   VARCHAR(20) DEFAULT 'value',
  slabs         JSONB DEFAULT '[]',
  status        VARCHAR(20) DEFAULT 'draft',
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scheme_chemists (
  scheme_id     INT REFERENCES schemes(id) ON DELETE CASCADE,
  chemist_id    INT REFERENCES chemists(id) ON DELETE CASCADE,
  enrolled_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (scheme_id, chemist_id)
);

CREATE TABLE distributor_invoices (
  id              SERIAL PRIMARY KEY,
  chemist_id      INT REFERENCES chemists(id),
  invoice_no      VARCHAR(100) NOT NULL,
  distributor_name VARCHAR(200),
  date            DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  quantity        INT,
  scheme_id       INT REFERENCES schemes(id),
  entered_by      INT REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gift_articles (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  brand         VARCHAR(100),
  model         VARCHAR(100),
  total_stock   INT DEFAULT 0,
  allocated     INT DEFAULT 0,
  to_be_ordered INT DEFAULT 0,
  damaged       INT DEFAULT 0,
  returned      INT DEFAULT 0,
  available     INT DEFAULT 0,
  unit_cost     NUMERIC(10,2),
  status        VARCHAR(20) DEFAULT 'adequate',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gift_fulfillments (
  id                SERIAL PRIMARY KEY,
  chemist_id        INT REFERENCES chemists(id),
  scheme_id         INT REFERENCES schemes(id),
  gift_article_id   INT REFERENCES gift_articles(id),
  qualified_date    DATE,
  delivery_address  TEXT,
  status            VARCHAR(30) DEFAULT 'qualified',
  courier           VARCHAR(100),
  tracking_id       VARCHAR(100),
  dispatch_date     DATE,
  delivered_date    DATE,
  acknowledgement_url TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- LOGISTICS
CREATE TABLE warehouses (
  id        SERIAL PRIMARY KEY,
  code      VARCHAR(20) UNIQUE NOT NULL,
  name      VARCHAR(200) NOT NULL,
  address   TEXT,
  capacity  INT DEFAULT 0,
  used      INT DEFAULT 0,
  type      VARCHAR(30) DEFAULT 'primary',
  status    VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transporters (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  contact     VARCHAR(20),
  email       VARCHAR(150),
  type        VARCHAR(30) DEFAULT 'road',
  coverage    VARCHAR(100) DEFAULT 'Pan India',
  rating      NUMERIC(3,1) DEFAULT 4.0,
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dispatches (
  id                SERIAL PRIMARY KEY,
  dispatch_no       VARCHAR(30) UNIQUE NOT NULL,
  batch_receipt_id  INT REFERENCES batch_receipts(id),
  from_warehouse    VARCHAR(100),
  to_type           VARCHAR(30),
  to_name           VARCHAR(200),
  to_address        TEXT,
  qty               INT NOT NULL,
  units             VARCHAR(50),
  transporter_id    INT REFERENCES transporters(id),
  tracking_no       VARCHAR(100),
  status            VARCHAR(20) DEFAULT 'pending',
  dispatch_date     DATE,
  delivery_date     DATE,
  driver_name       VARCHAR(100),
  driver_phone      VARCHAR(20),
  vehicle_no        VARCHAR(30),
  pod_url           TEXT,
  created_by        INT REFERENCES users(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_qr_status ON quotation_requests(status);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_di_chemist ON distributor_invoices(chemist_id);
CREATE INDEX idx_gf_status ON gift_fulfillments(status);
CREATE INDEX idx_dispatch_status ON dispatches(status);

-- SEED DATA
-- Default admin user password: admin123
INSERT INTO users (full_name, email, password_hash, role, avatar) VALUES
  ('Admin User', 'admin@pharmaops.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPiEHFpJN.1vS', 'admin', 'AU');

-- Executive users password: exec123
INSERT INTO users (full_name, email, password_hash, role, department, avatar) VALUES
  ('Rajesh Kumar', 'rajesh@pharmaops.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uDeSimD/W', 'executive', 'purchase', 'RK'),
  ('Priya Sharma', 'priya@pharmaops.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uDeSimD/W', 'executive', 'gift', 'PS'),
  ('Amit Singh', 'amit@pharmaops.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uDeSimD/W', 'executive', 'logistics', 'AS');

INSERT INTO warehouses (code, name, address, capacity, used, type) VALUES
  ('WH-1', 'Mumbai Central Warehouse', 'MIDC Andheri, Mumbai', 10000, 4200, 'primary'),
  ('WH-2', 'Ahmedabad Storage', 'Naroda, Ahmedabad', 5000, 1800, 'secondary');

INSERT INTO transporters (name, contact, email, type, rating) VALUES
  ('VRL Logistics', '9011223344', 'ops@vrl.co.in', 'road', 4.5),
  ('DTDC Cargo', '9022334455', 'cargo@dtdc.com', 'courier', 4.2),
  ('BlueDart Express', '9033445566', 'enterprise@bluedart.com', 'courier', 4.7);
