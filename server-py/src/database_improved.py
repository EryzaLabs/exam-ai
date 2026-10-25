import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import time
import random
from functools import wraps

def sync_retry_with_backoff(max_retries: int = 3, base_delay: float = 0.5, max_delay: float = 10.0):
    """Sync retry decorator for database operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt < max_retries - 1:
                        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 0.5), max_delay)
                        print(f"⚠️ DB operation attempt {attempt + 1} failed: {e}")
                        print(f"⏳ Retrying in {delay:.1f}s...")
                        time.sleep(delay)
                    else:
                        print(f"❌ DB operation failed after {max_retries} attempts")
            
            raise last_exception
        return wrapper
    return decorator

class QuestionDatabase:
    """Improved JSON file-based database with separate files per exam"""
    
    def __init__(self, base_path: str = "data"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)
        
    def _get_exam_file_path(self, exam_name: str, exam_year: str, paper_name: str) -> str:
        """Generate file path for specific exam"""
        import re
        filename = f"{exam_name} {exam_year} ({paper_name})"
        filename = re.sub(r'[^\w\s()-]', '', filename)  # Remove invalid chars
        filename = re.sub(r'\s+', ' ', filename).strip()  # Clean spaces
        filename = filename.replace(' ', '_') + '.json'
        return os.path.join(self.base_path, filename)
        
    def _load_exam_data(self, file_path: str) -> Dict[str, Any]:
        """Load data from exam-specific JSON file"""
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                pass
        
        # Return empty structure
        return {
            "questions": [],
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "total_questions": 0,
                "exam_info": {}
            }
        }
    
    @sync_retry_with_backoff(max_retries=3, base_delay=0.5)
    def _save_exam_data(self, file_path: str, data: Dict[str, Any]) -> None:
        # Update metadata
        data["metadata"]["updated_at"] = datetime.now().isoformat()
        data["metadata"]["total_questions"] = len(data["questions"])
        
        # Write to file with atomic operation
        temp_file = file_path + ".tmp"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Atomic rename
        os.replace(temp_file, file_path)

    @sync_retry_with_backoff(max_retries=3, base_delay=0.5)
    def add_questions_by_exam(self, questions: List[Dict[str, Any]], exam_info: Dict[str, Any]) -> List[str]:
        """Add questions to exam-specific file"""
        if not questions:
            return []
            
        exam_name = exam_info.get('exam_name', 'Unknown')
        exam_year = exam_info.get('exam_year', 'Unknown')
        paper_name = exam_info.get('paper_name', 'Unknown')
        
        file_path = self._get_exam_file_path(exam_name, exam_year, paper_name)
        data = self._load_exam_data(file_path)
        
        # Update exam info in metadata
        data["metadata"]["exam_info"] = exam_info
        
        question_ids = []
        for question in questions:
            question_id = str(uuid.uuid4())
            question_with_id = {
                "id": question_id,
                "created_at": datetime.now().isoformat(),
                **question
            }
            data["questions"].append(question_with_id)
            question_ids.append(question_id)
        
        self._save_exam_data(file_path, data)
        print(f"💾 Saved {len(questions)} questions to {os.path.basename(file_path)}")
        
        return question_ids
    
    def get_exam_files(self) -> List[str]:
        """Get list of all exam files"""
        files = []
        for filename in os.listdir(self.base_path):
            if filename.endswith('.json'):
                files.append(filename)
        return files
    
    def get_questions_from_exam(self, exam_name: str, exam_year: str, paper_name: str) -> List[Dict[str, Any]]:
        """Get all questions from specific exam"""
        file_path = self._get_exam_file_path(exam_name, exam_year, paper_name)
        data = self._load_exam_data(file_path)
        return data["questions"]
    
    def get_all_exams_summary(self) -> Dict[str, Any]:
        """Get summary of all available exams"""
        summary = {}
        for filename in self.get_exam_files():
            file_path = os.path.join(self.base_path, filename)
            data = self._load_exam_data(file_path)
            summary[filename] = {
                "total_questions": data["metadata"]["total_questions"],
                "exam_info": data["metadata"].get("exam_info", {}),
                "last_updated": data["metadata"]["updated_at"]
            }
        return summary
    
    # Legacy methods for backward compatibility
    def add_questions_bulk(self, questions: List[Dict[str, Any]]) -> List[str]:
        """Legacy method - adds to default file"""
        if not questions:
            return []
            
        # Try to determine exam info from first question
        first_question = questions[0]
        exam_info = {
            'exam_name': first_question.get('exam_name', 'Unknown'),
            'exam_year': first_question.get('exam_year', 'Unknown'),
            'paper_name': first_question.get('paper_name', 'Unknown')
        }
        
        return self.add_questions_by_exam(questions, exam_info)