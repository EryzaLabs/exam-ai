from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import asyncio
import tempfile
import json

from src.pdf_processor import PDFProcessor
from src.database import QuestionDatabase

app = FastAPI(title="Exam AI PDF Processor", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
pdf_processor = PDFProcessor()
database = QuestionDatabase()

# Pydantic models
class ProcessingRequest(BaseModel):
    pdf_path: str
    max_pages: Optional[int] = None
    dpi: Optional[int] = 300
    save_to_db: bool = True
    translate_to: Optional[str] = None
    rephrase_style: Optional[str] = None

class ProcessingResponse(BaseModel):
    job_id: str
    status: str
    message: str

# In-memory job storage (use Redis in production)
processing_jobs = {}

@app.get("/")
async def root():
    return {"message": "Exam AI PDF Processor API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database_stats": database.get_stats()}

@app.post("/process-pdf", response_model=ProcessingResponse)
async def process_pdf(request: ProcessingRequest, background_tasks: BackgroundTasks):
    """Start PDF processing job"""
    
    # Validate PDF file exists
    if not os.path.exists(request.pdf_path):
        raise HTTPException(status_code=400, detail=f"PDF file not found: {request.pdf_path}")
    
    # Generate job ID
    import uuid
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    processing_jobs[job_id] = {
        "status": "started",
        "progress": 0,
        "message": "Processing initiated",
        "result": None,
        "error": None
    }
    
    # Start background processing
    background_tasks.add_task(process_pdf_background, job_id, request)
    
    return ProcessingResponse(
        job_id=job_id,
        status="started",
        message="PDF processing job started"
    )

async def process_pdf_background(job_id: str, request: ProcessingRequest):
    """Background task to process PDF"""
    try:
        processing_jobs[job_id]["status"] = "processing"
        processing_jobs[job_id]["message"] = "Converting PDF to images"
        
        result = await pdf_processor.process_pdf_complete(
            pdf_path=request.pdf_path,
            max_pages=request.max_pages,
            dpi=request.dpi,
            save_to_db=request.save_to_db,
            translate_to=request.translate_to,
            rephrase_style=request.rephrase_style
        )
        
        if result['success']:
            processing_jobs[job_id]["status"] = "completed"
            processing_jobs[job_id]["message"] = f"Successfully processed {result['questions_extracted']} questions"
            processing_jobs[job_id]["result"] = result
        else:
            processing_jobs[job_id]["status"] = "failed"
            processing_jobs[job_id]["message"] = result.get('error', 'Unknown error')
            processing_jobs[job_id]["error"] = result.get('error')
            
    except Exception as e:
        processing_jobs[job_id]["status"] = "failed"
        processing_jobs[job_id]["message"] = str(e)
        processing_jobs[job_id]["error"] = str(e)

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a processing job"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_jobs[job_id]

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF file for processing"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create uploads directory
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Save uploaded file
    file_path = os.path.join(uploads_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"filename": file.filename, "path": file_path, "size": len(content)}

@app.get("/questions")
async def get_questions(
    source_file: Optional[str] = None,
    category: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get questions from database"""
    if source_file:
        questions = database.get_questions_by_source(source_file)
    else:
        questions = database.get_all_questions()
    
    # Filter by category if specified
    if category:
        questions = [q for q in questions if q.get('category') == category]
    
    # Apply limit if specified
    if limit:
        questions = questions[:limit]
    
    return {"questions": questions, "total": len(questions)}

@app.get("/questions/search")
async def search_questions(q: str):
    """Search questions by text"""
    results = database.search_questions(q)
    return {"questions": results, "total": len(results)}

@app.get("/stats")
async def get_database_stats():
    """Get database statistics"""
    return database.get_stats()

@app.delete("/questions/{question_id}")
async def delete_question(question_id: str):
    """Delete a question"""
    success = database.delete_question(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}

@app.get("/questions/{question_id}")
async def get_question(question_id: str):
    """Get a specific question"""
    question = database.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)