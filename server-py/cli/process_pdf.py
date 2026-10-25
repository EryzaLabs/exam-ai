#!/usr/bin/env python3
"""
PDF Processing CLI Tool
Process PDF files and extract questions using VLM
"""

import sys
import argparse
import asyncio
import os
from dotenv import load_dotenv

# Add parent directory to path to import src modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.pdf_processor import PDFProcessor

def parse_page_specification(page_spec: str) -> set:
    """Parse page specification like '1,3,5' or '1-5,8,10-12' into set of page numbers"""
    pages = set()
    
    for part in page_spec.split(','):
        part = part.strip()
        if '-' in part:
            # Handle range like '1-5'
            start, end = part.split('-', 1)
            try:
                start_num = int(start.strip())
                end_num = int(end.strip())
                if start_num > end_num:
                    raise ValueError(f"Invalid range '{part}': start > end")
                pages.update(range(start_num, end_num + 1))
            except ValueError as e:
                if "invalid literal" in str(e):
                    raise ValueError(f"Invalid number in range '{part}'")
                raise
        else:
            # Handle single page number
            try:
                page_num = int(part)
                if page_num < 1:
                    raise ValueError(f"Page numbers must be positive, got {page_num}")
                pages.add(page_num)
            except ValueError as e:
                if "invalid literal" in str(e):
                    raise ValueError(f"Invalid page number '{part}'")
                raise
    
    if not pages:
        raise ValueError("No valid pages specified")
        
    return pages

# Load environment variables
load_dotenv()

async def main():
    parser = argparse.ArgumentParser(description='Process PDF and extract questions using VLM')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--max-pages', type=int, help='Maximum pages to process (default: all)')
    parser.add_argument('--pages', help='Specific pages to process (e.g., "1,3,5" or "1-5,8,10-12")')
    parser.add_argument('--dpi', type=int, default=300, help='DPI for image conversion (default: 300)')
    parser.add_argument('--no-save', action='store_true', help='Don\'t save questions to database')
    parser.add_argument('--translate', help='Translate questions to specified language')
    parser.add_argument('--rephrase', help='Rephrase questions in specified style (formal, casual, etc.)')
    parser.add_argument('--output', help='Save results to JSON file')
    parser.add_argument('--resume', action='store_true', help='Resume processing from where it left off (if interrupted)')
    parser.add_argument('--no-ocr', action='store_true', help='Skip OCR and use VLM directly (slower but more accurate)')
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.max_pages and args.pages:
        print("❌ Error: Cannot use both --max-pages and --pages options together")
        sys.exit(1)
    
    # Parse specific pages if provided
    specific_pages = None
    if args.pages:
        try:
            specific_pages = parse_page_specification(args.pages)
            print(f"📄 Will process specific pages: {sorted(specific_pages)}")
        except ValueError as e:
            print(f"❌ Error parsing pages specification '{args.pages}': {e}")
            sys.exit(1)
    
    # Validate PDF file
    if not os.path.exists(args.pdf_path):
        print(f"❌ Error: PDF file not found: {args.pdf_path}")
        sys.exit(1)
    
    # Initialize processor
    try:
        processor = PDFProcessor()
    except Exception as e:
        print(f"❌ Error initializing processor: {e}")
        sys.exit(1)
    
    # Check if there's existing progress when resume is enabled
    if args.resume:
        progress_data = processor.load_processing_progress(args.pdf_path)
        if progress_data:
            processed_pages = len(progress_data.get('processed_pages', []))
            total_pages = progress_data.get('total_pages', 0)
            print(f"🔄 Found existing progress: {processed_pages}/{total_pages} pages completed")
            print(f"📍 Will resume from page {progress_data.get('resume_from_page', 1)}")
        else:
            print("ℹ️ No existing progress found, starting fresh")
    
    # Process PDF
    try:
        print(f"🚀 Processing PDF: {args.pdf_path}")
        
        result = await processor.process_pdf_complete(
            pdf_path=args.pdf_path,
            max_pages=args.max_pages,
            specific_pages=specific_pages,
            dpi=args.dpi,
            save_to_db=not args.no_save,
            translate_to=args.translate,
            rephrase_style=args.rephrase,
            resume=args.resume,
            use_ocr_first=not args.no_ocr
        )
        
        if result['success']:
            print("\n🎉 Processing completed successfully!")
            print(f"📝 Questions extracted: {result['questions_extracted']}")
            
            if not args.no_save:
                print(f"💾 Questions saved to database: {result['questions_saved']}")
            
            # Save to output file if requested
            if args.output:
                import json
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print(f"📄 Results saved to: {args.output}")
            
            # Return appropriate exit code
            if result['questions_extracted'] > 0:
                sys.exit(0)  # Full success
            else:
                print("⚠️ No questions were extracted")
                sys.exit(2)  # Partial success
        else:
            print(f"❌ Processing failed: {result.get('error', 'Unknown error')}")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Processing interrupted by user")
        print("💡 Tip: Use --resume flag to continue from where you left off:")
        print(f"   python cli/process_pdf.py \"{args.pdf_path}\" --resume")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print("💡 Tip: Use --resume flag to continue from where you left off if processing was partially completed:")
        print(f"   python cli/process_pdf.py \"{args.pdf_path}\" --resume")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())