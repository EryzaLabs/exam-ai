import os
import sys
import json
import random
import re
import uuid
from datetime import datetime

OUTPUT_DIR = "output_json"
TESTS_DIR = "tests_json"
TOPIC_TEST_SIZE = 20  # 20 questions per topic-wise test
FULL_TEST_SIZE = 120  # 120 questions per full mock test

TOPIC_DISPLAY_NAMES = {
    'nep-2020': 'NEP 2020 (National Education Policy)',
    'ncf-2023': 'NCF 2023 (School Education)',
    'ncf-2005': 'NCF 2005 (Curriculum Framework)',
    'pocso': 'POCSO Act 2012 & Child Protection',
    'cbse': 'CBSE Affiliation & Examination Bye-Laws',
    'ncert': 'NCERT Mandate, Structure & Curriculum',
    'kvs': 'Kendriya Vidyalaya Sangathan (KVS) Rules',
    'navodaya-jnv': 'Navodaya Vidyalaya Samiti (NVS / JNV)',
    'emrs': 'Eklavya Model Residential Schools (EMRS)',
    'cabe': 'Central Advisory Board of Education (CABE)',
    'scert': 'SCERT & DIET Structure & Functions',
    'ugc': 'University Grants Commission (UGC)',
    'nios': 'National Institute of Open Schooling (NIOS)',
    'open-university': 'Open & Distance Learning (ODL / IGNOU)',
    'parakh': 'PARAKH National Assessment Centre',
    'nipun-bharat': 'NIPUN Bharat & FLN Mission',
    'assessment': 'School Assessment, Standards & Rubrics',
    'evaluation': 'Continuous & Comprehensive Evaluation (CCE)',
    'measurement': 'Educational Measurement & Psychometrics',
    'inclusive-education': 'Inclusive Education & Special Needs',
    'specially-abled-children': 'RPwD Act & Specially Abled Children',
    'pm-poshan': 'PM POSHAN (Mid-Day Meal Scheme)',
    'pm-shri-cm-shri': 'PM SHRI & CM SHRI Exemplary Schools',
    'pm-vidya-laxmi': 'PM Vidya Laxmi Education Scheme',
    'ai-in-education': 'AI & ICT in Modern Classrooms',
    'vidyanjali': 'Vidyanjali 2.0 Community Participation',
    'yuva-sangam': 'Yuva Sangam (Ek Bharat Shreshtha Bharat)',
    'smc-2026': 'School Management Committees (SMC & PTA)',
    'kasturba-gandhi-balika-vidyalaya': 'Kasturba Gandhi Balika Vidyalaya (KGBV)',
    'sadhana-saptah-2026': 'Sadhana Saptah Pedagogical Week',
    'sakura-science-2026': 'Sakura Science High School Exchange',
    'nasha-mukt-abhiyan': 'Nasha Mukt Bharat Abhiyan in Schools',
    'bharat-innovates-2026': 'Bharat Innovates Science & Innovation',
    'bhartiya-bhasha-summer-camp': 'Bhartiya Bhasha Summer Camps',
    'career-cards': 'Career Cards & Vocational Guidance',
    'effective-leader-vs-successful-leader': 'School Leadership: Effective vs. Successful Leader',
    'effective_leader_vs_successful_leader': 'School Leadership: Effective vs. Successful Leader',
    'transformational-leadership': 'Transformational & Instructional Leadership',
    'transformational_leadership': 'Transformational & Instructional Leadership',
    'school-development-plan': 'School Development Plan (SDP) & Planning',
    'school_development_plan': 'School Development Plan (SDP) & Planning',
    'ccs-cca-rules-1965': 'CCS (CCA) Rules, 1965: Disciplinary Procedures',
    'ccs_cca_rules_1965': 'CCS (CCA) Rules, 1965: Disciplinary Procedures',
    'ccs-conduct-rules-1964': 'CCS (Conduct) Rules, 1964: Civil Services Code',
    'ccs_conduct_rules_1964': 'CCS (Conduct) Rules, 1964: Civil Services Code',
    'ccs-nps': 'National Pension System (NPS) & Retirement Rules',
    'ccs_nps': 'National Pension System (NPS) & Retirement Rules',
    'ccs-leave-rules-1972': 'CCS (Leave) Rules, 1972: Leave Entitlements',
    'ccs_leave_rules_1972': 'CCS (Leave) Rules, 1972: Leave Entitlements',
    'ccs-pension-rules': 'CCS (Pension) Rules: Service Pension & Gratuity',
    'ccs_pension_rules': 'CCS (Pension) Rules: Service Pension & Gratuity',
    'general-financial-rules-2017': 'General Financial Rules (GFR) 2017 & Public Procurement',
    'general_financial_rules_2017': 'General Financial Rules (GFR) 2017 & Public Procurement',
    'fundamental-rules-supplementary-rules': 'Fundamental Rules & Supplementary Rules (FR & SR)',
    'fundamental_rules_supplementary_rules': 'Fundamental Rules & Supplementary Rules (FR & SR)',
    'rte-2009': 'RTE Act 2009: Free & Compulsory Education',
    'rte_2009': 'RTE Act 2009: Free & Compulsory Education',
    'cce': 'Continuous & Comprehensive Evaluation (CCE)',
    'continuous-and-comprehensive-evaluation': 'Continuous & Comprehensive Evaluation (CCE)',
    'continuous_and_comprehensive_evaluation': 'Continuous & Comprehensive Evaluation (CCE)',
    'pmrc': 'PMRC Administrative Guidelines for Principals',
}

def format_topic_test_name(topic_slug, part_num):
    display = TOPIC_DISPLAY_NAMES.get(topic_slug) or TOPIC_DISPLAY_NAMES.get(topic_slug.replace('_', '-'))
    if not display:
        words = topic_slug.replace('_', ' ').replace('-', ' ').split()
        acronyms = {'ccs', 'cca', 'gfr', 'nps', 'cce', 'nep', 'ncf', 'cbse', 'ncert', 'kvs', 'jnv', 'emrs', 'cabe', 'scert', 'diet', 'ugc', 'nios', 'fln', 'nipun', 'rpwd', 'pwd', 'cwsn', 'pm', 'shri', 'kgbv', 'smc', 'pta', 'pmrc', 'ict', 'ai', 'rte', 'pocso', 'fr', 'sr'}
        formatted = []
        for w in words:
            if w.lower() in acronyms:
                formatted.append(w.upper())
            elif w.lower() in ('vs', 'v'):
                formatted.append('vs.')
            else:
                formatted.append(w.capitalize())
        display = ' '.join(formatted)
    return f"{display} • Practice Set {part_num:02d}"

def format_mock_test_name(mock_num):
    return f"UPSC Principal Full Mock Test {mock_num:02d} • Complete CBT Exam"

def get_q_key(q):
    """Returns a unique stable key for a question."""
    if isinstance(q, dict):
        if q.get("id"):
            return str(q["id"]).strip()
        en = q.get("question_english", "") or q.get("question_en", "")
        hi = q.get("question_hindi", "") or q.get("question_hi", "")
        return str(hash(en.strip() or hi.strip()))
    return str(q)

def get_existing_topic_stats(topic_wise_dir):
    """
    Scans topic_wise dir and returns:
    topic_stats: { topic_name: { "highest_part": int, "used_q_keys": set() } }
    """
    topic_stats = {}
    if not os.path.exists(topic_wise_dir):
        return topic_stats

    for fname in os.listdir(topic_wise_dir):
        if not fname.endswith(".json"):
            continue
        match = re.match(r"^(.+)_test_(\d+)\.json$", fname)
        if not match:
            continue
        topic_name = match.group(1)
        part_num = int(match.group(2))

        if topic_name not in topic_stats:
            topic_stats[topic_name] = {
                "highest_part": 0,
                "used_q_keys": set()
            }

        if part_num > topic_stats[topic_name]["highest_part"]:
            topic_stats[topic_name]["highest_part"] = part_num

        filepath = os.path.join(topic_wise_dir, fname)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                for q in data.get("questions", []):
                    topic_stats[topic_name]["used_q_keys"].add(get_q_key(q))
        except Exception as e:
            print(f"Warning: could not read {fname}: {e}")

    return topic_stats

def get_existing_mock_stats(full_mocks_dir):
    """
    Scans full_mocks dir and returns:
    (highest_mock, used_q_keys)
    """
    highest_mock = 0
    used_q_keys = set()
    if not os.path.exists(full_mocks_dir):
        return highest_mock, used_q_keys

    for fname in os.listdir(full_mocks_dir):
        if not fname.endswith(".json"):
            continue
        match = re.match(r"^mock_test_(\d+)\.json$", fname)
        if not match:
            continue
        mock_num = int(match.group(1))
        if mock_num > highest_mock:
            highest_mock = mock_num

        filepath = os.path.join(full_mocks_dir, fname)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                for q in data.get("questions", []):
                    used_q_keys.add(get_q_key(q))
        except Exception as e:
            print(f"Warning: could not read {fname}: {e}")

    return highest_mock, used_q_keys

def build_tests(force_rebuild=False):
    print(f"--- Building tests from {OUTPUT_DIR} (Mode: {'FORCE REBUILD' if force_rebuild else 'INCREMENTAL'}) ---")
    topic_wise_dir = os.path.join(TESTS_DIR, "topic_wise")
    full_mocks_dir = os.path.join(TESTS_DIR, "full_mocks")
    os.makedirs(topic_wise_dir, exist_ok=True)
    os.makedirs(full_mocks_dir, exist_ok=True)

    if force_rebuild:
        topic_stats = {}
        highest_mock = 0
        used_mock_keys = set()
    else:
        topic_stats = get_existing_topic_stats(topic_wise_dir)
        highest_mock, used_mock_keys = get_existing_mock_stats(full_mocks_dir)

    all_questions_for_mocks = []
    total_new_topic_tests = 0

    # 1. Process Topic-Wise Tests
    for filename in sorted(os.listdir(OUTPUT_DIR)):
        if not filename.endswith(".json"):
            continue

        topic_name = filename.replace(".json", "")
        filepath = os.path.join(OUTPUT_DIR, filename)

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                questions = data if isinstance(data, list) else data.get("questions", [])
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            continue

        if not questions:
            continue

        all_questions_for_mocks.extend(questions)

        stats = topic_stats.get(topic_name, {"highest_part": 0, "used_q_keys": set()})
        highest_part = stats["highest_part"]
        used_keys = stats["used_q_keys"]

        if force_rebuild:
            new_questions = list(questions)
            highest_part = 0
        else:
            new_questions = [q for q in questions if get_q_key(q) not in used_keys]

        if not new_questions:
            print(f"[{topic_name}] All {len(questions)} questions already in existing tests ({highest_part} parts).")
            continue

        # Thoroughly mix up questions so they aren't sequential chunks (e.g. 1-20, 21-40)
        random.shuffle(new_questions)

        num_chunks = len(new_questions) // TOPIC_TEST_SIZE
        if num_chunks == 0:
            print(f"[{topic_name}] {len(new_questions)} new questions waiting (need {TOPIC_TEST_SIZE} for Part {highest_part + 1}).")
            continue

        chunks = [new_questions[i * TOPIC_TEST_SIZE:(i + 1) * TOPIC_TEST_SIZE] for i in range(num_chunks)]

        for idx, chunk in enumerate(chunks):
            # Mix up questions inside each test as well
            random.shuffle(chunk)
            part_num = highest_part + idx + 1

            test_data = {
                "test_id": str(uuid.uuid4()),
                "test_name": format_topic_test_name(topic_name, part_num),
                "type": "topic_wise",
                "topic": topic_name,
                "created_at": datetime.utcnow().isoformat(),
                "questions": chunk
            }

            out_path = os.path.join(topic_wise_dir, f"{topic_name}_test_{part_num}.json")
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump(test_data, out, ensure_ascii=False, indent=2)

            total_new_topic_tests += 1

        print(f"[{topic_name}] Generated {num_chunks} new topic tests (Part {highest_part + 1} to Part {highest_part + num_chunks}). Total: {highest_part + num_chunks} parts.")

    print(f"\nTopic-wise summary: {total_new_topic_tests} new tests generated. Total topic tests in dir: {len(os.listdir(topic_wise_dir))}")

    # 2. Process Full Mock Tests
    if force_rebuild:
        unused_mock_pool = list(all_questions_for_mocks)
        highest_mock = 0
    else:
        unused_mock_pool = [q for q in all_questions_for_mocks if get_q_key(q) not in used_mock_keys]

    total_new_mocks = len(unused_mock_pool) // FULL_TEST_SIZE
    print(f"\nFull Mocks Pool: {len(unused_mock_pool)} unused questions across all topics.")

    if total_new_mocks == 0:
        print(f"Existing {highest_mock} full mock tests preserved. (Need {FULL_TEST_SIZE - len(unused_mock_pool)} more questions to generate Mock Test {highest_mock + 1}).")
    else:
        # Thoroughly shuffle unused pool across all topics so topics are evenly distributed
        random.shuffle(unused_mock_pool)

        for i in range(total_new_mocks):
            mock_num = highest_mock + i + 1
            chunk = unused_mock_pool[i * FULL_TEST_SIZE:(i + 1) * FULL_TEST_SIZE]
            random.shuffle(chunk)

            test_data = {
                "test_id": str(uuid.uuid4()),
                "test_name": format_mock_test_name(mock_num),
                "type": "full_mock",
                "created_at": datetime.utcnow().isoformat(),
                "questions": chunk
            }

            out_path = os.path.join(full_mocks_dir, f"mock_test_{mock_num}.json")
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump(test_data, out, ensure_ascii=False, indent=2)

        print(f"Generated {total_new_mocks} new Full Mock Tests (Mock Test {highest_mock + 1} to Mock Test {highest_mock + total_new_mocks}). Total: {highest_mock + total_new_mocks} mocks.")

    print("\nDone! Build complete.")

if __name__ == "__main__":
    force = "--force" in sys.argv or "--rebuild-all" in sys.argv
    build_tests(force_rebuild=force)
