import os
import json
import time
import asyncio
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import fitz  # PyMuPDF
import base64
from concurrent.futures import ThreadPoolExecutor
from functools import wraps
import random

from src.vlm_service import VLMService
from src.text_processing_service import TextProcessingService
from src.translation_service import TranslationService
from src.database_improved import QuestionDatabase
from src.ocr_service import OCRService


def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
    """Decorator for retry with exponential backoff"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt < max_retries - 1:  # Don't delay on last attempt
                        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
                        print(f"⚠️ Attempt {attempt + 1} failed: {e}")
                        print(f"⏳ Retrying in {delay:.1f}s...")
                        await asyncio.sleep(delay)
                    else:
                        print(f"❌ All {max_retries} attempts failed for {func.__name__}")
            
            raise last_exception
        return wrapper
    return decorator


def sync_retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
    """Decorator for sync retry with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt < max_retries - 1:  # Don't delay on last attempt
                        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
                        print(f"⚠️ Attempt {attempt + 1} failed: {e}")
                        print(f"⏳ Retrying in {delay:.1f}s...")
                        time.sleep(delay)
                    else:
                        print(f"❌ All {max_retries} attempts failed for {func.__name__}")
            
            raise last_exception
        return wrapper
    return decorator


class PDFProcessor:
    """Main PDF processing pipeline using PyMuPDF and VLM services"""
    
    def __init__(self):
        self.vlm_service = VLMService()
        self.text_processor = TextProcessingService()
        self.translation_service = TranslationService()
        self.database = QuestionDatabase()
        self.ocr_service = OCRService()
        self.default_dpi = int(os.getenv('DEFAULT_DPI', '300'))
        self.max_concurrent = int(os.getenv('MAX_CONCURRENT_PAGES', '2'))
        self.progress_dir = "cache"
        os.makedirs(self.progress_dir, exist_ok=True)
    
    def _get_progress_file_path(self, pdf_path: str) -> str:
        """Generate unique progress file path based on PDF name"""
        import hashlib
        pdf_name = os.path.basename(pdf_path)
        pdf_hash = hashlib.md5(pdf_path.encode()).hexdigest()[:8]
        progress_file = f"progress_{pdf_name}_{pdf_hash}.json"
        return os.path.join(self.progress_dir, progress_file)
    
    def save_processing_progress(self, pdf_path: str, processed_pages: List[int], extracted_data: List[Dict[str, Any]], total_pages: int) -> None:
        """Save current processing progress to file"""
        progress_file = self._get_progress_file_path(pdf_path)
        
        progress_data = {
            'pdf_path': pdf_path,
            'processed_pages': sorted(processed_pages),
            'total_pages': total_pages,
            'extracted_data': extracted_data,
            'last_updated': datetime.now().isoformat(),
            'resume_from_page': max(processed_pages) + 1 if processed_pages else 1
        }
        
        with open(progress_file, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Progress saved: {len(processed_pages)}/{total_pages} pages completed")
    
    def load_processing_progress(self, pdf_path: str) -> Optional[Dict[str, Any]]:
        """Load existing processing progress if available"""
        progress_file = self._get_progress_file_path(pdf_path)
        
        if not os.path.exists(progress_file):
            return None
            
        try:
            with open(progress_file, 'r', encoding='utf-8') as f:
                progress_data = json.load(f)
                
            # Validate progress file
            if progress_data.get('pdf_path') == pdf_path:
                print(f"📂 Found existing progress: {len(progress_data.get('processed_pages', []))}/{progress_data.get('total_pages', 0)} pages completed")
                return progress_data
            else:
                print(f"⚠️ Progress file PDF path mismatch, ignoring")
                return None
                
        except (json.JSONDecodeError, KeyError) as e:
            print(f"⚠️ Invalid progress file, starting fresh: {e}")
            return None
    
    def clean_progress_file(self, pdf_path: str) -> None:
        """Remove progress file after successful completion"""
        progress_file = self._get_progress_file_path(pdf_path)
        if os.path.exists(progress_file):
            os.remove(progress_file)
            print(f"🧹 Cleaned up progress file: {progress_file}")
    
    def convert_pdf_to_images(
        self,
        pdf_path: str,
        max_pages: Optional[int] = None,
        dpi: int = None,
        specific_pages: Optional[set] = None
    ) -> List[Dict[str, Any]]:
        """Convert PDF pages to base64-encoded images using PyMuPDF"""
        
        if dpi is None:
            dpi = self.default_dpi
        
        print(f"📄 Opening PDF: {pdf_path}")
        
        try:
            doc = fitz.open(pdf_path)
            total_pages = len(doc)
            
            # Determine which pages to process
            if specific_pages:
                # Filter specific pages to only include valid page numbers
                valid_pages = [p for p in specific_pages if 1 <= p <= total_pages]
                if not valid_pages:
                    raise Exception(f"No valid pages found. Requested pages: {sorted(specific_pages)}, PDF has {total_pages} pages")
                
                invalid_pages = [p for p in specific_pages if p > total_pages]
                if invalid_pages:
                    print(f"⚠️ Warning: Pages {sorted(invalid_pages)} don't exist in PDF (has {total_pages} pages)")
                
                pages_to_process = sorted(valid_pages)
                print(f"📄 Converting {len(pages_to_process)} specific pages to images (DPI: {dpi})")
                print(f"📊 Pages: {pages_to_process}")
            else:
                pages_limit = max_pages if max_pages and max_pages > 0 else total_pages
                pages_limit = min(pages_limit, total_pages)
                pages_to_process = list(range(1, pages_limit + 1))
                print(f"📄 Converting {len(pages_to_process)} pages to images (DPI: {dpi})")
            
            results = []
            
            for page_num in pages_to_process:
                try:
                    # PyMuPDF uses 0-based indexing
                    page_index = page_num - 1
                    page = doc[page_index]
                    
                    # Render page to pixmap
                    mat = fitz.Matrix(dpi/72, dpi/72)
                    pix = page.get_pixmap(matrix=mat)
                    
                    # Convert to JPEG bytes
                    img_bytes = pix.tobytes("jpeg")
                    
                    # Encode to base64
                    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                    
                    results.append({
                        "pageNumber": page_num,
                        "imageBase64": img_base64,
                        "width": pix.width,
                        "height": pix.height,
                        "dpi": dpi
                    })
                    
                    # Show progress
                    if len(results) % 5 == 0 or page_num == pages_to_process[-1]:
                        print(f"⚙️ Processed page {page_num} ({len(results)}/{len(pages_to_process)} completed)")
                    
                    print(f"✅ Page {page_num} converted ({len(img_base64)} chars)")
                    
                except Exception as e:
                    print(f"❌ Error converting page {page_num}: {e}")
                    continue
            
            doc.close()
            print(f"📄 Successfully converted {len(results)} pages")
            return results
            
        except Exception as e:
            print(f"❌ Error opening PDF: {e}")
            raise
    
    async def extract_text_with_vlm(
        self,
        pages: List[Dict[str, Any]],
        pdf_path: str = None,
        skip_processed: bool = True
    ) -> List[Dict[str, Any]]:
        """Extract text from pages using VLM with progress tracking and resumption"""
        
        results = []
        processed_pages = set()
        
        # Try to load existing progress if resuming
        if pdf_path and skip_processed:
            progress_data = self.load_processing_progress(pdf_path)
            if progress_data:
                existing_results = progress_data.get('extracted_data', [])
                processed_pages = set(progress_data.get('processed_pages', []))
                results = [r for r in existing_results if r.get('page_number') in processed_pages]
                print(f"📂 Resuming from page {max(processed_pages) + 1 if processed_pages else 1}")
        
        # Filter out already processed pages
        remaining_pages = [page for page in pages if page['pageNumber'] not in processed_pages]
        
        if not remaining_pages:
            print(f"✅ All pages already processed")
            return results
        
        print(f"📝 Extracting text from {len(remaining_pages)} remaining pages using VLM...")
        
        # Process in batches to handle retries and progress saving
        batch_size = self.max_concurrent
        
        for i in range(0, len(remaining_pages), batch_size):
            batch = remaining_pages[i:i + batch_size]
            batch_results = []
            
            current_batch = i//batch_size + 1
            total_batches = (len(remaining_pages) + batch_size - 1) // batch_size
            print(f"🔄 Processing batch {current_batch}/{total_batches} ({len(batch)} pages)")
            
            # Extract text from batch with retries
            for attempt in range(3):  # Up to 3 attempts
                try:
                    batch_results = await self.vlm_service.extract_text_from_multiple_pages(
                        batch, 
                        max_concurrent=self.max_concurrent
                    )
                    break  # Success
                    
                except Exception as e:
                    print(f"⚠️ Batch attempt {attempt + 1} failed: {e}")
                    if attempt < 2:  # Not the last attempt
                        wait_time = (attempt + 1) * 5  # 5s, 10s, 15s
                        print(f"⏳ Waiting {wait_time}s before retry...")
                        await asyncio.sleep(wait_time)
                    else:
                        print(f"❌ Batch failed after 3 attempts")
                        # Create error results for this batch
                        batch_results = [
                            {
                                'page_number': page['pageNumber'],
                                'extracted_text': '',
                                'error': str(e)
                            }
                            for page in batch
                        ]
            
            # Add batch results to overall results
            results.extend(batch_results)
            
            # Update processed pages tracking
            for result in batch_results:
                processed_pages.add(result['page_number'])
            
            # Save progress after each batch
            if pdf_path:
                total_pages = len(pages)
                self.save_processing_progress(pdf_path, list(processed_pages), results, total_pages)
                print(f"💾 Progress saved: {len(processed_pages)}/{total_pages} pages")
        
        print(f"✅ Text extraction completed for {len(results)} pages")
        return results
    
    async def extract_text_with_ocr_fallback(
        self,
        pages: List[Dict[str, Any]],
        pdf_path: Optional[str] = None,
        skip_processed: bool = False,
        use_ocr_first: bool = True
    ) -> List[Dict[str, Any]]:
        """Extract text using OCR first, fallback to VLM if quality is insufficient"""
        
        if not pages:
            return []
            
        print(f"📝 Extracting text from {len(pages)} pages using OCR with VLM fallback...")
        
        # Load existing progress
        processed_pages = set()
        results = []
        
        if pdf_path and skip_processed:
            progress = self.load_processing_progress(pdf_path)
            if progress:
                processed_pages = set(progress.get('processed_pages', []))
                results = progress.get('extracted_data', [])
                print(f"📄 Resuming: {len(processed_pages)} pages already processed")
        
        # Filter out already processed pages
        remaining_pages = [p for p in pages if p['pageNumber'] not in processed_pages]
        print(f"📝 Processing {len(remaining_pages)} remaining pages...")
        
        # Process pages in batches
        batch_size = self.max_concurrent
        total_batches = (len(remaining_pages) + batch_size - 1) // batch_size
        
        for batch_idx in range(total_batches):
            batch_start = batch_idx * batch_size
            batch_end = min(batch_start + batch_size, len(remaining_pages))
            batch = remaining_pages[batch_start:batch_end]
            
            print(f"🔄 Processing batch {batch_idx + 1}/{total_batches} ({len(batch)} pages)")
            
            try:
                batch_results = []
                
                for page in batch:
                    page_num = page['pageNumber']
                    image_data = page['imageBase64']
                    
                    if use_ocr_first:
                        # Try OCR first
                        print(f"📖 Trying OCR for page {page_num}...")
                        ocr_result = await self.ocr_service.extract_text_async(image_data, page_num)
                        
                        # Evaluate OCR quality
                        if self.is_ocr_quality_sufficient(ocr_result):
                            print(f"✅ Page {page_num}: OCR quality sufficient ({len(ocr_result.get('extracted_text', ''))} chars)")
                            batch_results.append(ocr_result)
                            continue
                        else:
                            print(f"⚠️ Page {page_num}: OCR quality insufficient, falling back to VLM...")
                    
                    # Fallback to VLM
                    vlm_result = await self.vlm_service.extract_text_async(image_data, page_num)
                    batch_results.append(vlm_result)
                
            except Exception as e:
                print(f"❌ Batch {batch_idx + 1} failed: {e}")
                # Create error results for this batch
                batch_results = [
                    {
                        'page_number': page['pageNumber'],
                        'extracted_text': '',
                        'error': str(e),
                        'method_used': 'error'
                    }
                    for page in batch
                ]
            
            # Add batch results to overall results
            results.extend(batch_results)
            
            # Update processed pages tracking
            for result in batch_results:
                processed_pages.add(result['page_number'])
            
            # Save progress after each batch
            if pdf_path:
                total_pages = len(pages)
                self.save_processing_progress(pdf_path, list(processed_pages), results, total_pages)
                print(f"💾 Progress saved: {len(processed_pages)}/{total_pages} pages")
        
        print(f"✅ Text extraction completed for {len(results)} pages")
        return results
    
    def is_ocr_quality_sufficient(self, ocr_result: Dict[str, Any]) -> bool:
        """Evaluate if OCR quality is good enough to skip VLM"""
        
        text = ocr_result.get('extracted_text', '')
        
        # Basic quality checks
        if len(text) < 50:  # Too short
            return False
            
        # Check for too many garbled characters
        total_chars = len(text)
        if total_chars == 0:
            return False
            
        # Count potentially garbled characters
        garbled_chars = sum(1 for c in text if c in '®©™€£¥§¶•')
        garbled_ratio = garbled_chars / total_chars
        
        if garbled_ratio > 0.1:  # More than 10% garbled
            return False
            
        # Check for reasonable word structure
        words = text.split()
        if len(words) < 10:  # Too few words
            return False
            
        # Check for reasonable character distribution (not all numbers or symbols)
        letters = sum(1 for c in text if c.isalpha())
        letter_ratio = letters / total_chars if total_chars > 0 else 0
        
        if letter_ratio < 0.3:  # Less than 30% letters
            return False
            
        print(f"📊 OCR Quality: {len(words)} words, {letter_ratio:.1%} letters, {garbled_ratio:.1%} garbled")
        return True
    
    def is_incomplete_question(self, question: Dict[str, Any]) -> bool:
        """Check if a question appears to be incomplete (missing options, answer, etc.)"""
        
        import re
        
        question_text = question.get('question_text', '')
        options = question.get('options', [])
        
        # Check for incomplete MCQ questions
        if question.get('question_type') == 'MCQ':
            options_english = question.get('options_english', [])
            options_hindi = question.get('options_hindi', [])
            
            total_options = max(len(options), len(options_english), len(options_hindi))
            
            # Most MCQs have 4 options (a, b, c, d)
            if total_options < 3:
                return True
            
            # Check if answer is missing
            if not question.get('correct_answer'):
                return True
                
        # Check for question text that seems cut off
        if question_text.endswith(('...', 'continued', 'contd', '(continued)')):
            return True
            
        # Check for questions that reference content not in the question text
        question_text_lower = question_text.lower()
        
        # Questions with "following" but no numbered statements
        if 'following' in question_text_lower:
            if not re.search(r'\n\s*[1-9]\.\s+', question_text):
                print(f"🔍 Incomplete: Question mentions 'following' but has no numbered statements")
                return True
                
        # Questions where options reference "above" but question has no numbered content
        if any('above' in opt.lower() for opt in options if opt):
            if not re.search(r'\n\s*[1-9]\.\s+', question_text):
                print(f"🔍 Incomplete: Options reference 'above' but question has no numbered content")
                return True
                
        # Very short questions with reference words (likely incomplete)
        if len(question_text.split()) < 15 and any(word in question_text_lower for word in ['following', 'above', 'given']):
            print(f"🔍 Incomplete: Very short question with reference words")
            return True
            
        # Questions ending with incomplete phrases
        if re.search(r'(which of the|from the|consider the|the following)\s*$', question_text_lower):
            print(f"🔍 Incomplete: Question ends with incomplete reference phrase")
            return True
            
        return False
    
    def validate_and_fix_questions(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate questions and detect missing numbered statements issue"""
        
        import re
        
        fixed_questions = []
        
        for question in questions:
            # Check if options reference numbered statements but question doesn't include them
            question_text = question.get('question_text', '').lower()
            options = question.get('options', [])
            
            # If options reference "above" or numbers but question doesn't have numbered list
            has_above_reference = any('above' in opt.lower() for opt in options if opt)
            has_following_reference = 'following' in question_text
            has_numbered_statements = bool(re.search(r'\n\s*[1-9]\.\s+', question.get('question_text', '')))
            
            # Check for incomplete question patterns
            if (has_above_reference or has_following_reference) and not has_numbered_statements:
                question['validation_warning'] = 'Missing numbered statements that options reference'
                question['needs_context'] = True
                
                # Try to extract question number for debugging
                q_num = question.get('question_number', 'Unknown')
                print(f"⚠️ Question {q_num}: Detected incomplete question - missing numbered statements")
                print(f"   Question: {question.get('question_text', '')[:100]}...")
                print(f"   Has 'above' reference: {has_above_reference}")
                print(f"   Has 'following' reference: {has_following_reference}")
                
            # Check if question appears too short for a "following" question
            if has_following_reference and len(question_text.split()) < 15:
                question['validation_warning'] = 'Question appears incomplete - very short with "following" reference'
                question['needs_context'] = True
                
            fixed_questions.append(question)
            
        return fixed_questions
    
    def find_continuation_question(self, incomplete_question: Dict[str, Any], next_page_questions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find a continuation of an incomplete question on the next page"""
        
        if not next_page_questions:
            return None
            
        incomplete_q_num = incomplete_question.get('question_number', '')
        incomplete_text = incomplete_question.get('question_text', '').lower()
        
        for question in next_page_questions:
            q_num = question.get('question_number', '')
            q_text = question.get('question_text', '').strip()
            q_text_lower = q_text.lower()
            
            # Check multiple criteria for continuation:
            
            # 1. Same question number on next page
            if q_num == incomplete_q_num and q_num:
                print(f"✅ Found continuation by question number: {q_num}")
                return question
                
            # 2. Check if this seems like a continuation (no new question, just options/answer/context)
            if not q_text and (question.get('options') or question.get('correct_answer')):
                print(f"✅ Found continuation with options but no question text")
                return question
                
            # 3. Check if question text starts with numbered statements (1., 2., 3.) without a question
            # This might be the missing context for a "which of the following" question
            if re.match(r'^\s*1\.\s+', q_text) and 'following' in incomplete_text:
                print(f"✅ Found numbered statements continuation for 'following' question")
                return question
                
            # 4. Check if it starts with context/statements that the incomplete question was referencing
            if ('above' in ' '.join(incomplete_question.get('options', [])).lower() and 
                re.search(r'^\s*[1-9]\.\s+', q_text)):
                print(f"✅ Found numbered context for question with 'above' options")
                return question
                
            # 5. Check if it's part of a complex question with sub-parts
            if (incomplete_q_num and q_num and 
                (q_num.startswith(incomplete_q_num) or incomplete_q_num.startswith(q_num))):
                print(f"✅ Found related question part: {incomplete_q_num} -> {q_num}")
                return question
                
        return None
    
    def merge_multi_page_question(self, question1: Dict[str, Any], question2: Dict[str, Any]) -> Dict[str, Any]:
        """Merge two parts of a multi-page question"""
        
        merged = question1.copy()
        
        # Merge question text
        if question2.get('question_text') and question2['question_text'] != question1.get('question_text'):
            text1 = merged.get('question_text') or ''
            text2 = question2.get('question_text') or ''
            merged['question_text'] = (text1 + ' ' + text2).strip()
            
        if question2.get('question_text_english'):
            text1 = merged.get('question_text_english') or ''
            text2 = question2.get('question_text_english') or ''
            merged['question_text_english'] = (text1 + ' ' + text2).strip()
            
        if question2.get('question_text_hindi'):
            text1 = merged.get('question_text_hindi') or ''
            text2 = question2.get('question_text_hindi') or ''
            merged['question_text_hindi'] = (text1 + ' ' + text2).strip()
        
        # Merge options
        merged['options'] = merged.get('options', []) + question2.get('options', [])
        merged['options_english'] = merged.get('options_english', []) + question2.get('options_english', [])
        merged['options_hindi'] = merged.get('options_hindi', []) + question2.get('options_hindi', [])
        
        # Use answer from second part if first doesn't have it
        if not merged.get('correct_answer') and question2.get('correct_answer'):
            merged['correct_answer'] = question2['correct_answer']
            
        # Merge explanations
        if question2.get('explanation') and question2['explanation'] != merged.get('explanation'):
            exp1 = merged.get('explanation') or ''
            exp2 = question2.get('explanation') or ''
            merged['explanation'] = (exp1 + ' ' + exp2).strip()
            
        if question2.get('explanation_english'):
            exp1 = merged.get('explanation_english') or ''
            exp2 = question2.get('explanation_english') or ''
            merged['explanation_english'] = (exp1 + ' ' + exp2).strip()
            
        if question2.get('explanation_hindi'):
            exp1 = merged.get('explanation_hindi') or ''
            exp2 = question2.get('explanation_hindi') or ''
            merged['explanation_hindi'] = (exp1 + ' ' + exp2).strip()
        
        # Update source pages to indicate multi-page
        page1 = str(merged.get('source_page', ''))
        page2 = str(question2.get('source_page', ''))
        merged['source_page'] = f"{page1}, {page2}".strip(', ')
        merged['multi_page'] = True
        
        return merged
    
    @retry_with_backoff(max_retries=3, base_delay=2.0)
    async def complete_question_with_ai(self, question: Dict[str, Any]) -> None:
        """Use AI to complete missing parts of a question"""
        
        question_text = question.get('question_text', '')
        if not question_text:
            return
            
        # Generate missing options for MCQ
        if question.get('question_type') == 'MCQ' and len(question.get('options', [])) < 3:
            options = await self.generate_missing_options(question)
            if options:
                question['options'] = options
                if not question.get('options_english'):
                    question['options_english'] = options
                    
        # Generate missing answer
        if not question.get('correct_answer'):
            answer = await self.generate_missing_answer(question)
            if answer:
                question['correct_answer'] = answer
                
        # Generate missing explanation
        if not question.get('explanation'):
            explanation = await self.generate_missing_explanation(question)
            if explanation:
                question['explanation'] = explanation
                question['explanation_english'] = explanation
    
    @retry_with_backoff(max_retries=3, base_delay=1.5)
    async def generate_missing_options(self, question: Dict[str, Any]) -> List[str]:
        """Generate plausible options for MCQ questions"""
        
        prompt = f"""Generate 4 plausible multiple choice options (a), (b), (c), (d) for this question:
        
        Question: {question.get('question_text', '')}
        Subject: {question.get('category', 'General')}
        
        Return only the options in this format:
        (a) Option 1
        (b) Option 2
        (c) Option 3
        (d) Option 4"""
        
        response = await self.text_processor.llm.ainvoke(prompt)
        options = [line.strip() for line in response.content.strip().split('\n') if line.strip()]
        return options[:4] if len(options) >= 4 else []
    
    @retry_with_backoff(max_retries=3, base_delay=1.5)
    async def generate_missing_answer(self, question: Dict[str, Any]) -> str:
        """Generate correct answer for questions"""
        
        prompt = f"""What is the correct answer for this question? Return only the letter (a, b, c, or d):
        
        Question: {question.get('question_text', '')}
        Options: {', '.join(question.get('options', []))}
        Subject: {question.get('category', 'General')}"""
        
        response = await self.text_processor.llm.ainvoke(prompt)
        answer = response.content.strip().lower()
        if answer in ['a', 'b', 'c', 'd']:
            return answer
        return 'a'  # Default fallback
    
    @retry_with_backoff(max_retries=3, base_delay=1.5)
    async def generate_missing_explanation(self, question: Dict[str, Any]) -> str:
        """Generate explanation for questions"""
        
        prompt = f"""Provide a clear, concise explanation for why the correct answer is right:
        
        Question: {question.get('question_text', '')}
        Options: {', '.join(question.get('options', []))}
        Correct Answer: {question.get('correct_answer', '')}
        Subject: {question.get('category', 'General')}"""
        
        response = await self.text_processor.llm.ainvoke(prompt)
        return response.content.strip()
    
    def format_question_text(self, text: str) -> str:
        """Format question text with proper line breaks and structure"""
        if not text:
            return ""
            
        # Add line breaks before numbered items
        import re
        
        # Pattern for numbered items like "1. text 2. text 3. text"
        text = re.sub(r'(\d+\.)\s*', r'\n\1 ', text)
        
        # Clean up multiple newlines and leading/trailing whitespace
        text = re.sub(r'\n+', '\n', text.strip())
        
        return text
    
    async def ensure_translations(self, question: Dict[str, Any]) -> None:
        """Ensure both English and Hindi versions exist for all text fields"""
        
        # Translate question text
        if question.get('question_text_english') and not question.get('question_text_hindi'):
            question['question_text_hindi'] = await self.translate_text(question['question_text_english'], 'hindi')
        elif question.get('question_text_hindi') and not question.get('question_text_english'):
            question['question_text_english'] = await self.translate_text(question['question_text_hindi'], 'english')
            
        # Translate explanation
        if question.get('explanation_english') and not question.get('explanation_hindi'):
            question['explanation_hindi'] = await self.translate_text(question['explanation_english'], 'hindi')
        elif question.get('explanation_hindi') and not question.get('explanation_english'):
            question['explanation_english'] = await self.translate_text(question['explanation_hindi'], 'english')
            
        # Set primary fields if empty
        if not question.get('question_text'):
            question['question_text'] = question.get('question_text_english', question.get('question_text_hindi', ''))
        if not question.get('explanation'):
            question['explanation'] = question.get('explanation_english', question.get('explanation_hindi', ''))
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    async def translate_text(self, text: str, target_lang: str) -> str:
        """Translate text to target language"""
        if not text.strip():
            return ""
            
        if target_lang.lower() == 'hindi':
            prompt = f"Translate this English text to Hindi: {text}"
        else:
            prompt = f"Translate this Hindi text to English: {text}"
            
        response = await self.text_processor.llm.ainvoke(prompt)
        return response.content.strip()
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    async def assess_difficulty(self, question: Dict[str, Any]) -> str:
        """AI-based difficulty assessment"""
        
        prompt = f"""Assess the difficulty level of this question. Return only one word: Easy, Medium, or Hard.
        
        Question: {question.get('question_text', '')}
        Subject: {question.get('category', 'General')}
        Options: {', '.join(question.get('options', []))}"""
        
        response = await self.text_processor.llm.ainvoke(prompt)
        difficulty = response.content.strip().title()
        if difficulty in ['Easy', 'Medium', 'Hard']:
            return difficulty
        return 'Medium'  # Default fallback
    
    def get_exam_filename(self, exam_info: Dict[str, Any]) -> str:
        """Generate filename for exam-specific JSON file"""
        
        exam_name = exam_info.get('exam_name', 'Unknown Exam')
        exam_year = exam_info.get('exam_year', 'Unknown Year')
        paper_name = exam_info.get('paper_name', 'Unknown Paper')
        
        # Clean and format filename
        import re
        filename = f"{exam_name} {exam_year} ({paper_name})"
        filename = re.sub(r'[^\w\s()-]', '', filename)  # Remove invalid chars
        filename = re.sub(r'\s+', ' ', filename).strip()  # Clean spaces
        filename = filename.replace(' ', '_') + '.json'
        
        return filename
    
    async def handle_multi_page_questions(self, all_questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process questions to handle multi-page questions"""
        
        if len(all_questions) < 2:
            # Still process single questions for completion
            for question in all_questions:
                if self.is_incomplete_question(question):
                    await self.complete_question_with_ai(question)
            return all_questions
            
        # Sort questions by page number and question number to ensure proper order
        def get_sort_key(q):
            try:
                page_num = q.get('source_page', 0)
                q_num = q.get('question_number', '')
                # Handle question numbers that might be strings or mixed types
                if isinstance(q_num, str):
                    # Try to extract number from string like "11." or "Question 11"
                    import re
                    numbers = re.findall(r'\d+', q_num)
                    q_num_for_sort = int(numbers[0]) if numbers else 9999
                elif isinstance(q_num, int):
                    q_num_for_sort = q_num
                else:
                    q_num_for_sort = 9999
                return (page_num, q_num_for_sort)
            except Exception as e:
                print(f"⚠️ Sort key error for question: {e}")
                return (9999, 9999)
            
        try:
            sorted_questions = sorted(all_questions, key=get_sort_key)
        except Exception as e:
            print(f"⚠️ Sorting error: {e}. Using original order.")
            sorted_questions = all_questions
        
        merged_questions = []
        skip_indices = set()
        
        for i, question in enumerate(sorted_questions):
            if i in skip_indices:
                continue
                
            # Check if this question is incomplete
            if self.is_incomplete_question(question):
                # Look for continuation in next questions (on same or next page)
                found_continuation = False
                
                for j in range(i + 1, len(sorted_questions)):
                    next_question = sorted_questions[j]
                    next_page = next_question.get('source_page', 0)
                    current_page = question.get('source_page', 0)
                    
                    # Only check questions on same page or consecutive pages
                    if next_page > current_page + 1:
                        break  # Too far, stop looking
                        
                    if self.find_continuation_question(question, [next_question]):
                        current_q_num = question.get('question_number', 'N/A')
                        print(f"🔗 Merging multi-page question {current_q_num} from pages {current_page} and {next_page}")
                        merged = self.merge_multi_page_question(question, next_question)
                        merged_questions.append(merged)
                        skip_indices.add(j)
                        found_continuation = True
                        break
                        
                if not found_continuation:
                    current_q_num = question.get('question_number', 'N/A')
                    current_page = question.get('source_page', 'N/A')
                    print(f"🤖 Generating missing content for incomplete question {current_q_num} on page {current_page} with AI")
                    await self.complete_question_with_ai(question)
                    merged_questions.append(question)
            else:
                merged_questions.append(question)
                
        print(f"🔗 Multi-page question merging: {len(all_questions)} → {len(merged_questions)} questions")
        
        # Sort final result by question number for consistent output
        def get_sort_key_final(q):
            try:
                page_num = q.get('source_page', 0)
                q_num = q.get('question_number', '')
                # Handle question numbers that might be strings or mixed types
                if isinstance(q_num, str):
                    import re
                    numbers = re.findall(r'\d+', q_num)
                    q_num_for_sort = int(numbers[0]) if numbers else 9999
                elif isinstance(q_num, int):
                    q_num_for_sort = q_num
                else:
                    q_num_for_sort = 9999
                return (page_num, q_num_for_sort)
            except Exception as e:
                print(f"⚠️ Sort key error for question: {e}")
                return (9999, 9999)
        
        try:
            final_questions = sorted(merged_questions, key=get_sort_key_final)
        except Exception as e:
            print(f"⚠️ Final sorting error: {e}. Using original order.")
            final_questions = merged_questions
        return final_questions
    
    async def extract_questions_from_analysis(
        self,
        text_analysis_results: List[Dict[str, Any]],
        source_file: str
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Extract and format questions from text analysis results"""
        
        all_questions = []
        
        for result in text_analysis_results:
            page_num = result.get('page_number', 0)
            analysis = result.get('analysis', {})
            
            page_info = analysis.get('page_info', {})
            
            if page_info.get('page_type') == 'error':
                print(f"⚠️ Page {page_num}: {page_info.get('page_description', 'Unknown error')}")
                continue
            
            questions = analysis.get('questions', [])
            
            if not questions:
                print(f"ℹ️ Page {page_num}: {page_info.get('page_description', 'No questions found')}")
                continue
            
            print(f"📝 Page {page_num}: Found {len(questions)} questions")
            
            # Get exam info for this page
            exam_info = analysis.get('exam_info', {})
            
            for question in questions:
                # Handle bilingual content properly
                question_text = question.get('question_text', '')
                options = question.get('options', [])
                explanation = question.get('explanation', '')
                
                # If primary fields are empty, try to use English versions
                if not question_text and question.get('question_text_english'):
                    question_text = question.get('question_text_english')
                if not options and question.get('options_english'):
                    options = question.get('options_english')
                if not explanation and question.get('explanation_english'):
                    explanation = question.get('explanation_english')
                
                # Format question text properly
                question_text = self.format_question_text(question_text)
                question_text_english = self.format_question_text(question.get('question_text_english', ''))
                question_text_hindi = self.format_question_text(question.get('question_text_hindi', ''))
                
                formatted_question = {
                    'question_text': question_text,
                    'question_text_english': question_text_english,
                    'question_text_hindi': question_text_hindi,
                    'options': options,
                    'options_english': question.get('options_english', []),
                    'options_hindi': question.get('options_hindi', []),
                    'correct_answer': question.get('correct_answer', ''),
                    'category': question.get('subject_area', 'Unknown'),
                    'question_type': question.get('question_type', 'MCQ'),
                    'explanation': explanation,
                    'explanation_english': question.get('explanation_english', ''),
                    'explanation_hindi': question.get('explanation_hindi', ''),
                    'question_number': question.get('question_number', ''),
                    'difficulty': question.get('difficulty', 'Medium'),
                    'source_file': source_file,
                    'source_page': page_num,
                    'extracted_at': datetime.now().isoformat(),
                    'extraction_model': result.get('model_used', 'unknown'),
                    # Exam metadata
                    'exam_name': exam_info.get('exam_name', 'Unknown'),
                    'exam_year': exam_info.get('exam_year', 'Unknown'),
                    'paper_name': exam_info.get('paper_name', 'Unknown'),
                    'subject': exam_info.get('subject', 'Unknown'),
                    'section': exam_info.get('section', 'Unknown')
                }
                
                all_questions.append(formatted_question)
        
        # Handle multi-page questions
        print(f"🔗 Processing multi-page questions...")
        all_questions = await self.handle_multi_page_questions(all_questions)
        
        # Validate and flag incomplete questions
        print(f"🔍 Validating questions for completeness...")
        all_questions = self.validate_and_fix_questions(all_questions)
        
        # Post-process all questions
        print(f"🔧 Post-processing questions (translations, difficulty, formatting)...")
        for question in all_questions:
            # Ensure translations exist
            await self.ensure_translations(question)
            
            # Assess difficulty if not set or null
            if not question.get('difficulty') or question['difficulty'] in ['Unknown', 'null', None]:
                question['difficulty'] = await self.assess_difficulty(question)
        
        # Get overall exam summary
        exam_summary = self.text_processor.summarize_exam_info(text_analysis_results)
        
        print(f"📚 Total questions extracted: {len(all_questions)}")
        return all_questions, exam_summary
    
    async def process_pdf_complete(
        self,
        pdf_path: str,
        max_pages: Optional[int] = None,
        specific_pages: Optional[set] = None,
        dpi: int = None,
        save_to_db: bool = True,
        translate_to: Optional[str] = None,
        rephrase_style: Optional[str] = None,
        resume: bool = False,
        use_ocr_first: bool = True
    ) -> Dict[str, Any]:
        """Complete PDF processing pipeline with resume capability"""
        
        start_time = time.time()
        
        print(f"🚀 Starting PDF processing pipeline for: {pdf_path}")
        if specific_pages:
            print(f"📋 Specific pages: {sorted(specific_pages)}")
        else:
            print(f"📋 Max pages: {max_pages or 'All'}")
        print(f"🖼️ DPI: {dpi or self.default_dpi}")
        print(f"🔄 Resume mode: {'Enabled' if resume else 'Disabled'}")
        
        try:
            # Step 1: Convert PDF to images
            print("\n" + "="*50)
            print("STEP 1: Converting PDF to images")
            print("="*50)
            
            pages = self.convert_pdf_to_images(pdf_path, max_pages, dpi, specific_pages)
            
            if not pages:
                raise Exception("No pages could be converted from PDF")
            
            # Step 2: Extract text using OCR with VLM fallback
            print("\n" + "="*50)
            if use_ocr_first:
                print("STEP 2: Extracting text using OCR with VLM fallback")
            else:
                print("STEP 2: Extracting text using VLM")
            print("="*50)
            
            if use_ocr_first:
                text_results = await self.extract_text_with_ocr_fallback(
                    pages, 
                    pdf_path=pdf_path if resume else None,
                    skip_processed=resume,
                    use_ocr_first=True
                )
            else:
                text_results = await self.extract_text_with_vlm(
                    pages, 
                    pdf_path=pdf_path if resume else None,
                    skip_processed=resume
                )
            
            # Step 3: Analyze text using LLM
            print("\n" + "="*50)
            print("STEP 3: Analyzing text with LLM")
            print("="*50)
            
            text_analysis = await self.text_processor.analyze_multiple_texts(
                text_results,
                source_file=os.path.basename(pdf_path),
                max_concurrent=self.max_concurrent
            )
            
            # Debug: Check what we got from text analysis
            print(f"📊 Text analysis completed. Got {len(text_analysis)} results")
            for i, result in enumerate(text_analysis):
                if hasattr(result, '__call__') or str(type(result)) == "<class 'coroutine'>":
                    print(f"❌ Result {i} is a {type(result)}, not a dictionary!")
                else:
                    print(f"✅ Result {i}: page {result.get('page_number', 'unknown')}")
            
            # Step 4: Extract questions and exam info
            print("\n" + "="*50)
            print("STEP 4: Extracting questions and exam metadata")
            print("="*50)
            
            questions, exam_summary = await self.extract_questions_from_analysis(
                text_analysis, 
                os.path.basename(pdf_path)
            )
            
            # Step 5: Translation (if requested)
            translated_questions = []
            if translate_to and questions:
                print("\n" + "="*50)
                print(f"STEP 5: Translating to {translate_to}")
                print("="*50)
                
                translated_results = await self.translation_service.process_multiple_questions(
                    questions,
                    operation="translate",
                    target_language=translate_to,
                    max_concurrent=self.max_concurrent
                )
                
                translated_questions = [r['processed'] for r in translated_results if 'processed' in r]
            
            # Step 6: Rephrasing (if requested)
            rephrased_questions = []
            if rephrase_style and questions:
                print("\n" + "="*50)
                print(f"STEP 6: Rephrasing in {rephrase_style} style")
                print("="*50)
                
                rephrased_results = await self.translation_service.process_multiple_questions(
                    questions,
                    operation="rephrase",
                    style=rephrase_style,
                    max_concurrent=self.max_concurrent
                )
                
                rephrased_questions = [r['processed'] for r in rephrased_results if 'processed' in r]
            
            # Step 7: Save to database (if requested)
            saved_ids = []
            if save_to_db and questions:
                print("\n" + "="*50)
                print("STEP 7: Saving to database")
                print("="*50)
                
                # Use consolidated exam info from summary (prioritizes headers/footers)
                exam_info = exam_summary.get('exam_info', {})
                if exam_info and exam_info.get('exam_name'):
                    # Ensure all required fields are present
                    exam_info.setdefault('exam_year', 'Unknown Year')
                    exam_info.setdefault('paper_name', 'Unknown Paper')
                    exam_info.setdefault('subject', 'Unknown Subject')
                    exam_info.setdefault('section', 'Unknown Section')
                    
                    source_priority = exam_info.get('source_priority', 'unknown')
                    print(f"📋 Using {source_priority} exam info: {exam_info['exam_name']} {exam_info['exam_year']} - {exam_info['paper_name']}")
                else:
                    # Fallback to first question's exam info
                    print("⚠️ No consolidated exam info available, using fallback from first question")
                    if questions:
                        first_q = questions[0]
                        exam_info = {
                            'exam_name': first_q.get('exam_name', 'Unknown Exam'),
                            'exam_year': first_q.get('exam_year', 'Unknown Year'),
                            'paper_name': first_q.get('paper_name', 'Unknown Paper'),
                            'subject': first_q.get('subject', 'Unknown Subject'),
                            'section': first_q.get('section', 'Unknown Section')
                        }
                        print(f"📋 Using fallback exam info: {exam_info['exam_name']} {exam_info['exam_year']} - {exam_info['paper_name']}")
                
                # Save questions to exam-specific file
                saved_ids = self.database.add_questions_by_exam(questions, exam_info)
                print(f"💾 Saved {len(saved_ids)} questions to database")
                
                # Also save translated questions if available
                if translated_questions:
                    translated_exam_info = exam_info.copy()
                    translated_exam_info['paper_name'] += f" (Translated to {translate_to})"
                    self.database.add_questions_by_exam(translated_questions, translated_exam_info)
                    
                # Also save rephrased questions if available  
                if rephrased_questions:
                    rephrased_exam_info = exam_info.copy()
                    rephrased_exam_info['paper_name'] += f" (Rephrased - {rephrase_style})"
                    self.database.add_questions_by_exam(rephrased_questions, rephrased_exam_info)
            
            # Compile results
            processing_time = time.time() - start_time
            
            result = {
                'success': True,
                'processing_time_seconds': round(processing_time, 2),
                'source_file': pdf_path,
                'pages_processed': len(pages),
                'questions_extracted': len(questions),
                'questions_saved': len(saved_ids),
                'questions': questions,
                'translated_questions': translated_questions,
                'rephrased_questions': rephrased_questions,
                'saved_question_ids': saved_ids,
                'text_extractions': text_results,
                'text_analysis_results': text_analysis,
                'exam_summary': exam_summary,
                'processing_summary': {
                    'total_pages_in_pdf': len(pages),
                    'pages_with_questions': exam_summary.get('summary', {}).get('pages_with_questions', 0),
                    'pages_with_errors': len([r for r in text_analysis if r.get('analysis', {}).get('page_info', {}).get('page_type') == 'error']),
                    'average_time_per_page': round(processing_time / len(pages), 2) if pages else 0,
                    'detected_exam': exam_summary.get('exam_info', {}).get('exam_name', 'Unknown'),
                    'detected_subjects': list(exam_summary.get('summary', {}).get('subject_distribution', {}).keys())
                }
            }
            
            print("\n" + "="*50)
            print("🎉 PROCESSING COMPLETE!")
            print("="*50)
            print(f"⏱️ Total time: {processing_time:.2f} seconds")
            print(f"📄 Pages processed: {len(pages)}")
            print(f"📝 Questions extracted: {len(questions)}")
            if save_to_db:
                print(f"💾 Questions saved: {len(saved_ids)}")
            
            # Clean up progress file on successful completion
            if resume:
                self.clean_progress_file(pdf_path)
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            print(f"\n❌ Processing failed after {processing_time:.2f} seconds")
            print(f"Error: {str(e)}")
            
            return {
                'success': False,
                'error': str(e),
                'processing_time_seconds': round(processing_time, 2),
                'source_file': pdf_path
            }