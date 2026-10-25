"""
BharatKosh Scraper - Advanced Playwright with Stealth & Human Behavior
Uses playwright-extra stealth plugin + human simulation for AWS Cloudflare bypass
Install: pip install playwright-stealth
"""

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
from playwright.async_api import async_playwright, Browser, Page
import sys

# Try to import stealth plugin
try:
    from playwright_stealth import stealth_async
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False
    print("⚠️ playwright-stealth not installed. Run: pip install playwright-stealth")
    print("   This will significantly improve Cloudflare bypass success rate")

# Add server-py/src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'server-py', 'src'))
from database_improved import QuestionDatabase

load_dotenv()


class BharatkoshScraperPlaywright:
    """AWS-hardened scraper using Playwright for Cloudflare bypass"""
    
    BASE_URL = "https://bharatdiscovery.org/india/%E0%A4%87%E0%A4%A4%E0%A4%BF%E0%A4%B9%E0%A4%BE%E0%A4%B8_%E0%A4%B8%E0%A4%BE%E0%A4%AE%E0%A4%BE%E0%A4%A8%E0%A5%8D%E0%A4%AF_%E0%A4%9C%E0%A5%8D%E0%A4%9E%E0%A4%BE%E0%A4%A8_{}"
    
    def __init__(self, 
                 start_page: int = 1, 
                 end_page: int = 566,
                 output_dir: str = "server-py/data",
                 delay_between_requests: float = 5.0,
                 proxy: Optional[str] = None):
        
        self.start_page = start_page
        self.end_page = end_page
        self.output_dir = output_dir
        self.delay_between_requests = delay_between_requests
        self.proxy = proxy
        
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
        
        # Progress tracking
        self.progress_file = os.path.join(self.cache_dir, "scraper_progress.json")
        self.skip_on_error = False
        self.failed_pages = []
        self.test_mode = False
        
        # Browser instance (initialized in run)
        self.browser: Optional[Browser] = None
        self.context = None
        self.playwright = None
    
    async def init_browser(self):
        """Initialize Playwright browser with advanced anti-detection"""
        print("🌐 Initializing Playwright browser (Advanced Stealth Mode)...")
        
        self.playwright = await async_playwright().start()
        
        # Launch Chromium with maximum stealth
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080',
                '--start-maximized',
            ]
        )
        
        # Prepare context options
        context_options = {
            'viewport': {'width': 1920, 'height': 1080},
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'locale': 'hi-IN',
            'timezone_id': 'Asia/Kolkata',
            'permissions': ['geolocation'],
            'geolocation': {'latitude': 28.6139, 'longitude': 77.2090},  # Delhi coordinates
            'extra_http_headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'DNT': '1',
            }
        }
        
        # Add proxy if provided
        if self.proxy:
            # Parse proxy URL for credentials
            if '@' in self.proxy:
                auth, server = self.proxy.split('@')
                username, password = auth.replace('http://', '').replace('https://', '').split(':')
                context_options['proxy'] = {
                    'server': f"http://{server}",
                    'username': username,
                    'password': password
                }
            else:
                context_options['proxy'] = {'server': self.proxy}
            print(f"🌐 Using proxy: {self.proxy.split('@')[-1] if '@' in self.proxy else self.proxy}")
        
        # Create context
        self.context = await self.browser.new_context(**context_options)
        
        # Add advanced anti-detection scripts
        await self.context.add_init_script("""
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Mock plugins with realistic values
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
                    {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''},
                    {name: 'Native Client', filename: 'internal-nacl-plugin', description: ''}
                ]
            });
            
            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['hi-IN', 'hi', 'en-US', 'en']
            });
            
            // Chrome runtime
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            
            // Permissions API
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Randomize canvas fingerprint
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                const canvas = this;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    // Add minimal noise to randomize fingerprint
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i] += Math.floor(Math.random() * 3) - 1;
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
                return originalToDataURL.call(this, type);
            };
            
            // Randomize WebGL fingerprint
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
                }
                return getParameter.call(this, parameter);
            };
            
            // Add battery API
            navigator.getBattery = () => Promise.resolve({
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 1
            });
        """)
        
        print("✅ Browser initialized with advanced stealth")
    
    def _random_delay(self, min_ms: int = 500, max_ms: int = 2000) -> int:
        """Generate random delay in milliseconds"""
        return random.randint(min_ms, max_ms)
    
    async def _human_scroll(self, page: Page):
        """Simulate human-like scrolling behavior"""
        try:
            scroll_height = await page.evaluate('() => document.body.scrollHeight')
            viewport_height = await page.evaluate('() => window.innerHeight')
            
            # Scroll in random chunks
            current_position = 0
            while current_position < scroll_height - viewport_height:
                scroll_amount = random.randint(200, 600)
                current_position = min(current_position + scroll_amount, scroll_height)
                
                await page.evaluate(f'() => window.scrollTo(0, {current_position})')
                await asyncio.sleep(self._random_delay(300, 800) / 1000)
                
                # Random chance to scroll back up a bit
                if random.random() < 0.15:
                    back_scroll = random.randint(50, 150)
                    current_position = max(0, current_position - back_scroll)
                    await page.evaluate(f'() => window.scrollTo(0, {current_position})')
                    await asyncio.sleep(self._random_delay(200, 500) / 1000)
        except Exception as e:
            print(f"   ⚠️ Scroll simulation error: {e}")
    
    async def _human_mouse_movement(self, page: Page):
        """Simulate random mouse movements"""
        try:
            for _ in range(random.randint(2, 5)):
                x = random.randint(100, 1800)
                y = random.randint(100, 900)
                steps = random.randint(10, 30)
                
                await page.mouse.move(x, y, steps=steps)
                await asyncio.sleep(self._random_delay(100, 400) / 1000)
        except Exception as e:
            print(f"   ⚠️ Mouse movement error: {e}")
    
    async def _wait_for_cloudflare(self, page: Page, timeout: int = 30000) -> bool:
        """Wait for Cloudflare challenge to complete"""
        try:
            # Check if we're on a Cloudflare challenge page
            is_challenge = await page.evaluate('''
                () => {
                    const title = document.title;
                    const body = document.body.innerText;
                    return title.includes('Just a moment') || 
                           body.includes('Checking your browser') ||
                           body.includes('Verify you are human') ||
                           document.querySelector('#challenge-form') !== null;
                }
            ''')
            
            if is_challenge:
                print(f"   ⚙️ Cloudflare challenge detected, waiting for resolution...")
                
                # Wait for challenge to disappear
                await page.wait_for_function(
                    '''
                    () => {
                        const title = document.title;
                        const body = document.body.innerText;
                        return !title.includes('Just a moment') && 
                               !body.includes('Checking your browser');
                    }
                    ''',
                    timeout=timeout
                )
                
                print(f"   ✅ Cloudflare challenge passed")
                await asyncio.sleep(self._random_delay(1000, 3000) / 1000)
                return True
            
            return False
            
        except Exception as e:
            print(f"   ⚠️ Cloudflare challenge timeout or error: {e}")
            return False
    
    async def fetch_page(self, page_num: int, max_retries: int = 3) -> Optional[str]:
        """Fetch page with advanced stealth and human behavior simulation"""
        url = self.BASE_URL.format(page_num)
        
        for attempt in range(max_retries):
            page = None
            try:
                if attempt > 0:
                    wait_time = (attempt * 3) + random.uniform(2, 5)
                    print(f"⏳ Waiting {wait_time:.1f}s before retry {attempt + 1}/{max_retries}...")
                    await asyncio.sleep(wait_time)
                
                print(f"🚀 Fetching page {page_num} with advanced stealth (attempt {attempt + 1}/{max_retries})...")
                
                # Create new page
                page = await self.context.new_page()
                
                # Apply playwright-stealth if available
                if HAS_STEALTH:
                    await stealth_async(page)
                
                # Set realistic timeout
                page.set_default_timeout(60000)
                
                # Navigate to URL
                response = await page.goto(url, wait_until='domcontentloaded')
                
                # Simulate human behavior
                await asyncio.sleep(self._random_delay(1000, 2500) / 1000)
                await self._human_mouse_movement(page)
                await asyncio.sleep(self._random_delay(500, 1500) / 1000)
                
                # Wait for Cloudflare challenge if present
                await self._wait_for_cloudflare(page, timeout=30000)
                
                # Scroll like a human
                await self._human_scroll(page)
                
                # Wait a bit more
                await asyncio.sleep(self._random_delay(1000, 2000) / 1000)
                
                # Get content
                content = await page.content()
                
                # Check if we got valid content
                if len(content) > 10000 and not any(x in content for x in ["Just a moment", "Checking your browser"]):
                    print(f"✅ Successfully fetched page {page_num} ({len(content)} chars)")
                    await page.close()
                    return content
                else:
                    print(f"⚠️ Got incomplete or blocked page ({len(content)} chars)")
                    if attempt < max_retries - 1:
                        await page.close()
                        continue
                    
            except Exception as e:
                print(f"❌ Error fetching page {page_num} on attempt {attempt + 1}: {type(e).__name__}: {e}")
                if attempt < max_retries - 1:
                    if page:
                        try:
                            await page.close()
                        except:
                            pass
                    continue
            finally:
                if page and not page.is_closed():
                    try:
                        await page.close()
                    except:
                        pass
        
        return None
    
    async def cleanup_browser(self):
        """Clean up browser resources"""
        try:
            if self.context:
                await self.context.close()
        except:
            pass
        
        try:
            if self.browser:
                await self.browser.close()
        except:
            pass
        
        try:
            if self.playwright:
                await self.playwright.stop()
        except:
            pass
    
    def load_progress(self) -> int:
        """Load last successful page from progress file"""
        try:
            if os.path.exists(self.progress_file):
                with open(self.progress_file, 'r') as f:
                    progress = json.load(f)
                    last_page = progress.get('last_successful_page', self.start_page - 1)
                    self.failed_pages = progress.get('failed_pages', [])
                    print(f"📂 Resuming from page {last_page + 1}")
                    if self.failed_pages:
                        print(f"⚠️ Previously failed pages: {self.failed_pages}")
                    return last_page + 1
        except Exception as e:
            print(f"⚠️ Could not load progress: {e}")
        return self.start_page
    
    def save_progress(self, page_num: int):
        """Save current progress"""
        try:
            serializable_stats = {}
            for key, value in self.stats.items():
                if isinstance(value, datetime):
                    serializable_stats[key] = value.isoformat()
                else:
                    serializable_stats[key] = value
            
            progress = {
                'last_successful_page': page_num,
                'failed_pages': self.failed_pages,
                'timestamp': datetime.now().isoformat(),
                'stats': serializable_stats
            }
            with open(self.progress_file, 'w') as f:
                json.dump(progress, f, indent=2)
        except Exception as e:
            print(f"⚠️ Could not save progress: {e}")
    
    def extract_questions_from_html(self, html_content: str, page_num: int) -> List[Dict[str, Any]]:
        """Extract questions and options from HTML content"""
        soup = BeautifulSoup(html_content, 'html.parser')
        questions = []
        
        # Strategy 1: MediaWiki Quiz extension
        quiz_divs = soup.find_all('div', class_='quiz')
        
        for quiz_div in quiz_divs:
            question_divs = quiz_div.find_all('div', class_='question')
            
            for question_div in question_divs:
                try:
                    question_id_span = question_div.find('span', class_='questionId')
                    question_text_span = question_div.find('span', class_='questionText')
                    
                    if question_id_span and question_text_span:
                        question_id = question_id_span.get_text(strip=True)
                        question_text = question_text_span.get_text(strip=True)
                        
                        option_rows = question_div.find_all('tr', class_='proposal')
                        options = []
                        option_labels = []
                        
                        for i, row in enumerate(option_rows):
                            option_td = row.find('td', class_=lambda x: x != 'sign')
                            if option_td:
                                option_text = option_td.get_text(strip=True)
                                options.append(option_text)
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
        
        print(f"📝 Extracted {len(questions)} questions from page {page_num}")
        return questions
    
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
        
        # Fetch page with Playwright
        html_content = await self.fetch_page(page_num)
        if not html_content:
            self.stats["errors"] += 1
            return 0, 0
        
        # Extract questions
        questions = self.extract_questions_from_html(html_content, page_num)
        
        if not questions:
            print(f"⚠️ No questions extracted from page {page_num}")
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
        print("🚀 BharatKosh Scraper (Playwright - AWS Hardened)")
        print("="*60)
        print(f"📊 Pages: {self.start_page} to {self.end_page}")
        print(f"📁 Output: {self.output_dir}")
        print(f"⏱️ Delay between pages: {self.delay_between_requests}s")
        print(f"🔄 Skip on error: {self.skip_on_error}")
        print("="*60 + "\n")
        
        # Load progress (skip in test mode)
        if not self.test_mode:
            resume_from = self.load_progress()
            if resume_from > self.start_page:
                self.start_page = resume_from
        else:
            print("🧪 Test mode: Ignoring resume progress")
        
        self.stats["start_time"] = datetime.now()
        
        # Initialize browser
        await self.init_browser()
        
        try:
            for page_num in range(self.start_page, self.end_page + 1):
                try:
                    questions_count, ai_count = await self.process_page(page_num)
                    
                    self.stats["pages_processed"] += 1
                    self.stats["questions_extracted"] += questions_count
                    self.stats["questions_with_answers"] += ai_count
                    
                    # Save progress
                    self.save_progress(page_num)
                    
                    print(f"\n📊 Progress: {self.stats['pages_processed']}/{self.end_page - self.start_page + 1} pages")
                    print(f"   Questions: {self.stats['questions_extracted']} total, {self.stats['questions_with_answers']} with AI answers")
                    
                    if page_num < self.end_page:
                        delay = self.delay_between_requests + random.uniform(1, 3)
                        print(f"⏳ Waiting {delay:.1f}s before next page...")
                        await asyncio.sleep(delay)
                    
                except Exception as e:
                    print(f"❌ Error processing page {page_num}: {e}")
                    self.stats["errors"] += 1
                    self.failed_pages.append(page_num)
                    
                    if self.skip_on_error:
                        print(f"⏭️ Skipping page {page_num} and continuing...")
                        self.save_progress(page_num)
                        await asyncio.sleep(5)
                    else:
                        print(f"⏸️ Stopping at page {page_num}.")
                        break
        
        finally:
            # Clean up browser
            await self.cleanup_browser()
        
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
        print("="*60 + "\n")


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape BharatKosh with Playwright (AWS-hardened)')
    parser.add_argument('--start', type=int, default=1, help='Start page number')
    parser.add_argument('--end', type=int, default=566, help='End page number')
    parser.add_argument('--output', type=str, default='server-py/data', help='Output directory')
    parser.add_argument('--delay', type=float, default=8.0, help='Delay between requests (seconds)')
    parser.add_argument('--skip-on-error', action='store_true', help='Skip failed pages and continue')
    parser.add_argument('--test', action='store_true', help='Test mode (pages 1-3)')
    parser.add_argument('--proxy', type=str, help='Proxy URL (format: http://user:pass@host:port or http://host:port)')
    
    args = parser.parse_args()
    
    if args.test:
        args.start = 1
        args.end = 3
        print("🧪 Running in TEST mode (pages 1-3)")
    
    scraper = BharatkoshScraperPlaywright(
        start_page=args.start,
        end_page=args.end,
        output_dir=args.output,
        delay_between_requests=args.delay,
        proxy=args.proxy
    )
    
    scraper.skip_on_error = args.skip_on_error
    scraper.test_mode = args.test
    
    await scraper.run()


if __name__ == "__main__":
    asyncio.run(main())
