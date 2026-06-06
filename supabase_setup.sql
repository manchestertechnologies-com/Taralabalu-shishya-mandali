-- ============================================================
-- TARALABALU SHISHYA MANDALI — COMPLETE SUPABASE SETUP SCRIPT
-- Comprehensive Indian Geographical Data:
--   • All 28 States + 8 Union Territories of India
--   • All Districts of every State / UT
--   • All Taluks of Karnataka (comprehensive)
--   • Major Taluks/Blocks/Mandals for all other States
-- ============================================================

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

-- 3. MEMBERS TABLE (Multi-member household workflow)
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  member_id INT UNIQUE,
  household_id UUID NOT NULL,
  is_head BOOLEAN DEFAULT FALSE,
  relationship TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  dob DATE NOT NULL,
  age INT NOT NULL,
  marital_status TEXT,
  education TEXT,
  employment_sector TEXT,
  occupation TEXT,
  traditional_occupation TEXT,
  country_id INT REFERENCES countries(id) ON DELETE SET NULL,
  state_id INT REFERENCES states(id) ON DELETE SET NULL,
  district_id INT REFERENCES districts(id) ON DELETE SET NULL,
  taluk_id INT REFERENCES taluks(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  pincode TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEMBER_CARDS TABLE
CREATE TABLE member_cards (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(member_id) ON DELETE CASCADE,
  card_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SEQUENTIAL MEMBER_ID TRIGGER
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

-- 6. RESOLVED VIEW
CREATE OR REPLACE VIEW members_resolved AS
SELECT
  m.id, m.member_id, m.household_id, m.is_head, m.relationship,
  m.full_name, m.phone, m.dob, m.age, m.marital_status, m.education,
  m.employment_sector, m.occupation, m.traditional_occupation,
  m.country_id, c.name AS country_name,
  m.state_id, s.name AS state_name,
  m.district_id, d.name AS district_name,
  m.taluk_id, t.name AS taluk_name,
  m.ward_id, w.name AS ward_name,
  m.address, m.pincode, m.photo_url, m.created_at
FROM members m
LEFT JOIN countries c ON m.country_id = c.id
LEFT JOIN states s ON m.state_id = s.id
LEFT JOIN districts d ON m.district_id = d.id
LEFT JOIN taluks t ON m.taluk_id = t.id
LEFT JOIN wards w ON m.ward_id = w.id;

-- 7. INDEXES
CREATE INDEX idx_states_country_id ON states(country_id);
CREATE INDEX idx_districts_state_id ON districts(state_id);
CREATE INDEX idx_taluks_district_id ON taluks(district_id);
CREATE INDEX idx_wards_taluk_id ON wards(taluk_id);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_household_id ON members(household_id);
CREATE INDEX idx_members_member_id ON members(member_id);

-- 8. ROW LEVEL SECURITY
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE taluks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read country" ON countries FOR SELECT USING (true);
CREATE POLICY "Allow public read state" ON states FOR SELECT USING (true);
CREATE POLICY "Allow public read district" ON districts FOR SELECT USING (true);
CREATE POLICY "Allow public read taluk" ON taluks FOR SELECT USING (true);
CREATE POLICY "Allow public read ward" ON wards FOR SELECT USING (true);
CREATE POLICY "Allow public write members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write member_cards" ON member_cards FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 9. SEED DATA
-- ============================================================

-- COUNTRIES
INSERT INTO countries (id, name) VALUES (1,'India'),(2,'USA'),(3,'UK')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================
-- ALL STATES AND UNION TERRITORIES
-- ============================================================
INSERT INTO states (id, country_id, name) VALUES
(1,1,'Andhra Pradesh'),
(2,1,'Arunachal Pradesh'),
(3,1,'Assam'),
(4,1,'Bihar'),
(5,1,'Chhattisgarh'),
(6,1,'Goa'),
(7,1,'Gujarat'),
(8,1,'Haryana'),
(9,1,'Himachal Pradesh'),
(10,1,'Jharkhand'),
(11,1,'Karnataka'),
(12,1,'Kerala'),
(13,1,'Madhya Pradesh'),
(14,1,'Maharashtra'),
(15,1,'Manipur'),
(16,1,'Meghalaya'),
(17,1,'Mizoram'),
(18,1,'Nagaland'),
(19,1,'Odisha'),
(20,1,'Punjab'),
(21,1,'Rajasthan'),
(22,1,'Sikkim'),
(23,1,'Tamil Nadu'),
(24,1,'Telangana'),
(25,1,'Tripura'),
(26,1,'Uttar Pradesh'),
(27,1,'Uttarakhand'),
(28,1,'West Bengal'),
(29,1,'Andaman and Nicobar Islands'),
(30,1,'Chandigarh'),
(31,1,'Dadra and Nagar Haveli and Daman and Diu'),
(32,1,'Delhi'),
(33,1,'Jammu and Kashmir'),
(34,1,'Ladakh'),
(35,1,'Lakshadweep'),
(36,1,'Puducherry'),
(37,2,'California'),
(38,2,'New York'),
(39,3,'England')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country_id = EXCLUDED.country_id;

-- ============================================================
-- ALL DISTRICTS (grouped by state)
-- ============================================================
INSERT INTO districts (id, state_id, name) VALUES
-- ── KARNATAKA (state 11) — IDs 1–31 ──
(1,11,'Bagalkot'),(2,11,'Ballari'),(3,11,'Belagavi'),(4,11,'Bengaluru Rural'),
(5,11,'Bengaluru Urban'),(6,11,'Bidar'),(7,11,'Chamarajanagara'),
(8,11,'Chikkaballapura'),(9,11,'Chikkamagaluru'),(10,11,'Chitradurga'),
(11,11,'Dakshina Kannada'),(12,11,'Davangere'),(13,11,'Dharwad'),
(14,11,'Gadag'),(15,11,'Hassan'),(16,11,'Haveri'),(17,11,'Kalaburagi'),
(18,11,'Kodagu'),(19,11,'Kolar'),(20,11,'Koppal'),(21,11,'Mandya'),
(22,11,'Mysuru'),(23,11,'Raichur'),(24,11,'Ramanagara'),(25,11,'Shivamogga'),
(26,11,'Tumakuru'),(27,11,'Udupi'),(28,11,'Uttara Kannada'),
(29,11,'Vijayapura'),(30,11,'Yadgir'),(31,11,'Vijayanagara'),

-- ── ANDHRA PRADESH (state 1) — IDs 32–44 ──
(32,1,'Alluri Sitharama Raju'),(33,1,'Anakapalli'),(34,1,'Ananthapuramu'),
(35,1,'Bapatla'),(36,1,'Chittoor'),(37,1,'East Godavari'),
(38,1,'Eluru'),(39,1,'Guntur'),(40,1,'Konaseema'),
(41,1,'Krishna'),(42,1,'Kurnool'),(43,1,'Nandyal'),
(44,1,'NTR'),(45,1,'Palnadu'),(46,1,'Parvathipuram Manyam'),
(47,1,'Prakasam'),(48,1,'Sri Balaji (Tirupati)'),(49,1,'Sri Sathya Sai'),
(50,1,'Srikakulam'),(51,1,'Visakhapatnam'),(52,1,'Vizianagaram'),
(53,1,'West Godavari'),(54,1,'YSR Kadapa'),

-- ── ARUNACHAL PRADESH (state 2) — IDs 55–79 ──
(55,2,'Anjaw'),(56,2,'Changlang'),(57,2,'Dibang Valley'),
(58,2,'East Kameng'),(59,2,'East Siang'),(60,2,'Kamle'),
(61,2,'Kra Daadi'),(62,2,'Kurung Kumey'),(63,2,'Lepa Rada'),
(64,2,'Lohit'),(65,2,'Longding'),(66,2,'Lower Dibang Valley'),
(67,2,'Lower Siang'),(68,2,'Lower Subansiri'),(69,2,'Namsai'),
(70,2,'Pakke Kessang'),(71,2,'Papum Pare'),(72,2,'Shi Yomi'),
(73,2,'Siang'),(74,2,'Tawang'),(75,2,'Tirap'),
(76,2,'Upper Siang'),(77,2,'Upper Subansiri'),(78,2,'West Kameng'),
(79,2,'West Siang'),

-- ── ASSAM (state 3) — IDs 80–114 ──
(80,3,'Bajali'),(81,3,'Baksa'),(82,3,'Barpeta'),(83,3,'Biswanath'),
(84,3,'Bongaigaon'),(85,3,'Cachar'),(86,3,'Charaideo'),(87,3,'Chirang'),
(88,3,'Darrang'),(89,3,'Dhemaji'),(90,3,'Dhubri'),(91,3,'Dibrugarh'),
(92,3,'Dima Hasao'),(93,3,'Goalpara'),(94,3,'Golaghat'),(95,3,'Hailakandi'),
(96,3,'Hojai'),(97,3,'Jorhat'),(98,3,'Kamrup'),(99,3,'Kamrup Metropolitan'),
(100,3,'Karbi Anglong'),(101,3,'Karimganj'),(102,3,'Kokrajhar'),
(103,3,'Lakhimpur'),(104,3,'Majuli'),(105,3,'Morigaon'),(106,3,'Nagaon'),
(107,3,'Nalbari'),(108,3,'Sivasagar'),(109,3,'Sonitpur'),
(110,3,'South Salmara-Mankachar'),(111,3,'Tamulpur'),(112,3,'Tinsukia'),
(113,3,'Udalguri'),(114,3,'West Karbi Anglong'),

-- ── BIHAR (state 4) — IDs 115–152 ──
(115,4,'Araria'),(116,4,'Arwal'),(117,4,'Aurangabad'),(118,4,'Banka'),
(119,4,'Begusarai'),(120,4,'Bhagalpur'),(121,4,'Bhojpur'),(122,4,'Buxar'),
(123,4,'Darbhanga'),(124,4,'East Champaran'),(125,4,'Gaya'),
(126,4,'Gopalganj'),(127,4,'Jamui'),(128,4,'Jehanabad'),(129,4,'Kaimur'),
(130,4,'Katihar'),(131,4,'Khagaria'),(132,4,'Kishanganj'),
(133,4,'Lakhisarai'),(134,4,'Madhepura'),(135,4,'Madhubani'),
(136,4,'Munger'),(137,4,'Muzaffarpur'),(138,4,'Nalanda'),(139,4,'Nawada'),
(140,4,'Patna'),(141,4,'Purnia'),(142,4,'Rohtas'),(143,4,'Saharsa'),
(144,4,'Samastipur'),(145,4,'Saran'),(146,4,'Sheikhpura'),
(147,4,'Sheohar'),(148,4,'Sitamarhi'),(149,4,'Siwan'),(150,4,'Supaul'),
(151,4,'Vaishali'),(152,4,'West Champaran'),

-- ── CHHATTISGARH (state 5) — IDs 153–185 ──
(153,5,'Balod'),(154,5,'Baloda Bazar'),(155,5,'Balrampur'),
(156,5,'Bastar'),(157,5,'Bemetara'),(158,5,'Bijapur'),
(159,5,'Bilaspur'),(160,5,'Dantewada'),(161,5,'Dhamtari'),
(162,5,'Durg'),(163,5,'Gariaband'),(164,5,'Gaurela-Pendra-Marwahi'),
(165,5,'Janjgir-Champa'),(166,5,'Jashpur'),(167,5,'Kabirdham'),
(168,5,'Kanker'),(169,5,'Khairagarh-Chhuikhadan-Gandai'),
(170,5,'Kondagaon'),(171,5,'Korba'),(172,5,'Korea'),
(173,5,'Mahasamund'),(174,5,'Manendragarh-Chirmiri-Bharatpur'),
(175,5,'Mohla-Manpur-Ambagaon'),(176,5,'Mungeli'),(177,5,'Narayanpur'),
(178,5,'Raigarh'),(179,5,'Raipur'),(180,5,'Rajnandgaon'),
(181,5,'Sarangarh-Bilaigarh'),(182,5,'Shakti'),(183,5,'Sukma'),
(184,5,'Surajpur'),(185,5,'Surguja'),

-- ── GOA (state 6) — IDs 186–187 ──
(186,6,'North Goa'),(187,6,'South Goa'),

-- ── GUJARAT (state 7) — IDs 188–220 ──
(188,7,'Ahmedabad'),(189,7,'Amreli'),(190,7,'Anand'),(191,7,'Aravalli'),
(192,7,'Banaskantha'),(193,7,'Bharuch'),(194,7,'Bhavnagar'),
(195,7,'Botad'),(196,7,'Chhota Udaipur'),(197,7,'Dahod'),
(198,7,'Dang'),(199,7,'Devbhoomi Dwarka'),(200,7,'Gandhinagar'),
(201,7,'Gir Somnath'),(202,7,'Jamnagar'),(203,7,'Junagadh'),
(204,7,'Kheda'),(205,7,'Kutch'),(206,7,'Mahisagar'),
(207,7,'Mehsana'),(208,7,'Morbi'),(209,7,'Narmada'),
(210,7,'Navsari'),(211,7,'Panchmahal'),(212,7,'Patan'),
(213,7,'Porbandar'),(214,7,'Rajkot'),(215,7,'Sabarkantha'),
(216,7,'Surat'),(217,7,'Surendranagar'),(218,7,'Tapi'),
(219,7,'Vadodara'),(220,7,'Valsad'),

-- ── HARYANA (state 8) — IDs 221–242 ──
(221,8,'Ambala'),(222,8,'Bhiwani'),(223,8,'Charkhi Dadri'),
(224,8,'Faridabad'),(225,8,'Fatehabad'),(226,8,'Gurugram'),
(227,8,'Hisar'),(228,8,'Jhajjar'),(229,8,'Jind'),(230,8,'Kaithal'),
(231,8,'Karnal'),(232,8,'Kurukshetra'),(233,8,'Mahendragarh'),
(234,8,'Nuh'),(235,8,'Palwal'),(236,8,'Panchkula'),
(237,8,'Panipat'),(238,8,'Rewari'),(239,8,'Rohtak'),
(240,8,'Sirsa'),(241,8,'Sonipat'),(242,8,'Yamunanagar'),

-- ── HIMACHAL PRADESH (state 9) — IDs 243–254 ──
(243,9,'Bilaspur'),(244,9,'Chamba'),(245,9,'Hamirpur'),
(246,9,'Kangra'),(247,9,'Kinnaur'),(248,9,'Kullu'),
(249,9,'Lahaul and Spiti'),(250,9,'Mandi'),(251,9,'Shimla'),
(252,9,'Sirmaur'),(253,9,'Solan'),(254,9,'Una'),

-- ── JHARKHAND (state 10) — IDs 255–278 ──
(255,10,'Bokaro'),(256,10,'Chatra'),(257,10,'Deoghar'),
(258,10,'Dhanbad'),(259,10,'Dumka'),(260,10,'East Singhbhum'),
(261,10,'Garhwa'),(262,10,'Giridih'),(263,10,'Godda'),
(264,10,'Gumla'),(265,10,'Hazaribagh'),(266,10,'Jamtara'),
(267,10,'Khunti'),(268,10,'Koderma'),(269,10,'Latehar'),
(270,10,'Lohardaga'),(271,10,'Pakur'),(272,10,'Palamu'),
(273,10,'Ramgarh'),(274,10,'Ranchi'),(275,10,'Sahibganj'),
(276,10,'Seraikela-Kharsawan'),(277,10,'Simdega'),(278,10,'West Singhbhum'),

-- ── KERALA (state 12) — IDs 279–292 ──
(279,12,'Alappuzha'),(280,12,'Ernakulam'),(281,12,'Idukki'),
(282,12,'Kannur'),(283,12,'Kasaragod'),(284,12,'Kollam'),
(285,12,'Kottayam'),(286,12,'Kozhikode'),(287,12,'Malappuram'),
(288,12,'Palakkad'),(289,12,'Pathanamthitta'),(290,12,'Thiruvananthapuram'),
(291,12,'Thrissur'),(292,12,'Wayanad'),

-- ── MADHYA PRADESH (state 13) — IDs 293–347 ──
(293,13,'Agar Malwa'),(294,13,'Alirajpur'),(295,13,'Anuppur'),
(296,13,'Ashoknagar'),(297,13,'Balaghat'),(298,13,'Barwani'),
(299,13,'Betul'),(300,13,'Bhind'),(301,13,'Bhopal'),
(302,13,'Burhanpur'),(303,13,'Chhatarpur'),(304,13,'Chhindwara'),
(305,13,'Damoh'),(306,13,'Datia'),(307,13,'Dewas'),
(308,13,'Dhar'),(309,13,'Dindori'),(310,13,'Guna'),
(311,13,'Gwalior'),(312,13,'Harda'),(313,13,'Narmadapuram'),
(314,13,'Indore'),(315,13,'Jabalpur'),(316,13,'Jhabua'),
(317,13,'Katni'),(318,13,'Khandwa'),(319,13,'Khargone'),
(320,13,'Mandla'),(321,13,'Mandsaur'),(322,13,'Morena'),
(323,13,'Narsinghpur'),(324,13,'Neemuch'),(325,13,'Niwari'),
(326,13,'Panna'),(327,13,'Raisen'),(328,13,'Rajgarh'),
(329,13,'Ratlam'),(330,13,'Rewa'),(331,13,'Sagar'),
(332,13,'Satna'),(333,13,'Sehore'),(334,13,'Seoni'),
(335,13,'Shahdol'),(336,13,'Shajapur'),(337,13,'Sheopur'),
(338,13,'Shivpuri'),(339,13,'Sidhi'),(340,13,'Singrauli'),
(341,13,'Tikamgarh'),(342,13,'Ujjain'),(343,13,'Umaria'),
(344,13,'Vidisha'),

-- ── MAHARASHTRA (state 14) — IDs 345–380 ──
(345,14,'Ahmednagar'),(346,14,'Akola'),(347,14,'Amravati'),
(348,14,'Aurangabad'),(349,14,'Beed'),(350,14,'Bhandara'),
(351,14,'Buldhana'),(352,14,'Chandrapur'),(353,14,'Dhule'),
(354,14,'Gadchiroli'),(355,14,'Gondia'),(356,14,'Hingoli'),
(357,14,'Jalgaon'),(358,14,'Jalna'),(359,14,'Kolhapur'),
(360,14,'Latur'),(361,14,'Mumbai City'),(362,14,'Mumbai Suburban'),
(363,14,'Nagpur'),(364,14,'Nanded'),(365,14,'Nandurbar'),
(366,14,'Nashik'),(367,14,'Osmanabad'),(368,14,'Palghar'),
(369,14,'Parbhani'),(370,14,'Pune'),(371,14,'Raigad'),
(372,14,'Ratnagiri'),(373,14,'Sangli'),(374,14,'Satara'),
(375,14,'Sindhudurg'),(376,14,'Solapur'),(377,14,'Thane'),
(378,14,'Wardha'),(379,14,'Washim'),(380,14,'Yavatmal'),

-- ── MANIPUR (state 15) — IDs 381–396 ──
(381,15,'Bishnupur'),(382,15,'Chandel'),(383,15,'Churachandpur'),
(384,15,'Imphal East'),(385,15,'Imphal West'),(386,15,'Jiribam'),
(387,15,'Kakching'),(388,15,'Kamjong'),(389,15,'Kangpokpi'),
(390,15,'Noney'),(391,15,'Pherzawl'),(392,15,'Senapati'),
(393,15,'Tamenglong'),(394,15,'Tengnoupal'),(395,15,'Thoubal'),
(396,15,'Ukhrul'),

-- ── MEGHALAYA (state 16) — IDs 397–408 ──
(397,16,'East Garo Hills'),(398,16,'East Jaintia Hills'),
(399,16,'East Khasi Hills'),(400,16,'Eastern West Khasi Hills'),
(401,16,'North Garo Hills'),(402,16,'Ri Bhoi'),
(403,16,'South Garo Hills'),(404,16,'South West Garo Hills'),
(405,16,'South West Khasi Hills'),(406,16,'West Garo Hills'),
(407,16,'West Jaintia Hills'),(408,16,'West Khasi Hills'),

-- ── MIZORAM (state 17) — IDs 409–419 ──
(409,17,'Aizawl'),(410,17,'Champhai'),(411,17,'Hnahthial'),
(412,17,'Khawzawl'),(413,17,'Kolasib'),(414,17,'Lawngtlai'),
(415,17,'Lunglei'),(416,17,'Mamit'),(417,17,'Saitual'),
(418,17,'Serchhip'),(419,17,'Siaha'),

-- ── NAGALAND (state 18) — IDs 420–435 ──
(420,18,'Chumoukedima'),(421,18,'Dimapur'),(422,18,'Kiphire'),
(423,18,'Kohima'),(424,18,'Longleng'),(425,18,'Mokokchung'),
(426,18,'Mon'),(427,18,'Niuland'),(428,18,'Noklak'),
(429,18,'Peren'),(430,18,'Phek'),(431,18,'Shamator'),
(432,18,'Tseminyu'),(433,18,'Tuensang'),(434,18,'Wokha'),
(435,18,'Zunheboto'),

-- ── ODISHA (state 19) — IDs 436–465 ──
(436,19,'Angul'),(437,19,'Balangir'),(438,19,'Balasore'),
(439,19,'Bargarh'),(440,19,'Bhadrak'),(441,19,'Boudh'),
(442,19,'Cuttack'),(443,19,'Deogarh'),(444,19,'Dhenkanal'),
(445,19,'Gajapati'),(446,19,'Ganjam'),(447,19,'Jagatsinghpur'),
(448,19,'Jajpur'),(449,19,'Jharsuguda'),(450,19,'Kalahandi'),
(451,19,'Kandhamal'),(452,19,'Kendrapara'),(453,19,'Keonjhar'),
(454,19,'Khordha'),(455,19,'Koraput'),(456,19,'Malkangiri'),
(457,19,'Mayurbhanj'),(458,19,'Nabarangpur'),(459,19,'Nayagarh'),
(460,19,'Nuapada'),(461,19,'Puri'),(462,19,'Rayagada'),
(463,19,'Sambalpur'),(464,19,'Subarnapur'),(465,19,'Sundargarh'),

-- ── PUNJAB (state 20) — IDs 466–488 ──
(466,20,'Amritsar'),(467,20,'Barnala'),(468,20,'Bathinda'),
(469,20,'Faridkot'),(470,20,'Fatehgarh Sahib'),(471,20,'Fazilka'),
(472,20,'Ferozepur'),(473,20,'Gurdaspur'),(474,20,'Hoshiarpur'),
(475,20,'Jalandhar'),(476,20,'Kapurthala'),(477,20,'Ludhiana'),
(478,20,'Malerkotla'),(479,20,'Mansa'),(480,20,'Moga'),
(481,20,'Sri Muktsar Sahib'),(482,20,'Pathankot'),(483,20,'Patiala'),
(484,20,'Rupnagar'),(485,20,'SAS Nagar (Mohali)'),(486,20,'Sangrur'),
(487,20,'SBS Nagar (Nawanshahr)'),(488,20,'Tarn Taran'),

-- ── RAJASTHAN (state 21) — IDs 489–521 ──
(489,21,'Ajmer'),(490,21,'Alwar'),(491,21,'Anupgarh'),
(492,21,'Balotra'),(493,21,'Banswara'),(494,21,'Baran'),
(495,21,'Barmer'),(496,21,'Beawar'),(497,21,'Bharatpur'),
(498,21,'Bhilwara'),(499,21,'Bikaner'),(500,21,'Bundi'),
(501,21,'Chittorgarh'),(502,21,'Churu'),(503,21,'Dausa'),
(504,21,'Deeg'),(505,21,'Dholpur'),(506,21,'Didwana-Kuchaman'),
(507,21,'Dungarpur'),(508,21,'Ganganagar'),(509,21,'Hanumangarh'),
(510,21,'Jaipur'),(511,21,'Jaisalmer'),(512,21,'Jalore'),
(513,21,'Jhalawar'),(514,21,'Jhunjhunu'),(515,21,'Jodhpur'),
(516,21,'Karauli'),(517,21,'Kekri'),(518,21,'Kota'),
(519,21,'Kotputli-Behror'),(520,21,'Nagaur'),(521,21,'Pali'),
(522,21,'Phalodi'),(523,21,'Pratapgarh'),(524,21,'Rajsamand'),
(525,21,'Sanchore'),(526,21,'Sawai Madhopur'),(527,21,'Shahpura'),
(528,21,'Sikar'),(529,21,'Sirohi'),(530,21,'Tonk'),
(531,21,'Udaipur'),

-- ── SIKKIM (state 22) — IDs 532–537 ──
(532,22,'East Sikkim'),(533,22,'North Sikkim'),(534,22,'Pakyong'),
(535,22,'Soreng'),(536,22,'South Sikkim'),(537,22,'West Sikkim'),

-- ── TAMIL NADU (state 23) — IDs 538–575 ──
(538,23,'Ariyalur'),(539,23,'Chengalpattu'),(540,23,'Chennai'),
(541,23,'Coimbatore'),(542,23,'Cuddalore'),(543,23,'Dharmapuri'),
(544,23,'Dindigul'),(545,23,'Erode'),(546,23,'Kallakurichi'),
(547,23,'Kancheepuram'),(548,23,'Kanyakumari'),(549,23,'Karur'),
(550,23,'Krishnagiri'),(551,23,'Madurai'),(552,23,'Mayiladuthurai'),
(553,23,'Nagapattinam'),(554,23,'Namakkal'),(555,23,'Nilgiris'),
(556,23,'Perambalur'),(557,23,'Pudukkottai'),(558,23,'Ramanathapuram'),
(559,23,'Ranipet'),(560,23,'Salem'),(561,23,'Sivaganga'),
(562,23,'Tenkasi'),(563,23,'Thanjavur'),(564,23,'Theni'),
(565,23,'Thoothukudi'),(566,23,'Tiruchirappalli'),(567,23,'Tirunelveli'),
(568,23,'Tirupattur'),(569,23,'Tiruppur'),(570,23,'Tiruvallur'),
(571,23,'Tiruvannamalai'),(572,23,'Tiruvarur'),(573,23,'Vellore'),
(574,23,'Villupuram'),(575,23,'Virudhunagar'),

-- ── TELANGANA (state 24) — IDs 576–608 ──
(576,24,'Adilabad'),(577,24,'Bhadradri Kothagudem'),(578,24,'Hanumakonda'),
(579,24,'Hyderabad'),(580,24,'Jagtial'),(581,24,'Jangaon'),
(582,24,'Jayashankar Bhupalpally'),(583,24,'Jogulamba Gadwal'),
(584,24,'Kamareddy'),(585,24,'Karimnagar'),(586,24,'Khammam'),
(587,24,'Komaram Bheem Asifabad'),(588,24,'Mahabubabad'),
(589,24,'Mahabubnagar'),(590,24,'Mancherial'),(591,24,'Medak'),
(592,24,'Medchal-Malkajgiri'),(593,24,'Mulugu'),
(594,24,'Nagarkurnool'),(595,24,'Nalgonda'),(596,24,'Narayanpet'),
(597,24,'Nirmal'),(598,24,'Nizamabad'),(599,24,'Peddapalli'),
(600,24,'Rajanna Sircilla'),(601,24,'Rangareddy'),(602,24,'Sangareddy'),
(603,24,'Siddipet'),(604,24,'Suryapet'),(605,24,'Vikarabad'),
(606,24,'Wanaparthy'),(607,24,'Warangal'),(608,24,'Yadadri Bhuvanagiri'),

-- ── TRIPURA (state 25) — IDs 609–616 ──
(609,25,'Dhalai'),(610,25,'Gomati'),(611,25,'Khowai'),
(612,25,'North Tripura'),(613,25,'Sepahijala'),(614,25,'South Tripura'),
(615,25,'Unokoti'),(616,25,'West Tripura'),

-- ── UTTAR PRADESH (state 26) — IDs 617–691 ──
(617,26,'Agra'),(618,26,'Aligarh'),(619,26,'Ambedkar Nagar'),
(620,26,'Amethi'),(621,26,'Amroha'),(622,26,'Auraiya'),
(623,26,'Ayodhya'),(624,26,'Azamgarh'),(625,26,'Baghpat'),
(626,26,'Bahraich'),(627,26,'Ballia'),(628,26,'Balrampur'),
(629,26,'Banda'),(630,26,'Barabanki'),(631,26,'Bareilly'),
(632,26,'Basti'),(633,26,'Bhadohi'),(634,26,'Bijnor'),
(635,26,'Budaun'),(636,26,'Bulandshahr'),(637,26,'Chandauli'),
(638,26,'Chitrakoot'),(639,26,'Deoria'),(640,26,'Etah'),
(641,26,'Etawah'),(642,26,'Farrukhabad'),(643,26,'Fatehpur'),
(644,26,'Firozabad'),(645,26,'Gautam Buddha Nagar'),(646,26,'Ghaziabad'),
(647,26,'Ghazipur'),(648,26,'Gonda'),(649,26,'Gorakhpur'),
(650,26,'Hamirpur'),(651,26,'Hapur'),(652,26,'Hardoi'),
(653,26,'Hathras'),(654,26,'Jalaun'),(655,26,'Jaunpur'),
(656,26,'Jhansi'),(657,26,'Kannauj'),(658,26,'Kanpur Dehat'),
(659,26,'Kanpur Nagar'),(660,26,'Kasganj'),(661,26,'Kaushambi'),
(662,26,'Kushinagar'),(663,26,'Lakhimpur Kheri'),(664,26,'Lalitpur'),
(665,26,'Lucknow'),(666,26,'Maharajganj'),(667,26,'Mahoba'),
(668,26,'Mainpuri'),(669,26,'Mathura'),(670,26,'Mau'),
(671,26,'Meerut'),(672,26,'Mirzapur'),(673,26,'Moradabad'),
(674,26,'Muzaffarnagar'),(675,26,'Pilibhit'),(676,26,'Pratapgarh'),
(677,26,'Prayagraj'),(678,26,'Rae Bareli'),(679,26,'Rampur'),
(680,26,'Saharanpur'),(681,26,'Sambhal'),(682,26,'Sant Kabir Nagar'),
(683,26,'Shahjahanpur'),(684,26,'Shamli'),(685,26,'Shravasti'),
(686,26,'Siddharthnagar'),(687,26,'Sitapur'),(688,26,'Sonbhadra'),
(689,26,'Sultanpur'),(690,26,'Unnao'),(691,26,'Varanasi'),

-- ── UTTARAKHAND (state 27) — IDs 692–704 ──
(692,27,'Almora'),(693,27,'Bageshwar'),(694,27,'Chamoli'),
(695,27,'Champawat'),(696,27,'Dehradun'),(697,27,'Haridwar'),
(698,27,'Nainital'),(699,27,'Pauri Garhwal'),(700,27,'Pithoragarh'),
(701,27,'Rudraprayag'),(702,27,'Tehri Garhwal'),
(703,27,'Udham Singh Nagar'),(704,27,'Uttarkashi'),

-- ── WEST BENGAL (state 28) — IDs 705–727 ──
(705,28,'Alipurduar'),(706,28,'Bankura'),(707,28,'Birbhum'),
(708,28,'Cooch Behar'),(709,28,'Dakshin Dinajpur'),
(710,28,'Darjeeling'),(711,28,'Hooghly'),(712,28,'Howrah'),
(713,28,'Jalpaiguri'),(714,28,'Jhargram'),(715,28,'Kalimpong'),
(716,28,'Kolkata'),(717,28,'Malda'),(718,28,'Murshidabad'),
(719,28,'Nadia'),(720,28,'North 24 Parganas'),
(721,28,'Paschim Bardhaman'),(722,28,'Paschim Medinipur'),
(723,28,'Purba Bardhaman'),(724,28,'Purba Medinipur'),
(725,28,'Purulia'),(726,28,'South 24 Parganas'),
(727,28,'Uttar Dinajpur'),

-- ── ANDAMAN & NICOBAR (state 29) — IDs 728–730 ──
(728,29,'Nicobar'),(729,29,'North and Middle Andaman'),(730,29,'South Andaman'),

-- ── CHANDIGARH (state 30) — ID 731 ──
(731,30,'Chandigarh'),

-- ── DADRA & NH AND DAMAN & DIU (state 31) — IDs 732–733 ──
(732,31,'Daman and Diu'),(733,31,'Dadra and Nagar Haveli'),

-- ── DELHI (state 32) — IDs 734–744 ──
(734,32,'Central Delhi'),(735,32,'East Delhi'),(736,32,'New Delhi'),
(737,32,'North Delhi'),(738,32,'North East Delhi'),(739,32,'North West Delhi'),
(740,32,'Shahdara'),(741,32,'South Delhi'),(742,32,'South East Delhi'),
(743,32,'South West Delhi'),(744,32,'West Delhi'),

-- ── JAMMU & KASHMIR (state 33) — IDs 745–764 ──
(745,33,'Anantnag'),(746,33,'Bandipora'),(747,33,'Baramulla'),
(748,33,'Budgam'),(749,33,'Doda'),(750,33,'Ganderbal'),
(751,33,'Jammu'),(752,33,'Kathua'),(753,33,'Kishtwar'),
(754,33,'Kulgam'),(755,33,'Kupwara'),(756,33,'Poonch'),
(757,33,'Pulwama'),(758,33,'Rajouri'),(759,33,'Ramban'),
(760,33,'Reasi'),(761,33,'Samba'),(762,33,'Shopian'),
(763,33,'Srinagar'),(764,33,'Udhampur'),

-- ── LADAKH (state 34) — IDs 765–766 ──
(765,34,'Kargil'),(766,34,'Leh'),

-- ── LAKSHADWEEP (state 35) — ID 767 ──
(767,35,'Lakshadweep'),

-- ── PUDUCHERRY (state 36) — IDs 768–771 ──
(768,36,'Karaikal'),(769,36,'Mahe'),(770,36,'Puducherry'),(771,36,'Yanam'),

-- ── USA (states 37–38) — IDs 772–774 ──
(772,37,'Los Angeles'),(773,37,'San Francisco'),(774,38,'New York City'),

-- ── UK (state 39) — IDs 775–776 ──
(775,39,'Westminster'),(776,39,'City of London')

ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, state_id = EXCLUDED.state_id;

-- ============================================================
-- TALUKS / SUBDIVISIONS
-- ============================================================
INSERT INTO taluks (id, district_id, name) VALUES

-- ================================================================
-- KARNATAKA — ALL TALUKS (Comprehensive)
-- ================================================================

-- Bagalkot (district 1)
(1,1,'Bagalkot'),(2,1,'Badami'),(3,1,'Bilagi'),(4,1,'Hungund'),(5,1,'Jamkhandi'),(6,1,'Mudhol'),

-- Ballari (district 2)
(7,2,'Ballari'),(8,2,'Hadagali'),(9,2,'Hospet'),(10,2,'Sandur'),(11,2,'Siruguppa'),

-- Belagavi (district 3)
(12,3,'Athani'),(13,3,'Bailhongal'),(14,3,'Belagavi'),(15,3,'Chikodi'),(16,3,'Gokak'),
(17,3,'Hukkeri'),(18,3,'Kagwad'),(19,3,'Khanapur'),(20,3,'Mudalagi'),
(21,3,'Raibag'),(22,3,'Ramdurg'),(23,3,'Saundatti'),

-- Bengaluru Rural (district 4)
(24,4,'Devanahalli'),(25,4,'Doddaballapura'),(26,4,'Hosakote'),(27,4,'Nelamangala'),

-- Bengaluru Urban (district 5)
(28,5,'Anekal'),(29,5,'Bengaluru East'),(30,5,'Bengaluru North'),
(31,5,'Bengaluru South'),(32,5,'Yeshwanthapura'),

-- Bidar (district 6)
(33,6,'Aurad'),(34,6,'Basavakalyan'),(35,6,'Bhalki'),(36,6,'Bidar'),(37,6,'Humnabad'),

-- Chamarajanagara (district 7)
(38,7,'Chamarajanagara'),(39,7,'Gundlupet'),(40,7,'Hanur'),(41,7,'Kollegal'),

-- Chikkaballapura (district 8)
(42,8,'Bagepalli'),(43,8,'Chikkaballapura'),(44,8,'Chintamani'),
(45,8,'Gauribidanur'),(46,8,'Gudibanda'),(47,8,'Sidlaghatta'),

-- Chikkamagaluru (district 9)
(48,9,'Chikkamagaluru'),(49,9,'Kadur'),(50,9,'Koppa'),(51,9,'Mudigere'),
(52,9,'Narasimharajapura'),(53,9,'Sringeri'),(54,9,'Tarikere'),

-- Chitradurga (district 10)
(55,10,'Challakere'),(56,10,'Chitradurga'),(57,10,'Hiriyur'),
(58,10,'Holalkere'),(59,10,'Hosadurga'),(60,10,'Molakalmuru'),

-- Dakshina Kannada (district 11)
(61,11,'Bantval'),(62,11,'Belthangady'),(63,11,'Mangaluru'),(64,11,'Puttur'),(65,11,'Sullia'),

-- Davangere (district 12)
(66,12,'Channagiri'),(67,12,'Davangere'),(68,12,'Harihar'),
(69,12,'Honnali'),(70,12,'Jagalur'),(71,12,'Nyamathi'),

-- Dharwad (district 13)
(72,13,'Dharwad'),(73,13,'Hubballi'),(74,13,'Kalagatagi'),(75,13,'Kundgol'),(76,13,'Navalgund'),

-- Gadag (district 14)
(77,14,'Gadag'),(78,14,'Mundaragi'),(79,14,'Nargund'),(80,14,'Ron'),(81,14,'Shirahatti'),

-- Hassan (district 15)
(82,15,'Alur'),(83,15,'Arkalgud'),(84,15,'Arsikere'),(85,15,'Belur'),
(86,15,'Channarayapatna'),(87,15,'Hassan'),(88,15,'Holenarasipur'),(89,15,'Sakleshpur'),

-- Haveri (district 16)
(90,16,'Byadagi'),(91,16,'Hanagal'),(92,16,'Haveri'),(93,16,'Hirekerur'),
(94,16,'Ranebennur'),(95,16,'Savanur'),(96,16,'Shiggaon'),

-- Kalaburagi (district 17)
(97,17,'Afzalpur'),(98,17,'Aland'),(99,17,'Chincholi'),(100,17,'Chittapur'),
(101,17,'Jevargi'),(102,17,'Kalaburagi'),(103,17,'Sedam'),

-- Kodagu (district 18)
(104,18,'Madikeri'),(105,18,'Somvarpet'),(106,18,'Virajpet'),

-- Kolar (district 19)
(107,19,'Bangarpet'),(108,19,'KGF'),(109,19,'Kolar'),
(110,19,'Malur'),(111,19,'Mulbagal'),(112,19,'Srinivasapura'),

-- Koppal (district 20)
(113,20,'Gangavathi'),(114,20,'Koppal'),(115,20,'Kushtagi'),(116,20,'Yelburga'),

-- Mandya (district 21)
(117,21,'Krishnarajapet'),(118,21,'Maddur'),(119,21,'Malavalli'),
(120,21,'Mandya'),(121,21,'Nagamangala'),(122,21,'Pandavapura'),(123,21,'Shrirangapattana'),

-- Mysuru (district 22)
(124,22,'H.D. Kote'),(125,22,'Heggadadevankote'),(126,22,'Hunsur'),
(127,22,'Krishnarajanagara'),(128,22,'Mysuru'),(129,22,'Nanjangud'),
(130,22,'Periyapatna'),(131,22,'T. Narasipur'),

-- Raichur (district 23)
(132,23,'Devadurga'),(133,23,'Lingsugur'),(134,23,'Manvi'),
(135,23,'Raichur'),(136,23,'Sindhanur'),

-- Ramanagara (district 24)
(137,24,'Channapatna'),(138,24,'Kanakapura'),(139,24,'Magadi'),(140,24,'Ramanagara'),

-- Shivamogga (district 25)
(141,25,'Bhadravati'),(142,25,'Hosanagara'),(143,25,'Sagar'),
(144,25,'Shikaripura'),(145,25,'Shivamogga'),(146,25,'Soraba'),(147,25,'Tirthahalli'),

-- Tumakuru (district 26)
(148,26,'Chiknayakanhalli'),(149,26,'Gubbi'),(150,26,'Koratagere'),
(151,26,'Kunigal'),(152,26,'Madhugiri'),(153,26,'Pavagada'),
(154,26,'Sira'),(155,26,'Tiptur'),(156,26,'Tumakuru'),(157,26,'Turuvekere'),

-- Udupi (district 27)
(158,27,'Karkala'),(159,27,'Kundapura'),(160,27,'Udupi'),

-- Uttara Kannada (district 28)
(161,28,'Ankola'),(162,28,'Bhatkal'),(163,28,'Dandeli'),(164,28,'Haliyal'),
(165,28,'Honavar'),(166,28,'Joida'),(167,28,'Karwar'),(168,28,'Kumta'),
(169,28,'Mundgod'),(170,28,'Siddapur'),(171,28,'Sirsi'),(172,28,'Yellapur'),

-- Vijayapura (district 29)
(173,29,'Basavana Bagewadi'),(174,29,'Indi'),(175,29,'Muddebihal'),
(176,29,'Sindagi'),(177,29,'Vijayapura'),

-- Yadgir (district 30)
(178,30,'Gurmitkal'),(179,30,'Shahapur'),(180,30,'Shorapur'),(181,30,'Yadgir'),

-- Vijayanagara (district 31)
(182,31,'Hagaribommanahalli'),(183,31,'Harpanahalli'),(184,31,'Hosapete'),
(185,31,'Kampli'),(186,31,'Kottur'),(187,31,'Kudligi'),

-- ================================================================
-- ANDHRA PRADESH — Major Mandals per District
-- ================================================================
(188,32,'Gorantla'),(189,32,'Hindupur'),(190,32,'Kadiri'),
(191,33,'Punganur'),(192,33,'Chittoor'),(193,33,'Madanapalle'),
(194,34,'Kakinada'),(195,34,'Pithapuram'),(196,34,'Rajam'),
(197,35,'Bapatla'),(198,35,'Chirala'),(199,35,'Narasaraopet'),
(200,36,'Chittoor'),(201,36,'Tirupati'),(202,36,'Srikalahasti'),
(203,37,'Rajahmundry'),(204,37,'Amalapuram'),(205,37,'Malkipuram'),
(206,38,'Eluru'),(207,38,'Bhimavaram'),(208,38,'Palakol'),
(209,39,'Guntur'),(210,39,'Tenali'),(211,39,'Sattenapalle'),
(212,40,'Machilipatnam'),(213,40,'Vijayawada'),(214,40,'Gudivada'),
(215,41,'Kurnool'),(216,41,'Nandyal'),(217,41,'Adoni'),
(218,42,'Nandyal'),(219,42,'Atmakur'),(220,42,'Nandyal Urban'),
(221,43,'NTR Rural'),(222,43,'Ibrahimpatnam'),(223,43,'Jaggayyapeta'),
(224,44,'Narasaraopet'),(225,44,'Macherla'),(226,44,'Vinukonda'),
(227,45,'Paderu'),(228,45,'Araku Valley'),(229,45,'Chintapalle'),
(230,46,'Vizianagaram'),(231,46,'Bobbili'),(232,46,'Salur'),
(233,47,'Ongole'),(234,47,'Kandukur'),(235,47,'Markapur'),
(236,48,'Tirupati'),(237,48,'Srikalahasti'),(238,48,'Puttur'),
(239,49,'Puttaparthi'),(240,49,'Kadiri'),(241,49,'Hindupur'),
(242,50,'Srikakulam'),(243,50,'Palasa'),(244,50,'Amadalavalasa'),
(245,51,'Visakhapatnam'),(246,51,'Bheemunipatnam'),(247,51,'Anakapalle'),
(248,52,'Vizianagaram'),(249,52,'Srungavarapukota'),(250,52,'Bobbili'),
(251,53,'Tanuku'),(252,53,'Narsapuram'),(253,53,'Bhimavaram'),
(254,54,'Kadapa'),(255,54,'Proddatur'),(256,54,'Jammalamadugu'),

-- ================================================================
-- ASSAM — Key Blocks/Circles
-- ================================================================
(257,80,'Tamulpur'),(258,80,'Tihu'),(259,80,'Baganpara'),
(260,81,'Barpeta Road'),(261,81,'Barpeta'),(262,81,'Bajali'),
(263,82,'Biswanath Chariali'),(264,82,'Behali'),(265,82,'Gohpur'),
(266,83,'Bongaigaon'),(267,83,'Abhayapuri'),(268,83,'Bijni'),
(269,84,'Silchar'),(270,84,'Lakhipur'),(271,84,'Sonai'),
(272,85,'Charaideo'),(273,85,'Sonari'),(274,85,'Amguri'),
(275,86,'Bongaigaon Rural'),(276,86,'Chirang'),(277,86,'Sidli'),
(278,87,'Mangaldoi'),(279,87,'Kalaigaon'),(280,87,'Dalgaon'),
(281,88,'Dhemaji'),(282,88,'Jonai'),(283,88,'Sissiborgaon'),
(284,89,'Dhubri'),(285,89,'Bilasipara'),(286,89,'Gauripur'),
(287,90,'Dibrugarh'),(288,90,'Naharkatia'),(289,90,'Lahowal'),
(290,91,'Haflong'),(291,91,'Maibong'),(292,91,'Umrangso'),
(293,92,'Goalpara'),(294,92,'Lakhipur'),(295,92,'Matia'),
(296,93,'Golaghat'),(297,93,'Sarupathar'),(298,93,'Bokakhat'),
(299,94,'Hailakandi'),(300,94,'Lala'),(301,94,'Katlicherra'),
(302,95,'Hojai'),(303,95,'Doboka'),(304,95,'Lumding'),
(305,96,'Jorhat'),(306,96,'Titabor'),(307,96,'Majuli'),
(308,97,'Guwahati'),(309,97,'Hajo'),(310,97,'Changsari'),
(311,98,'Guwahati Metro'),(312,98,'Dispur'),(313,98,'North Guwahati'),
(314,99,'Diphu'),(315,99,'Bokajan'),(316,99,'Hamren'),
(317,100,'Karimganj'),(318,100,'Badarpur'),(319,100,'Nilambazar'),
(320,101,'Kokrajhar'),(321,101,'Gossaigaon'),(322,101,'Dotma'),
(323,102,'Lakhimpur'),(324,102,'Narayanpur'),(325,102,'Dhakuakhana'),
(326,103,'Majuli Island'),(327,103,'Kamalabari'),(328,103,'Jorhat Rural'),
(329,104,'Morigaon'),(330,104,'Laharighat'),(331,104,'Mayong'),
(332,105,'Nagaon'),(333,105,'Raha'),(334,105,'Samaguri'),
(335,106,'Nalbari'),(336,106,'Tihu'),(337,106,'Barkhetri'),
(338,107,'Sivasagar'),(339,107,'Nazira'),(340,107,'Gaurisagar'),
(341,108,'Tezpur'),(342,108,'Dhekiajuli'),(343,108,'Biswanath'),
(344,109,'Mankachar'),(345,109,'Salmara'),(346,109,'Bilasipara'),
(347,110,'Tamulpur Town'),(348,110,'Pub Tamulpur'),(349,110,'Barama'),
(350,111,'Tinsukia'),(351,111,'Margherita'),(352,111,'Digboi'),
(353,112,'Udalguri'),(354,112,'Kalaigaon'),(355,112,'Bhergaon'),
(356,113,'Hamren'),(357,113,'Rongram'),(358,113,'Amri'),
(359,114,'Diphu'),(360,114,'Bokajan'),(361,114,'Singhason'),

-- ================================================================
-- BIHAR — Key Blocks
-- ================================================================
(362,115,'Araria'),(363,115,'Forbesganj'),(364,115,'Jokihat'),
(365,116,'Arwal'),(366,116,'Kaler'),(367,116,'Kurtha'),
(368,117,'Aurangabad'),(369,117,'Daudnagar'),(370,117,'Obra'),
(371,118,'Banka'),(372,118,'Katoria'),(373,118,'Dhuraiya'),
(374,119,'Begusarai'),(375,119,'Barauni'),(376,119,'Teghra'),
(377,120,'Bhagalpur'),(378,120,'Kahalgaon'),(379,120,'Naugachia'),
(380,121,'Arrah'),(381,121,'Jagdishpur'),(382,121,'Piro'),
(383,122,'Buxar'),(384,122,'Simri'),(385,122,'Chausa'),
(386,123,'Darbhanga'),(387,123,'Benipur'),(388,123,'Manigachhi'),
(389,124,'Motihari'),(390,124,'Raxaul'),(391,124,'Kesaria'),
(392,125,'Gaya'),(393,125,'Bodh Gaya'),(394,125,'Wazirganj'),
(395,126,'Gopalganj'),(396,126,'Sidhwalia'),(397,126,'Uchkagaon'),
(398,127,'Jamui'),(399,127,'Sikandra'),(400,127,'Chakai'),
(401,128,'Jehanabad'),(402,128,'Makhdumpur'),(403,128,'Ghoshi'),
(404,129,'Bhabua'),(405,129,'Mohania'),(406,129,'Adhaura'),
(407,130,'Katihar'),(408,130,'Manihari'),(409,130,'Korha'),
(410,131,'Khagaria'),(411,131,'Mansi'),(412,131,'Gogri'),
(413,132,'Kishanganj'),(414,132,'Thakurganj'),(415,132,'Pothia'),
(416,133,'Lakhisarai'),(417,133,'Halsi'),(418,133,'Surajgarha'),
(419,134,'Madhepura'),(420,134,'Singheshwar'),(421,134,'Alamnagar'),
(422,135,'Madhubani'),(423,135,'Jainagar'),(424,135,'Phulparas'),
(425,136,'Munger'),(426,136,'Jamalpur'),(427,136,'Tarapur'),
(428,137,'Muzaffarpur'),(429,137,'Sitamarhi'),(430,137,'Kanti'),
(431,138,'Nalanda'),(432,138,'Rajgir'),(433,138,'Biharsharif'),
(434,139,'Nawada'),(435,139,'Warsaliganj'),(436,139,'Rajauli'),
(437,140,'Patna'),(438,140,'Patna City'),(439,140,'Danapur'),
(440,141,'Purnia'),(441,141,'Kasba'),(442,141,'Banmankhi'),
(443,142,'Sasaram'),(444,142,'Bikramganj'),(445,142,'Dehri'),
(446,143,'Saharsa'),(447,143,'Salkhua'),(448,143,'Mahishi'),
(449,144,'Samastipur'),(450,144,'Dalsinghsarai'),(451,144,'Warisnagar'),
(452,145,'Chapra'),(453,145,'Marhaura'),(454,145,'Parsa'),
(455,146,'Sheikhpura'),(456,146,'Shekhopur Sarai'),(457,146,'Ariyari'),
(458,147,'Sheohar'),(459,147,'Piprahi'),(460,147,'Tariyani'),
(461,148,'Sitamarhi'),(462,148,'Runnisaidpur'),(463,148,'Dumra'),
(464,149,'Siwan'),(465,149,'Maharajganj'),(466,149,'Mairwa'),
(467,150,'Supaul'),(468,150,'Nirmali'),(469,150,'Triveniganj'),
(470,151,'Hajipur'),(471,151,'Lalganj'),(472,151,'Mahua'),
(473,152,'Bettiah'),(474,152,'Narkatiaganj'),(475,152,'Bagaha'),

-- ================================================================
-- KERALA — All Taluks
-- ================================================================
(476,279,'Ambalappuzha'),(477,279,'Chengannur'),(478,279,'Karthikappally'),
(479,279,'Kuttanad'),(480,279,'Mavelikkara'),(481,279,'Cherthala'),

(482,280,'Aluva'),(483,280,'Ernakulam'),(484,280,'Kanayannur'),
(485,280,'Kochi'),(486,280,'Kothamangalam'),(487,280,'Kunnathunad'),
(488,280,'Muvattupuzha'),(489,280,'Paravur'),

(490,281,'Devikulam'),(491,281,'Idukki'),(492,281,'Peermade'),
(493,281,'Thodupuzha'),(494,281,'Udumbanchola'),

(495,282,'Iritty'),(496,282,'Kannur'),(497,282,'Koothuparamba'),
(498,282,'Payyanur'),(499,282,'Thalassery'),

(500,283,'Hosdurg'),(501,283,'Kasaragod'),(502,283,'Manjeswaram'),
(503,283,'Vela Pally'),

(504,284,'Chathannur'),(505,284,'Karunagappally'),(506,284,'Kottarakkara'),
(507,284,'Kollam'),(508,284,'Kunnathur'),(509,284,'Pathanapuram'),

(510,285,'Changanassery'),(511,285,'Kottayam'),(512,285,'Kanjirappally'),
(513,285,'Meenachil'),(514,285,'Vaikom'),

(515,286,'Koyilandy'),(516,286,'Kozhikode'),(517,286,'Mukkam'),
(518,286,'Vadakara'),

(519,287,'Ernad'),(520,287,'Malappuram'),(521,287,'Nilambur'),
(522,287,'Perintalmanna'),(523,287,'Tirur'),(524,287,'Tirurrangadi'),

(525,288,'Alathur'),(526,288,'Chittur'),(527,288,'Mannarghat'),
(528,288,'Palakkad'),(529,288,'Thrithala'),

(530,289,'Adoor'),(531,289,'Kozhencherry'),(532,289,'Mallappally'),
(533,289,'Pathanamthitta'),(534,289,'Thiruvalla'),

(535,290,'Chirayinkeezhu'),(536,290,'Nedumangad'),(537,290,'Neyyattinkara'),
(538,290,'Thiruvananthapuram'),(539,290,'Varkala'),

(540,291,'Chalakudy'),(541,291,'Kunnamkulam'),(542,291,'Mukundapuram'),
(543,291,'Thrissur'),

(544,292,'Mananthavady'),(545,292,'Sultan Bathery'),(546,292,'Vythiri'),

-- ================================================================
-- TAMIL NADU — Major Taluks per District
-- ================================================================
(547,538,'Ariyalur'),(548,538,'Sendurai'),(549,538,'Udayarpalayam'),
(550,539,'Chengalpattu'),(551,539,'Madurantakam'),(552,539,'Tambaram'),
(553,540,'Alandur'),(554,540,'Egmore-Nungambakkam'),(555,540,'Mambalam-Guindy'),(556,540,'Sholavaram'),
(557,541,'Coimbatore North'),(558,541,'Coimbatore South'),(559,541,'Mettupalayam'),(560,541,'Pollachi'),(561,541,'Sulur'),
(562,542,'Cuddalore'),(563,542,'Chidambaram'),(564,542,'Virudhachalam'),
(565,543,'Dharmapuri'),(566,543,'Harur'),(567,543,'Palacode'),
(568,544,'Dindigul'),(569,544,'Natham'),(570,544,'Palani'),(571,544,'Vedasandur'),
(572,545,'Erode'),(573,545,'Bhavani'),(574,545,'Gobichettipalayam'),(575,545,'Perundurai'),
(576,546,'Kallakurichi'),(577,546,'Chinnasalem'),(578,546,'Sankarapuram'),
(579,547,'Kancheepuram'),(580,547,'Sriperumbudur'),(581,547,'Uthiramerur'),
(582,548,'Kanyakumari'),(583,548,'Agasteeswaram'),(584,548,'Vilavancode'),
(585,549,'Karur'),(586,549,'Aravakurichi'),(587,549,'Kulithalai'),
(588,550,'Krishnagiri'),(589,550,'Bargur'),(590,550,'Hosur'),
(591,551,'Madurai North'),(592,551,'Madurai South'),(593,551,'Melur'),(594,551,'Thirumangalam'),
(595,552,'Mayiladuthurai'),(596,552,'Sirkali'),(597,552,'Kuthalam'),
(598,553,'Nagapattinam'),(599,553,'Vedaranyam'),(600,553,'Kilvelur'),
(601,554,'Namakkal'),(602,554,'Rasipuram'),(603,554,'Tiruchengode'),
(604,555,'Gudalur'),(605,555,'Ooty (Udhagamandalam)'),(606,555,'Coonoor'),
(607,556,'Perambalur'),(608,556,'Kunnam'),(609,556,'Veppanthattai'),
(610,557,'Pudukkottai'),(611,557,'Alangudi'),(612,557,'Gandarvakottai'),
(613,558,'Ramanathapuram'),(614,558,'Paramakudi'),(615,558,'Rameswaram'),
(616,559,'Ranipet'),(617,559,'Arcot'),(618,559,'Arakkonam'),
(619,560,'Salem'),(620,560,'Attur'),(621,560,'Mettur'),(622,560,'Omalur'),
(623,561,'Sivaganga'),(624,561,'Karaikudi'),(625,561,'Devakottai'),
(626,562,'Tenkasi'),(627,562,'Sankarankovil'),(628,562,'Shencottah'),
(629,563,'Thanjavur'),(630,563,'Kumbakonam'),(631,563,'Papanasam'),
(632,564,'Theni'),(633,564,'Cumbum'),(634,564,'Uthamapalayam'),
(635,565,'Thoothukudi'),(636,565,'Tiruchendur'),(637,565,'Kovilpatti'),
(638,566,'Tiruchirappalli'),(639,566,'Lalgudi'),(640,566,'Srirangam'),(641,566,'Musiri'),
(642,567,'Tirunelveli'),(643,567,'Ambasamudram'),(644,567,'Nanguneri'),
(645,568,'Tirupattur'),(646,568,'Ambur'),(647,568,'Vaniyambadi'),
(648,569,'Tiruppur North'),(649,569,'Tiruppur South'),(650,569,'Dharapuram'),(651,569,'Udumalaipettai'),
(652,570,'Tiruvallur'),(653,570,'Ponneri'),(654,570,'Ambattur'),
(655,571,'Tiruvannamalai'),(656,571,'Arani'),(657,571,'Polur'),
(658,572,'Tiruvarur'),(659,572,'Kodavasal'),(660,572,'Mannargudi'),
(661,573,'Vellore'),(662,573,'Gudiyattam'),(663,573,'Katpadi'),
(664,574,'Villupuram'),(665,574,'Tindivanam'),(666,574,'Kallakurichi'),
(667,575,'Virudhunagar'),(668,575,'Sivakasi'),(669,575,'Rajapalayam'),

-- ================================================================
-- TELANGANA — Major Mandals per District
-- ================================================================
(670,576,'Adilabad'),(671,576,'Utnoor'),(672,576,'Boath'),
(673,577,'Kothagudem'),(674,577,'Bhadrachalam'),(675,577,'Yellandu'),
(676,578,'Hanamkonda'),(677,578,'Kazipet'),(678,578,'Warangal'),
(679,579,'Hyderabad'),(680,579,'Secunderabad'),(681,579,'Begumpet'),
(682,580,'Jagtial'),(683,580,'Koratla'),(684,580,'Metpally'),
(685,581,'Jangaon'),(686,581,'Ghanpur'),(687,581,'Station Ghanpur'),
(688,582,'Bhupalpally'),(689,582,'Tadvai'),(690,582,'Mahadevpur'),
(691,583,'Gadwal'),(692,583,'Alampur'),(693,583,'Wanaparthy'),
(694,584,'Kamareddy'),(695,584,'Yellareddy'),(696,584,'Banswada'),
(697,585,'Karimnagar'),(698,585,'Husnabad'),(699,585,'Choppadandi'),
(700,586,'Khammam'),(701,586,'Wyra'),(702,586,'Madhira'),
(703,587,'Asifabad'),(704,587,'Sirpur'),(705,587,'Luxettipet'),
(706,588,'Mahabubabad'),(707,588,'Dornakal'),(708,588,'Thorrur'),
(709,589,'Mahabubnagar'),(710,589,'Jadcherla'),(711,589,'Narayanpet'),
(712,590,'Mancherial'),(713,590,'Bellampalli'),(714,590,'Luxettipet'),
(715,591,'Medak'),(716,591,'Siddipet'),(717,591,'Narsapur'),
(718,592,'Medchal'),(719,592,'Malkajgiri'),(720,592,'Keesara'),
(721,593,'Mulugu'),(722,593,'Venkatapur'),(723,593,'Mangapet'),
(724,594,'Nagarkurnool'),(725,594,'Kollapur'),(726,594,'Achampet'),
(727,595,'Nalgonda'),(728,595,'Miryalaguda'),(729,595,'Bhongir'),
(730,596,'Narayanpet'),(731,596,'Makthal'),(732,596,'Uppununthala'),
(733,597,'Nirmal'),(734,597,'Bhainsa'),(735,597,'Dilawarpur'),
(736,598,'Nizamabad'),(737,598,'Bodhan'),(738,598,'Armoor'),
(739,599,'Peddapalli'),(740,599,'Manthani'),(741,599,'Ramagundam'),
(742,600,'Sircilla'),(743,600,'Vemulawada'),(744,600,'Koheda'),
(745,601,'Rangareddy'),(746,601,'Chevella'),(747,601,'Tandur'),
(748,602,'Sangareddy'),(749,602,'Zahirabad'),(750,602,'Narayankhed'),
(751,603,'Siddipet'),(752,603,'Gajwel'),(753,603,'Dubbaka'),
(754,604,'Suryapet'),(755,604,'Nalgonda Rural'),(756,604,'Kodad'),
(757,605,'Vikarabad'),(758,605,'Parigi'),(759,605,'Tandur Rural'),
(760,606,'Wanaparthy'),(761,606,'Pebbair'),(762,606,'Gopalpet'),
(763,607,'Warangal Rural'),(764,607,'Narsampet'),(765,607,'Parkal'),
(766,608,'Yadadri'),(767,608,'Bhongir'),(768,608,'Alair'),

-- ================================================================
-- MAHARASHTRA — Major Taluks per District
-- ================================================================
(769,345,'Ahmednagar'),(770,345,'Sangamner'),(771,345,'Rahuri'),
(772,346,'Akola'),(773,346,'Balapur'),(774,346,'Murtizapur'),
(775,347,'Amravati'),(776,347,'Achalpur'),(777,347,'Daryapur'),
(778,348,'Aurangabad'),(779,348,'Kannad'),(780,348,'Paithan'),
(781,349,'Beed'),(782,349,'Parli'),(783,349,'Ambejogai'),
(784,350,'Bhandara'),(785,350,'Tumsar'),(786,350,'Sakoli'),
(787,351,'Buldhana'),(788,351,'Khamgaon'),(789,351,'Malkapur'),
(790,352,'Chandrapur'),(791,352,'Warora'),(792,352,'Chimur'),
(793,353,'Dhule'),(794,353,'Shirpur'),(795,353,'Sindkheda'),
(796,354,'Gadchiroli'),(797,354,'Kurkheda'),(798,354,'Chamorshi'),
(799,355,'Gondia'),(800,355,'Tumsar Rural'),(801,355,'Tirora'),
(802,356,'Hingoli'),(803,356,'Basmath'),(804,356,'Sengaon'),
(805,357,'Jalgaon'),(806,357,'Amalner'),(807,357,'Dharangaon'),
(808,358,'Jalna'),(809,358,'Badnapur'),(810,358,'Ambad'),
(811,359,'Kolhapur'),(812,359,'Ichalkaranji'),(813,359,'Kagal'),
(814,360,'Latur'),(815,360,'Ausa'),(816,360,'Nilanga'),
(817,361,'Mumbai City'),(818,361,'Fort'),(819,361,'Kurla'),
(820,362,'Borivali'),(821,362,'Andheri'),(822,362,'Bandra'),
(823,363,'Nagpur'),(824,363,'Ramtek'),(825,363,'Umred'),
(826,364,'Nanded'),(827,364,'Deglur'),(828,364,'Hadgaon'),
(829,365,'Nandurbar'),(830,365,'Shahada'),(831,365,'Taloda'),
(832,366,'Nashik'),(833,366,'Igatpuri'),(834,366,'Malegaon'),
(835,367,'Osmanabad'),(836,367,'Tuljapur'),(837,367,'Umarga'),
(838,368,'Palghar'),(839,368,'Wada'),(840,368,'Vasai'),
(841,369,'Parbhani'),(842,369,'Jintur'),(843,369,'Selu'),
(844,370,'Pune'),(845,370,'Haveli'),(846,370,'Maval'),
(847,371,'Raigad'),(848,371,'Panvel'),(849,371,'Alibag'),
(850,372,'Ratnagiri'),(851,372,'Chiplun'),(852,372,'Khed'),
(853,373,'Sangli'),(854,373,'Miraj'),(855,373,'Shirala'),
(856,374,'Satara'),(857,374,'Karad'),(858,374,'Patan'),
(859,375,'Sindhudurg'),(860,375,'Sawantwadi'),(861,375,'Kankavli'),
(862,376,'Solapur North'),(863,376,'Solapur South'),(864,376,'Pandharpur'),
(865,377,'Thane'),(866,377,'Kalyan'),(867,377,'Ulhasnagar'),
(868,378,'Wardha'),(869,378,'Hinganghat'),(870,378,'Arvi'),
(871,379,'Washim'),(872,379,'Mangrulpir'),(873,379,'Malegaon Rural'),
(874,380,'Yavatmal'),(875,380,'Wani'),(876,380,'Pusad'),

-- ================================================================
-- GUJARAT — Major Taluks
-- ================================================================
(877,188,'Ahmedabad City'),(878,188,'Detroj-Rampura'),(879,188,'Dholka'),
(880,189,'Amreli'),(881,189,'Rajula'),(882,189,'Jafrabad'),
(883,190,'Anand'),(884,190,'Khambhat'),(885,190,'Petlad'),
(886,191,'Modasa'),(887,191,'Bayad'),(888,191,'Himmatnagar'),
(889,192,'Palanpur'),(890,192,'Dantiwada'),(891,192,'Tharad'),
(892,193,'Bharuch'),(893,193,'Ankleshwar'),(894,193,'Hansot'),
(895,194,'Bhavnagar'),(896,194,'Palitana'),(897,194,'Talaja'),
(898,195,'Botad'),(899,195,'Barwala'),(900,195,'Gadhada'),
(901,196,'Chhota Udaipur'),(902,196,'Nasvadi'),(903,196,'Kavant'),
(904,197,'Dahod'),(905,197,'Fatepura'),(906,197,'Zalod'),
(907,198,'Ahwa (Dang)'),(908,198,'Waghai'),(909,198,'Subir'),
(910,199,'Dwarka'),(911,199,'Khambhalia'),(912,199,'Bhanvad'),
(913,200,'Gandhinagar'),(914,200,'Mansa'),(915,200,'Kalol'),
(916,201,'Veraval'),(917,201,'Una'),(918,201,'Kodinar'),
(919,202,'Jamnagar'),(920,202,'Dhrol'),(921,202,'Kalavad'),
(922,203,'Junagadh'),(923,203,'Keshod'),(924,203,'Mangrol'),
(925,204,'Anand Rural'),(926,204,'Nadiad'),(927,204,'Kapadwanj'),
(928,205,'Bhuj'),(929,205,'Mandvi'),(930,205,'Anjar'),
(931,206,'Lunawada'),(932,206,'Balasinor'),(933,206,'Santrampur'),
(934,207,'Mehsana'),(935,207,'Visnagar'),(936,207,'Kheralu'),
(937,208,'Morbi'),(938,208,'Halvad'),(939,208,'Tankara'),
(940,209,'Nandod'),(941,209,'Dediyapada'),(942,209,'Tilakwada'),
(943,210,'Navsari'),(944,210,'Jalalpore'),(945,210,'Vansda'),
(946,211,'Godhra'),(947,211,'Halol'),(948,211,'Kalol Rural'),
(949,212,'Patan'),(950,212,'Sidhpur'),(951,212,'Chanasma'),
(952,213,'Porbandar'),(953,213,'Kutiyana'),(954,213,'Ranavav'),
(955,214,'Rajkot'),(956,214,'Gondal'),(957,214,'Jetpur'),
(958,215,'Himmatnagar Rural'),(959,215,'Idar'),(960,215,'Prantij'),
(961,216,'Surat City'),(962,216,'Olpad'),(963,216,'Mandvi Rural'),
(964,217,'Surendranagar'),(965,217,'Wadhwan'),(966,217,'Limbdi'),
(967,218,'Vyara'),(968,218,'Songadh'),(969,218,'Uchchhal'),
(970,219,'Vadodara'),(971,219,'Padra'),(972,219,'Savli'),
(973,220,'Valsad'),(974,220,'Pardi'),(975,220,'Umbergaon'),

-- ================================================================
-- RAJASTHAN — Major Taluks
-- ================================================================
(976,489,'Ajmer'),(977,489,'Kishangarh'),(978,489,'Beawar Rural'),
(979,490,'Alwar'),(980,490,'Tijara'),(981,490,'Behror'),
(982,492,'Balotra'),(983,492,'Pachpadra'),(984,492,'Siwana'),
(985,493,'Banswara'),(986,493,'Kushalgarh'),(987,493,'Garhi'),
(988,494,'Baran'),(989,494,'Atru'),(990,494,'Shahabad'),
(991,495,'Barmer'),(992,495,'Chohtan'),(993,495,'Sindhari'),
(994,497,'Bharatpur'),(995,497,'Deeg'),(996,497,'Nagar'),
(997,498,'Bhilwara'),(998,498,'Shahpura Rural'),(999,498,'Asind'),
(1000,499,'Bikaner'),(1001,499,'Nokha'),(1002,499,'Lunkaransar'),
(1003,500,'Bundi'),(1004,500,'Nainwa'),(1005,500,'Hindoli'),
(1006,501,'Chittorgarh'),(1007,501,'Begun'),(1008,501,'Kapasan'),
(1009,502,'Churu'),(1010,502,'Sardarshahar'),(1011,502,'Rajgarh Rural'),
(1012,503,'Dausa'),(1013,503,'Lalsot'),(1014,503,'Bandikui'),
(1015,505,'Dholpur'),(1016,505,'Bari'),(1017,505,'Rajakhera'),
(1018,507,'Dungarpur'),(1019,507,'Sagwara'),(1020,507,'Aspur'),
(1021,508,'Ganganagar'),(1022,508,'Suratgarh'),(1023,508,'Anupgarh Rural'),
(1024,509,'Hanumangarh'),(1025,509,'Sangaria'),(1026,509,'Nohar'),
(1027,510,'Jaipur'),(1028,510,'Amber'),(1029,510,'Sanganer'),
(1030,511,'Jaisalmer'),(1031,511,'Pokaran'),(1032,511,'Ramgarh'),
(1033,512,'Jalore'),(1034,512,'Sanchore Rural'),(1035,512,'Bhinmal'),
(1036,513,'Jhalawar'),(1037,513,'Khanpur'),(1038,513,'Jhalarapatan'),
(1039,514,'Jhunjhunu'),(1040,514,'Pilani'),(1041,514,'Nawalgarh'),
(1042,515,'Jodhpur'),(1043,515,'Phalodi Rural'),(1044,515,'Shergarh'),
(1045,516,'Karauli'),(1046,516,'Hindaun'),(1047,516,'Sapotra'),
(1048,518,'Kota'),(1049,518,'Ladpura'),(1050,518,'Itawa'),
(1051,520,'Nagaur'),(1052,520,'Didwana Rural'),(1053,520,'Merta City'),
(1054,521,'Pali'),(1055,521,'Sojat'),(1056,521,'Bali'),
(1057,523,'Pratapgarh'),(1058,523,'Arnod'),(1059,523,'Dhariawad'),
(1060,524,'Rajsamand'),(1061,524,'Nathdwara'),(1062,524,'Kumbhalgarh'),
(1063,526,'Sawai Madhopur'),(1064,526,'Gangapur City'),(1065,526,'Bamanwas'),
(1066,528,'Sikar'),(1067,528,'Neem ka Thana'),(1068,528,'Fatehpur Rural'),
(1069,529,'Sirohi'),(1070,529,'Abu Road'),(1071,529,'Pindwara'),
(1072,530,'Tonk'),(1073,530,'Uniara'),(1074,530,'Todaraisingh'),
(1075,531,'Udaipur'),(1076,531,'Girwa'),(1077,531,'Vallabhnagar'),

-- ================================================================
-- MADHYA PRADESH — Key Taluks / Tehsils
-- ================================================================
(1078,301,'Bhopal'),(1079,301,'Berasia'),(1080,301,'Huzur'),
(1081,302,'Burhanpur'),(1082,302,'Nepanagar'),(1083,302,'Khaknar'),
(1084,314,'Indore'),(1085,314,'Mhow'),(1086,314,'Sanwer'),
(1087,315,'Jabalpur'),(1088,315,'Sihora'),(1089,315,'Katanga'),
(1090,311,'Gwalior'),(1091,311,'Bhitarwar'),(1092,311,'Morar'),
(1093,342,'Ujjain'),(1094,342,'Mahidpur'),(1095,342,'Nagda'),
(1096,331,'Sagar'),(1097,331,'Rehli'),(1098,331,'Khurai'),
(1099,330,'Rewa'),(1100,330,'Mauganj'),(1101,330,'Teonthar'),
(1102,332,'Satna'),(1103,332,'Nagod'),(1104,332,'Maihar'),
(1105,344,'Vidisha'),(1106,344,'Basoda'),(1107,344,'Gyaraspur'),

-- ================================================================
-- WEST BENGAL — Key Subdivisions/Blocks
-- ================================================================
(1108,705,'Alipurduar'),(1109,705,'Falakata'),(1110,705,'Kumargram'),
(1111,706,'Bankura Sadar'),(1112,706,'Bishnupur'),(1113,706,'Khatra'),
(1114,707,'Bolpur'),(1115,707,'Suri'),(1116,707,'Rampurhat'),
(1117,708,'Cooch Behar Sadar'),(1118,708,'Dinhata'),(1119,708,'Tufanganj'),
(1120,709,'Balurghat'),(1121,709,'Gangarampur'),(1122,709,'Hili'),
(1123,710,'Darjeeling Sadar'),(1124,710,'Siliguri'),(1125,710,'Kurseong'),
(1126,711,'Arambagh'),(1127,711,'Chandannagar'),(1128,711,'Serampore'),
(1129,712,'Howrah Sadar'),(1130,712,'Uluberia'),(1131,712,'Bally'),
(1132,713,'Jalpaiguri Sadar'),(1133,713,'Mal'),(1134,713,'Dhupguri'),
(1135,714,'Jhargram'),(1136,714,'Gopiballavpur'),(1137,714,'Binpur'),
(1138,715,'Kalimpong I'),(1139,715,'Kalimpong II'),(1140,715,'Gorubathan'),
(1141,716,'Kolkata'),(1142,716,'Port Trust Area'),(1143,716,'Metiabruz'),
(1144,717,'Malda Sadar'),(1145,717,'Old Malda'),(1146,717,'English Bazar'),
(1147,718,'Murshidabad Sadar'),(1148,718,'Lalbag'),(1149,718,'Kandi'),
(1150,719,'Krishnanagar'),(1151,719,'Ranaghat'),(1152,719,'Chakdaha'),
(1153,720,'Barrackpur'),(1154,720,'Barasat'),(1155,720,'Basirhat'),
(1156,721,'Asansol'),(1157,721,'Durgapur'),(1158,721,'Kanksa'),
(1159,722,'Medinipur'),(1160,722,'Ghatal'),(1161,722,'Kharagpur'),
(1162,723,'Burdwan Sadar'),(1163,723,'Katwa'),(1164,723,'Kalna'),
(1165,724,'Contai'),(1166,724,'Haldia'),(1167,724,'Tamluk'),
(1168,725,'Purulia Sadar'),(1169,725,'Manbazar'),(1170,725,'Raghunathpur'),
(1171,726,'Diamond Harbour'),(1172,726,'Alipore'),(1173,726,'Joynagar'),
(1174,727,'Raiganj'),(1175,727,'Islampur'),(1176,727,'Hemtabad'),

-- ================================================================
-- DELHI — Subdivisions
-- ================================================================
(1177,734,'Paharganj'),(1178,734,'Karol Bagh'),(1179,734,'Connaught Place'),
(1180,735,'Preet Vihar'),(1181,735,'Gandhi Nagar'),(1182,735,'Geeta Colony'),
(1183,736,'Chanakyapuri'),(1184,736,'Sadar Bazar'),(1185,736,'Parliament Street'),
(1186,737,'Civil Lines'),(1187,737,'Sadar'),(1188,737,'Burari'),
(1189,738,'Seema Puri'),(1190,738,'Karawal Nagar'),(1191,738,'Mustafabad'),
(1192,739,'Rohini'),(1193,739,'Shalimar Bagh'),(1194,739,'Bawana'),
(1195,740,'Shahdara'),(1196,740,'Vivek Vihar'),(1197,740,'Nand Nagri'),
(1198,741,'Mehrauli'),(1199,741,'Chattarpur'),(1200,741,'Hauz Khas'),
(1201,742,'Okhla'),(1202,742,'Lajpat Nagar'),(1203,742,'Kalkaji'),
(1204,743,'Dwarka'),(1205,743,'Vasant Vihar'),(1206,743,'Najafgarh'),
(1207,744,'Janakpuri'),(1208,744,'Vikaspuri'),(1209,744,'Uttam Nagar'),

-- ================================================================
-- UTTAR PRADESH — Major Tehsils (Key Districts)
-- ================================================================
(1210,617,'Agra'),(1211,617,'Fatehabad'),(1212,617,'Kiraoli'),
(1213,621,'Lucknow'),(1214,621,'Malihabad'),(1215,621,'Mohanlalganj'),
(1216,647,'Varanasi'),(1217,647,'Pindra'),(1218,647,'Kashi Vidyapeeth'),
(1219,677,'Allahabad'),(1220,677,'Karchhana'),(1221,677,'Meja'),
(1222,671,'Meerut'),(1223,671,'Hapur Rural'),(1224,671,'Sardhana'),
(1225,646,'Ghaziabad'),(1226,646,'Modinagar'),(1227,646,'Loni'),
(1228,665,'Lucknow Sadar'),(1229,665,'Bakshi Ka Talab'),(1230,665,'Chinhat'),
(1231,649,'Gorakhpur'),(1232,649,'Gola'),(1233,649,'Sahjanwa'),
(1234,618,'Aligarh'),(1235,618,'Khair'),(1236,618,'Iglas'),
(1237,631,'Bareilly'),(1238,631,'Nawabganj'),(1239,631,'Meerganj'),

-- ================================================================
-- JHARKHAND — Key Blocks
-- ================================================================
(1240,274,'Ranchi'),(1241,274,'Kanke'),(1242,274,'Ormanjhi'),
(1243,258,'Dhanbad'),(1244,258,'Jharia'),(1245,258,'Sindri'),
(1246,260,'Jamshedpur'),(1247,260,'Ghatsila'),(1248,260,'Baharagora'),
(1249,255,'Bokaro'),(1250,255,'Chandankiyari'),(1251,255,'Chas'),
(1252,265,'Hazaribagh'),(1253,265,'Barhi'),(1254,265,'Churchu'),

-- ================================================================
-- ODISHA — Key Taluks
-- ================================================================
(1255,442,'Cuttack'),(1256,442,'Banki'),(1257,442,'Athagarh'),
(1258,454,'Bhubaneswar'),(1259,454,'Jatani'),(1260,454,'Begunia'),
(1261,463,'Sambalpur'),(1262,463,'Rairakhol'),(1263,463,'Kuchinda'),
(1264,446,'Berhampur'),(1265,446,'Aska'),(1266,446,'Chhatrapur'),

-- ================================================================
-- PUNJAB — Key Subdivisions
-- ================================================================
(1267,466,'Amritsar'),(1268,466,'Ajnala'),(1269,466,'Tarn Taran Rural'),
(1270,477,'Ludhiana'),(1271,477,'Jagraon'),(1272,477,'Khanna'),
(1273,475,'Jalandhar'),(1274,475,'Nakodar'),(1275,475,'Phillaur'),
(1276,483,'Patiala'),(1277,483,'Nabha'),(1278,483,'Rajpura'),

-- ================================================================
-- HIMACHAL PRADESH — Key Subdivisions
-- ================================================================
(1279,251,'Shimla'),(1280,251,'Rampur'),(1281,251,'Chopal'),
(1282,246,'Kangra'),(1283,246,'Dharamsala'),(1284,246,'Palampur'),
(1285,250,'Mandi'),(1286,250,'Sundernagar'),(1287,250,'Jogindernagar'),

-- ================================================================
-- HARYANA — Key Subdivisions
-- ================================================================
(1288,226,'Gurugram'),(1289,226,'Farrukhnagar'),(1290,226,'Pataudi'),
(1291,224,'Faridabad'),(1292,224,'Ballabhgarh'),(1293,224,'Tigaon'),
(1294,231,'Karnal'),(1295,231,'Nilokheri'),(1296,231,'Indri'),

-- ================================================================
-- JAMMU & KASHMIR — Key Tehsils
-- ================================================================
(1297,751,'Jammu'),(1298,751,'RS Pura'),(1299,751,'Akhnoor'),
(1300,763,'Srinagar'),(1301,763,'Ganderbal Rural'),(1302,763,'Budgam Rural'),
(1303,747,'Baramulla'),(1304,747,'Sopore'),(1305,747,'Uri'),
(1306,745,'Anantnag'),(1307,745,'Pahalgam'),(1308,745,'Kokernag'),

-- ================================================================
-- UTTARAKHAND — Key Tehsils
-- ================================================================
(1309,696,'Dehradun'),(1310,696,'Vikasnagar'),(1311,696,'Chakrata'),
(1312,697,'Haridwar'),(1313,697,'Roorkee'),(1314,697,'Laksar'),
(1315,698,'Haldwani'),(1316,698,'Nainital Sadar'),(1317,698,'Bhimtal'),

-- ================================================================
-- SIKKIM — Key Subdivisions
-- ================================================================
(1318,532,'Gangtok'),(1319,532,'Pakyong Rural'),(1320,532,'Rongli'),
(1321,536,'Namchi'),(1322,536,'Ravangla'),(1323,536,'Jorethang'),
(1324,533,'Mangan'),(1325,533,'Chungthang'),(1326,533,'Dzongu'),
(1327,537,'Gyalshing'),(1328,537,'Soreng Rural'),(1329,537,'Yuksom'),

-- ================================================================
-- GOAN — Taluks
-- ================================================================
(1330,186,'Panaji'),(1331,186,'Bardez'),(1332,186,'Pernem'),(1333,186,'Bicholim'),(1334,186,'Tiswadi'),
(1335,187,'Margao'),(1336,187,'Salcete'),(1337,187,'Mormugao'),(1338,187,'Sanguem'),(1339,187,'Quepem'),

-- ================================================================
-- PUDUCHERRY — Communes
-- ================================================================
(1340,768,'Karaikal'),(1341,768,'Neravy'),(1342,768,'Thirunallar'),
(1343,769,'Mahe'),(1344,769,'Panduranga Nagar'),
(1345,770,'Pondicherry'),(1346,770,'Oulgaret'),(1347,770,'Villianur'),
(1348,771,'Yanam'),

-- ================================================================
-- LADAKH — Subdivisions
-- ================================================================
(1349,765,'Kargil Town'),(1350,765,'Zanskar'),(1351,765,'Sankoo'),
(1352,766,'Leh Town'),(1353,766,'Nubra'),(1354,766,'Nobra'),

-- ================================================================
-- USA / UK
-- ================================================================
(1355,772,'LA City'),(1356,772,'Santa Monica'),(1357,772,'Pasadena'),
(1358,773,'SF City'),(1359,773,'Oakland'),(1360,773,'San Jose'),
(1361,774,'Manhattan'),(1362,774,'Brooklyn'),(1363,774,'Queens'),
(1364,775,'Westminster Central'),(1365,775,'Pimlico'),(1366,775,'Mayfair'),
(1367,776,'City of London Central'),(1368,776,'Aldgate'),(1369,776,'Barbican')

ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, district_id = EXCLUDED.district_id;

-- ============================================================
-- SEED WARDS (Ward 1 to Ward 10 per Taluk — dynamic generation)
-- ============================================================
DO $$
DECLARE
  t_row RECORD;
BEGIN
  TRUNCATE TABLE wards CASCADE;
  FOR t_row IN SELECT id FROM taluks LOOP
    INSERT INTO wards (taluk_id, name) VALUES
    (t_row.id, 'Ward 1'),
    (t_row.id, 'Ward 2'),
    (t_row.id, 'Ward 3'),
    (t_row.id, 'Ward 4'),
    (t_row.id, 'Ward 5'),
    (t_row.id, 'Ward 6'),
    (t_row.id, 'Ward 7'),
    (t_row.id, 'Ward 8'),
    (t_row.id, 'Ward 9'),
    (t_row.id, 'Ward 10');
  END LOOP;
END $$;
