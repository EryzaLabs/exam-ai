#!/usr/bin/env python3
"""
PDF to Images converter using PyMuPDF (fitz)
Usage: python pdf_to_images.py <pdf_path> [dpi] [max_pages]
"""
import sys
import os
import base64
import json
import fitz  # PyMuPDF

def convert_pdf_to_images(pdf_path, dpi=300, max_pages=None):
    """Convert PDF pages to base64-encoded JPEG images"""
    results = []
    
    try:
        doc = fitz.open(pdf_path)
        
        num_pages = len(doc) if max_pages is None else min(max_pages, len(doc))
        
        for page_num in range(num_pages):
            page = doc[page_num]
            
            # Render page to pixmap
            mat = fitz.Matrix(dpi/72, dpi/72)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to JPEG bytes
            img_bytes = pix.tobytes("jpeg")
            
            # Encode to base64
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            
            results.append({
                "pageNumber": page_num + 1,
                "imageBase64": img_base64,
                "width": pix.width,
                "height": pix.height,
                "dpi": dpi
            })
        
        doc.close()
        return results
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_images.py <pdf_path> [dpi] [max_pages]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    max_pages = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"PDF file not found: {pdf_path}"}), file=sys.stderr)
        sys.exit(1)
    
    results = convert_pdf_to_images(pdf_path, dpi=dpi, max_pages=max_pages)
    print(json.dumps(results))
