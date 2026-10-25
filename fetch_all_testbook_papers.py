import json
import requests
import time
import os
import gzip
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Auth code for API access
AUTH_CODE = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjY5NzZmMDNkYjQ1NGQ4N2RjM2U1NjNlZSIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wMi0yNVQwNDo1NDozMi42NDQ1ODg4ODhaIiwiaWF0IjoiMjAyNi0wMS0yNlQwNDo1NDozMi42NDQ1ODg4ODhaIiwibmFtZSI6IlN1c2hpbGEgRGV2aSIsImVtYWlsIjoic2RtMTExOTY1QGdtYWlsLmNvbSIsIm9yZ0lkIjoiIiwiaG9tZVN0YXRlSWQiOiI1ZjkxNjNhNDJlYzgyN2IyMThkYWNkMzAiLCJpc0xNU1VzZXIiOmZhbHNlLCJyb2xlcyI6InN0dWRlbnQifQ.REbggmVDXTZkldyuM9JFC6LEWgOgFIsob8qMptM_4_PDlRxemvLIza9xzEZJdzlwVWy0_3TxyOKcroUOwA65Wmy9gdX8geMZVIYQ6N1doFG-sp0sobasQdcf7t9AY9Wg2lx4JcE3wgH15wcmzUNltxfCXHsYFlDC0mvUUZv5rno"




# Parent output directory
PARENT_DIR = "testseries"

# Configuration
COMPRESS_FILES = True  # Save as .json.gz instead of .json (80-90% size reduction)
DELETE_AFTER_COMPRESS = False  # Delete original .json after creating .gz

# Thread-safe counter lock
counter_lock = threading.Lock()

def create_safe_folder_name(name):
    """Create a safe folder name from test series name"""
    # Remove invalid characters
    safe_name = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in name)
    # Replace multiple spaces/underscores with single underscore
    safe_name = '_'.join(safe_name.split())
    # Limit length to 50 characters for shorter paths
    return safe_name[:50]

def load_test_series():
    """Load test-series.json and extract all test series with their sections"""
    with open('test-series.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    test_series_list = []
    if 'data' in data and 'testSeries' in data['data']:
        for series in data['data']['testSeries']:
            if 'details' in series and 'id' in series['details']:
                series_id = series['details']['id']
                series_name = series['details'].get('name', 'Unknown')
                sections = series['details'].get('sections', [])
                
                test_series_list.append({
                    'id': series_id,
                    'name': series_name,
                    'sections': sections
                })
    
    print(f"Found {len(test_series_list)} test series", flush=True)
    return test_series_list

def fetch_tests_from_section(series_id, section_id):
    """Fetch list of tests for a specific section of a test series"""
    projection = {
        "tests": {
            "id": 1,
            "title": 1,
            "description": 1,
            "isLive": 1,
            "availFrom": 1,
            "availTill": 1,
            "startTime": 1,
            "endTime": 1,
            "languages": 1,
            "pdfLanguages": 1,
            "questionCount": 1,
            "totalMark": 1,
            "duration": 1,
            "totalAttempts": 1,
            "isFree": 1,
            "isSolutionPresent": 1,
            "hideMarks": 1,
            "onClickPopup": {
                "link": 1,
                "image": 1,
                "description": 1,
                "canDismiss": 1
            },
            "hasTypingQuestions": 1,
            "hasDescriptiveQuestions": 1,
            "hasAccess": 1,
            "purchaseInfo": {
                "type": 1,
                "id": 1,
                "showInPitch": 1,
                "consumedFrom": 1
            },
            "reattemptPurchaseInfo": {
                "type": 1,
                "id": 1,
                "showInPitch": 1,
                "consumedFrom": 1
            },
            "target": 1,
            "testUrl": 1,
            "primaryTarget": 1,
            "analysisUrl": 1,
            "solutionsUrl": 1,
            "statusUrl": 1,
            "progress": 1,
            "isPdfAvailable": 1,
            "isTestAvailable": 1,
            "isQuiz": 1,
            "pdf": 1,
            "pdfId": 1,
            "cutOffs": 1,
            "isAnalysisGenerated": 1,
            "analysisAfter": 1,
            "hasSkippableSections": 1,
            "labelTags": 1,
            "specificExams": 1
        }
    }
    
    url = f"https://api.testbook.com/api/v2/test-series/{series_id}/tests/details"
    params = {
        "__projection": json.dumps(projection),
        "testType": "all",
        "sectionId": section_id,
        "subSectionId": "",
        "skip": 0,
        "limit": 140,
        "branchId": "639b2fa5dad6971351a809cb",
        "language": "English"
    }
    
    headers = {
        "Authorization": f"Bearer {AUTH_CODE}"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            test_ids = []
            if 'data' in data and 'tests' in data['data']:
                tests = data['data']['tests']
                if isinstance(tests, list):
                    for test in tests:
                        if 'id' in test:
                            # Only include tests that are available and not live
                            is_live = test.get('isLive', True)
                            is_test_available = test.get('isTestAvailable', False)
                            
                            # Skip live tests or unavailable tests
                            if is_live or not is_test_available:
                                continue
                            
                            test_ids.append({
                                'id': test['id'],
                                'title': test.get('title', 'Unknown'),
                                'description': test.get('description', ''),
                                'questionCount': test.get('questionCount', 0),
                                'duration': test.get('duration', 0),
                                'totalMark': test.get('totalMark', 0),
                                'isFree': test.get('isFree', False),
                                'isLive': is_live,
                                'isTestAvailable': is_test_available
                            })
            
            return test_ids
        else:
            return []
    
    except requests.exceptions.RequestException as e:
        print(f"    Error: {e}", flush=True)
        return []

def download_test_paper(test_id, output_file, retries=2):
    """Download a single test paper with retry logic"""
    for attempt in range(retries):
        try:
            url = f"https://api-new.testbook.com/api/v2/tests/{test_id}?auth_code={AUTH_CODE}&X-Tb-Client=web,1.2&language=English"
            
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                api_data = response.json()
                
                if COMPRESS_FILES:
                    # Save as compressed .json.gz
                    compressed_file = output_file + '.gz'
                    with gzip.open(compressed_file, 'wt', encoding='utf-8') as f:
                        json.dump(api_data, f, indent=2, ensure_ascii=False)
                else:
                    # Save as regular .json
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(api_data, f, indent=2, ensure_ascii=False)
                
                return True, None
            elif response.status_code in [400, 403, 404]:
                # Don't retry for client errors - test not accessible/doesn't exist
                error_msg = f"HTTP {response.status_code} (Not accessible)"
                return False, error_msg
            else:
                error_msg = f"HTTP {response.status_code}"
                if attempt < retries - 1:
                    time.sleep(1)
                    continue
                return False, error_msg
                
        except requests.exceptions.Timeout:
            error_msg = "Timeout"
            if attempt < retries - 1:
                time.sleep(1)
                continue
            return False, error_msg
        except Exception as e:
            error_msg = str(e)
            if attempt < retries - 1:
                time.sleep(1)
                continue
            return False, error_msg
    
    return False, "Max retries exceeded"

def download_single_test(test, test_idx, total_tests, section_folder):
    """Download a single test (used by thread pool)"""
    test_id = test['id']
    test_title = test['title']
    
    # Create safe filename - keep it short (30 chars max for title)
    safe_title = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in test_title)
    safe_title = safe_title[:30]
    filename = os.path.join(section_folder, f"{safe_title}_{test_id}.json")
    
    # Check if file exists (either .json or .json.gz)
    if os.path.exists(filename) or os.path.exists(filename + '.gz'):
        return {
            'status': 'skipped',
            'test_idx': test_idx,
            'total': total_tests,
            'title': test_title,
            'test_id': test_id
        }
    
    # Download
    success, error = download_test_paper(test_id, filename)
    
    if success:
        return {
            'status': 'success',
            'test_idx': test_idx,
            'total': total_tests,
            'title': test_title,
            'test_id': test_id
        }
    else:
        # Save failed test info
        failed_file = os.path.join(section_folder, f"_FAILED_{test_id}.txt")
        try:
            with open(failed_file, 'w', encoding='utf-8') as f:
                f.write(f"Test ID: {test_id}\n")
                f.write(f"Title: {test_title}\n")
                f.write(f"Error: {error}\n")
        except:
            pass
        
        return {
            'status': 'failed',
            'test_idx': test_idx,
            'total': total_tests,
            'title': test_title,
            'test_id': test_id,
            'error': error
        }

def compress_existing_files():
    """Compress all existing .json files to .json.gz"""
    print("\n=== Compressing Existing Files ===\n", flush=True)
    
    json_files = list(Path(PARENT_DIR).rglob('*.json'))
    # Exclude metadata files
    json_files = [f for f in json_files if not f.name.startswith('_')]
    
    if not json_files:
        print("No .json files found to compress", flush=True)
        return
    
    print(f"Found {len(json_files)} .json files to compress...\n", flush=True)
    
    compressed_count = 0
    failed_count = 0
    skipped_count = 0
    
    for idx, json_file in enumerate(json_files, 1):
        gz_file = str(json_file) + '.gz'
        
        # Skip if .gz already exists
        if os.path.exists(gz_file):
            print(f"[{idx}/{len(json_files)}] ⊘ Skipped (already compressed): {json_file.name}", flush=True)
            skipped_count += 1
            continue
        
        try:
            # Read original JSON
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Write compressed
            with gzip.open(gz_file, 'wt', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            # Get file sizes
            original_size = os.path.getsize(json_file)
            compressed_size = os.path.getsize(gz_file)
            ratio = (1 - compressed_size / original_size) * 100
            
            print(f"[{idx}/{len(json_files)}] ✓ Compressed: {json_file.name} ({ratio:.1f}% smaller)", flush=True)
            
            # Delete original
            os.remove(json_file)
            compressed_count += 1
            
        except Exception as e:
            print(f"[{idx}/{len(json_files)}] ✗ Failed: {json_file.name} - {e}", flush=True)
            failed_count += 1
    
    print(f"\n{'='*60}", flush=True)
    print(f"Compression Complete!", flush=True)
    print(f"Compressed: {compressed_count}", flush=True)
    print(f"Skipped: {skipped_count}", flush=True)
    print(f"Failed: {failed_count}", flush=True)
    print(f"{'='*60}\n", flush=True)

def main():
    # Force UTF-8 encoding and unbuffered output
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    
    print("=== Testbook Paper Downloader ===\n", flush=True)
    
    # Create parent directory
    os.makedirs(PARENT_DIR, exist_ok=True)
    print(f"Output directory: {PARENT_DIR}/", flush=True)
    print(f"Compression: {'ENABLED (.json.gz)' if COMPRESS_FILES else 'DISABLED (.json)'}", flush=True)
    if COMPRESS_FILES:
        print(f"  → Files will be ~80-90% smaller", flush=True)
    
    # Count existing files for resume info
    if os.path.exists(PARENT_DIR):
        existing_json = sum(1 for _ in Path(PARENT_DIR).rglob('*.json') if not _.name.startswith('_'))
        existing_gz = sum(1 for _ in Path(PARENT_DIR).rglob('*.json.gz'))
        total_existing = existing_json + existing_gz
        if total_existing > 0:
            print(f"  → Found {total_existing} existing files ({existing_json} .json, {existing_gz} .json.gz)", flush=True)
            if existing_json > 0 and COMPRESS_FILES:
                print(f"  → Will compress {existing_json} uncompressed files first", flush=True)
    print("", flush=True)
    
    # Compress existing uncompressed files if compression is enabled
    if COMPRESS_FILES and os.path.exists(PARENT_DIR):
        existing_json = list(Path(PARENT_DIR).rglob('*.json'))
        existing_json = [f for f in existing_json if not f.name.startswith('_')]
        if existing_json:
            compress_existing_files()
    
    # Load test series
    test_series_list = load_test_series()
    
    if not test_series_list:
        print("No test series found in test-series.json", flush=True)
        return
    
    # Statistics
    total_papers_downloaded = 0
    total_papers_failed = 0
    total_papers_skipped = 0
    total_sections_processed = 0
    
    # Process each test series
    for idx, series in enumerate(test_series_list, 1):
        series_id = series['id']
        series_name = series['name']
        sections = series['sections']
        
        print(f"\n[{idx}/{len(test_series_list)}] {series_name}", flush=True)
        print(f"  Series ID: {series_id}", flush=True)
        print(f"  Sections: {len(sections)}", flush=True)
        
        # Create folder for this test series
        folder_name = create_safe_folder_name(series_name)
        series_folder = os.path.join(PARENT_DIR, f"{folder_name}_{series_id}")
        os.makedirs(series_folder, exist_ok=True)
        
        series_total_tests = 0
        
        # Process each section
        for section_idx, section in enumerate(sections, 1):
            section_id = section.get('id')
            section_name = section.get('name', 'Unknown Section')
            
            if not section_id:
                continue
                
            print(f"\n  [{section_idx}/{len(sections)}] Section: {section_name}", flush=True)
            print(f"    Section ID: {section_id}", flush=True)
            
            # Create section folder
            section_folder_name = create_safe_folder_name(section_name)
            section_folder = os.path.join(series_folder, f"{section_folder_name}_{section_id}")
            os.makedirs(section_folder, exist_ok=True)
            
            # Fetch tests for this section
            print(f"    Fetching tests...", flush=True)
            tests = fetch_tests_from_section(series_id, section_id)
            
            if not tests:
                print(f"    No downloadable tests found (filtered out live/unavailable tests)", flush=True)
                continue
            
            print(f"    Found {len(tests)} downloadable tests", flush=True)
            series_total_tests += len(tests)
            total_sections_processed += 1
            
            # Download tests concurrently using thread pool
            with ThreadPoolExecutor(max_workers=8) as executor:
                # Submit all download tasks
                future_to_test = {
                    executor.submit(download_single_test, test, idx, len(tests), section_folder): test 
                    for idx, test in enumerate(tests, 1)
                }
                
                # Process completed downloads
                for future in as_completed(future_to_test):
                    try:
                        result = future.result()
                        
                        if result['status'] == 'skipped':
                            print(f"    [{result['test_idx']}/{result['total']}] ⊘ Skipped: {result['title']}", flush=True)
                            with counter_lock:
                                total_papers_skipped += 1
                        elif result['status'] == 'success':
                            print(f"    [{result['test_idx']}/{result['total']}] ✓ Downloaded: {result['title']}", flush=True)
                            with counter_lock:
                                total_papers_downloaded += 1
                        elif result['status'] == 'failed':
                            print(f"    [{result['test_idx']}/{result['total']}] ✗ Failed: {result['title']} ({result['error']})", flush=True)
                            with counter_lock:
                                total_papers_failed += 1
                    
                    except KeyboardInterrupt:
                        print(f"\n\n⚠ Interrupted by user!", flush=True)
                        executor.shutdown(wait=False, cancel_futures=True)
                        raise
                    except Exception as e:
                        print(f"    ✗ Unexpected error: {e}", flush=True)
                        with counter_lock:
                            total_papers_failed += 1
            
            # Save section metadata
            section_metadata = {
                'section_id': section_id,
                'section_name': section_name,
                'total_tests': len(tests),
                'tests': tests
            }
            
            metadata_file = os.path.join(section_folder, '_section_info.json')
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(section_metadata, f, indent=2, ensure_ascii=False)
        
        print(f"\n  Series Total: {series_total_tests} tests across {len(sections)} sections", flush=True)
        
        # Brief pause between series
        time.sleep(0.5)
    
    # Print summary
    print(f"\n\n{'='*60}", flush=True)
    print(f"=== SUMMARY ===", flush=True)
    print(f"{'='*60}", flush=True)
    print(f"Total test series processed: {len(test_series_list)}", flush=True)
    print(f"Total sections processed: {total_sections_processed}", flush=True)
    print(f"Papers downloaded: {total_papers_downloaded}", flush=True)
    print(f"Papers failed: {total_papers_failed}", flush=True)
    print(f"Papers skipped (already exist): {total_papers_skipped}", flush=True)
    print(f"Total papers: {total_papers_downloaded + total_papers_failed + total_papers_skipped}", flush=True)
    print(f"Output directory: {PARENT_DIR}/", flush=True)
    print(f"{'='*60}", flush=True)

if __name__ == "__main__":
    main()
