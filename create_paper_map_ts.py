import os
import json

# We now look at the copied assets inside the project
base_dir = r"C:\Users\aloo\exam-ai"
project_assets_dir = os.path.join(base_dir, "project", "assets")
ssc_cgl_dir = os.path.join(project_assets_dir, "SSC_CGL")
answers_dir = os.path.join(project_assets_dir, "ai_generated_answers")

output_file = os.path.join(base_dir, "project", "data", "generated_papers.ts")

papers = []

if not os.path.exists(ssc_cgl_dir):
    print(f"Error: Directory not found: {ssc_cgl_dir}")
    exit(1)

for filename in os.listdir(ssc_cgl_dir):
    if filename.endswith(".json"):
        # We assume filename structure is somewhat consistent or we just use filename as title
        # title is usually readable in the filename
        # 'SSC CGL 2020 ... .json'
        
        title = filename.replace(".json", "")
        # Try to make it shorter or nicer if possible, but raw filename is okay for now
        
        # Check if answer exists
        answer_path = os.path.join(answers_dir, filename)
        has_answers = os.path.exists(answer_path)
        
        papers.append({
            "id": filename,
            "title": title,
            "filename": filename,
            "hasAnswers": has_answers
        })

# Sort papers by title (or year if we could parse it, but string sort is fine for now)
papers.sort(key=lambda x: x["title"], reverse=True)

# Limit to 20 papers to prevent bundle size explosion (100MB+ crash)
print(f"Total papers found: {len(papers)}")
if len(papers) > 20:
    print("Limiting to top 20 papers for performance")
    papers = papers[:20]

with open(output_file, "w", encoding="utf-8") as f:
    f.write("// AUTO-GENERATED FILE\n")
    f.write("// Do not edit manually\n\n")
    
    f.write("export interface PaperDefinition {\n")
    f.write("  id: string;\n")
    f.write("  title: string;\n")
    f.write("  hasAnswers: boolean;\n")
    f.write("  loadPaper: () => any;\n")
    f.write("  loadAnswers: () => any;\n")
    f.write("}\n\n")
    
    f.write("export const PAPERS: PaperDefinition[] = [\n")
    
    for p in papers:
        f.write("  {\n")
        f.write(f"    id: '{p['id']}',\n")
        # Extract a cleaner title if possible
        display_name = p['title'].split('__')[0].replace('_', ' ').replace('  ', ' ')
        f.write(f"    title: `{display_name}`,\n")
        f.write(f"    hasAnswers: {'true' if p['hasAnswers'] else 'false'},\n")
        # Updated path: Relative to project/data/generated_papers.ts -> ../assets/SSC_CGL
        f.write(f"    loadPaper: () => require('../assets/SSC_CGL/{p['filename']}'),\n")
        
        if p['hasAnswers']:
             f.write(f"    loadAnswers: () => require('../assets/ai_generated_answers/{p['filename']}'),\n")
        else:
             f.write(f"    loadAnswers: () => null,\n")
             
        f.write("  },\n")
    
    f.write("];\n")

print(f"Generated {len(papers)} papers in {output_file}")
