import json
import requests
import time
import os
from datetime import datetime

# Read the details.json file
with open('ctet.json', 'r', encoding='utf-8') as f:
    details_data = json.load(f)

# Extract test IDs
tests = details_data['data']['tests']
print(f"Found {len(tests)} test papers")

# API configuration
AUTH_CODE = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjY5NzZmMDNkYjQ1NGQ4N2RjM2U1NjNlZSIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wMi0yNVQwNDo1NDozMi42NDQ1ODg4ODhaIiwiaWF0IjoiMjAyNi0wMS0yNlQwNDo1NDozMi42NDQ1ODg4ODhaIiwibmFtZSI6IlN1c2hpbGEgRGV2aSIsImVtYWlsIjoic2RtMTExOTY1QGdtYWlsLmNvbSIsIm9yZ0lkIjoiIiwiaG9tZVN0YXRlSWQiOiI1ZjkxNjNhNDJlYzgyN2IyMThkYWNkMzAiLCJpc0xNU1VzZXIiOmZhbHNlLCJyb2xlcyI6InN0dWRlbnQifQ.REbggmVDXTZkldyuM9JFC6LEWgOgFIsob8qMptM_4_PDlRxemvLIza9xzEZJdzlwVWy0_3TxyOKcroUOwA65Wmy9gdX8geMZVIYQ6N1doFG-sp0sobasQdcf7t9AY9Wg2lx4JcE3wgH15wcmzUNltxfCXHsYFlDC0mvUUZv5rno"

# Create output directory
output_dir = "testbook_papers"
os.makedirs(output_dir, exist_ok=True)

# Fetch and save each test
successful = 0
failed = 0
skipped = 0

for idx, test in enumerate(tests, 1):
    test_id = test['id']
    test_title = test.get('title', f'Test_{test_id}')
    
    # Create safe filename
    safe_title = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in test_title)
    safe_title = safe_title[:100]  # Limit length
    filename = f"{output_dir}/{safe_title}_{test_id}.json"
    
    # Skip if already exists
    if os.path.exists(filename):
        print(f"[{idx}/{len(tests)}] Skipping (already exists): {test_title}")
        skipped += 1
        continue
    
    print(f"\n[{idx}/{len(tests)}] Fetching: {test_title}")
    print(f"Test ID: {test_id}")
    
    try:
        # Make API request
        url = f"https://api-new.testbook.com/api/v2/tests/{test_id}?auth_code={AUTH_CODE}&X-Tb-Client=web,1.2&language=English"
        
        response = requests.get(url, timeout=60)
        
        if response.status_code == 200:
            api_data = response.json()
            
            # Save the original API response as-is
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(api_data, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Saved to: {filename}")
            successful += 1
            
        else:
            print(f"✗ Failed with status code: {response.status_code}")
            failed += 1
            
    except KeyboardInterrupt:
        print(f"\n\nInterrupted by user at test {idx}/{len(tests)}")
        print(f"You can resume by running this script again.")
        break
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        failed += 1
    
    # Add delay to avoid rate limiting
    if idx < len(tests):
        time.sleep(1.5)  # 1.5 second delay between requests

print(f"\n{'='*60}")
print(f"Completed!")
print(f"Successful: {successful}")
print(f"Failed: {failed}")
print(f"Skipped (already exist): {skipped}")
print(f"Total: {len(tests)}")
print(f"Output directory: {output_dir}/")
print(f"{'='*60}")
