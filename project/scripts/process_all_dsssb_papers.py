#!/usr/bin/env python3
"""
Astra Exam AI - Full Batch DSSSB Ingestion Pipeline
Parses all downloaded official DSSSB TGT and PGT question papers (200 questions each, 10 sections)
Deterministically verifies answer keys via green checkmark coordinate detection.
Saves structured papers to project/data/tgt_pgt/ and tests_json/tgt_pgt/.
Updates INITIAL_TGT_PGT_PAPERS in project/services/paper-service.ts.
"""

import os
import sys
import re
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Add script directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_dsssb_universal import parse_full_paper

TGT_DIR = Path('/home/aloo/exam-ai/raw_pdfs/tgt')
PGT_DIR = Path('/home/aloo/exam-ai/raw_pdfs/pgt')

PROJECT_DATA_DIR = Path('/home/aloo/exam-ai/project/data/tgt_pgt')
SERVER_DATA_DIR = Path('/home/aloo/exam-ai/tests_json/tgt_pgt')
PAPER_SERVICE_TS = Path('/home/aloo/exam-ai/project/services/paper-service.ts')

PROJECT_DATA_DIR.mkdir(parents=True, exist_ok=True)
SERVER_DATA_DIR.mkdir(parents=True, exist_ok=True)

def process_single_pdf(pdf_path):
    try:
        paper_doc = parse_full_paper(pdf_path)
        if not paper_doc or paper_doc.get('totalQuestions', 0) < 20:
            return None
            
        test_id = paper_doc['test_id']
        json_filename = f"{test_id}.json"
        
        # Save to both project and server
        for target_dir in [PROJECT_DATA_DIR, SERVER_DATA_DIR]:
            target_path = target_dir / json_filename
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(paper_doc, f, indent=2, ensure_ascii=False)
                
        catalog_entry = {
            'id': test_id,
            'testId': test_id,
            'title': paper_doc['title'],
            'filename': f"tgt_pgt/{json_filename}",
            'hasAnswers': True,
            'series': paper_doc['exam'],
            'subject': paper_doc['subject'],
            'examBoard': 'DSSSB',
            'year': paper_doc['year'],
            'examDate': paper_doc['examDate'],
            'shift': paper_doc['shift'],
            'gender': paper_doc['gender'],
            'tier': paper_doc['tier'],
            'isPYQ': True,
            'totalQuestions': paper_doc['totalQuestions'],
            'price': 199,
            'originalPrice': 999
        }
        
        print(f"✅ [{paper_doc['exam'].upper()}] {paper_doc['subject']} • {paper_doc['year']} ({paper_doc['totalQuestions']} Qs, {len(paper_doc['sections'])} sec) -> {json_filename}")
        return catalog_entry
    except Exception as e:
        print(f"❌ Error processing {os.path.basename(pdf_path)}: {e}")
        return None

def update_paper_service_ts(catalog):
    if not PAPER_SERVICE_TS.exists():
        print(f"⚠️ {PAPER_SERVICE_TS} not found, skipping TS update.")
        return
        
    with open(PAPER_SERVICE_TS, 'r', encoding='utf-8') as f:
        content = f.read()
        
    json_str = json.dumps(catalog, indent=2, ensure_ascii=False)
    # Replace INITIAL_TGT_PGT_PAPERS = [...]
    pattern = r'(export const INITIAL_TGT_PGT_PAPERS: ServerPaper\[\] = )\[.*?\];'
    replacement = f"export const INITIAL_TGT_PGT_PAPERS: ServerPaper[] = {json_str};"
    
    new_content, count = re.subn(pattern, replacement, content, count=1, flags=re.DOTALL)
    if count > 0:
        with open(PAPER_SERVICE_TS, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"🎯 Updated INITIAL_TGT_PGT_PAPERS in paper-service.ts with {len(catalog)} official papers!")
    else:
        print("⚠️ Could not locate INITIAL_TGT_PGT_PAPERS regex target in paper-service.ts.")

def main():
    print("=" * 70)
    print("🚀 Astra Exam AI - Official DSSSB Full 200/300-Q Ingestion Pipeline")
    print("=" * 70)
    
    all_pdfs = []
    for d in [TGT_DIR, PGT_DIR]:
        if d.exists():
            for f in sorted(d.glob('*.pdf')):
                all_pdfs.append(f)
                
    print(f"📚 Total PDFs found: {len(all_pdfs)} (TGT: {len(list(TGT_DIR.glob('*.pdf')))}, PGT: {len(list(PGT_DIR.glob('*.pdf')))})")
    
    catalog = []
    # Run in parallel using 8 threads
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(process_single_pdf, all_pdfs))
        
    for r in results:
        if r:
            catalog.append(r)
            
    # Sort catalog: TGT first then PGT, then by subject, then by year descending
    catalog.sort(key=lambda x: (x['series'], x['subject'], -(int(x['year']) if x['year'].isdigit() else 0), x['title']))
    
    print(f"\n🎉 Successfully processed {len(catalog)} full official exam papers!")
    
    # Save master catalog JSON
    catalog_path = PROJECT_DATA_DIR / "official_full_catalog.json"
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    print(f"📋 Master catalog saved to {catalog_path}")
    
    # Update paper-service.ts
    update_paper_service_ts(catalog)

if __name__ == '__main__':
    main()
