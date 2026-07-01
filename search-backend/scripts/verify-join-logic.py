import sqlite3
db=sqlite3.connect(":memory:")
c=db.cursor()
c.executescript("""
-- susi subset (실측 Prisma schema 기준)
CREATE TABLE ss_university(id INT PRIMARY KEY, region TEXT, name TEXT, establishment_type TEXT);
CREATE TABLE ss_admission_category(id INT PRIMARY KEY, name TEXT);
CREATE TABLE ss_admission(id INT PRIMARY KEY, name TEXT, year INT, university_id INT, category_id INT);
CREATE TABLE ss_admission_method(id INT PRIMARY KEY, admission_id INT, subject_ratio REAL, document_ratio REAL, interview_ratio REAL, practical_ratio REAL);
CREATE TABLE ss_general_field(id INT PRIMARY KEY, name TEXT);
CREATE TABLE ss_major_field(id INT PRIMARY KEY, name TEXT);
CREATE TABLE ss_mid_field(id INT PRIMARY KEY, name TEXT, major_field_id INT);
CREATE TABLE ss_minor_field(id INT PRIMARY KEY, name TEXT, mid_field_id INT);
CREATE TABLE ss_recruitment_unit(id INT PRIMARY KEY, name TEXT, recruitment_number INT, admission_id INT, general_field_id INT, minor_field_id INT);
CREATE TABLE ss_recruitment_unit_interview(id INT PRIMARY KEY, recruitment_unit_id INT, is_reflected INT);
CREATE TABLE ss_recruitment_unit_minimum_grade(id INT PRIMARY KEY, recruitment_unit_id INT, description TEXT);
-- jungsi subset
CREATE TABLE js_admission(id INT PRIMARY KEY, year INT, recruitment_name TEXT, general_field_name TEXT, detailed_fields TEXT,
  admission_type TEXT, admission_name TEXT, recruitment_number INT, csat_ratio TEXT, school_record_ratio TEXT,
  interview_ratio TEXT, other_ratio TEXT, csat_required TEXT, university_id INT);
""")
# seed
c.executescript("""
INSERT INTO ss_university VALUES (1,'서울','고려대','PRIVATE'),(2,'경기','아주대','PRIVATE');
INSERT INTO ss_admission_category VALUES (10,'학생부종합'),(11,'학생부교과');
INSERT INTO ss_admission VALUES (100,'학업우수형',2027,1,10),(101,'교과우수자',2027,2,11);
INSERT INTO ss_admission_method VALUES (1000,100,0,100,0,0),(1001,101,100,0,0,0);
INSERT INTO ss_general_field VALUES (20,'공학');
INSERT INTO ss_major_field VALUES (30,'공학계열');
INSERT INTO ss_mid_field VALUES (40,'컴퓨터·통신',30);
INSERT INTO ss_minor_field VALUES (50,'컴퓨터공학',40);
INSERT INTO ss_recruitment_unit VALUES (200,'컴퓨터학과',15,100,20,50),(201,'전자공학과',20,101,20,NULL);
INSERT INTO ss_recruitment_unit_interview VALUES (1,200,1);
INSERT INTO ss_recruitment_unit_minimum_grade VALUES (1,200,'국수영탐 중 2개 합 5');
INSERT INTO js_admission VALUES (300,2027,'컴퓨터공학과','공학','컴퓨터','수능위주','일반전형',30,'100','0','0','0','국,수,영,탐',1);
""")

print("=== SUSI JOIN (모집단위 grain) ===")
susi="""
SELECT ru.id AS source_id, ad.year, u.name AS university, u.region, ru.name AS dept,
       gf.name AS field_general, mid.name AS field_mid, mf.name AS field_minor,
       cat.name AS admission_type, ad.name AS admission_name, ru.recruitment_number,
       m.subject_ratio, m.document_ratio, m.interview_ratio,
       mg.description AS min_grade, COALESCE(iv.is_reflected,0) AS has_interview
FROM ss_recruitment_unit ru
JOIN ss_admission ad ON ad.id=ru.admission_id
LEFT JOIN ss_university u ON u.id=ad.university_id
LEFT JOIN ss_admission_category cat ON cat.id=ad.category_id
LEFT JOIN ss_admission_method m ON m.admission_id=ad.id
LEFT JOIN ss_general_field gf ON gf.id=ru.general_field_id
LEFT JOIN ss_minor_field mf ON mf.id=ru.minor_field_id
LEFT JOIN ss_mid_field mid ON mid.id=mf.mid_field_id
LEFT JOIN ss_recruitment_unit_interview iv ON iv.recruitment_unit_id=ru.id
LEFT JOIN ss_recruitment_unit_minimum_grade mg ON mg.recruitment_unit_id=ru.id
ORDER BY ru.id
"""
for r in c.execute(susi): print(dict(zip([d[0] for d in c.description],r)))

print("\n=== JUNGSI JOIN ===")
jungsi="""
SELECT a.id AS source_id, a.year, u.name AS university, u.region, a.recruitment_name AS dept,
       a.general_field_name, a.admission_type, a.admission_name, a.recruitment_number,
       a.csat_ratio, a.school_record_ratio, a.interview_ratio, a.csat_required
FROM js_admission a
LEFT JOIN ss_university u ON u.id=a.university_id
ORDER BY a.id
"""
for r in c.execute(jungsi): print(dict(zip([d[0] for d in c.description],r)))

# assertions
rows=list(c.execute(susi))
assert len(rows)==2, "susi rows"
# ru 200: 컴퓨터학과, 고려대, field_minor=컴퓨터공학, has_interview=1
r200=[x for x in c.execute(susi) if x[0]==200][0]
assert r200[2]=='고려대' and r200[4]=='컴퓨터학과' and r200[7]=='컴퓨터공학' and r200[15]==1, r200
# ru 201: minor NULL 이어도 행 유지(LEFT JOIN), has_interview=0
r201=[x for x in c.execute(susi) if x[0]==201][0]
assert r201[7] is None and r201[15]==0, r201
j=list(c.execute(jungsi)); assert len(j)==1 and j[0][2]=='고려대', j
print("\nALL JOIN ASSERTIONS PASSED ✓")
