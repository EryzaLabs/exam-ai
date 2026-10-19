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
                questions = data.get("questions", [])
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
                "test_name": f"Topic Test: {topic_name.replace('-', ' ').upper()} - Part {part_num}",
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
                "test_name": f"UPSC Principal Mock Test {mock_num}",
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
