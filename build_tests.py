import os
import json
import random
import uuid
from datetime import datetime

OUTPUT_DIR = "output_json"
TESTS_DIR = "tests_json"
TOPIC_TEST_SIZE = 20  # 20 questions per topic-wise test
FULL_TEST_SIZE = 120  # 120 questions per full mock test
FULL_TEST_COUNT = 10  # How many full mock tests to generate

def build_tests():
    print(f"Building tests from {OUTPUT_DIR}...")
    os.makedirs(TESTS_DIR, exist_ok=True)
    os.makedirs(os.path.join(TESTS_DIR, "topic_wise"), exist_ok=True)
    os.makedirs(os.path.join(TESTS_DIR, "full_mocks"), exist_ok=True)
    
    all_questions_pool = []
    
    # 1. Generate Topic-Wise Tests
    for filename in os.listdir(OUTPUT_DIR):
        if not filename.endswith(".json"): 
            continue
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                questions = data.get("questions", [])
            except:
                continue
            
        if not questions: 
            continue
            
        all_questions_pool.extend(questions)
        topic_name = filename.replace(".json", "")
        
        # Split the 100 questions into 5 topic-wise tests of 20 questions each
        random.shuffle(questions)
        chunks = [questions[i:i + TOPIC_TEST_SIZE] for i in range(0, len(questions), TOPIC_TEST_SIZE)]
        
        for idx, chunk in enumerate(chunks):
            if len(chunk) < 5: 
                continue # Skip tiny leftovers
            
            test_data = {
                "test_id": str(uuid.uuid4()),
                "test_name": f"Topic Test: {topic_name.replace('-', ' ').upper()} - Part {idx+1}",
                "type": "topic_wise",
                "topic": topic_name,
                "created_at": datetime.utcnow().isoformat(),
                "questions": chunk
            }
            
            out_path = os.path.join(TESTS_DIR, "topic_wise", f"{topic_name}_test_{idx+1}.json")
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump(test_data, out, ensure_ascii=False, indent=2)
                
    print(f"Generated {len(os.listdir(os.path.join(TESTS_DIR, 'topic_wise')))} Topic-wise tests in {TESTS_DIR}/topic_wise/")
    
    # 2. Generate Full Mock Tests
    if not all_questions_pool:
        print("No questions found to build mock tests!")
        return

    # Shuffle the pool so questions across all topics are evenly distributed
    random.shuffle(all_questions_pool)
    
    # Calculate how many full mock tests can be made with 120 questions each (e.g. 3,145 // 120 = 26 full tests)
    total_full_tests = len(all_questions_pool) // FULL_TEST_SIZE
    print(f"Total question pool: {len(all_questions_pool)} questions. Generating {total_full_tests} unique full mocks of {FULL_TEST_SIZE} questions each...")

    for i in range(total_full_tests):
        start_idx = i * FULL_TEST_SIZE
        end_idx = start_idx + FULL_TEST_SIZE
        mock_questions = all_questions_pool[start_idx:end_idx]
        
        test_data = {
            "test_id": str(uuid.uuid4()),
            "test_name": f"UPSC Principal Mock Test {i+1}",
            "type": "full_mock",
            "created_at": datetime.utcnow().isoformat(),
            "questions": mock_questions
        }
        
        out_path = os.path.join(TESTS_DIR, "full_mocks", f"mock_test_{i+1}.json")
        with open(out_path, "w", encoding="utf-8") as out:
            json.dump(test_data, out, ensure_ascii=False, indent=2)
            
    print(f"Generated {total_full_tests} Full Mock Tests in {TESTS_DIR}/full_mocks/")
    print("Done! All tests are ready for the app.")

if __name__ == "__main__":
    build_tests()
