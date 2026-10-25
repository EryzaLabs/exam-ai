#!/usr/bin/env python3
"""
Quick test rate limit detection logic
"""
import sys
import os
sys.path.append('src')

from vlm_service import is_rate_limit_error

def test_rate_limit_detection():
    """Test rate limit error detection logic"""
    print("🧪 Testing rate limit detection logic...")
    
    # Test cases
    test_cases = [
        # Rate limit cases (should return True)
        ("HTTP Error 429: Too Many Requests", True),
        ("Rate limit exceeded for requests", True),
        ("rate_limit_exceeded", True),
        ("Request throttled due to high usage", True),
        ("quota exceeded", True),
        ("Too many requests", True),
        
        # Non-rate limit cases (should return False)  
        ("Connection timeout", False),
        ("Invalid API key", False),
        ("Internal server error 500", False),
        ("Network unreachable", False),
        ("JSON decode error", False),
    ]
    
    print("\n🔍 Testing rate limit detection:")
    for error_msg, expected in test_cases:
        # Create a mock exception
        exception = Exception(error_msg)
        result = is_rate_limit_error(exception)
        status = "✅" if result == expected else "❌"
        print(f"{status} '{error_msg}' -> {result} (expected {expected})")
    
    print("\n✅ Rate limit detection test completed")

if __name__ == "__main__":
    test_rate_limit_detection()