"""
BharatKosh Scraper - Complete Solution with HackClub AI Proxy
Scrapes history questions from bharatdiscovery.org (pages 1-566)
Extracts questions, translates, gets AI answers with explanations, and stores in database
"""

import requests
import cloudscraper
import asyncio
import json
import time
import random
import re
import os
from typing import Dict, List, Optional, Any, Tuple
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
import sys

# Add server-py/src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'server-py', 'src'))
from database_improved import QuestionDatabase

load_dotenv()


class BharatkoshScraper:
    """Comprehensive scraper for BharatDiscovery.org history questions using HackClub AI proxy"""
    
    BASE_URL = "https://bharatdiscovery.org/india/%E0%A4%87%E0%A4%A4%E0%A4%BF%E0%A4%B9%E0%A4%BE%E0%A4%B8_%E0%A4%B8%E0%A4%BE%E0%A4%AE%E0%A4%BE%E0%A4%A8%E0%A5%8D%E0%A4%AF_%E0%A4%9C%E0%A5%8D%E0%A4%9E%E0%A4%BE%E0%A4%A8_{}"
    
    def __init__(self, 
                 start_page: int = 1, 
                 end_page: int = 566,
                 output_dir: str = "server-py/data",
                 delay_between_requests: float = 2.0,
                 auto_cookie: bool = True):
        
        self.start_page = start_page
        self.end_page = end_page
        self.output_dir = output_dir
        self.delay_between_requests = delay_between_requests
        self.auto_cookie = auto_cookie
        
        # Initialize cloudscraper session for automatic Cloudflare bypass
        self.scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            }
        )
        
        # Fallback manual cookies (used if auto_cookie=False)
        self.manual_cookies = {
            "cf_clearance": "bF2crImAphPcjaHbZeqxeLBq0mtduTZc3K0PfFt6I.4-1769355865-1.2.1.1-ivy3Nm7a6mNUwGuwbdp7_UizNVaVXmLO_NwZz_4PPsnivolid4lxHAzOgINj0q.H5tJaO.JBMn60i.3sbMDSLlVZeop6YDZRfSdudZruR.PLh2qXWK5chJ_02S9u87b52HcgFw8irfFao_JsUVj.U5UdXbs2VIhuQBgKynJuMYQezYtnfH2t2hvLMv3A8fc7_d9o8nt_pjM7c9OdvVFuY5pBfwPAMp6Z4hk9qWzl6BE"
        }
        
        # Multiple user agents for rotation
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
        self.headers = {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Referer": "https://bharatdiscovery.org/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Cache-Control": "no-cache"
        }
        
        # Initialize database
        self.db = QuestionDatabase(base_path=output_dir)
        
        # Initialize AI model with HackClub proxy
        api_key = os.getenv("BHARATKOSH_API_KEY") or os.getenv("TRANSLATOR_API_KEY")
        base_url = os.getenv("BHARATKOSH_BASE_URL") or os.getenv("TRANSLATOR_BASE_URL")
        model = os.getenv("BHARATKOSH_MODEL") or os.getenv("TRANSLATOR_MODEL") or "openai/gpt-4o-mini"
        
        self.llm = ChatOpenAI(
            model=model,
            temperature=0.3,
            request_timeout=60,
            api_key=api_key,
            base_url=base_url
        )
        
        # Statistics
        self.stats = {
            "pages_processed": 0,
            "questions_extracted": 0,
            "questions_with_answers": 0,
            "errors": 0,
            "start_time": None,
            "end_time": None
        }
        
        # Cache directory
        self.cache_dir = os.path.join(output_dir, "..", "cache", "bharatkosh")
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Recovery tracking
        self.failed_pages = []
        self.session_refresh_count = 0
        self.last_successful_page = None
    
    def refresh_session(self):
        """Refresh the scraper session to bypass potential IP/session blocks"""
        print(f"🔄 Refreshing scraper session (attempt {self.session_refresh_count + 1})...")
        
        # Rotate user agent
        new_agent = random.choice(self.user_agents)
        self.headers["User-Agent"] = new_agent
        print(f"🔄 Using new User-Agent: {new_agent[:50]}...")
        
        # Create new cloudscraper session with different browser config
        browser_configs = [
            {'browser': 'chrome', 'platform': 'windows', 'desktop': True},
            {'browser': 'chrome', 'platform': 'darwin', 'desktop': True}, 
            {'browser': 'firefox', 'platform': 'windows', 'desktop': True},
            {'browser': 'chrome', 'platform': 'linux', 'desktop': True}
        ]
        
        config = random.choice(browser_configs)
        self.scraper = cloudscraper.create_scraper(browser=config)
        self.session_refresh_count += 1
        
        # Add random delay after session refresh
        delay = random.uniform(5, 15)
        print(f"⏳ Waiting {delay:.1f}s after session refresh...")
        time.sleep(delay)
    
    def should_retry_failed_pages(self) -> bool:
        """Determine if we should retry failed pages"""
        if len(self.failed_pages) == 0:
            return False
            
        success_rate = (self.stats["pages_processed"] - len(self.failed_pages)) / max(1, self.stats["pages_processed"])
        
        # Retry if we have less than 80% success rate and haven't tried too many session refreshes
        return success_rate < 0.8 and self.session_refresh_count < 5
    
    def retry_failed_pages(self):
        """Retry previously failed pages with fresh session"""
        if not self.failed_pages:
            return
        
        print(f"\n🔄 Retrying {len(self.failed_pages)} failed pages...")
        failed_copy = self.failed_pages.copy()
        self.failed_pages.clear()
        
        # Refresh session before retrying
        self.refresh_session()
        
        for page_num in failed_copy:
            print(f"\n🔄 Retrying page {page_num}...")
            
            # Check if we already have cached data
            if self._has_cached_data(page_num):
                print(f"📦 Using cached data for page {page_num}")
                continue
                
            html_content = self.fetch_page(page_num, max_retries=3)
            if html_content:
                questions = self.extract_questions_from_html(html_content, page_num)
                if questions:
                    self.process_questions(questions, page_num)
                    print(f"✅ Successfully recovered page {page_num} with {len(questions)} questions")
                else:
                    self.failed_pages.append(page_num)
            else:
                self.failed_pages.append(page_num)
                
            # Add delay between retry attempts
            time.sleep(random.uniform(3, 7))
    
    def _has_cached_data(self, page_num: int) -> bool:
        """Check if we already have processed data for this page"""
        cache_file = os.path.join(self.cache_dir, f"page_{page_num}.json")
        return os.path.exists(cache_file)
        
    def fetch_page(self, page_num: int, max_retries: int = 5) -> Optional[str]:
        """Fetch HTML content from a specific page with automatic Cloudflare bypass and retry logic"""
        url = self.BASE_URL.format(page_num)
        
        for retry in range(max_retries):
            try:
                # Implement exponential backoff for retries
                if retry > 0:
                    delay = min(30, (2 ** retry) + random.uniform(1, 3))
                    print(f"⏳ Waiting {delay:.1f}s before retry {retry}/{max_retries-1} for page {page_num}...")
                    time.sleep(delay)
                
                if self.auto_cookie:
                    # Use cloudscraper for automatic Cloudflare bypass
                    print(f"🔄 Fetching page {page_num} (auto-cookie mode, attempt {retry + 1}/{max_retries})...")
                    
                    # Try POST first (BharatDiscovery prefers POST for content pages)
                    response = self.scraper.post(url, timeout=60, allow_redirects=True)
                    
                    # If POST fails, try GET as fallback
                    if response.status_code not in [200, 404] or len(response.text) < 1000:
                        print(f"🔄 POST failed, trying GET for page {page_num}...")
                        response = self.scraper.get(url, timeout=60, allow_redirects=True)
            else:
                # Fallback to manual cookies
                print(f"🔄 Fetching page {page_num} (manual cookie mode)...")
                
                # Try POST first
                response = requests.post(
                    url,
                    headers=self.headers,
                    cookies=self.manual_cookies,
                    timeout=60
                )
                
                # If POST fails, try GET
                if response.status_code not in [200, 404] or len(response.text) < 1000:
                    print(f"🔄 POST failed, trying GET for page {page_num}...")
                    response = requests.get(
                        url,
                        headers=self.headers,
                        cookies=self.manual_cookies,
                        timeout=60
                    )
            
                # Handle different response scenarios
                if response.status_code == 200:
                    # Check if we got actual content or Cloudflare challenge
                    if "Checking your browser" in response.text or "cf-spinner" in response.text or "Just a moment" in response.text:
                        print(f"⚠️ Cloudflare challenge detected for page {page_num}, attempt {retry + 1}...")
                        if retry < max_retries - 1:
                            continue  # Retry with exponential backoff
                        else:
                            print(f"❌ Max retries reached for Cloudflare challenge on page {page_num}")
                            return None
                    
                    # Check for valid content
                    if len(response.text) > 1000 and "इतिहास" in response.text:
                        print(f"✅ Successfully fetched page {page_num} (Status: 200, Length: {len(response.text)} chars)")
                        return response.text
                    else:
                        print(f"⚠️ Page {page_num} has insufficient content, retrying...")
                        if retry < max_retries - 1:
                            continue
                        
                elif response.status_code == 403:
                    print(f"🚫 403 Forbidden for page {page_num} - Cloudflare protection active")
                    if "cloudflare" in response.text.lower() or "cf-ray" in response.text.lower():
                        print(f"🛡️ Detected Cloudflare protection, switching strategies...")
                        
                        # Try to get new session
                        if self.auto_cookie and retry < max_retries - 1:
                            print(f"🔄 Creating new scraper session...")
                            self.scraper = cloudscraper.create_scraper(
                                browser={
                                    'browser': 'chrome',
                                    'platform': 'windows',
                                    'desktop': True
                                }
                            )
                            continue
                    
                    if retry < max_retries - 1:
                        continue
                    else:
                        print(f"❌ Max retries reached for 403 error on page {page_num}")
                        return None
                    
                return response.text
            elif response.status_code == 404 and len(response.text) > 10000:
                # Sometimes 404 pages still contain content (MediaWiki behavior)
                print(f"✅ Page {page_num} returned 404 but has content ({len(response.text)} chars)")
                return response.text
            else:
                print(f"❌ Failed to fetch page {page_num}: Status {response.status_code}, Length: {len(response.text)} chars")
                print(f"   Response preview: {response.text[:200]}...")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching page {page_num}: {e}")
            
            # Try switching modes if auto-cookie fails
            if self.auto_cookie:
                print(f"🔄 Retrying page {page_num} with manual cookies...")
                try:
                    response = requests.get(
                        url,
                        headers=self.headers,
                        cookies=self.manual_cookies,
                        timeout=60
                    )
                    if response.status_code == 200 or (response.status_code == 404 and len(response.text) > 10000):
                        print(f"✅ Successfully fetched page {page_num} (manual fallback)")
                        return response.text
                except Exception as e2:
                    print(f"❌ Manual fallback also failed: {e2}")
            
            return None
    
    def extract_questions_from_html(self, html_content: str, page_num: int) -> List[Dict[str, Any]]:
        """Extract questions and options from HTML content with improved detection"""
        soup = BeautifulSoup(html_content, 'html.parser')
        questions = []
        
        # Debug: Print some content to understand structure
        text_content = soup.get_text()
        print(f"📊 Page {page_num} content preview (first 500 chars):")
        print(f"   {text_content[:500]}...")
        
        # Strategy 1: Look for MediaWiki Quiz extension (most likely format)
        quiz_divs = soup.find_all('div', class_='quiz')
        print(f"📝 Strategy 1: Found {len(quiz_divs)} quiz divs")
        
        for quiz_div in quiz_divs:
            question_divs = quiz_div.find_all('div', class_='question')
            print(f"   - Found {len(question_divs)} questions in this quiz")
            
            for question_div in question_divs:
                try:
                    # Extract question ID and text
                    question_id_span = question_div.find('span', class_='questionId')
                    question_text_span = question_div.find('span', class_='questionText')
                    
                    if question_id_span and question_text_span:
                        question_id = question_id_span.get_text(strip=True)
                        question_text = question_text_span.get_text(strip=True)
                        
                        # Extract options from table rows
                        option_rows = question_div.find_all('tr', class_='proposal')
                        options = []
                        option_labels = []
                        
                        for i, row in enumerate(option_rows):
                            option_td = row.find('td', class_=lambda x: x != 'sign')  # Get the non-sign td
                            if option_td:
                                option_text = option_td.get_text(strip=True)
                                options.append(option_text)
                                # Use standard option labels (अ, ब, स, द)
                                hindi_labels = ['अ', 'ब', 'स', 'द', 'ई', 'फ']
                                option_labels.append(hindi_labels[i] if i < len(hindi_labels) else str(i + 1))
                        
                        if len(options) >= 2:
                            question_dict = {
                                "question_hindi": question_text,
                                "options_hindi": options,
                                "option_labels": option_labels,
                                "source": "bharatkosh",
                                "page_number": page_num,
                                "question_number": int(question_id) if question_id.isdigit() else None,
                                "subject": "इतिहास (History)",
                                "language": "hindi"
                            }
                            questions.append(question_dict)
                            
                except Exception as e:
                    print(f"   ⚠️ Error parsing question: {e}")
        
        # Strategy 2: Look for numbered questions (प्रश्न 1., प्रश्न 2., etc.)
        if not questions:
            question_pattern = re.compile(r'प्रश्न\s*(\d+)[.।]\s*(.+?)(?=प्रश्न\s*\d+|$)', re.DOTALL)
            matches = question_pattern.findall(text_content)
            print(f"📝 Strategy 2: Found {len(matches)} 'प्रश्न' patterns")
            
            for q_num, q_text in matches:
                options = self._extract_options_from_text(q_text)
                if options:
                    questions.append(self._create_question_dict(q_text, options, page_num, q_num))
        
        # Strategy 3: Look for question numbers (1., 2., 3., etc.)
        if not questions:
            number_pattern = re.compile(r'(\d+)[.):]\s*(.+?)(?=\d+[.):])(?=.*?[अआइईउऊऋएऐओऔ]\))', re.DOTALL)
            matches = number_pattern.findall(text_content)
            print(f"📝 Strategy 3: Found {len(matches)} numbered patterns")
            
            for q_num, q_text in matches[:10]:  # Limit to first 10 to avoid false positives
                options = self._extract_options_from_text(q_text)
                if len(options) >= 2:
                    questions.append(self._create_question_dict(q_text, options, page_num, q_num))
        
        # Strategy 4: Look for table-based questions
        if not questions:
            tables = soup.find_all('table')
            print(f"📝 Strategy 4: Found {len(tables)} tables")
            
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        question_text = cells[0].get_text(strip=True)
                        if len(question_text) > 20:
                            options_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                            options = self._extract_options_from_text(options_text)
                            
                            if options:
                                questions.append(self._create_question_dict(question_text, options, page_num))
        
        # Strategy 5: Look for any Hindi text with multiple choice options
        if not questions:
            # Find all potential option patterns
            option_sections = re.findall(r'([^।.]*?[अआइईउऊऋएऐओऔ]\).*?[अआइईउऊऋएऐओऔ]\).*?[अआइईउऊऋएऐओऔ]\).*?[अआइईउऊऋएऐओऔ]\))', text_content, re.DOTALL)
            print(f"📝 Strategy 5: Found {len(option_sections)} potential MCQ sections")
            
            for i, section in enumerate(option_sections[:5]):  # Limit to first 5
                lines = section.split('\n')
                question_lines = []
                option_lines = []
                
                for line in lines:
                    line = line.strip()
                    if re.match(r'[अआइईउऊऋएऐओऔ]\)', line):
                        option_lines.append(line)
                    elif line and len(line) > 10:
                        question_lines.append(line)
                
                if len(option_lines) >= 3 and question_lines:
                    question_text = ' '.join(question_lines)
                    questions.append(self._create_question_dict(question_text, option_lines, page_num, i + 1))
        
        # Strategy 6: Look for any pattern with parentheses and Hindi text
        if not questions:
            # More aggressive pattern matching
            sections = text_content.split('\n')
            current_question = []
            current_options = []
            
            for line in sections:
                line = line.strip()
                if not line:
                    continue
                
                # Check if line looks like an option
                if re.match(r'\([अबसदaबcdABCD123]\)', line) or re.match(r'[अबसदaबcd123][.):]', line):
                    current_options.append(line)
                elif len(current_options) >= 2:  # We have enough options, save previous question
                    if current_question:
                        question_text = ' '.join(current_question)
                        if len(question_text) > 15:
                            questions.append(self._create_question_dict(question_text, current_options, page_num))
                    current_question = [line] if line else []
                    current_options = []
                else:
                    if line and len(line) > 5:
                        current_question.append(line)
            
            # Handle last question
            if current_question and len(current_options) >= 2:
                question_text = ' '.join(current_question)
                if len(question_text) > 15:
                    questions.append(self._create_question_dict(question_text, current_options, page_num))
        
        print(f"📝 Total extracted: {len(questions)} questions from page {page_num}")
        return questions
    
    def _extract_options_from_text(self, text: str) -> List[str]:
        """Extract multiple choice options from text"""
        # Multiple option patterns to try
        patterns = [
            r'\(([अबसदabcd])\)\s*([^\n\(]+)',
            r'([अबसदabcd])[.):]\s*([^\n]+)',
            r'\(([ABCD123])\)\s*([^\n\(]+)',
            r'([ABCD123])[.):]\s*([^\n]+)',
        ]
        
        for pattern in patterns:
            options = re.findall(pattern, text)
            if len(options) >= 2:
                return [f"({opt[0]}) {opt[1].strip()}" for opt in options]
        
        return []
    
    def _create_question_dict(self, question_text: str, options: List[str], page_num: int, question_num=None) -> Dict[str, Any]:
        """Create standardized question dictionary"""
        # Clean up the question text
        question_text = re.sub(r'^\d+[.):]\s*', '', question_text.strip())
        question_text = question_text.replace('\n', ' ').strip()
        
        # Extract option labels and text
        option_labels = []
        option_texts = []
        
        for opt in options:
            match = re.match(r'\(?([अबसदabcdABCD123])\)?[.):]?\s*(.+)', opt.strip())
            if match:
                option_labels.append(match.group(1))
                option_texts.append(match.group(2).strip())
            else:
                option_labels.append(str(len(option_labels) + 1))
                option_texts.append(opt.strip())
        
        return {
            "question_hindi": question_text,
            "options_hindi": option_texts,
            "option_labels": option_labels,
            "source": "bharatkosh",
            "page_number": page_num,
            "question_number": int(question_num) if question_num and str(question_num).isdigit() else None,
            "subject": "इतिहास (History)",
            "language": "hindi"
        }
    
    async def translate_and_get_answer(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Translate question to English and get AI answer with explanation"""
        
        prompt_template = """You are an expert in Indian history and competitive exams like UPSC.

Given the following multiple-choice question in Hindi, please:
1. Translate the question and all options to English
2. Identify the correct answer
3. Provide a detailed explanation in both English and Hindi

Hindi Question:
{question_hindi}

Options:
{options_str}

Please respond in the following JSON format:
{{
    "question_english": "translated question",
    "options_english": ["option 1", "option 2", "option 3", "option 4"],
    "correct_answer": "a/b/c/d",
    "explanation_english": "detailed explanation",
    "explanation_hindi": "विस्तृत व्याख्या",
    "topic": "specific history topic",
    "difficulty": "easy/medium/hard",
    "key_facts": ["fact 1", "fact 2"]
}}
"""
        
        options_str = "\n".join([
            f"({label}) {option}" 
            for label, option in zip(
                question.get("option_labels", ["अ", "ब", "स", "द"]),
                question.get("options_hindi", [])
            )
        ])
        
        prompt = prompt_template.format(
            question_hindi=question.get("question_hindi", ""),
            options_str=options_str
        )
        
        try:
            response = await self._call_ai_with_retry(prompt)
            result = json.loads(response)
            
            enriched_question = {
                **question,
                **result,
                "ai_processed": True,
                "processed_at": datetime.now().isoformat()
            }
            
            return enriched_question
            
        except Exception as e:
            print(f"⚠️ Error processing question with AI: {e}")
            return {
                **question,
                "ai_processed": False,
                "error": str(e)
            }
    
    async def _call_ai_with_retry(self, prompt: str, max_retries: int = 3) -> str:
        """Call AI with retry logic for rate limits"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                response = await self.llm.ainvoke(prompt)
                return response.content
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                if '429' in error_str or 'rate limit' in error_str:
                    wait_time = 60 * (attempt + 1)
                    print(f"⏳ Rate limit hit. Waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    wait_time = 2 ** attempt
                    print(f"⚠️ AI call failed (attempt {attempt + 1}): {e}")
                    await asyncio.sleep(wait_time)
        
        raise last_error
    
    async def process_page(self, page_num: int) -> Tuple[int, int]:
        """Process a single page: fetch, extract, enrich, and save"""
        print(f"\n{'='*60}")
        print(f"📄 Processing Page {page_num}/{self.end_page}")
        print(f"{'='*60}")
        
        # Check cache first
        cache_file = os.path.join(self.cache_dir, f"page_{page_num}.json")
        if os.path.exists(cache_file):
            print(f"📦 Loading from cache: {cache_file}")
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    questions = cached_data.get("questions", [])
                    if questions:
                        self._save_to_database(questions, page_num)
                        return len(questions), len([q for q in questions if q.get("ai_processed")])
            except Exception as e:
                print(f"⚠️ Cache read failed: {e}")
        
        # Fetch page
        html_content = self.fetch_page(page_num)
        if not html_content:
            self.stats["errors"] += 1
            return 0, 0
        
        # Save HTML for debugging if no questions found on first few pages
        if page_num <= 5:
            debug_file = os.path.join(self.cache_dir, f"debug_page_{page_num}.html")
            try:
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                print(f"🔍 Saved HTML for debugging: {debug_file}")
            except Exception as e:
                print(f"⚠️ Debug save failed: {e}")
        
        # Extract questions
        questions = self.extract_questions_from_html(html_content, page_num)
        print(f"📝 Extracted {len(questions)} questions from page {page_num}")
        
        if not questions:
            # If no questions found, save the raw HTML content info for debugging
            soup = BeautifulSoup(html_content, 'html.parser')
            text_content = soup.get_text()
            print(f"⚠️ No questions extracted. Page info:")
            print(f"   - HTML length: {len(html_content)} chars")
            print(f"   - Text length: {len(text_content)} chars")
            print(f"   - Contains 'प्रश्न': {'प्रश्न' in text_content}")
            print(f"   - Contains '(अ)': {'(अ)' in text_content}")
            print(f"   - Contains 'अ)': {'अ)' in text_content}")
            return 0, 0
        
        # Process each question with AI
        enriched_questions = []
        for i, question in enumerate(questions, 1):
            print(f"🤖 Processing question {i}/{len(questions)} with AI...")
            enriched = await self.translate_and_get_answer(question)
            enriched_questions.append(enriched)
            await asyncio.sleep(1)
        
        # Cache results
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "page_number": page_num,
                    "timestamp": datetime.now().isoformat(),
                    "questions": enriched_questions
                }, f, indent=2, ensure_ascii=False)
            print(f"💾 Cached to: {cache_file}")
        except Exception as e:
            print(f"⚠️ Cache write failed: {e}")
        
        # Save to database
        self._save_to_database(enriched_questions, page_num)
        
        questions_with_ai = len([q for q in enriched_questions if q.get("ai_processed")])
        return len(enriched_questions), questions_with_ai
    
    def _save_to_database(self, questions: List[Dict[str, Any]], page_num: int):
        """Save questions to database"""
        if not questions:
            return
        
        exam_info = {
            "exam_name": "BharatKosh History",
            "exam_year": "General",
            "paper_name": f"History General Knowledge Pages {self.start_page}-{self.end_page}",
            "subject": "History",
            "source": "bharatdiscovery.org",
            "language": "Hindi + English"
        }
        
        try:
            question_ids = self.db.add_questions_by_exam(questions, exam_info)
            print(f"💾 Saved {len(question_ids)} questions to database")
        except Exception as e:
            print(f"❌ Database save failed: {e}")
    
    async def run(self):
        """Main scraping loop"""
        print("\n" + "="*60)
        print("🚀 BharatKosh History Scraper Started (HackClub AI Proxy)")
        print("="*60)
        print(f"📊 Pages: {self.start_page} to {self.end_page}")
        print(f"📁 Output: {self.output_dir}")
        print(f"⏱️ Delay between pages: {self.delay_between_requests}s")
        print("="*60 + "\n")
        
        self.stats["start_time"] = datetime.now()
        
        for page_num in range(self.start_page, self.end_page + 1):
            try:
                questions_count, ai_count = await self.process_page(page_num)
                
                self.stats["pages_processed"] += 1
                self.stats["questions_extracted"] += questions_count
                self.stats["questions_with_answers"] += ai_count
                
                print(f"\n📊 Progress: {self.stats['pages_processed']}/{self.end_page - self.start_page + 1} pages")
                print(f"   Questions: {self.stats['questions_extracted']} total, {self.stats['questions_with_answers']} with AI answers")
                
                if page_num < self.end_page:
                    delay = self.delay_between_requests + random.uniform(0, 1)
                    print(f"⏳ Waiting {delay:.1f}s before next page...")
                    await asyncio.sleep(delay)
                
            except Exception as e:
                print(f"❌ Error processing page {page_num}: {e}")
                self.stats["errors"] += 1
                await asyncio.sleep(5)
        
        self.stats["end_time"] = datetime.now()
        self._print_final_stats()
    
    def _print_final_stats(self):
        """Print final statistics"""
        duration = (self.stats["end_time"] - self.stats["start_time"]).total_seconds()
        
        print("\n" + "="*60)
        print("🎉 Scraping Complete!")
        print("="*60)
        print(f"⏱️ Duration: {duration/60:.1f} minutes")
        print(f"📄 Pages Processed: {self.stats['pages_processed']}")
        print(f"📝 Questions Extracted: {self.stats['questions_extracted']}")
        print(f"🤖 Questions with AI Answers: {self.stats['questions_with_answers']}")
        print(f"❌ Errors: {self.stats['errors']}")
        print(f"⚡ Avg time per page: {duration/max(self.stats['pages_processed'], 1):.1f}s")
        print("="*60 + "\n")


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape BharatKosh history questions using HackClub AI proxy')
    parser.add_argument('--start', type=int, default=1, help='Start page number')
    parser.add_argument('--end', type=int, default=566, help='End page number')
    parser.add_argument('--output', type=str, default='server-py/data', help='Output directory')
    parser.add_argument('--delay', type=float, default=2.0, help='Delay between requests (seconds)')
    parser.add_argument('--test', action='store_true', help='Test mode (only first 3 pages)')
    parser.add_argument('--no-auto-cookie', action='store_true', help='Disable automatic cookie generation (use manual cookies)')
    
    args = parser.parse_args()
    
    if args.test:
        args.start = 1
        args.end = 3
        print("🧪 Running in TEST mode (pages 1-3)")
    
    auto_cookie_mode = not args.no_auto_cookie
    
    scraper = BharatkoshScraper(
        start_page=args.start,
        end_page=args.end,
        output_dir=args.output,
        delay_between_requests=args.delay,
        auto_cookie=auto_cookie_mode
    )
    
    await scraper.run()


if __name__ == "__main__":
    asyncio.run(main())