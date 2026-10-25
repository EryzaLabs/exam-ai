import os
import time
import base64
import json
import asyncio
import random
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv
from functools import wraps
from PIL import Image
from io import BytesIO

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
                            print(f"🚫 Rate limit detected on attempt {attempt + 1}: {str(e)[:100]}...")
                            print(f"⏳ Waiting {delay}s before retrying (rate limit backoff)...")
                        else:
                            # Normal exponential backoff for other errors
                            delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
                            print(f"⚠️ VLM attempt {attempt + 1} failed: {str(e)[:100]}...")
                            print(f"⏳ Retrying in {delay:.1f}s...")
                        
                        await asyncio.sleep(delay)
                    else:
                        if is_rate_limit_error(e):
                            print(f"🚫 Rate limit exceeded after {max_retries} attempts")
                        else:
                            print(f"❌ VLM failed after {max_retries} attempts")
            
            raise last_exception
        return wrapper
    return decorator

class VLMService:
    """Vision-Language Model service using Hack Club AI proxy"""
    
    def __init__(self):
        self.provider = os.getenv('VLM_PROVIDER', 'qwen')
        self.model = os.getenv('VLM_MODEL', 'qwen/qwen3-vl-235b-a22b-instruct')
        self.api_key = os.getenv('VLM_API_KEY')
        self.base_url = os.getenv('VLM_BASE_URL', 'https://ai.hackclub.com/proxy/v1')
        
        if not self.api_key:
            raise ValueError("VLM_API_KEY environment variable is required")
            
        # Create session with connection pooling for better performance
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        })
        
        # Progressive timeout strategy (start fast, increase on retry)
        self.base_timeouts = [300, 450, 600, 900]  # Progressive timeouts for each attempt
    
    def _compress_image_if_needed(self, image_base64: str, max_size_kb: int = 800) -> str:
        """Compress image if it's too large to reduce timeout risk"""
        try:
            # Calculate current size
            current_size_kb = len(image_base64) * 3 / 4 / 1024  # Base64 overhead ~33%
            
            if current_size_kb <= max_size_kb:
                return image_base64
                
            print(f"🗜️ Compressing image ({current_size_kb:.0f}KB -> target: {max_size_kb}KB)...")
            
            # Decode base64 to image
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))
            
            # Calculate compression ratio needed
            target_ratio = max_size_kb / current_size_kb
            
            # Reduce quality and/or size
            if target_ratio < 0.5:
                # Significant reduction needed - resize image
                scale_factor = (target_ratio * 1.2) ** 0.5  # Square root for 2D scaling
                new_width = int(image.width * scale_factor)
                new_height = int(image.height * scale_factor)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                quality = 85
            else:
                # Moderate reduction - just adjust quality
                quality = max(60, int(target_ratio * 100))
            
            # Convert back to base64
            buffer = BytesIO()
            image.save(buffer, format='JPEG', quality=quality, optimize=True)
            compressed_data = buffer.getvalue()
            compressed_base64 = base64.b64encode(compressed_data).decode('utf-8')
            
            new_size_kb = len(compressed_base64) * 3 / 4 / 1024
            print(f"✅ Image compressed: {current_size_kb:.0f}KB -> {new_size_kb:.0f}KB")
            
            return compressed_base64
            
        except Exception as e:
            print(f"⚠️ Image compression failed, using original: {e}")
            return image_base64
    
    def _create_text_extraction_prompt(self) -> str:
        """Create prompt for simple text extraction from exam pages"""
        return """You are an expert at extracting text from exam papers and educational materials.

Extract ALL visible text from this image exactly as it appears. Include:

1. All text content in its original language and formatting
2. Headers, titles, instructions, questions, answers, options  
3. Page numbers, dates, exam names
4. Any mathematical formulas or special characters
5. Maintain the original structure and spacing as much as possible

CRITICAL FOR QUESTION COMPLETENESS:
- If you see a question like "Which of the following..." ensure you capture ALL numbered statements (1., 2., 3., etc.) that follow
- Always include the complete context that options refer to - never skip numbered lists, statements, or bullet points
- For multi-choice questions, capture both the question AND the numbered/lettered statements it references
- Include any preparatory text, context paragraphs, or setup that questions reference

IMPORTANT INSTRUCTIONS:
- Extract text exactly as written, including in Hindi, English, or any other language
- Preserve numbering, bullet points, and formatting structure
- Include ALL text - don't skip anything, especially numbered lists and context statements
- If text is unclear or partially visible, indicate with [UNCLEAR] 
- If mathematical formulas are present, describe them clearly
- Maintain the reading order (top to bottom, left to right)
- Pay special attention to numbered statements (1., 2., 3.) that questions reference

Return the response as plain text with clear structure. Do not format as JSON - just return the extracted text with clear line breaks and spacing to show the document structure."""

    async def extract_text_async(
        self, 
        image_base64: str, 
        page_number: int
    ) -> Dict[str, Any]:
        """Extract text from a single page image asynchronously with retry logic"""
        
        # Compress image first to reduce timeout risk
        compressed_image = self._compress_image_if_needed(image_base64)
        
        attempt_count = 0
        
        @async_retry_with_backoff(max_retries=4, base_delay=2.0, max_delay=30.0)
        async def _extract_with_retry():
            nonlocal attempt_count
            timeout = self.base_timeouts[min(attempt_count, len(self.base_timeouts) - 1)]
            attempt_count += 1
            
            return await asyncio.to_thread(
                self._extract_text_sync, 
                compressed_image, 
                page_number,
                timeout
            )
        
        try:
            return await _extract_with_retry()
        except Exception as e:
            print(f"💥 Final failure extracting text from page {page_number}: {e}")
            
            # Try one last time with heavily compressed image if original compression wasn't aggressive
            if len(compressed_image) == len(image_base64):  # No compression happened
                try:
                    print(f"🚨 Trying page {page_number} with aggressive compression...")
                    super_compressed = self._compress_image_if_needed(image_base64, max_size_kb=200)
                    if super_compressed != image_base64:
                        fallback_result = await asyncio.to_thread(
                            self._extract_text_sync, 
                            super_compressed, 
                            page_number,
                            60  # Short timeout for fallback
                        )
                        print(f"✅ Page {page_number} succeeded with aggressive compression!")
                        return fallback_result
                except Exception as fallback_e:
                    print(f"💥 Fallback also failed: {fallback_e}")
            
            return {
                'page_number': page_number,
                'extracted_text': '',
                'model_used': self.model,
                'timestamp': time.time(),
                'error': str(e)
            }
    
    def _extract_text_sync(
        self, 
        image_base64: str, 
        page_number: int,
        timeout: int = 120
    ) -> Dict[str, Any]:
        """Synchronous text extraction that can be called with retry logic"""
        prompt = self._create_text_extraction_prompt()
        
        payload = {
            'model': self.model,
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'text',
                            'text': prompt
                        },
                        {
                            'type': 'image_url',
                            'image_url': {
                                'url': f'data:image/jpeg;base64,{image_base64}'
                            }
                        }
                    ]
                }
            ],
            'max_tokens': 4000,
            'temperature': 0.1
        }
        
        image_size_kb = len(image_base64) * 3 / 4 / 1024
        print(f"📤 Extracting text from page {page_number}... (image: {image_size_kb:.0f}KB, timeout: {timeout}s)")
        
        response = self.session.post(
            f'{self.base_url}/chat/completions',
            json=payload,
            timeout=timeout
        )
        
        # Handle specific HTTP status codes
        if response.status_code == 401:
            raise Exception(f"Authentication failed. Check your API key.")
        elif response.status_code == 429:
            retry_after = response.headers.get('Retry-After', '60')
            raise Exception(f"Rate limit exceeded. Retry after {retry_after}s (HTTP 429)")
        elif response.status_code == 503:
            raise Exception(f"Service temporarily unavailable (HTTP 503). Model may be overloaded.")
        
        response.raise_for_status()
        result = response.json()
        
        # Extract the response content
        extracted_text = result['choices'][0]['message']['content']
        
        print(f"✅ Page {page_number} text extracted ({len(extracted_text)} chars)")
        return {
            'page_number': page_number,
            'extracted_text': extracted_text,
            'model_used': self.model,
            'timestamp': time.time()
        }
    
    def extract_text(
        self, 
        image_base64: str, 
        page_number: int
    ) -> Dict[str, Any]:
        """Legacy synchronous method - now delegates to sync implementation"""
        try:
            return self._extract_text_sync(image_base64, page_number)
        except requests.exceptions.RequestException as e:
            print(f"❌ Error extracting text from page {page_number}: {e}")
            return {
                'page_number': page_number,
                'extracted_text': '',
                'model_used': self.model,
                'timestamp': time.time(),
                'error': str(e)
            }
    
    async def extract_text_from_multiple_pages(
        self,
        pages: List[Dict[str, Any]],
        max_concurrent: int = 2
    ) -> List[Dict[str, Any]]:
        """Extract text from multiple pages with controlled concurrency"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def extract_with_semaphore(page_data):
            async with semaphore:
                return await self.extract_text_async(
                    page_data['imageBase64'],
                    page_data['pageNumber']
                )
        
        print(f"🔄 Extracting text from {len(pages)} pages with max {max_concurrent} concurrent requests...")
        
        tasks = [extract_with_semaphore(page) for page in pages]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        valid_results = []
        rate_limit_count = 0
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                if is_rate_limit_error(result):
                    rate_limit_count += 1
                    print(f"🚫 Page {pages[i]['pageNumber']} rate limited: {result}")
                else:
                    print(f"❌ Page {pages[i]['pageNumber']} failed: {result}")
                
                valid_results.append({
                    'page_number': pages[i]['pageNumber'],
                    'extracted_text': '',
                    'error': str(result)
                })
            else:
                valid_results.append(result)
        
        if rate_limit_count > 0:
            print(f"⚠️ Warning: {rate_limit_count} pages failed due to rate limiting. Consider reducing concurrency.")
        
        return valid_results