-- COMPLETE REBUILD SUPABASE SETUP SCRIPT
-- Run this entire script in your Supabase SQL Editor to configure all tables, triggers, views, and seed location data.

-- 1. DROP EXISTING TABLES AND VIEWS (Clean Slate)
DROP VIEW IF EXISTS members_resolved CASCADE;
DROP TABLE IF EXISTS member_cards CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS wards CASCADE;
DROP TABLE IF EXISTS taluks CASCADE;
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

CREATE TABLE taluks (
  id SERIAL PRIMARY KEY,
  district_id INT REFERENCES districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE wards (
  id SERIAL PRIMARY KEY,
  taluk_id INT REFERENCES taluks(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 3. CREATE MEMBERS TABLE
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  member_id INT UNIQUE, -- Sequential generated ID: 1, 2, 3...
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  dob DATE NOT NULL,
  age INT NOT NULL,
  country_id INT REFERENCES countries(id) ON DELETE SET NULL,
  state_id INT REFERENCES states(id) ON DELETE SET NULL,
  district_id INT REFERENCES districts(id) ON DELETE SET NULL,
  taluk_id INT REFERENCES taluks(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE MEMBER_CARDS TABLE
CREATE TABLE member_cards (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(member_id) ON DELETE CASCADE,
  card_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRIGGER FOR SEQUENTIAL MEMBER_ID AUTO-GENERATION (No duplicates, no skipped IDs)
CREATE OR REPLACE FUNCTION set_member_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.member_id := COALESCE((SELECT MAX(member_id) FROM members), 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_member_id
BEFORE INSERT ON members
FOR EACH ROW
EXECUTE FUNCTION set_member_id();

-- 6. CREATE RESOLVED VIEW FOR JOINING NAMES IN THE FRONTEND
CREATE OR REPLACE VIEW members_resolved AS
SELECT 
  m.id,
  m.member_id,
  m.full_name,
  m.phone,
  m.dob,
  m.age,
  m.country_id,
  c.name AS country_name,
  m.state_id,
  s.name AS state_name,
  m.district_id,
  d.name AS district_name,
  m.taluk_id,
  t.name AS taluk_name,
  m.ward_id,
  w.name AS ward_name,
  m.address,
  m.photo_url,
  m.created_at
FROM members m
LEFT JOIN countries c ON m.country_id = c.id
LEFT JOIN states s ON m.state_id = s.id
LEFT JOIN districts d ON m.district_id = d.id
LEFT JOIN taluks t ON m.taluk_id = t.id
LEFT JOIN wards w ON m.ward_id = w.id;

-- 7. PERFORMANCE INDEXES
CREATE INDEX idx_states_country_id ON states(country_id);
CREATE INDEX idx_districts_state_id ON districts(state_id);
CREATE INDEX idx_taluks_district_id ON taluks(district_id);
CREATE INDEX idx_wards_taluk_id ON wards(taluk_id);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_member_id ON members(member_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE taluks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_cards ENABLE ROW LEVEL SECURITY;

-- Create Public Access Policies
CREATE POLICY "Allow public read country" ON countries FOR SELECT USING (true);
CREATE POLICY "Allow public read state" ON states FOR SELECT USING (true);
CREATE POLICY "Allow public read district" ON districts FOR SELECT USING (true);
CREATE POLICY "Allow public read taluk" ON taluks FOR SELECT USING (true);
CREATE POLICY "Allow public read ward" ON wards FOR SELECT USING (true);

CREATE POLICY "Allow public write members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write member_cards" ON member_cards FOR ALL USING (true) WITH CHECK (true);

-- 9. SEED DATA FOR GEOGRAPHICAL HIERARCHY
-- Countries
INSERT INTO countries (id, name) VALUES 
(1, 'India'), 
(2, 'USA'), 
(3, 'UK')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- States
INSERT INTO states (id, country_id, name) VALUES
(1, 1, 'Karnataka'),
(2, 1, 'Maharashtra'),
(3, 1, 'Tamil Nadu'),
(4, 2, 'California'),
(5, 2, 'New York'),
(6, 3, 'England')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country_id = EXCLUDED.country_id;

-- Districts
INSERT INTO districts (id, state_id, name) VALUES
-- Karnataka
(1, 1, 'Davangere'),
(2, 1, 'Chitradurga'),
(3, 1, 'Bangalore'),
(4, 1, 'Mysore'),
(5, 1, 'Hubli'),
-- Maharashtra
(6, 2, 'Mumbai'),
(7, 2, 'Pune'),
(8, 2, 'Nagpur'),
-- Tamil Nadu
(9, 3, 'Chennai'),
(10, 3, 'Coimbatore'),
-- California
(11, 4, 'Los Angeles'),
(12, 4, 'San Francisco'),
-- England
(13, 6, 'Westminster'),
(14, 6, 'City of London')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, state_id = EXCLUDED.state_id;

-- Taluks
INSERT INTO taluks (id, district_id, name) VALUES
-- Davangere
(1, 1, 'Davangere Taluk'),
(2, 1, 'Harihar Taluk'),
(3, 1, 'Channagiri Taluk'),
(4, 1, 'Jagalur Taluk'),
(5, 1, 'Honnali Taluk'),
-- Chitradurga
(6, 2, 'Chitradurga Taluk'),
(7, 2, 'Holalkere Taluk'),
(8, 2, 'Hosadurga Taluk'),
(9, 2, 'Hiriyur Taluk'),
-- Bangalore
(10, 3, 'Bangalore North'),
(11, 3, 'Bangalore South'),
(12, 3, 'Anekal'),
-- Mysore
(13, 4, 'Mysore Taluk'),
(14, 4, 'Nanjangud Taluk'),
-- Hubli
(15, 5, 'Hubli Taluk'),
(16, 5, 'Dharwad Taluk'),
-- Mumbai
(17, 6, 'Mumbai Central'),
(18, 6, 'Andheri'),
-- Pune
(19, 7, 'Pune Central'),
(20, 7, 'Haveli'),
-- Nagpur
(21, 8, 'Nagpur Urban'),
(22, 8, 'Nagpur Rural'),
-- Los Angeles
(23, 11, 'LA City'),
(24, 11, 'Santa Monica'),
-- San Francisco
(25, 12, 'SF City'),
-- Westminster
(26, 13, 'Westminster Central'),
-- City of London
(27, 14, 'London Central')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, district_id = EXCLUDED.district_id;

-- Seed Wards for each taluk dynamically using a PL/pgSQL block
DO $$
DECLARE
  t_row RECORD;
BEGIN
  -- Clear existing wards first to prevent duplicate seeds
  TRUNCATE TABLE wards CASCADE;
  
  FOR t_row IN SELECT id FROM taluks LOOP
    INSERT INTO wards (taluk_id, name) VALUES
    (t_row.id, 'Ward 1'),
    (t_row.id, 'Ward 2'),
    (t_row.id, 'Ward 3'),
    (t_row.id, 'Ward 4'),
    (t_row.id, 'Ward 5');
  END LOOP;
END $$;
