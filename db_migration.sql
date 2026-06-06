-- Migration script to support UI enhancements
-- 1. Add country_id to states table
ALTER TABLE states ADD COLUMN country_id INT NOT NULL;

-- 2. Populate country_id for existing states (example for India)
-- Adjust the WHERE clause to match your actual state names.
UPDATE states SET country_id = (SELECT id FROM countries WHERE name = 'India')
WHERE name IN (
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'
);

-- 3. Add foreign key constraint for states
ALTER TABLE states ADD CONSTRAINT fk_states_country FOREIGN KEY (country_id) REFERENCES countries(id);

-- 4. Add state_id to districts table
ALTER TABLE districts ADD COLUMN state_id INT NOT NULL;

-- 5. Populate state_id for existing districts (example for India)
-- You must map each district to its state manually or via a script.
-- Example placeholder:
-- UPDATE districts SET state_id = (SELECT id FROM states WHERE name = 'Karnataka') WHERE name = 'Bangalore';

-- 6. Add foreign key constraint for districts
ALTER TABLE districts ADD CONSTRAINT fk_districts_state FOREIGN KEY (state_id) REFERENCES states(id);

-- 7. Ensure dob column is of DATE type
ALTER TABLE census_entries MODIFY COLUMN dob DATE;

-- 8. Create indexes for fast search
CREATE INDEX idx_countries_name ON countries(name);
CREATE INDEX idx_states_name ON states(name);
CREATE INDEX idx_districts_name ON districts(name);
CREATE INDEX idx_states_country_id ON states(country_id);
CREATE INDEX idx_districts_state_id ON districts(state_id);

-- 9. Optional: create drafts table for auto‑save feature
CREATE TABLE census_drafts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  draft_json TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Add sequential_id column to persons table
ALTER TABLE persons ADD COLUMN IF NOT EXISTS sequential_id INT;

-- 11. Recreate household_members view to include sequential_id
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
