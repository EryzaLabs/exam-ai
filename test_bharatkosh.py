#!/usr/bin/env python3
"""
Simple test script for Bharatkosh scraper
Tests basic functionality on a few pages
"""

import asyncio
import sys
import os

# Add server-py src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'server-py', 'src'))

from bharatkosh_scraper import BharatkoshScraper, QuestionProcessor

async def test_scraper():
    """Test the scraper on a few pages"""
    print("🧪 Testing Bharatkosh Scraper...")
    
    # Test scraper
    scraper = BharatkoshScraper()
    
    # Test single page
    print("\n1. Testing page fetch...")
    html_content = scraper.get_page_content(1)
    if html_content:
        print(f"✅ Successfully fetched page 1 ({len(html_content)} characters)")
        print(f"📄 First 200 characters: {html_content[:200]}...")
        
        # Test question extraction
        print("\n2. Testing question extraction...")
        questions = scraper.extract_questions_from_html(html_content, 1)
        print(f"✅ Extracted {len(questions)} questions from page 1")
        
        if questions:
            print("\n📝 Sample question:")
            q = questions[0]
            print(f"   Question: {q.question_text[:100]}...")
            print(f"   Options: {len(q.options)} options")
            for i, option in enumerate(q.options[:3]):  # Show first 3 options
                print(f"     {i+1}. {option[:50]}...")
        
        # Test AI processing (optional - requires API keys)
        if os.getenv('TRANSLATOR_API_KEY'):
            print("\n3. Testing AI processing...")
            try:
                processor = QuestionProcessor()
                if questions:
                    processed = await processor.process_question(questions[0])
                    if processed:
                        print("✅ Successfully processed question with AI")
                        print(f"   English: {processed.question_text_english[:100]}...")
                        print(f"   Answer: {processed.correct_answer}")
                    else:
                        print("❌ Failed to process question with AI")
            except Exception as e:
                print(f"⚠️ AI processing test failed (expected if API keys not configured): {e}")
        else:
            print("\n3. Skipping AI processing test (no API keys configured)")
    else:
        print("❌ Failed to fetch page 1")
    
    print("\n🎉 Test complete!")

if __name__ == "__main__":
    asyncio.run(test_scraper())