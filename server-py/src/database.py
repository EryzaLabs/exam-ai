import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

class QuestionDatabase:
    """Simple JSON file-based database for exam questions"""
    
    def __init__(self, db_path: str = "data/questions.json"):
        self.db_path = db_path
        self.data = self._load_data()
        
    def _load_data(self) -> Dict[str, Any]:
        """Load data from JSON file"""
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                pass
        
        # Return empty structure
        return {
            "questions": [],
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "total_questions": 0
            }
        }
    
    def _save_data(self) -> None:
        """Save data to JSON file"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        # Update metadata
        self.data["metadata"]["updated_at"] = datetime.now().isoformat()
        self.data["metadata"]["total_questions"] = len(self.data["questions"])
        
        # Write to file
        with open(self.db_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
    
    def add_question(self, question: Dict[str, Any]) -> str:
        """Add a new question to the database"""
        question_id = str(uuid.uuid4())
        question_with_id = {
            "id": question_id,
            "created_at": datetime.now().isoformat(),
            **question
        }
        
        self.data["questions"].append(question_with_id)
        self._save_data()
        
        return question_id
    
    def add_questions_bulk(self, questions: List[Dict[str, Any]]) -> List[str]:
        """Add multiple questions in bulk"""
        question_ids = []
        
        for question in questions:
            question_id = str(uuid.uuid4())
            question_with_id = {
                "id": question_id,
                "created_at": datetime.now().isoformat(),
                **question
            }
            self.data["questions"].append(question_with_id)
            question_ids.append(question_id)
        
        self._save_data()
        return question_ids
    
    def get_question(self, question_id: str) -> Optional[Dict[str, Any]]:
        """Get a question by ID"""
        for question in self.data["questions"]:
            if question["id"] == question_id:
                return question
        return None
    
    def get_all_questions(self) -> List[Dict[str, Any]]:
        """Get all questions"""
        return self.data["questions"]
    
    def get_questions_by_source(self, source_file: str) -> List[Dict[str, Any]]:
        """Get questions from a specific source file"""
        return [
            q for q in self.data["questions"]
            if q.get("source_file") == source_file
        ]
    
    def search_questions(self, query: str) -> List[Dict[str, Any]]:
        """Search questions by text content"""
        query_lower = query.lower()
        results = []
        
        for question in self.data["questions"]:
            # Search in question text
            if query_lower in question.get("question", "").lower():
                results.append(question)
                continue
            
            # Search in options
            options = question.get("options", [])
            if any(query_lower in opt.lower() for opt in options):
                results.append(question)
                continue
            
            # Search in explanation
            if query_lower in question.get("explanation", "").lower():
                results.append(question)
                continue
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        total_questions = len(self.data["questions"])
        
        # Count by category
        categories = {}
        for question in self.data["questions"]:
            category = question.get("category", "Unknown")
            categories[category] = categories.get(category, 0) + 1
        
        # Count by source
        sources = {}
        for question in self.data["questions"]:
            source = question.get("source_file", "Unknown")
            sources[source] = sources.get(source, 0) + 1
        
        return {
            "total_questions": total_questions,
            "categories": categories,
            "sources": sources,
            "created_at": self.data["metadata"]["created_at"],
            "updated_at": self.data["metadata"]["updated_at"]
        }
    
    def delete_question(self, question_id: str) -> bool:
        """Delete a question by ID"""
        for i, question in enumerate(self.data["questions"]):
            if question["id"] == question_id:
                del self.data["questions"][i]
                self._save_data()
                return True
        return False
    
    def update_question(self, question_id: str, updates: Dict[str, Any]) -> bool:
        """Update a question by ID"""
        for question in self.data["questions"]:
            if question["id"] == question_id:
                question.update(updates)
                question["updated_at"] = datetime.now().isoformat()
                self._save_data()
                return True
        return False
    
    def clear_all(self) -> None:
        """Clear all questions (use with caution!)"""
        self.data = {
            "questions": [],
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "total_questions": 0
            }
        }
        self._save_data()