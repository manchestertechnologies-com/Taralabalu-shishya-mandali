-- COMPLETE UNIFIED SUPABASE SETUP SCRIPT
-- Run this entire script in your Supabase SQL Editor to configure all tables, views, policies, and location data.

-- 1. DROP EXISTING VIEWS AND TABLES IF THEY CONFLICT (Clean Slate)
DROP VIEW IF EXISTS household_members CASCADE;
DROP TABLE IF EXISTS household_members CASCADE; -- Added to drop existing table with this name
DROP TABLE IF EXISTS persons CASCADE;
DROP TABLE IF EXISTS households CASCADE;
DROP TABLE IF EXISTS enumerators CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- 2. CREATE LOCATION TABLES
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE states (
  id SERIAL PRIMARY KEY,
  country_id INT REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE districts (
  id SERIAL PRIMARY KEY,
  state_id INT REFERENCES states(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 3. CREATE ENUMERATORS TABLE
CREATE TABLE enumerators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Enumerator',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 4. CREATE HOUSEHOLDS TABLE
CREATE TABLE households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Links to enumerator/user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE PERSONS (HOUSEHOLD MEMBERS) TABLE
CREATE TABLE persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  is_head BOOLEAN DEFAULT FALSE,
  date_of_birth DATE,
  age INTEGER,
  aadhar_number TEXT,
  mobile_number TEXT,
  marital_status TEXT,
  education TEXT,
  employment_sector TEXT,
  occupation TEXT,
  traditional_occupation TEXT,
  country TEXT DEFAULT 'India',
  state TEXT,
  district TEXT,
  taluk TEXT,
  nagara TEXT,
  ward TEXT,
  pincode TEXT,
  profile_image_url TEXT,
  sequential_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE HOUSEHOLD_MEMBERS VIEW FOR APP QUERIES
CREATE OR REPLACE VIEW household_members AS
SELECT 
  p.id,
  p.household_id,
  p.name,
  p.relationship,
  p.is_head,
  p.date_of_birth,
  p.age,
  p.aadhar_number,
  p.mobile_number,
  p.marital_status,
  p.education,
  p.employment_sector,
  p.occupation,
  p.traditional_occupation,
  p.country,
  p.state,
  p.district,
  p.taluk,
  p.nagara,
  p.ward,
  p.pincode,
  p.profile_image_url,
  p.sequential_id,
  p.created_at,
  p.updated_at,
  h.created_at AS household_created_at,
  h.user_id AS household_user_id
FROM persons p
JOIN households h ON p.household_id = h.id;

-- 7. PERFORMANCE INDEXES
CREATE INDEX idx_countries_name ON countries(name);
CREATE INDEX idx_states_name ON states(name);
CREATE INDEX idx_districts_name ON districts(name);
CREATE INDEX idx_states_country_id ON states(country_id);
CREATE INDEX idx_districts_state_id ON districts(state_id);
CREATE INDEX idx_households_user_id ON households(user_id);
CREATE INDEX idx_persons_household_id ON persons(household_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enumerators ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- Allow SELECT/INSERT/UPDATE (Publicly accessible for easy application testing)
CREATE POLICY "Allow public select" ON countries FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON states FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON districts FOR SELECT USING (true);

CREATE POLICY "Allow public write" ON enumerators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write" ON households FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write" ON persons FOR ALL USING (true) WITH CHECK (true);

-- 9. SEED DATA FOR COUNTRIES, STATES, AND DISTRICTS
-- Insert Countries
INSERT INTO countries (name) VALUES 
('India'), ('USA'), ('UK'), ('Australia'), ('Canada'), ('China'), ('Brazil'), ('Argentina'), ('Japan')
ON CONFLICT (name) DO NOTHING;

-- Insert States for India
INSERT INTO states (country_id, name) VALUES
((SELECT id FROM countries WHERE name='India'), 'Karnataka'),
((SELECT id FROM countries WHERE name='India'), 'Maharashtra'),
((SELECT id FROM countries WHERE name='India'), 'Tamil Nadu')
ON CONFLICT DO NOTHING;

-- Insert Districts for Karnataka
INSERT INTO districts (state_id, name) VALUES
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Bengaluru Urban'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Bengaluru Rural'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Mysuru'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Davangere'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Dharwad'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Shivamogga'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Belagavi'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Tumakuru'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Mandya'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Hassan'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Dakshina Kannada'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Udupi'),
((SELECT id FROM states WHERE name='Karnataka' LIMIT 1), 'Uttara Kannada')
ON CONFLICT DO NOTHING;

-- Insert Districts for Maharashtra
INSERT INTO districts (state_id, name) VALUES
((SELECT id FROM states WHERE name='Maharashtra' LIMIT 1), 'Mumbai City'),
((SELECT id FROM states WHERE name='Maharashtra' LIMIT 1), 'Pune'),
((SELECT id FROM states WHERE name='Maharashtra' LIMIT 1), 'Nagpur')
ON CONFLICT DO NOTHING;

-- Insert Districts for Tamil Nadu
INSERT INTO districts (state_id, name) VALUES
((SELECT id FROM states WHERE name='Tamil Nadu' LIMIT 1), 'Chennai'),
((SELECT id FROM states WHERE name='Tamil Nadu' LIMIT 1), 'Coimbatore'),
((SELECT id FROM states WHERE name='Tamil Nadu' LIMIT 1), 'Madurai')
ON CONFLICT DO NOTHING;
