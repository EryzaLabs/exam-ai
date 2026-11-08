#!/usr/bin/env python3
"""
Enrich DSSSB TGT/PGT Exam Papers using GPT-4o-mini via Hack Club AI Proxy.
Generates genuine step-by-step pedagogical explanations and Hindi/English translations
for all questions across the official papers.
"""

import os
import sys
import glob
import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "https://ai.hackclub.com/proxy/v1/chat/completions"

def get_api_key():
    key = os.environ.get("VLM_API_KEY") or os.environ.get("EXPO_PUBLIC_VLM_API_KEY")
    if key:
        return key
    for env_path in [".env", "server/.env", "project/.env"]:
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("VLM_API_KEY=") or line.startswith("EXPO_PUBLIC_VLM_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

API_KEY = get_api_key()
MODEL = "openai/gpt-4o-mini"
MAX_WORKERS = 8
BATCH_SIZE = 5

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

def is_placeholder_explanation(exp_text: str) -> bool:
    if not exp_text or not isinstance(exp_text, str):
        return True
    exp = exp_text.strip()
    if len(exp) < 35:
        return True
    if "Analytical Derivation:" in exp and "violates the relational constraint" in exp:
        return True
    if "Official DSSSB Answer Key: Option" in exp and "strictly yields" in exp:
        return True
    return False

def needs_enrichment(q: dict) -> bool:
    exp = q.get("explanation_english") or q.get("explanation") or ""
    if is_placeholder_explanation(exp):
        return True
    q_hi = (q.get("question_hindi") or "").strip()
    q_en = (q.get("question_english") or q.get("question") or "").strip()
    if not q_hi or q_hi == q_en:
        return True
    return False

def call_gpt4o_mini_batch(batch: list, retries: int = 3) -> dict:
    """
    batch is list of dicts: [{'id': ..., 'question_en': ..., 'question_hi': ..., 'options_en': ..., 'correct_idx': ...}]
    """
    prompt = f"""You are an expert bilingual exam tutor for DSSSB TGT/PGT CBT exams.
For each of the {len(batch)} questions below:
1. 'question_hindi': If currently in English or untranslated, provide an accurate, natural academic Hindi translation (Devanagari script). Otherwise maintain the existing Hindi.
2. 'options_hindi': Array of accurate Hindi translations for all options. (If options are numbers, formulas, or alphanumeric codes, keep them unchanged).
3. 'explanation_english': Clear, step-by-step pedagogical explanation explaining why the official correct option is right, demonstrating the full logic/calculation/grammatical rule/concept, and why incorrect options fail.
4. 'explanation_hindi': Clear, step-by-step explanation in Hindi (विस्तृत व्याख्या).

Questions to enrich:
{json.dumps(batch, ensure_ascii=False, indent=2)}

Output strictly valid JSON matching this schema:
{{
  "results": [
    {{
      "id": "<question_id>",
      "question_hindi": "...",
      "options_hindi": ["...", "...", "...", "..."],
      "explanation_english": "...",
      "explanation_hindi": "..."
    }}
  ]
}}
Do not write markdown fences or commentary outside the JSON.
"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert academic tutor for Indian competitive examinations (DSSSB/UPSC/SSC). Always respond with strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 3000
    }

    data = json.dumps(payload).encode("utf-8")

    for attempt in range(retries):
        try:
            req = urllib.request.Request(API_URL, data=data, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=45) as resp:
                raw = resp.read().decode("utf-8")
                res = json.loads(raw)
                content = res["choices"][0]["message"]["content"].strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                parsed = json.loads(content.strip())
                return {item["id"]: item for item in parsed.get("results", [])}
        except Exception as e:
            wait = 2 ** (attempt + 1)
            time.sleep(wait)
            if attempt == retries - 1:
                print(f"[Warning] Failed batch of {len(batch)} questions after {retries} attempts: {e}")
                return {}

def enrich_paper(file_path: str, paper_index: int, total_papers: int):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    paper_title = data.get("title", os.path.basename(file_path))
    sections = data.get("sections", [])
    
    # Collect all questions that need enrichment
    all_qs = []
    for s_idx, sec in enumerate(sections):
        for q_idx, q in enumerate(sec.get("questions", [])):
            if needs_enrichment(q):
                all_qs.append((s_idx, q_idx, q))

    total_needing = len(all_qs)
    if total_needing == 0:
        print(f"[{paper_index}/{total_papers}] Already fully enriched: {paper_title}", flush=True)
        return

    print(f"\n=======================================================", flush=True)
    print(f"[{paper_index}/{total_papers}] Enriching: {paper_title}", flush=True)
    print(f"Total questions needing LLM enrichment: {total_needing}", flush=True)
    print(f"=======================================================", flush=True)

    # Group into batches of BATCH_SIZE
    batches = []
    for i in range(0, total_needing, BATCH_SIZE):
        chunk = all_qs[i:i + BATCH_SIZE]
        batch_payload = []
        for s_idx, q_idx, q in chunk:
            opts_en = q.get("options_english") or q.get("options") or []
            correct = q.get("correct_answer") or q.get("correct") or 0
            # format correct answer human readable
            if isinstance(correct, int) and 0 <= correct < len(opts_en):
                correct_str = f"Option {chr(65 + correct)}: {opts_en[correct]}"
            elif isinstance(correct, str) and correct.lower() in ['a', 'b', 'c', 'd']:
                c_idx = ord(correct.lower()) - 97
                correct_str = f"Option {correct.upper()}: {opts_en[c_idx] if c_idx < len(opts_en) else ''}"
            else:
                correct_str = str(correct)

            batch_payload.append({
                "id": q.get("id") or f"q_{s_idx}_{q_idx}",
                "question_english": q.get("question_english") or q.get("question", ""),
                "question_hindi": q.get("question_hindi", ""),
                "options_english": opts_en,
                "correct_answer": correct_str
            })
        batches.append((chunk, batch_payload))

    enriched_count = 0
    start_time = time.time()

    # Process batches concurrently
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_batch = {
            executor.submit(call_gpt4o_mini_batch, b_payload): chunk
            for chunk, b_payload in batches
        }

        for future in as_completed(future_to_batch):
            chunk = future_to_batch[future]
            res_map = future.result()
            if not res_map:
                continue

            for s_idx, q_idx, q in chunk:
                qid = q.get("id") or f"q_{s_idx}_{q_idx}"
                if qid in res_map:
                    item = res_map[qid]
                    if item.get("explanation_english"):
                        q["explanation_english"] = item["explanation_english"].strip()
                        q["explanation"] = item["explanation_english"].strip()
                    if item.get("explanation_hindi"):
                        q["explanation_hindi"] = item["explanation_hindi"].strip()
                    if item.get("question_hindi"):
                        q["question_hindi"] = item["question_hindi"].strip()
                    if item.get("options_hindi") and isinstance(item["options_hindi"], list) and len(item["options_hindi"]) == 4:
                        q["options_hindi"] = item["options_hindi"]
                    enriched_count += 1

            elapsed = time.time() - start_time
            rate = enriched_count / elapsed if elapsed > 0 else 0
            pct = (enriched_count / total_needing) * 100
            print(f"  -> Progress: {enriched_count}/{total_needing} ({pct:.1f}%) | {rate:.1f} Qs/sec | Elapsed: {elapsed:.1f}s", flush=True)

    # Save enriched paper atomically
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Also mirror to tests_json/tgt_pgt if exists
    mirror_path = os.path.join("tests_json", "tgt_pgt", os.path.basename(file_path))
    if os.path.exists(os.path.dirname(mirror_path)):
        with open(mirror_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved enriched paper to {file_path} and mirror ({enriched_count} questions enriched)\n", flush=True)

def main():
    catalog_path = "project/data/tgt_pgt/official_full_catalog.json"
    if not os.path.exists(catalog_path):
        print(f"Error: {catalog_path} not found")
        sys.exit(1)

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # Sort catalog: TGT first, then PGT
    tgt_papers = [p for p in catalog if p.get("type") == "tgt" or "tgt" in p.get("id", "")]
    pgt_papers = [p for p in catalog if p.get("type") == "pgt" or "pgt" in p.get("id", "")]
    ordered_papers = tgt_papers + pgt_papers

    total = len(ordered_papers)
    print(f"Total official papers to verify and enrich: {total}")

    for idx, paper_meta in enumerate(ordered_papers, 1):
        filename = paper_meta.get("filename")
        if not filename:
            continue
        # Check path
        fpath = os.path.join("project", "data", filename)
        if not os.path.exists(fpath):
            fpath = os.path.join("project", "data", "tgt_pgt", os.path.basename(filename))
        if not os.path.exists(fpath):
            print(f"[{idx}/{total}] File not found: {fpath}")
            continue

        enrich_paper(fpath, idx, total)

if __name__ == "__main__":
    main()
