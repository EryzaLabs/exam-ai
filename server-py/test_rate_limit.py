#!/usr/bin/env python3
"""
Test rate limit handling for VLM service
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the src directory to the path so we can import our modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

load_dotenv()

from vlm_service import VLMService

async def test_rate_limit_handling():
    """Test rate limit handling with simulated rate limit errors"""
    print("🧪 Testing rate limit handling...")
    
    # Initialize VLM service
    vlm = VLMService()
    
    # Create a dummy base64 image 
    test_image = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"
    
    # Test normal timeout error first
    print("\n1️⃣ Testing normal timeout error...")
    original_method = vlm._extract_text_sync
    attempt_count = 0
    
    def mock_timeout_error(self, image_base64, page_number):
        nonlocal attempt_count
        attempt_count += 1
        print(f"🎭 Mock timeout attempt #{attempt_count}")
        import requests
        raise requests.exceptions.ReadTimeout("Read timed out. (read timeout=120)")
    
    vlm._extract_text_sync = lambda img, page: mock_timeout_error(vlm, img, page)
    
    try:
        result = await vlm.extract_text_async(test_image, 100)
    except Exception as e:
        print(f"✅ Expected timeout failure: {type(e).__name__}")
    
    print(f"🔢 Timeout attempts: {attempt_count}")
    
    # Test rate limit error
    print("\n2️⃣ Testing rate limit error handling...")
    attempt_count = 0
    
    def mock_rate_limit_error(self, image_base64, page_number):
        nonlocal attempt_count
        attempt_count += 1
        print(f"🎭 Mock rate limit attempt #{attempt_count}")
        import requests
        # Simulate 429 Too Many Requests
        response = requests.Response()
        response.status_code = 429
        response.headers['Retry-After'] = '60'
        raise requests.exceptions.HTTPError("429 Too Many Requests: Rate limit exceeded", response=response)
    
    vlm._extract_text_sync = lambda img, page: mock_rate_limit_error(vlm, img, page)
    
    try:
        result = await vlm.extract_text_async(test_image, 200)
    except Exception as e:
        print(f"✅ Expected rate limit failure: {type(e).__name__}")
    
    print(f"🔢 Rate limit attempts: {attempt_count}")
    
    # Test mixed rate limit indicators
    print("\n3️⃣ Testing various rate limit error messages...")
    rate_limit_messages = [
        "Rate limit exceeded for requests",
        "HTTP Error 429: Too Many Requests", 
        "quota exceeded",
        "throttled due to high usage"
    ]
    
    for i, message in enumerate(rate_limit_messages):
        attempt_count = 0
        
        def mock_specific_rate_limit(self, image_base64, page_number):
            nonlocal attempt_count
            attempt_count += 1
            print(f"🎭 Testing message: '{message}' (attempt #{attempt_count})")
            if attempt_count == 1:  # Fail once then succeed
                raise Exception(message)
            else:
                return {
                    'page_number': page_number,
                    'extracted_text': f'Success after rate limit retry for message {i+1}',
                    'model_used': self.model,
                    'timestamp': 1767770000.0
                }
        
        vlm._extract_text_sync = lambda img, page: mock_specific_rate_limit(vlm, img, page)
        
        try:
            result = await vlm.extract_text_async(test_image, 300 + i)
            print(f"✅ Successfully recovered from rate limit: {result['extracted_text'][:50]}...")
        except Exception as e:
            print(f"❌ Failed to recover: {e}")
    
    # Restore original method
    vlm._extract_text_sync = original_method
    
    print("\n✅ Rate limit test completed")

if __name__ == "__main__":
    asyncio.run(test_rate_limit_handling())