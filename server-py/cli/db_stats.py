#!/usr/bin/env python3
"""
Database Statistics CLI Tool
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import QuestionDatabase

def main():
    try:
        db = QuestionDatabase()
        stats = db.get_stats()
        
        print("📊 Database Statistics")
        print("=" * 50)
        print(f"Total Questions: {stats['total_questions']}")
        print(f"Created: {stats['created_at']}")
        print(f"Last Updated: {stats['updated_at']}")
        
        print(f"\n📚 Categories:")
        for category, count in stats['categories'].items():
            print(f"  {category}: {count}")
        
        print(f"\n📄 Sources:")
        for source, count in stats['sources'].items():
            print(f"  {source}: {count}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()