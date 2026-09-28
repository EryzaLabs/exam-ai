import os
import json
import time
import random
import requests
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
HACKCLUB_API_KEY = os.environ.get("VLM_API_KEY")
EXA_API_KEY = os.environ.get("EXA_API_KEY")
HACKCLUB_URL = "https://ai.hackclub.com/proxy/v1/chat/completions"
TEXT_MODEL = "google/gemini-3.8-flash"

TOPICS_FILE = "topics.json"
OUTPUT_DIR = "output_json"
QUESTIONS_PER_TOPIC = 100  # Set to 100 as requested!
QUESTIONS_PER_REQUEST = 5

os.makedirs(OUTPUT_DIR, exist_ok=True)

def robust_request(url, headers, payload, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            return response
        except Exception as e:
            print(f"Request failed (attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                return None

def search_exa(topic):
    print(f"Searching Exa for: {topic}")
    if EXA_API_KEY == "YOUR_EXA_API_KEY" or not EXA_API_KEY:
        return "No API Key provided."
    
    url = "https://ai.hackclub.com/proxy/v1/exa/search"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "Authorization": f"Bearer {EXA_API_KEY}"
    }
    payload = {
        "query": f"UPSC Principal factual details {topic}",
        "numResults": 3,
        "contents": {"text": {"maxCharacters": 4000}}
    }
    response = robust_request(url, headers, payload)
    if response:
        results = response.json().get("results", [])
        context = ""
        for r in results:
            context += f"URL: {r.get('url')}\nContent: {r.get('text', '')}\n\n"
        
        print(f"  -> Exa returned {len(context)} chars of context.")
        if len(context) > 0:
            safe_preview = context[:200].encode('ascii', 'replace').decode('ascii')
            print(f"  -> Preview: {safe_preview}...")
        return context
    return ""

def generate_questions(topic, context, previous_questions=[]):
    print(f"Generating questions for: {topic}")
    
    avoid_prompt = ""
    if previous_questions:
        # Check both raw key (question_en) and formatted key (question_english)
        avoid_list = "\n".join([f"- {q.get('question_en', q.get('question_english', ''))}" for q in previous_questions[-15:]])
        avoid_prompt = f"\nCRITICAL: DO NOT REPEAT OR REPHRASE the following concepts you already covered:\n{avoid_list}\n"

    prompt = f"""
    You are an expert UPSC Principal exam setter.
    Create {QUESTIONS_PER_REQUEST} highly specific, verifiable multiple-choice questions about "{topic}".
    Ensure a mix of difficulty: 3 Medium, 1 Hard, 1 Easy. Ensure no duplicates from standard knowledge.
    Mimic the exact style seen in the GNCTD Principal papers.
    IMPORTANT: You MUST heavily include complex question formats such as:
    1. "Match the Following" (List I vs List II) with options like A-1, B-2, C-3.
    2. "Statement based" questions (e.g., "Consider the following statements... Which is/are correct?").
    3. "Incorrect Pair" identification (e.g., "Which of the following pairs is NOT correctly matched?").
    {avoid_prompt}
    CRITICAL: YOU MUST USE ONLY THE CONTEXT PROVIDED BELOW. DO NOT HALLUCINATE OR USE OUTSIDE MEMORY.
    For each question, extract a verbatim exact quote from the context that proves the answer, and provide the exact URL it came from.
    NO images or diagrams are required.
    
    Context:
    {context}
    
    Provide the output strictly in JSON format matching this schema:
    [
      {{
        "difficulty": "Hard",
        "question_en": "Question text in English",
        "question_hi": "Question text in Hindi",
        "options_en": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "options_hi": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correct_index": 0,
        "explanation_en": "Explanation",
        "explanation_hi": "Explanation in Hindi",
        "exact_quote": "Verbatim quote from context",
        "source_url": "URL from context"
      }}
    ]
    (Note: correct_index should be an integer 0, 1, 2, or 3 corresponding to the correct option BEFORE shuffling).
    """
    
    headers = {
        "Authorization": f"Bearer {HACKCLUB_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": TEXT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    
    response = robust_request(HACKCLUB_URL, headers, payload)
    if response:
        try:
            content = response.json()["choices"][0]["message"]["content"]
            start = content.find('[')
            end = content.rfind(']') + 1
            raw_questions = json.loads(content[start:end])
            
            processed_questions = []
            for q in raw_questions:
                indices = [0, 1, 2, 3]
                random.shuffle(indices)
                
                final_options_en = []
                final_options_hi = []
                correct_idx = 0
                for idx, orig_idx in enumerate(indices):
                    if orig_idx == q.get("correct_index", 0):
                        correct_idx = idx
                    
                    final_options_en.append(q.get("options_en", ["","","",""])[orig_idx])
                    final_options_hi.append(q.get("options_hi", ["","","",""])[orig_idx])
                
                q["options_en"] = final_options_en
                q["options_hi"] = final_options_hi
                q["correct_answer"] = correct_idx
                processed_questions.append(q)
                
            return processed_questions
        except Exception as e:
            print(f"Failed parsing JSON for {topic}: {e}")
            return []
    return []

def format_as_db_records(topic_name, raw_questions):
    """Formats questions into the EXACT JSON schema found in exam-ai app (e.g. BharatKosh format)"""
    records = []
    labels = ["a", "b", "c", "d"]
    for idx, q in enumerate(raw_questions):
        record = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.utcnow().isoformat(),
            "question_hindi": q.get("question_hi", ""),
            "options_hindi": q.get("options_hi", []),
            "option_labels": ["A", "B", "C", "D"],
            "source": "exa-ai-pipeline",
            "subject": "UPSC Principal Paper",
            "language": "bilingual",
            "question_english": q.get("question_en", ""),
            "options_english": q.get("options_en", []),
            "correct_answer": labels[q.get("correct_answer", 0)],
            "explanation_english": q.get("explanation_en", ""),
            "explanation_hindi": q.get("explanation_hi", ""),
            "topic": topic_name,
            "difficulty": q.get("difficulty", "Medium").lower(),
            "key_facts": [q.get("exact_quote", "")],
            "ai_processed": True,
            "processed_at": datetime.utcnow().isoformat()
        }
        records.append(record)
    return records

def save_json(topic_name, topic_id, records):
    output_path = os.path.join(OUTPUT_DIR, f"{topic_id}.json")
    # Wrap in {"questions": [...]} as per the app schema
    data = {"questions": records}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return output_path

def main():
    print(f"Starting UPSC QBank JSON Pipeline (Generating {QUESTIONS_PER_TOPIC} Questions/Topic)...")
    with open(TOPICS_FILE, "r", encoding="utf-8") as f:
        topics = json.load(f)
        
    test_topics = topics  # Process ALL topics
    
    query_suffixes = [
        "key facts and definitions", "history and background", 
        "committees and recommendations", "current affairs and recent updates", 
        "constitutional and legal provisions", "challenges and criticisms", 
        "impact and significance", "important dates and milestones",
        "comparison and analysis", "government initiatives and schemes"
    ]
    
    for idx, topic in enumerate(test_topics):
        topic_name = topic['en']
        topic_id = topic['id']
        print(f"\n[{idx+1}/{len(test_topics)}] Processing Topic: {topic_name}")
        
        all_topic_questions = []
        json_path = os.path.join(OUTPUT_DIR, f"{topic_id}.json")
        
        # Resume mode: Load existing questions if file exists
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                    all_topic_questions = existing_data.get("questions", [])
                print(f"  -> Found {len(all_topic_questions)} existing questions. Resuming...")
            except Exception as e:
                print(f"  -> Could not load existing file: {e}")
        
        batch_num = 0
        max_attempts = (QUESTIONS_PER_TOPIC // QUESTIONS_PER_REQUEST) * 3
        
        while len(all_topic_questions) < QUESTIONS_PER_TOPIC and batch_num < max_attempts:
            needed = QUESTIONS_PER_TOPIC - len(all_topic_questions)
            request_size = min(QUESTIONS_PER_REQUEST, needed)
            
            print(f"  -> Batch {batch_num + 1} (Targeting {request_size} questions, currently at {len(all_topic_questions)}/{QUESTIONS_PER_TOPIC})")
            
            # Rotate suffixes to get fresh context from Exa
            suffix = query_suffixes[batch_num % len(query_suffixes)]
            context = search_exa(f"{topic_name} {suffix}")
            
            if not context:
                print("  -> Exa failed. Skipping batch...")
                time.sleep(2)
                batch_num += 1
                continue
                
            # Use raw prompt generator but limit count to request_size if needed
            # For simplicity, we just request QUESTIONS_PER_REQUEST. The prompt string needs fixing for request_size but it's hardcoded to QUESTIONS_PER_REQUEST.
            # We'll just slice the result if it generates too many.
            questions = generate_questions(topic_name, context, all_topic_questions)
            if questions:
                # Only take what we need to reach exactly 100
                questions_to_add = questions[:needed]
                
                # Format only the newly generated questions!
                formatted_new = format_as_db_records(topic_name, questions_to_add)
                all_topic_questions.extend(formatted_new)
                
                # Incremental save
                save_json(topic_name, topic_id, all_topic_questions)
                print(f"  -> Saved {len(all_topic_questions)} questions so far...")
            else:
                print("  -> Failed to generate a batch. Retrying...")
            
            batch_num += 1
            time.sleep(2)
            
        if len(all_topic_questions) >= QUESTIONS_PER_TOPIC:
            print(f"Successfully secured {len(all_topic_questions)} questions for {topic_name}!")
        else:
            print(f"Finished attempts, but only got {len(all_topic_questions)} questions for {topic_name}.")
        
    print("\nPipeline Complete! Check the 'output_json' directory.")

if __name__ == "__main__":
    main()
