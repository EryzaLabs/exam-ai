import os
import time
import json
import asyncio
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

class TranslationService:
    """Translation and rephrasing service using GPT model"""
    
    def __init__(self):
        self.model = os.getenv('TRANSLATOR_MODEL', 'openai/gpt-oss-120b')
        self.api_key = os.getenv('TRANSLATOR_API_KEY')
        self.base_url = os.getenv('TRANSLATOR_BASE_URL', 'https://ai.hackclub.com/proxy/v1')
        
        if not self.api_key:
            raise ValueError("TRANSLATOR_API_KEY environment variable is required")
    
    def _create_translation_prompt(self, original_language: str, target_language: str) -> str:
        """Create prompt for translation"""
        return f"""You are an expert translator specializing in educational content and exam questions.

Translate the following exam question from {original_language} to {target_language}.

IMPORTANT INSTRUCTIONS:
- Maintain the exact structure and formatting
- Keep question numbers, option labels (A, B, C, D) unchanged
- Preserve mathematical expressions, formulas, and technical terms accurately
- If certain terms are better left untranslated (like proper nouns), keep them in original language
- Ensure the translation is natural and suitable for exam context
- Maintain the same level of difficulty and clarity

Return the response as JSON with this structure:
{{
  "translated_question": "...",
  "translated_options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "translated_explanation": "..." (if provided),
  "notes": "Any translation notes or preserved terms"
}}"""

    def _create_rephrasing_prompt(self, style: str = "formal") -> str:
        """Create prompt for rephrasing questions"""
        return f"""You are an expert at rephrasing educational content while maintaining meaning and accuracy.

Rephrase the following exam question in a {style} style while keeping:
- The same difficulty level
- All answer options equally valid/invalid
- The core concept being tested
- Professional exam language

IMPORTANT INSTRUCTIONS:
- Do not change the correct answer
- Maintain question structure and option format
- Ensure clarity and readability
- Keep technical terms accurate
- Preserve any mathematical expressions exactly

Return the response as JSON with this structure:
{{
  "rephrased_question": "...",
  "rephrased_options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "rephrased_explanation": "..." (if provided),
  "style_applied": "{style}",
  "changes_made": "Brief description of what was changed"
}}"""

    async def translate_question_async(
        self,
        question_data: Dict[str, Any],
        target_language: str,
        original_language: str = "auto-detect"
    ) -> Dict[str, Any]:
        """Translate a question asynchronously"""
        return await asyncio.to_thread(
            self.translate_question,
            question_data,
            target_language,
            original_language
        )

    def translate_question(
        self,
        question_data: Dict[str, Any],
        target_language: str,
        original_language: str = "auto-detect"
    ) -> Dict[str, Any]:
        """Translate a question to target language"""
        
        # Prepare the content to translate
        content_to_translate = f"""Question: {question_data.get('question_text', '')}

Options:
{chr(10).join(question_data.get('options', []))}

Explanation: {question_data.get('explanation', '')}"""

        prompt = self._create_translation_prompt(original_language, target_language)
        
        return self._call_translation_api(content_to_translate, prompt, question_data)

    async def rephrase_question_async(
        self,
        question_data: Dict[str, Any],
        style: str = "formal"
    ) -> Dict[str, Any]:
        """Rephrase a question asynchronously"""
        return await asyncio.to_thread(
            self.rephrase_question,
            question_data,
            style
        )

    def rephrase_question(
        self,
        question_data: Dict[str, Any],
        style: str = "formal"
    ) -> Dict[str, Any]:
        """Rephrase a question in specified style"""
        
        # Prepare the content to rephrase
        content_to_rephrase = f"""Question: {question_data.get('question_text', '')}

Options:
{chr(10).join(question_data.get('options', []))}

Explanation: {question_data.get('explanation', '')}"""

        prompt = self._create_rephrasing_prompt(style)
        
        return self._call_translation_api(content_to_rephrase, prompt, question_data)

    def _call_translation_api(
        self,
        content: str,
        prompt: str,
        original_question: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make API call to translation service"""
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
        
        payload = {
            'model': self.model,
            'messages': [
                {
                    'role': 'user',
                    'content': f"{prompt}\n\nContent to process:\n{content}"
                }
            ],
            'max_tokens': 2000,
            'temperature': 0.2
        }
        
        try:
            print(f"🔄 Processing question with {self.model}...")
            
            response = requests.post(
                f'{self.base_url}/chat/completions',
                headers=headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Extract the response content
            content_response = result['choices'][0]['message']['content']
            
            # Try to parse as JSON
            try:
                parsed_result = json.loads(content_response)
                print("✅ Translation/rephrasing completed successfully")
                
                return {
                    'original': original_question,
                    'processed': parsed_result,
                    'model_used': self.model,
                    'timestamp': time.time()
                }
                
            except json.JSONDecodeError:
                print("⚠️ Translation service returned non-JSON response")
                return {
                    'original': original_question,
                    'processed': {
                        'error': 'Failed to parse response as JSON',
                        'raw_response': content_response
                    },
                    'model_used': self.model,
                    'timestamp': time.time()
                }
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error in translation service: {e}")
            return {
                'original': original_question,
                'processed': {
                    'error': f'Translation failed: {str(e)}'
                },
                'model_used': self.model,
                'timestamp': time.time()
            }

    async def process_multiple_questions(
        self,
        questions: List[Dict[str, Any]],
        operation: str = "translate",
        target_language: str = "English",
        style: str = "formal",
        max_concurrent: int = 2
    ) -> List[Dict[str, Any]]:
        """Process multiple questions with controlled concurrency"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_with_semaphore(question):
            async with semaphore:
                if operation == "translate":
                    return await self.translate_question_async(question, target_language)
                elif operation == "rephrase":
                    return await self.rephrase_question_async(question, style)
                else:
                    raise ValueError(f"Unknown operation: {operation}")
        
        print(f"🔄 Processing {len(questions)} questions with {operation}...")
        
        tasks = [process_with_semaphore(q) for q in questions]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"❌ Question {i+1} failed: {result}")
                valid_results.append({
                    'original': questions[i],
                    'processed': {'error': str(result)},
                    'timestamp': time.time()
                })
            else:
                valid_results.append(result)
        
        return valid_results