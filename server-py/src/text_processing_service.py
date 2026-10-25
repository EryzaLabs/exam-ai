import os
import time
import json
import asyncio
import random
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv
from pydantic import BaseModel, Field, model_validator, ConfigDict
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from functools import wraps

load_dotenv()

def is_rate_limit_error(exception) -> bool:
    """Check if exception is a rate limit error"""
    error_str = str(exception).lower()
    
    # Check for common rate limit indicators
    rate_limit_indicators = [
        '429',
        'rate limit',
        'rate_limit', 
        'too many requests',
        'quota exceeded',
        'rate exceeded',
        'throttled'
    ]
    
    return any(indicator in error_str for indicator in rate_limit_indicators)

def async_retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
    """Async retry decorator with exponential backoff and rate limit handling"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt < max_retries - 1:
                        # Check if it's a rate limit error
                        if is_rate_limit_error(e):
                            # Longer delay for rate limits: 30s, 60s, 120s
                            rate_limit_delays = [30, 60, 120]
                            delay = rate_limit_delays[min(attempt, len(rate_limit_delays) - 1)]
                            print(f"🚫 LLM rate limit detected on attempt {attempt + 1}: {str(e)[:100]}...")
                            print(f"⏳ Waiting {delay}s before retrying (rate limit backoff)...")
                        else:
                            # Normal exponential backoff for other errors
                            delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
                            print(f"⚠️ LLM attempt {attempt + 1} failed: {str(e)[:100]}...")
                            print(f"⏳ Retrying in {delay:.1f}s...")
                        
                        await asyncio.sleep(delay)
                    else:
                        if is_rate_limit_error(e):
                            print(f"🚫 LLM rate limit exceeded after {max_retries} attempts")
                        else:
                            print(f"❌ LLM failed after {max_retries} attempts")
            
            raise last_exception
        return wrapper
    return decorator

class ExamInfo(BaseModel):
    exam_name: Optional[str] = Field(description="Name of the exam (e.g., UPSC Civil Services)")
    exam_year: Optional[str] = Field(description="Year of the exam")
    paper_name: Optional[str] = Field(description="Name of the paper/section")
    subject: Optional[str] = Field(description="Main subject")
    section: Optional[str] = Field(description="Specific section if identifiable")
    
    model_config = ConfigDict(
        extra="allow",
        str_strip_whitespace=True
    )
    
    @model_validator(mode='before')
    def fix_common_typos(cls, v):
        if isinstance(v, dict):
            # Fix the common typo exam_naame -> exam_name
            if 'exam_naame' in v:
                v['exam_name'] = v.pop('exam_naame')
            
            # Ensure no None values
            for key in ['exam_name', 'exam_year', 'paper_name', 'subject', 'section']:
                if v.get(key) is None:
                    v[key] = ""
                    
        return v

class PageInfo(BaseModel):
    page_type: str = Field(description="Type of page: questions, cover, index, instructions, mixed, blank")
    page_description: str = Field(description="Brief description of page content")
    has_questions: bool = Field(description="Whether this page contains exam questions")

class Question(BaseModel):
    question_number: Optional[str] = Field(description="Question number as it appears")
    question_text_english: Optional[str] = Field(description="Question text in English (if available)")
    question_text_hindi: Optional[str] = Field(description="Question text in Hindi (if available)")
    question_text: str = Field(description="Primary question text (choose best language for consistency)")
    question_type: str = Field(description="Type: MCQ, Numerical, True/False, Assertion-Reason")
    options_english: List[str] = Field(default=[], description="Answer options in English (if available)")
    options_hindi: List[str] = Field(default=[], description="Answer options in Hindi (if available)")
    options: List[str] = Field(default=[], description="Primary answer options (consistent language)")
    correct_answer: Optional[str] = Field(default="", description="Correct answer if provided")
    subject_area: Optional[str] = Field(default="", description="Subject area of the question")
    difficulty: Optional[str] = Field(default="", description="Difficulty level: Easy, Medium, Hard")
    explanation_english: Optional[str] = Field(default="", description="Explanation in English (if available)")
    explanation_hindi: Optional[str] = Field(default="", description="Explanation in Hindi (if available)")
    explanation: Optional[str] = Field(default="", description="Primary explanation (consistent language)")
    
    model_config = ConfigDict(
        extra="allow",  # Allow extra fields from LLM
        str_strip_whitespace=True,  # Strip whitespace automatically
        use_enum_values=True,
        validate_assignment=True
    )
    
    @model_validator(mode='before')
    def handle_common_issues(cls, v):
        if isinstance(v, dict):
            # Handle common issues and provide defaults
            if 'question_text' not in v or not v.get('question_text'):
                # Try to get from language-specific fields
                v['question_text'] = v.get('question_text_english') or v.get('question_text_hindi') or ""
            
            if 'question_type' not in v or not v.get('question_type'):
                v['question_type'] = "MCQ"  # Default type
                
            if 'options' not in v or not v.get('options'):
                # Try to get from language-specific fields
                v['options'] = v.get('options_english') or v.get('options_hindi') or []
                
            # Ensure no None values
            for key in ['question_number', 'correct_answer', 'subject_area', 'difficulty', 
                       'explanation_english', 'explanation_hindi', 'explanation']:
                if v.get(key) is None:
                    v[key] = ""
                    
            # Ensure lists are not None
            for key in ['options', 'options_english', 'options_hindi']:
                if v.get(key) is None:
                    v[key] = []
                    
        return v

class AdditionalContent(BaseModel):
    instructions: str = Field(default="", description="Any instructions or notes")
    references: str = Field(default="", description="Citations or sources mentioned") 
    other_text: str = Field(default="", description="Other relevant text")

class ExamPageAnalysis(BaseModel):
    exam_info: Optional[ExamInfo] = Field(description="Information about the exam")
    page_info: PageInfo = Field(description="Information about this specific page")
    questions: List[Question] = Field(default=[], description="Questions found on this page")
    additional_content: AdditionalContent = Field(default_factory=AdditionalContent, description="Additional content")

class TextProcessingService:
    """Smart text processing service using LLM to understand exam content"""
    
    def __init__(self):
        self.api_key = os.getenv('TRANSLATOR_API_KEY')
        self.base_url = os.getenv('TRANSLATOR_BASE_URL', 'https://ai.hackclub.com/proxy/v1')
        
        if not self.api_key:
            raise ValueError("TRANSLATOR_API_KEY environment variable is required")
        
        # Initialize LangChain LLM
        self.llm = ChatOpenAI(
            model="openai/gpt-oss-120b",
            openai_api_key=self.api_key,
            openai_api_base=self.base_url,
            temperature=0.1,
            max_tokens=4000
        )
        
        # Setup output parser
        self.output_parser = PydanticOutputParser(pydantic_object=ExamPageAnalysis)
    
    def _create_exam_analysis_prompt(self) -> PromptTemplate:
        """Create LangChain prompt template for intelligent exam text analysis"""
        
        prompt_text = """You are an expert at analyzing exam papers and educational content. 

Analyze the following extracted text from an exam page and intelligently determine:

1. **Exam Type & Details**: What exam is this? (UPSC, JEE, NEET, SSC, etc.)
2. **Subject/Section**: What subject or section is this? (General Studies, Physics, Chemistry, Math, CSAT, etc.)
3. **Page Content Type**: What type of content is on this page?
4. **Questions**: Extract any questions with their options and answers
5. **Metadata**: Any other relevant information

CRITICAL EXAM METADATA EXTRACTION:
- FIRST look for page headers, footers, or section titles that contain exam information
- Look for patterns like "UPSC Civil Services Examination 2026", "CSAT Paper-II", "General Studies Paper-I"
- Headers/footers often contain: exam name, year, paper type, section name
- Section headings may indicate: "Part-I General Studies", "Part-II CSAT", specific years
- Pay attention to publisher information, watermarks, or document titles
- Use ACTUAL text found in headers/footers, don't infer or guess
- If you see "2026" in headers, use 2026 as exam_year, not some other year from question content

EXAM INFORMATION PRIORITY:
1. Page headers/footers (highest priority)
2. Section headings and titles  
3. Document structure indicators
4. Publisher/source information
5. Question content context (lowest priority)

IMPORTANT BILINGUAL CONTENT HANDLING:
- This exam paper may contain BOTH Hindi and English text
- SEPARATE English and Hindi content properly
- For questions: If both languages present, extract question_text_english AND question_text_hindi separately
- For options: If both languages present, extract options_english AND options_hindi separately  
- For explanations: If both languages present, extract explanation_english AND explanation_hindi separately
- Choose ONE primary language for question_text, options, and explanation (prefer English if both available)
- Do NOT mix languages in the same field
- Keep language-specific content clean and separate

MULTI-PAGE QUESTION HANDLING:
- Some questions may span multiple pages (question starts on one page, continues on next)
- If a question seems incomplete (missing options, answers, or cuts off mid-sentence), mark it clearly
- Extract all available content even if incomplete - the system will merge multi-page questions later
- Pay attention to question numbers that repeat across pages
- Look for continuation patterns like "continued...", "contd.", or incomplete option lists

LANGUAGE DETECTION RULES:
- Hindi text uses Devanagari script (characters like ह, म, त, क, etc.)
- English text uses Latin script
- Mixed content often appears as: "English text\nHindi text" or "English/Hindi"
- Extract each language portion separately and clean

QUESTION EXTRACTION EXAMPLES:
For a typical bilingual question like:
"1. What is GDP?\nGDP क्या है?\n(a) Gross Domestic Product\n(b) General Development Plan\n..."

Extract as:
- question_text_english: "What is GDP?"
- question_text_hindi: "GDP क्या है?"
- options_english: ["(a) Gross Domestic Product", "(b) General Development Plan", ...]
- options_hindi: [extract Hindi options if present]
- question_text: "What is GDP?" (choose English as primary)
- options: ["(a) Gross Domestic Product", "(b) General Development Plan", ...] (primary language)

FOR QUESTIONS WITH NUMBERED STATEMENTS:
Many exam questions have this pattern:
"Consider the following statements:
1. Statement one text
2. Statement two text  
3. Statement three text
Which of the above is/are correct?"

The numbered statements (1, 2, 3) are PART OF THE QUESTION - include them in question_text!

CORRECT extraction:
- question_text: "Consider the following statements:\n1. Statement one text\n2. Statement two text\n3. Statement three text\nWhich of the above is/are correct?"

WRONG extraction:
- question_text: "Consider the following statements: Which of the above is/are correct?" (missing numbered statements)

CRITICAL: Always include numbered lists, bullet points, or any preparatory context that answer options refer to.

IMPORTANT: 
- Extract ALL answer options (a), (b), (c), (d) etc. even if they appear on separate lines
- If question appears incomplete, extract what's available and note it
- Question numbers should be consistent and help identify multi-page questions
- Include ALL numbered statements, lists, or contexts that options reference

QUESTION EXTRACTION:
- Be smart about identifying exam patterns and formats
- Different exams have different structures (UPSC has GS/CSAT, JEE has PCM, etc.)
- Look for clues in headers, footers, question numbering, and content style
- For questions, extract exact text with proper formatting but separate by language
- Identify question types (MCQ, numerical, assertion-reason, etc.)
- If it's a cover page, index, or instructions, clearly identify that

EXTRACTED TEXT FROM PAGE {page_number} of {source_file}:

{extracted_text}

{format_instructions}

CRITICAL JSON STRUCTURE REQUIREMENT:
Your response MUST be a valid JSON object with this exact structure (no typos in field names):
{{
  "exam_info": {{
    "exam_name": "UPSC Civil Services Examination",
    "exam_year": "2011", 
    "paper_name": "CSAT Paper I",
    "subject": "General Studies",
    "section": "Paper I"
  }},
  "page_info": {{
    "page_type": "questions",
    "page_description": "Description of page content",
    "has_questions": true
  }},
  "questions": [
    {{
      "question_number": "1",
      "question_text": "Question text here",
      "question_type": "MCQ",
      "options": ["(a) Option 1", "(b) Option 2"],
      "correct_answer": "(a)",
      "subject_area": "Economics",
      "difficulty": "Medium",
      "explanation": "Explanation here"
    }}
  ],
  "additional_content": {{
    "instructions": "",
    "references": "",
    "other_text": ""
  }}
}}

IMPORTANT RULES:
- Use "exam_name" NOT "exam_naame" 
- Include ALL required fields even if empty (use empty strings "")
- Do NOT truncate the JSON response
- Ensure all brackets and quotes are properly closed
- If a question spans multiple pages or is incomplete, extract what's available"""

        return PromptTemplate(
            template=prompt_text,
            input_variables=["page_number", "source_file", "extracted_text"],
            partial_variables={"format_instructions": self.output_parser.get_format_instructions()}
        )

    @async_retry_with_backoff(max_retries=4, base_delay=2.0, max_delay=45.0)
    async def analyze_text_async(
        self,
        extracted_text: str,
        page_number: int,
        source_file: str = ""
    ) -> Dict[str, Any]:
        """Analyze extracted text asynchronously with retry logic"""
        return await asyncio.to_thread(
            self.analyze_text,
            extracted_text,
            page_number,
            source_file
        )

    def analyze_text(
        self,
        extracted_text: str,
        page_number: int,
        source_file: str = ""
    ) -> Dict[str, Any]:
        """Analyze extracted text using LangChain LLM with structured output"""
        
        if not extracted_text.strip():
            return {
                'page_number': page_number,
                'analysis': {
                    'exam_info': None,
                    'page_info': {
                        'page_type': 'blank',
                        'page_description': 'No text found on this page',
                        'has_questions': False
                    },
                    'questions': [],
                    'additional_content': {}
                },
                'model_used': 'openai/gpt-oss-120b',
                'timestamp': time.time()
            }

        try:
            print(f"🧠 Analyzing extracted text from page {page_number} with LangChain...")
            
            # Create prompt with LangChain
            prompt_template = self._create_exam_analysis_prompt()
            prompt = prompt_template.format(
                page_number=page_number,
                source_file=source_file,
                extracted_text=extracted_text
            )
            
            # Retry parsing with progressively simpler prompts if parsing fails
            max_parsing_attempts = 3
            last_parsing_error = None
            
            for parsing_attempt in range(max_parsing_attempts):
                try:
                    # Get response from LLM
                    response = self.llm.invoke(prompt)
                    
                    # Parse with LangChain output parser
                    parsed_result = self.output_parser.parse(response.content)
                    
                    print(f"✅ Page {page_number} text analysis completed with LangChain (attempt {parsing_attempt + 1})")
                    
                    return {
                        'page_number': page_number,
                        'analysis': parsed_result.dict(),
                        'raw_content': response.content,
                        'model_used': 'openai/gpt-oss-120b',
                        'timestamp': time.time()
                    }
                    
                except Exception as parsing_error:
                    last_parsing_error = parsing_error
                    
                    if parsing_attempt < max_parsing_attempts - 1:
                        print(f"⚠️ Parsing attempt {parsing_attempt + 1} failed for page {page_number}: {str(parsing_error)[:100]}...")
                        
                        # Modify prompt to be more explicit about required structure
                        if parsing_attempt == 0:
                            prompt += "\n\nIMPORTANT: Include ALL required fields including 'additional_content' with 'instructions', 'references', and 'other_text' fields (use empty strings if not applicable)."
                        elif parsing_attempt == 1:
                            prompt = prompt.replace("IMPORTANT: Include ALL required fields", "CRITICAL: You MUST include 'additional_content': {'instructions': '', 'references': '', 'other_text': ''} in your response")
                        
                        # Brief delay before retry
                        time.sleep(1.0)
                    else:
                        print(f"❌ Failed to parse response after {max_parsing_attempts} attempts for page {page_number}")
                        raise last_parsing_error
                
        except Exception as e:
            print(f"❌ Error analyzing text for page {page_number}: {e}")
            
            # Fallback structure
            fallback_analysis = {
                'exam_info': None,
                'page_info': {
                    'page_type': 'error',
                    'page_description': f'Analysis failed: {str(e)}',
                    'has_questions': False
                },
                'questions': [],
                'additional_content': {
                    'instructions': '',
                    'references': '',
                    'other_text': ''
                }
            }
            
            return {
                'page_number': page_number,
                'analysis': fallback_analysis,
                'model_used': 'openai/gpt-oss-120b',
                'timestamp': time.time(),
                'error': str(e)
            }

    async def analyze_multiple_texts(
        self,
        text_extractions: List[Dict[str, Any]],
        source_file: str = "",
        max_concurrent: int = 2
    ) -> List[Dict[str, Any]]:
        """Analyze multiple extracted texts with controlled concurrency"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def analyze_with_semaphore(text_data):
            async with semaphore:
                return await self.analyze_text_async(
                    text_data['extracted_text'],
                    text_data['page_number'],
                    source_file
                )
        
        print(f"🧠 Analyzing text from {len(text_extractions)} pages...")
        
        tasks = [analyze_with_semaphore(t) for t in text_extractions]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"❌ Text analysis for page {text_extractions[i]['page_number']} failed: {result}")
                valid_results.append({
                    'page_number': text_extractions[i]['page_number'],
                    'analysis': {
                        'exam_info': None,
                        'page_info': {
                            'page_type': 'error',
                            'page_description': f'Analysis failed: {str(result)}',
                            'has_questions': False
                        },
                        'questions': [],
                        'additional_content': {}
                    },
                    'error': str(result)
                })
            else:
                valid_results.append(result)
        
        return valid_results
    
    def summarize_exam_info(self, analysis_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize exam information from all analyzed pages with priority to headers/footers"""
        
        exam_infos = []
        total_questions = 0
        page_types = {}
        subjects = {}
        
        # Collect all exam info and prioritize those from headers/footers
        header_based_info = []
        content_based_info = []
        
        for result in analysis_results:
            analysis = result.get('analysis', {})
            
            # Collect exam info and categorize by source reliability
            exam_info = analysis.get('exam_info')
            if exam_info:
                # Check if this appears to be from headers/footers (more reliable)
                page_desc = analysis.get('page_info', {}).get('page_description', '')
                if any(indicator in page_desc.lower() for indicator in ['header', 'footer', 'title', 'cover', 'table of contents']):
                    header_based_info.append(exam_info)
                else:
                    content_based_info.append(exam_info)
                
                exam_infos.append(exam_info)
            
            # Count questions
            questions = analysis.get('questions', [])
            total_questions += len(questions)
            
            # Count page types
            page_type = analysis.get('page_info', {}).get('page_type', 'unknown')
            page_types[page_type] = page_types.get(page_type, 0) + 1
            
            # Count subjects
            for question in questions:
                subject = question.get('subject_area', 'Unknown')
                subjects[subject] = subjects.get(subject, 0) + 1
        
        # Determine best exam info (prioritize header-based info)
        consolidated_exam_info = {}
        source_infos = header_based_info if header_based_info else content_based_info
        
        if source_infos:
            # Find most common values for each field
            exam_names = [info.get('exam_name') for info in source_infos if info.get('exam_name')]
            exam_years = [info.get('exam_year') for info in source_infos if info.get('exam_year')]
            paper_names = [info.get('paper_name') for info in source_infos if info.get('paper_name')]
            subjects_list = [info.get('subject') for info in source_infos if info.get('subject')]
            
            # Use most frequent or latest info
            if exam_names:
                consolidated_exam_info['exam_name'] = max(set(exam_names), key=exam_names.count)
            if exam_years:
                # For years, prefer the most recent or most frequent
                year_counts = {}
                for year in exam_years:
                    year_counts[year] = year_counts.get(year, 0) + 1
                consolidated_exam_info['exam_year'] = max(year_counts.keys(), key=lambda x: (year_counts[x], x))
            if paper_names:
                consolidated_exam_info['paper_name'] = max(set(paper_names), key=paper_names.count)
            if subjects_list:
                consolidated_exam_info['subject'] = max(set(subjects_list), key=subjects_list.count)
            
            consolidated_exam_info['source_priority'] = 'header_based' if header_based_info else 'content_based'
        
        return {
            'exam_info': consolidated_exam_info,
            'total_questions': total_questions,
            'page_type_distribution': page_types,
            'subject_distribution': subjects,
            'total_pages_analyzed': len(analysis_results)
        }