"""Topic master list. src='pdf' means it came from topical_index.pdf, 'added' means suggested extra.
group is used for grouping in the index and in the app. Duplicates in the PDF are merged."""
import re, json

def _slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

_PDF_EDU = [
 "NCF 2023","NCF 2005","Inclusive Education","POCSO","Specially Abled Children","NEP 2020","EMRS",
 "Navodaya (JNV)","KVS","Kasturba Gandhi Balika Vidyalaya","PARAKH","Vidyanjali","PM Vidya Laxmi",
 "NIPUN BHARAT","PM SHRI / CM SHRI","CABE","PM POSHAN","PMRC","Yuva Sangam","SMC 2026","NIOS",
 "Open University","Bhartiya Bhasha Summer Camp","Bharat Innovates 2026","NCERT","SCERT","UGC",
 "Sadhana Saptah 2026","CBSE","Sakura Science 2026","Career Cards","AI in Education","Nasha Mukt Abhiyan",
 "Measurement","Evaluation","Assessment","RTI","RTE","Statistics","Pedagogy","Management","Leadership",
 "Midday Meal","Operation Blackboard","SSA","RMSA","Rashtriya Gyan Aayog","NCTE","Satellite","IEP",
 "NHERC","NAC","Education Commissions","NCPCR","Micro Teaching","Education Committees","DIET",
 "Programme of Action 1986","Rashtriya Shiksha Niti 1986 (NPE 1986)",
]
_PDF_SERVICE = [
 "Leaves","LTC","DGEHS (Advance)","CGHS","Leave Encashment","Pension","HRA","AIESC","Kashi Tamil Sangam",
 "Project Veer Gatha","International Dyslexia Day","Walk for Dyslexia","Prashast 2","ITEP","Conduct Rules",
 "Discipline Rules","APAR","Increment","D.A.","T.A.","GPF","CEA","MACP","Quitting Service","Change of Name",
 "GIS 1980","DOSEL","Co-Curricular Activities","Football for Schools","UDISE",
 "Inclusive Education Summit","Pariksha Pe Charcha","Prerana","PM YUVA","Scholarship","Buildthon",
 "Swachhata Hi Seva","TARA App","My Career Advisor App","SHUR Rating","NATS AI","VIBE","Bhasha Sagar",
 "Atal Tinkering Lab","ULLAS (NILP)","PM USHA","LADLI","STEM","MERITE","Gyan Bhartam Mission",
 "BHARATNET","SWAYAM PLUS","Nipun","Bhasha Sangam","Ek Bharat Shreshtha Bharat",
]
# (topic, group)
_ADDED = [
 # Policy and schemes
 ("Samagra Shiksha","Education Policy & Schemes"),("Beti Bachao Beti Padhao","Education Policy & Schemes"),
 ("Saakshar Bharat / Adult Education","Education Policy & Schemes"),("NMMSS Scholarship","Education Policy & Schemes"),
 ("DIKSHA, SWAYAM, SWAYAM Prabha, PM eVidya","Education Policy & Schemes"),("National Digital Library and NDEAR","Education Policy & Schemes"),
 ("APAAR ID and Academic Bank of Credits","Education Policy & Schemes"),("NSQF, NCVET and Vocational Education","Education Policy & Schemes"),
 ("Balvatika, ECCE and Vidya Pravesh","Education Policy & Schemes"),("NISHTHA Teacher Training","Education Policy & Schemes"),
 ("PM Schools, Fit India and Khelo India","Education Policy & Schemes"),("School Health and Wellness Programme","Education Policy & Schemes"),
 ("Viksit Bharat 2047 and Education","Education Policy & Schemes"),("Vidya Samiksha Kendra","Education Policy & Schemes"),
 ("Delhi Govt: Happiness, Entrepreneurship Mindset and Deshbhakti Curricula","Education Policy & Schemes"),
 ("Delhi Govt: Schools of Specialised Excellence and Mentor Teachers","Education Policy & Schemes"),
 # Bodies
 ("NIEPA","Bodies & Institutions"),("RCI (Rehabilitation Council of India)","Bodies & Institutions"),
 ("NAAC, NBA and NIRF","Bodies & Institutions"),("AICTE and HECI / Viksit Bharat Shiksha Adhishthan Bill","Bodies & Institutions"),
 ("NTA, CTET and TET","Bodies & Institutions"),("National Achievement Survey (NAS)","Bodies & Institutions"),
 ("Central Tibetan School Administration","Bodies & Institutions"),("NCERT Regional Institutes of Education","Bodies & Institutions"),
 ("Sainik Schools and Military Schools","Bodies & Institutions"),("CTSA, NVS and KVS Governance Structure","Bodies & Institutions"),
 # Commissions
 ("Wood's Despatch, Macaulay Minute and Hunter Commission","Commissions & Committees"),
 ("Sadler Commission, Hartog Committee, Sargent Report and Wardha Scheme","Commissions & Committees"),
 ("Radhakrishnan Commission 1948","Commissions & Committees"),("Mudaliar Commission 1952","Commissions & Committees"),
 ("Kothari Commission 1964-66","Commissions & Committees"),("Ramamurti Review Committee 1990","Commissions & Committees"),
 ("Yashpal Committee 1993 and Learning Without Burden","Commissions & Committees"),
 ("TSR Subramanian Committee and Kasturirangan Committee","Commissions & Committees"),
 ("Delors Report and UNESCO Frameworks","Commissions & Committees"),("Programme of Action 1992 and NPE 1986 Modified","Commissions & Committees"),
 # Constitution and law
 ("Article 21A, 45, 46, 51A(k), 350A and 86th Amendment","Constitution & Law"),
 ("RTE Act 2009 in Detail (Sec 12(1)(c), 16, 17, 29, 30)","Constitution & Law"),
 ("RPWD Act 2016","Constitution & Law"),("Juvenile Justice Act 2015","Constitution & Law"),
 ("Corporal Punishment and Bullying Guidelines","Constitution & Law"),("UNCRC and Child Rights","Constitution & Law"),
 ("DPDP Act 2023 and Student Data","Constitution & Law"),("Delhi School Education Act and Rules 1973","Constitution & Law"),
 ("Fee Regulation in Private Schools","Constitution & Law"),("POSH Act 2013","Constitution & Law"),
 ("Right to Education vs Fundamental Duties","Constitution & Law"),
 # Pedagogy and psychology
 ("Piaget and Vygotsky","Pedagogy & Psychology"),("Kohlberg and Moral Development","Pedagogy & Psychology"),
 ("Bloom's Taxonomy (Revised)","Pedagogy & Psychology"),("Gardner's Multiple Intelligences","Pedagogy & Psychology"),
 ("Maslow, Skinner, Bandura and Thorndike","Pedagogy & Psychology"),("Constructivism and Competency-Based Education","Pedagogy & Psychology"),
 ("Guidance and Counselling","Pedagogy & Psychology"),("Gifted and Talented Education","Pedagogy & Psychology"),
 ("Learning Disabilities and Dyslexia","Pedagogy & Psychology"),("Formative and Summative Assessment, CCE","Pedagogy & Psychology"),
 ("Holistic Progress Card","Pedagogy & Psychology"),("Multilingualism and Three Language Formula","Pedagogy & Psychology"),
 ("Universal Design for Learning","Pedagogy & Psychology"),("Action Research","Pedagogy & Psychology"),
 ("Educational Statistics and Research Methods","Pedagogy & Psychology"),
 # Administration
 ("School Management Committee under RTE","School Administration & Finance"),("School Development Plan and SQAAF","School Administration & Finance"),
 ("General Financial Rules 2017","School Administration & Finance"),("GeM Procurement","School Administration & Finance"),
 ("School Safety and Disaster Management","School Administration & Finance"),("Leadership Theories in Education","School Administration & Finance"),
 ("Supervision and Institutional Planning","School Administration & Finance"),("Time and Conflict Management","School Administration & Finance"),
 ("Public Grievance (CPGRAMS) and Citizen Charter","School Administration & Finance"),("Official Language Policy and Rajbhasha","School Administration & Finance"),
 # Service
 ("Fundamental Rules and Supplementary Rules","Service Rules"),("CCS (CCA) Rules 1965 Procedure","Service Rules"),
 ("CCS (Conduct) Rules 1964 Case Studies","Service Rules"),("NPS, UPS and Old Pension Scheme","Service Rules"),
 ("7th CPC Pay Matrix and Pay Fixation","Service Rules"),("8th Pay Commission","Service Rules"),
 ("Probation, Seniority and Promotion, DPC","Service Rules"),("Recruitment Rules and Deputation","Service Rules"),
 ("Suspension and Subsistence Allowance","Service Rules"),("Vigilance, CVC and Lokpal","Service Rules"),
 ("Reservation in Services (Roster, OBC, EWS, PwBD)","Service Rules"),("CGEGIS","Service Rules"),
 ("CS(MA) Rules Medical Reimbursement","Service Rules"),("Transfer Policy","Service Rules"),
 ("Retirement, Gratuity and Family Pension","Service Rules"),("Mission Karmayogi and iGOT","Service Rules"),
 ("Whistleblower and Public Interest Disclosure","Service Rules"),("Hostel Subsidy and Special Allowances","Service Rules"),
 # International and digital
 ("SDG 4 and Incheon Declaration","International & Digital"),("Salamanca Statement and UNCRPD","International & Digital"),
 ("EdTech, NETF and Digital Education","International & Digital"),("PISA, TIMSS and International Assessments","International & Digital"),
]

def _mk(names, group, part, src):
    return [{"id": _slug(n), "en": n, "group": group, "part": part, "src": src} for n in names]

TOPICS = (_mk(_PDF_EDU, "Education & Policy (Index Part 1)", 1, "pdf")
          + _mk(_PDF_SERVICE, "Service Matters & Schemes (Index Part 2)", 2, "pdf")
          + [{"id": _slug(n), "en": n, "group": g, "part": 3, "src": "added"} for n, g in _ADDED])

# de-dupe ids
_seen, _out = set(), []
for t in TOPICS:
    if t["id"] not in _seen:
        _seen.add(t["id"]); _out.append(t)
TOPICS = _out

if __name__ == "__main__":
    json.dump(TOPICS, open("topics.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(TOPICS), "topics;", sum(t["src"] == "pdf" for t in TOPICS), "from pdf;", sum(t["src"] == "added" for t in TOPICS), "added")
