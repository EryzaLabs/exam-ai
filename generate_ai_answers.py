import json
import os
import requests
import time
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Load environment variables
load_dotenv()

# HackClub AI API configuration
HACKCLUB_API_URL = os.getenv('TRANSLATOR_BASE_URL', 'https://ai.hackclub.com/proxy/v1')
HACKCLUB_API_KEY = os.getenv('HACKCLUB_API_KEY')
HACKCLUB_MODEL = "deepseek/r1-distill-qwen-32b"  # Best JSON reliability (was: google/gemini-2.5-flash)

# Directories
TESTBOOK_DIR = "SSC_CGL"
OUTPUT_DIR = "ai_generated_answers"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Threading configuration
MAX_WORKERS = 5  # Number of parallel threads
print_lock = Lock()  # Thread-safe printing
counter_lock = Lock()  # Thread-safe counter

def thread_safe_print(*args, **kwargs):
    """Thread-safe print function"""
    with print_lock:
        print(*args, **kwargs)

def clean_json_string(json_str):
    """Clean JSON string by removing/escaping invalid control characters"""
    import re
    # Remove control characters except newline, tab, carriage return
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', json_str)
    # Fix common issues
    cleaned = cleaned.replace('\\n', '\n').replace('\\t', '\t')
    # Remove trailing commas before } or ]
    cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
    return cleaned

def call_hackclub_ai(prompt, language="English", max_retries=3):
    """Call HackClub AI API to generate answer and explanation with retry logic"""
    headers = {
        "Authorization": f"Bearer {HACKCLUB_API_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{HACKCLUB_API_URL}/chat/completions"
    
    payload = {
        "model": HACKCLUB_MODEL,
        "messages": [
            {
                "role": "system",
                "content": f"You are an expert educator who provides clear, accurate answers and detailed explanations for competitive exam questions in {language}. Respond with valid JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 16000
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=600)
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content'], None
            elif response.status_code == 524:
                # Timeout error - retry with exponential backoff
                wait_time = (2 ** attempt) * 5  # 5, 10, 20 seconds
                print(f"      Timeout (524), retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            else:
                error_msg = f"API Error {response.status_code}"
                print(f"      {error_msg}")
                return None, error_msg
        except requests.exceptions.Timeout:
            wait_time = (2 ** attempt) * 5
            print(f"      Request timeout, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
            time.sleep(wait_time)
            continue
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            print(f"      {error_msg}")
            return None, error_msg
    
    return None, "Max retries exceeded"

def create_batch_prompt(questions, language="English"):
    """Create a prompt for multiple questions at once"""
    prompt = f"Provide answers and explanations for the following questions in {language}. "
    prompt += "CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.\n"
    prompt += "Ensure all strings are properly escaped. Do not use control characters or tabs.\n\n"
    prompt += "Return this exact structure:\n"
    prompt += '[\n  {\n    "question_id": "id_here",\n    "correct_answer": "option number and text",\n'
    prompt += '    "explanation": "detailed step-by-step explanation",\n    "key_concepts": ["concept1", "concept2"]\n  }\n]\n\n'
    prompt += "Questions:\n\n"
    
    for idx, q in enumerate(questions, 1):
        # Extract question text from appropriate language field
        lang_key = 'en' if language == 'English' else 'hn'
        question_data = q.get(lang_key, {})
        question_text = question_data.get('value', '').strip()
        options = question_data.get('options', [])
        question_id = q.get('_id', '')
        
        prompt += f"{idx}. Question ID: {question_id}\n"
        prompt += f"Question: {question_text}\n"
        prompt += "Options:\n"
        for i, opt in enumerate(options, 1):
            option_text = opt.get('value', '').strip()
            prompt += f"  {i}. {option_text}\n"
        prompt += "\n"
    
    return prompt

def process_single_question(question, language="English"):
    """Process a single question if batch fails"""
    start_time = time.time()
    lang_key = 'en' if language == 'English' else 'hn'
    question_data = question.get(lang_key, {})
    question_text = question_data.get('value', '').strip()
    options = question_data.get('options', [])
    question_id = question.get('_id', '')
    
    prompt = f"Provide answer and explanation for this question in {language}.\n\n"
    prompt += f"Question: {question_text}\n\nOptions:\n"
    for i, opt in enumerate(options, 1):
        option_text = opt.get('value', '').strip()
        prompt += f"{i}. {option_text}\n"
    prompt += "\nReturn ONLY a JSON object with: question_id, correct_answer, explanation, key_concepts"
    
    response, error = call_hackclub_ai(prompt, language, max_retries=2)
    elapsed = time.time() - start_time
    
    if response:
        try:
            # Clean and extract JSON
            cleaned = clean_json_string(response)
            json_start = cleaned.find('{')
            json_end = cleaned.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = cleaned[json_start:json_end]
                answer = json.loads(json_str)
                answer['question_id'] = question_id
                print(f"          [{elapsed:.1f}s]")
                return answer, None
        except json.JSONDecodeError as e:
            print(f"          [{elapsed:.1f}s] JSON error: {e.msg}")
            return None, f"JSON parse error: {e.msg}"
        except Exception as e:
            print(f"          [{elapsed:.1f}s] Parse error")
            return None, f"Parse error: {str(e)}"
    
    print(f"          [{elapsed:.1f}s] Failed")
    return None, error or "No response"

def process_test_paper(filepath):
    """Process a single test paper and generate AI answers"""
    test_start_time = time.time()
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
        
        test_id = test_data.get('_id', Path(filepath).stem)
        test_name = test_data.get('name', Path(filepath).stem)
        thread_safe_print(f"\n{'='*80}")
        thread_safe_print(f"Processing: {test_name}")
        thread_safe_print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        thread_safe_print(f"{'='*80}")
        
        # Check for existing results
        output_file = f"{OUTPUT_DIR}/{Path(filepath).stem}.json"
        failed_file = f"{OUTPUT_DIR}/{Path(filepath).stem}_FAILED.json"
        
        # Load existing results if available
        existing_results = {}
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                    for section in existing_data.get('sections', []):
                        for q in section.get('questions', []):
                            qid = q.get('question_id')
                            if qid and 'ai_generated' in q:
                                # Check if both languages exist
                                ai_gen = q['ai_generated']
                                if 'english' in ai_gen and 'hindi' in ai_gen:
                                    existing_results[qid] = ai_gen
                thread_safe_print(f"  Found existing results for {len(existing_results)} questions")
            except Exception as e:
                thread_safe_print(f"  Warning: Could not load existing file: {e}")
        
        results = {
            "test_id": test_id,
            "test_name": test_name,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "sections": []
        }
        
        failed_questions = []
        total_questions = 0
        successful_questions = 0
        skipped_questions = 0
        
        # Extract all questions from sections
        if 'data' in test_data and 'sections' in test_data['data']:
            for section in test_data['data']['sections']:
                section_name = section.get('title', '')
                questions = section.get('questions', [])
                
                thread_safe_print(f"  Section: {section_name} ({len(questions)} questions)")
                
                if not questions:
                    continue
                
                section_result = {
                    "section_name": section_name,
                    "questions": []
                }
                
                # Process questions in smaller batches for better reliability
                batch_size = 15  # Reduced for better JSON parsing (was 25)
                for batch_start in range(0, len(questions), batch_size):
                    batch_end = min(batch_start + batch_size, len(questions))
                    batch_questions = questions[batch_start:batch_end]
                    
                    # Filter out questions that already have answers
                    questions_to_process = []
                    for q in batch_questions:
                        qid = q.get('_id')
                        if qid in existing_results:
                            skipped_questions += 1
                        else:
                            questions_to_process.append(q)
                    
                    if not questions_to_process:
                        thread_safe_print(f"    Questions {batch_start + 1}-{batch_end}: All already completed, skipping")
                        # Still add existing answers to results
                        for q in batch_questions:
                            qid = q.get('_id')
                            question_text = q.get('en', {}).get('value', '')
                            options = q.get('en', {}).get('options', [])
                            section_result["questions"].append({
                                "question_id": qid,
                                "original_question": question_text,
                                "options": options,
                                "ai_generated": existing_results.get(qid, {})
                            })
                        continue
                    
                    thread_safe_print(f"    Processing questions {batch_start + 1}-{batch_end} ({len(questions_to_process)} new, {len(batch_questions) - len(questions_to_process)} existing)...")
                    total_questions += len(questions_to_process)
                    
                    # Generate English answers for batch
                    batch_start_time = time.time()
                    thread_safe_print(f"      Generating English answers...")
                    prompt_en = create_batch_prompt(questions_to_process, "English")
                    answer_en, error_en = call_hackclub_ai(prompt_en, "English")
                    en_elapsed = time.time() - batch_start_time
                    
                    # Parse English response
                    english_answers = {}
                    batch_failed_en = []
                    if answer_en:
                        try:
                            # Clean and extract JSON
                            cleaned = clean_json_string(answer_en)
                            json_start = cleaned.find('[')
                            json_end = cleaned.rfind(']') + 1
                            if json_start >= 0 and json_end > json_start:
                                json_str = cleaned[json_start:json_end]
                                answers_list = json.loads(json_str)
                                for ans in answers_list:
                                    english_answers[ans.get('question_id')] = ans
                                thread_safe_print(f"      Parsed {len(english_answers)} English answers [{en_elapsed:.1f}s]")
                            else:
                                thread_safe_print(f"      Warning: No JSON array found in English response")
                                batch_failed_en = [q.get('_id') for q in questions_to_process]
                        except json.JSONDecodeError as e:
                            thread_safe_print(f"      Warning: JSON parse error at line {e.lineno} col {e.colno}: {e.msg}")
                            batch_failed_en = [q.get('_id') for q in questions_to_process]
                        except Exception as e:
                            thread_safe_print(f"      Warning: Could not parse English response: {str(e)}")
                            batch_failed_en = [q.get('_id') for q in questions_to_process]
                    else:
                        thread_safe_print(f"      Failed to get English batch response: {error_en}")
                        batch_failed_en = [q.get('_id') for q in questions_to_process]
                    
                    time.sleep(3)  # Rate limiting
                    
                    # Generate Hindi answers for batch
                    hi_start_time = time.time()
                    thread_safe_print(f"      Generating Hindi answers...")
                    prompt_hi = create_batch_prompt(questions_to_process, "Hindi")
                    prompt_hi += "\n\nIMPORTANT: Provide all answers and explanations in Hindi (हिंदी में)."
                    answer_hi, error_hi = call_hackclub_ai(prompt_hi, "Hindi")
                    hi_elapsed = time.time() - hi_start_time
                    
                    # Parse Hindi response
                    hindi_answers = {}
                    batch_failed_hi = []
                    if answer_hi:
                        try:
                            # Clean and extract JSON
                            cleaned = clean_json_string(answer_hi)
                            json_start = cleaned.find('[')
                            json_end = cleaned.rfind(']') + 1
                            if json_start >= 0 and json_end > json_start:
                                json_str = cleaned[json_start:json_end]
                                answers_list = json.loads(json_str)
                                for ans in answers_list:
                                    hindi_answers[ans.get('question_id')] = ans
                                thread_safe_print(f"      Parsed {len(hindi_answers)} Hindi answers [{hi_elapsed:.1f}s]")
                            else:
                                thread_safe_print(f"      Warning: No JSON array found in Hindi response")
                                batch_failed_hi = [q.get('_id') for q in questions_to_process]
                        except json.JSONDecodeError as e:
                            thread_safe_print(f"      Warning: JSON parse error at line {e.lineno} col {e.colno}: {e.msg}")
                            batch_failed_hi = [q.get('_id') for q in questions_to_process]
                        except Exception as e:
                            thread_safe_print(f"      Warning: Could not parse Hindi response: {str(e)}")
                            batch_failed_hi = [q.get('_id') for q in questions_to_process]
                    else:
                        thread_safe_print(f"      Failed to get Hindi batch response: {error_hi}")
                        batch_failed_hi = [q.get('_id') for q in questions_to_process]
                    
                    time.sleep(3)  # Rate limiting
                    
                    # Retry failed questions individually
                    if batch_failed_en or batch_failed_hi:
                        thread_safe_print(f"      Retrying failed questions individually...")
                        for q in questions_to_process:
                            question_id = q.get('_id', '')
                            
                            # Retry English if needed
                            if question_id in batch_failed_en or question_id not in english_answers:
                                thread_safe_print(f"        Retrying English for {question_id}...")
                                ans, err = process_single_question(q, "English")
                                if ans:
                                    english_answers[question_id] = ans
                                    thread_safe_print(f"        Success!")
                                else:
                                    thread_safe_print(f"        Failed: {err}")
                                time.sleep(2)
                            
                            # Retry Hindi if needed
                            if question_id in batch_failed_hi or question_id not in hindi_answers:
                                thread_safe_print(f"        Retrying Hindi for {question_id}...")
                                ans, err = process_single_question(q, "Hindi")
                                if ans:
                                    hindi_answers[question_id] = ans
                                    thread_safe_print(f"        Success!")
                                else:
                                    thread_safe_print(f"        Failed: {err}")
                                time.sleep(2)
                    
                    # Combine results for each question (including existing ones)
                    for q in batch_questions:
                        question_id = q.get('_id', '')
                        
                        # Check if we already have this question's answer
                        if question_id in existing_results:
                            en_data = q.get('en', {})
                            question_text = en_data.get('value', '')
                            options_list = [opt.get('value', '') for opt in en_data.get('options', [])]
                            section_result["questions"].append({
                                "question_id": question_id,
                                "original_question": question_text,
                                "options": options_list,
                                "ai_generated": existing_results[question_id]
                            })
                            successful_questions += 1
                            continue
                        
                        # Extract English question and options
                        en_data = q.get('en', {})
                        question_text = en_data.get('value', '')
                        options_list = [opt.get('value', '') for opt in en_data.get('options', [])]
                        
                        en_answer = english_answers.get(question_id, {})
                        hi_answer = hindi_answers.get(question_id, {})
                        
                        has_english = bool(en_answer)
                        has_hindi = bool(hi_answer)
                        
                        question_result = {
                            "question_id": question_id,
                            "original_question": question_text,
                            "options": options_list,
                            "status": "success" if (has_english and has_hindi) else ("partial" if (has_english or has_hindi) else "failed"),
                            "ai_generated": {
                                "english": en_answer if has_english else {"error": "Failed to generate"},
                                "hindi": hi_answer if has_hindi else {"error": "Failed to generate"}
                            }
                        }
                        section_result["questions"].append(question_result)
                        
                        # Track failures
                        if question_result["status"] == "success":
                            successful_questions += 1
                        else:
                            failed_questions.append({
                                "question_id": question_id,
                                "section": section_name,
                                "status": question_result["status"],
                                "has_english": has_english,
                                "has_hindi": has_hindi
                            })
                
                results["sections"].append(section_result)
        
        # Add summary statistics
        results["summary"] = {
            "total_questions": total_questions,
            "successful": successful_questions,
            "skipped": skipped_questions,
            "failed": len([f for f in failed_questions if f["status"] == "failed"]),
            "partial": len([f for f in failed_questions if f["status"] == "partial"])
        }
        
        # Save complete test result
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        test_elapsed = time.time() - test_start_time
        thread_safe_print(f"\n  Saved: {output_file}")
        thread_safe_print(f"  Success: {successful_questions}/{total_questions + skipped_questions} questions (skipped {skipped_questions})")
        thread_safe_print(f"  Time: {timedelta(seconds=int(test_elapsed))} ({test_elapsed:.1f}s)")
        thread_safe_print(f"  Completed: {datetime.now().strftime('%H:%M:%S')}")
        
        # Save failed questions info if any
        if failed_questions:
            failed_data = {
                "test_id": test_id,
                "test_name": test_name,
                "failed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "failed_questions": failed_questions,
                "summary": results["summary"]
            }
            with open(failed_file, 'w', encoding='utf-8') as f:
                json.dump(failed_data, f, indent=2, ensure_ascii=False)
            thread_safe_print(f"  Failed questions log: {failed_file}")
        
        return len(failed_questions) == 0
        
    except Exception as e:
        thread_safe_print(f"Error processing {filepath}: {str(e)}")
        import traceback
        with print_lock:
            traceback.print_exc()
        return False

def main():
    """Main function to process all test papers with multi-threading"""
    script_start_time = time.time()
    print(f"\n{'='*80}")
    print(f"AI Answer Generation Script (Multi-threaded)")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Workers: {MAX_WORKERS} parallel threads")
    print(f"Model: {HACKCLUB_MODEL}")
    print(f"{'='*80}\n")
    
    test_files = list(Path(TESTBOOK_DIR).glob('*.json'))
    print(f"Found {len(test_files)} test paper files\n")
    
    processed = 0
    failed = 0
    
    # Use ThreadPoolExecutor for parallel processing
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all tasks
        future_to_file = {executor.submit(process_test_paper, test_file): test_file for test_file in test_files}
        
        try:
            # Process completed tasks as they finish
            for future in as_completed(future_to_file):
                test_file = future_to_file[future]
                
                with counter_lock:
                    try:
                        result = future.result()
                        if result:
                            processed += 1
                        else:
                            failed += 1
                    except Exception as e:
                        thread_safe_print(f"Error processing {test_file.name}: {str(e)}")
                        failed += 1
                    
                    # Progress update
                    total_processed = processed + failed
                    total_elapsed = time.time() - script_start_time
                    avg_time = total_elapsed / total_processed if total_processed > 0 else 0
                    remaining = len(test_files) - total_processed
                    eta = timedelta(seconds=int(avg_time * remaining)) if avg_time > 0 else timedelta(0)
                    
                    thread_safe_print(f"\n  Progress: {total_processed}/{len(test_files)} | Success: {processed} | Failed: {failed}")
                    thread_safe_print(f"  Avg time/file: {timedelta(seconds=int(avg_time))} | ETA: {eta}")
                    thread_safe_print(f"  {'='*80}\n")
        except KeyboardInterrupt:
            thread_safe_print("\n\nInterrupted by user")
            executor.shutdown(wait=False, cancel_futures=True)
    
    total_elapsed = time.time() - script_start_time
    print(f"\n{'='*80}")
    print(f"Processing Complete!")
    print(f"Total time: {timedelta(seconds=int(total_elapsed))} ({total_elapsed:.1f}s)")
    print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Processed: {processed} | Failed: {failed} | Total: {len(test_files)}")
    if processed + failed > 0:
        print(f"Avg time/file: {timedelta(seconds=int(total_elapsed/(processed+failed)))}")
    print(f"Output directory: {OUTPUT_DIR}/")
    print(f"{'='*80}")

if __name__ == "__main__":
    # Check if API key is set
    if not HACKCLUB_API_KEY:
        print("ERROR: HACKCLUB_API_KEY not found in environment variables")
        print("Please create a .env file with: HACKCLUB_API_KEY=your-api-key")
        exit(1)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Generate AI answers for test papers')
    parser.add_argument('--file', type=str, help='Process a specific test file instead of all files')
    parser.add_argument('--dir', type=str, help='Override input directory (default: SSC_CGL)')
    parser.add_argument('--output', type=str, help='Override output directory (default: ai_generated_answers)')
    
    args = parser.parse_args()
    
    # Override directories if specified
    if args.dir:
        TESTBOOK_DIR = args.dir
    if args.output:
        OUTPUT_DIR = args.output
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Process single file if specified
    if args.file:
        print(f"Processing single file: {args.file}")
        result = process_test_paper(args.file)
        exit(0 if result else 1)
    else:
        # Process all files
        main()

