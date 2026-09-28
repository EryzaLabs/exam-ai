import os
import json
import base64
import requests
import time
from pathlib import Path
from PyPDF2 import PdfMerger
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch

# ----------------- Configuration -----------------
HACKCLUB_API_KEY = os.environ.get("HACKCLUB_API_KEY", "YOUR_API_KEY")
EXA_API_KEY = os.environ.get("EXA_API_KEY", "")  # Optional, but recommended for verified sources
TEXT_MODEL = "openai/gpt-6-astra"  # Good choice from your list for hard, verified reasoning
IMAGE_MODEL = "google/gemini-3.1-flash-lite-image"
API_URL = "https://ai.hackclub.com/proxy/v1/chat/completions"

# Font Setup (Hindi requires a TTF font that supports Devanagari)
# On Windows, Nirmala UI or Mangal are standard Hindi fonts.
font_name = 'Helvetica'
try:
    pdfmetrics.registerFont(TTFont('Hindi', 'C:\\Windows\\Fonts\\Nirmala.ttf'))
    font_name = 'Hindi'
except:
    try:
        pdfmetrics.registerFont(TTFont('Hindi', 'C:\\Windows\\Fonts\\mangal.ttf'))
        font_name = 'Hindi'
    except:
        print("Warning: Hindi fonts not found in standard Windows path. PDF might not render Hindi correctly.")

OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)
IMAGE_DIR = OUTPUT_DIR / "images"
IMAGE_DIR.mkdir(exist_ok=True)
PDF_DIR = OUTPUT_DIR / "pdfs"
PDF_DIR.mkdir(exist_ok=True)

# ----------------- Helper Functions -----------------

def get_exa_context(topic):
    """Fetch real sources using Exa AI for verified facts."""
    if not EXA_API_KEY:
        return "No Exa API key provided. Relying on model's internal knowledge base."
    
    url = "https://api.exa.ai/search"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": EXA_API_KEY
    }
    payload = {
        "query": f"High quality UPSC level questions, facts, and syllabus details about {topic}",
        "numResults": 3,
        "contents": {"text": True}
    }
    try:
        print("  -> Searching Exa AI for context...")
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        results = response.json().get('results', [])
        context = "\n".join([f"Source: {r.get('url')}\nText: {r.get('text')}" for r in results])
        return context
    except Exception as e:
        print(f"  -> Exa search failed for {topic}: {e}")
        return ""

def generate_questions(topic, context):
    """Generate structured bilingual questions using Hack Club proxy."""
    headers = {
        "Authorization": f"Bearer {HACKCLUB_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    You are an expert UPSC examiner creating extremely high-quality, verified, and hard questions.
    Topic: {topic}
    
    Context from web (use this to ensure factual accuracy and exact real sources): 
    {context}
    
    Create exactly 5 unique questions. Distribution: 1 Easy, 3 Medium, 1 Hard. 
    They should NOT be duplicates or generic. 
    Some questions MUST be visually oriented (e.g., geography map, art diagram) and require an image.
    
    Output STRICTLY as a JSON array of objects with this schema, and do NOT wrap it in markdown codeblocks (no ```json):
    [
      {{
        "difficulty": "Hard",
        "question_en": "English question text",
        "question_hi": "Hindi question text (Translated)",
        "answer_en": "English answer and detailed explanation with exact source",
        "answer_hi": "Hindi answer and detailed explanation (Translated)",
        "source": "Exact URL or source of information",
        "needs_image": true,
        "image_prompt": "If needs_image is true, provide a detailed prompt to generate an image (e.g. map, diagram) in english. Else empty string."
      }}
    ]
    """
    
    payload = {
        "model": TEXT_MODEL,
        "messages": [
            {"role": "system", "content": "You are a precise JSON generator. Output only valid raw JSON array."},
            {"role": "user", "content": prompt}
        ]
    }
    
    try:
        print("  -> Generating text questions via LLM...")
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        
        # Cleanup potential markdown wrapping
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"  -> Failed to generate questions for {topic}: {e}")
        return []

def generate_image(prompt, topic_idx, q_idx):
    """Generate image and save to disk."""
    headers = {
        "Authorization": f"Bearer {HACKCLUB_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": IMAGE_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "modalities": ["image", "text"],
        "image_config": {
            "aspect_ratio": "16:9"
        }
    }
    
    try:
        print(f"  -> Generating image for Q{q_idx+1}...")
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        image_url = result["choices"][0]["message"]["images"][0]["image_url"]["url"]
        
        if image_url.startswith("data:image"):
            base64_data = image_url.split(",")[1]
            image_bytes = base64.b64decode(base64_data)
            
            image_path = IMAGE_DIR / f"topic_{topic_idx}_q_{q_idx}.png"
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            return str(image_path)
    except Exception as e:
        print(f"  -> Failed to generate image: {e}")
    return None

def create_pdf_for_topic(topic, questions, topic_idx):
    """Create a PDF for a specific topic."""
    pdf_path = PDF_DIR / f"topic_{topic_idx:03d}.pdf"
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontName=font_name, fontSize=16, spaceAfter=12)
    q_style = ParagraphStyle('Question', fontName=font_name, fontSize=12, spaceAfter=6, leading=16)
    a_style = ParagraphStyle('Answer', fontName=font_name, fontSize=11, spaceAfter=12, leading=14, textColor='#333333')
    meta_style = ParagraphStyle('Meta', fontName=font_name, fontSize=10, textColor='gray', spaceAfter=20)
    
    story = []
    story.append(Paragraph(f"Topic: {topic}", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    for q_idx, q in enumerate(questions):
        img_path = None
        if q.get("needs_image") and q.get("image_prompt"):
            img_path = generate_image(q.get("image_prompt"), topic_idx, q_idx)
            
        story.append(Paragraph(f"<b>Q{q_idx+1} ({q.get('difficulty', 'Medium')}):</b> {q.get('question_en', '')}", q_style))
        story.append(Paragraph(f"<b>प्र{q_idx+1}:</b> {q.get('question_hi', '')}", q_style))
        
        if img_path:
            story.append(RLImage(img_path, width=5*inch, height=2.8*inch))
            story.append(Spacer(1, 0.1*inch))
            
        story.append(Paragraph(f"<b>Answer:</b> {q.get('answer_en', '')}", a_style))
        story.append(Paragraph(f"<b>उत्तर:</b> {q.get('answer_hi', '')}", a_style))
        story.append(Paragraph(f"<i>Source/Verification:</i> {q.get('source', 'N/A')}", meta_style))
        
    doc.build(story)
    return str(pdf_path)

def generate_index_pdf(topics, pdf_files):
    """Generate an index/table of contents PDF."""
    index_path = PDF_DIR / "000_Index.pdf"
    doc = SimpleDocTemplate(str(index_path), pagesize=A4)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontName=font_name, fontSize=20, spaceAfter=20)
    item_style = ParagraphStyle('Item', fontName=font_name, fontSize=12, spaceAfter=6)
    
    story = [Paragraph("<b>UPSC Question Bank - Index</b>", title_style)]
    story.append(Spacer(1, 0.2*inch))
    
    for idx, topic in enumerate(topics):
        story.append(Paragraph(f"{idx+1}. {topic}", item_style))
        
    doc.build(story)
    return str(index_path)

def merge_pdfs(index_pdf, pdf_files, output_path):
    """Merge all generated PDFs into a single file."""
    merger = PdfMerger()
    merger.append(index_pdf)
    for pdf in pdf_files:
        merger.append(pdf)
        
    with open(output_path, "wb") as f:
        merger.write(f)
    merger.close()

def main():
    print("==================================================")
    print("       UPSC Question Bank Pipeline Started        ")
    print("==================================================")
    
    # Path to user's JSON file
    topics_file = r"C:\Users\Aryan\Downloads\upsc_qbank_pipeline\upsc_qbank_pipeline\topics.json"
    
    if not os.path.exists(topics_file):
        topics_file = input("topics.json not found at default path. Enter correct path: ").strip()
        
    try:
        with open(topics_file, 'r', encoding='utf-8') as f:
            topics_data = json.load(f)
            
        # Extract topics based on potential JSON structures
        if isinstance(topics_data, list):
            if isinstance(topics_data[0], dict):
                topics = [t.get("topic", t.get("name", str(t))) for t in topics_data]
            else:
                topics = topics_data
        elif isinstance(topics_data, dict):
            topics = topics_data.get("topics", list(topics_data.keys()))
        else:
            print("Unknown JSON format in topics.json")
            return
            
    except Exception as e:
        print(f"Error reading topics file: {e}")
        return
        
    print(f"Loaded {len(topics)} topics successfully.")
    
    pdf_files = []
    
    for idx, topic in enumerate(topics):
        print(f"\n[{idx+1}/{len(topics)}] Processing Topic: {topic}")
        
        context = get_exa_context(topic)
        questions = generate_questions(topic, context)
        
        if questions:
            pdf_path = create_pdf_for_topic(topic, questions, idx+1)
            pdf_files.append(pdf_path)
            print(f"  -> Successfully created PDF for {topic}")
        else:
            print(f"  -> Warning: Skipped {topic} due to generation failure.")
            
        # Sleep to avoid hitting rate limits on APIs
        time.sleep(2)
        
    if not pdf_files:
        print("No PDFs were generated. Please check your API keys and quotas.")
        return
        
    print("\nGenerating Index PDF...")
    index_pdf = generate_index_pdf(topics, pdf_files)
    
    print("Merging all PDFs...")
    final_output = OUTPUT_DIR / "UPSC_Hard_QBank_Final.pdf"
    merge_pdfs(index_pdf, pdf_files, str(final_output))
    
    print(f"\nPipeline Complete! Final compiled Q-Bank is ready at: {final_output.absolute()}")

if __name__ == "__main__":
    main()
