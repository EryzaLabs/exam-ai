import json
import os
from datetime import datetime

# Read all downloaded test paper files
testbook_dir = "testbook_papers"
papers = []

print("Reading downloaded test papers...")

for filename in os.listdir(testbook_dir):
    if filename.endswith('.json'):
        filepath = os.path.join(testbook_dir, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract only essential metadata with custom field names
            paper_summary = {
                "paper_ref": data.get("paper_id", ""),
                "name": data.get("exam_title", ""),
                "category": data.get("exam_category", ""),
                "total_questions": data.get("total_items", 0),
                "duration_minutes": data.get("time_limit", 0),
                "maximum_marks": data.get("max_score", 0),
                "languages": data.get("available_languages", []),
                "attempts": data.get("attempt_count", 0),
                "free_access": data.get("is_free_access", False),
                "solutions_available": data.get("has_solutions", False),
                "available_from": data.get("availability_start", ""),
                "available_until": data.get("availability_end", ""),
                "file_location": filename
            }
            
            # Add section summary
            sections_summary = []
            if data.get("sections"):
                for section in data["sections"]:
                    sections_summary.append({
                        "name": section.get("section_name", ""),
                        "question_count": section.get("item_count", 0)
                    })
            
            paper_summary["sections_overview"] = sections_summary
            
            papers.append(paper_summary)
            print(f"✓ Processed: {paper_summary['name']}")
            
        except Exception as e:
            print(f"✗ Error reading {filename}: {str(e)}")

# Sort papers by name
papers.sort(key=lambda x: x.get('name', ''))

# Create the index file with transformed schema
index_data = {
    "generated_at": datetime.now().isoformat(),
    "total_papers": len(papers),
    "data_source": "testbook_papers",
    "schema_version": "1.0",
    "papers": papers
}

# Save to a new index file
output_file = "paper_index.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(index_data, f, indent=2, ensure_ascii=False)

print(f"\n{'='*60}")
print(f"Index file created: {output_file}")
print(f"Total papers indexed: {len(papers)}")
print(f"{'='*60}")

# Also create a simplified version with even less data
simplified_papers = []
for paper in papers:
    simplified_papers.append({
        "ref": paper["paper_ref"],
        "title": paper["name"],
        "category": paper["category"],
        "q_count": paper["total_questions"],
        "time_min": paper["duration_minutes"],
        "max_marks": paper["maximum_marks"],
        "file": paper["file_location"]
    })

simplified_index = {
    "created": datetime.now().isoformat(),
    "count": len(simplified_papers),
    "items": simplified_papers
}

simplified_file = "paper_index_compact.json"
with open(simplified_file, 'w', encoding='utf-8') as f:
    json.dump(simplified_index, f, indent=2, ensure_ascii=False)

print(f"Compact index created: {simplified_file}")
print(f"{'='*60}")
