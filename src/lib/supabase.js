import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// SQL to run in Supabase SQL editor to create all tables:
export const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default departments (safe upsert)
INSERT INTO departments (name) VALUES ('Minto Money'), ('Greyhound')
ON CONFLICT (name) DO NOTHING;

-- Borrowers table
CREATE TABLE IF NOT EXISTS borrowers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  tenure_years NUMERIC(4,1) DEFAULT 0,
  address TEXT,
  phone TEXT,
  email TEXT,
  trustee_name TEXT,
  trustee_phone TEXT,
  trustee_relationship TEXT,
  credit_score INTEGER DEFAULT 750,
  risk_score TEXT DEFAULT 'Low',
  loyalty_badge TEXT DEFAULT 'New',
  loan_limit INTEGER DEFAULT 5000,
  loan_limit_level INTEGER DEFAULT 1,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID REFERENCES borrowers(id) ON DELETE CASCADE,
  loan_amount NUMERIC(10,2) NOT NULL,
  interest_rate NUMERIC(4,2) DEFAULT 0.08,
  total_repayment NUMERIC(10,2),
  installment_amount NUMERIC(10,2),
  release_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payments_made INTEGER DEFAULT 0,
  remaining_balance NUMERIC(10,2),
  status TEXT DEFAULT 'Pending',
  agreement_confirmed BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Installments table
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  is_paid BOOLEAN DEFAULT FALSE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  starting_capital NUMERIC(10,2) DEFAULT 30000,
  interest_rate NUMERIC(4,2) DEFAULT 0.08,
  max_loan_amount INTEGER DEFAULT 10000,
  reinvestment_mode BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT ''
);

-- Insert default settings
INSERT INTO settings (id, starting_capital, interest_rate, max_loan_amount, reinvestment_mode)
VALUES (1, 30000, 0.08, 10000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capital logs table
CREATE TABLE IF NOT EXISTS capital_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`
