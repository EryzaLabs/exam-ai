import os
import time
import base64
import asyncio
from typing import Dict, Any
from PIL import Image
import io

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("⚠️ Warning: pytesseract not available. Install with: pip install pytesseract")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("⚠️ Warning: easyocr not available. Install with: pip install easyocr")


class OCRService:
    """OCR service for text extraction from images"""
    
    def __init__(self):
        self.preferred_engine = os.getenv('OCR_ENGINE', 'auto')  # auto, tesseract, easyocr
        self.languages = ['eng', 'hin']  # English and Hindi
        self.easyocr_reader = None
        self.tesseract_available = TESSERACT_AVAILABLE
        
        # Initialize EasyOCR if available and preferred
        if EASYOCR_AVAILABLE and self.preferred_engine in ['auto', 'easyocr']:
            try:
                print("🔧 Initializing EasyOCR with GPU...")
                import easyocr
                self.easyocr_reader = easyocr.Reader(['en', 'hi'], gpu=True)  # GPU mode for faster processing
                print("✅ EasyOCR initialized successfully with GPU")
            except Exception as e:
                print(f"⚠️ EasyOCR initialization failed: {e}")
                self.easyocr_reader = None
        
        # Check tesseract availability
        if self.tesseract_available:
            try:
                # Try to run tesseract to verify it works
                pytesseract.get_tesseract_version()
                print("✅ Tesseract OCR available")
            except Exception as e:
                print(f"⚠️ Tesseract OCR not properly configured: {e}")
                self.tesseract_available = False
        
        # Warn if no OCR engines are available
        if not self.easyocr_reader and not self.tesseract_available:
            print("⚠️ Warning: No OCR engines available. Text extraction will fail.")
    
    async def extract_text_async(self, image_base64: str, page_number: int) -> Dict[str, Any]:
        """Extract text from image using OCR asynchronously"""
        
        try:
            # Convert base64 to PIL Image
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # Run OCR in thread pool to avoid blocking
            result = await asyncio.to_thread(self._extract_text_sync, image, page_number)
            return result
            
        except Exception as e:
            print(f"❌ OCR extraction failed for page {page_number}: {e}")
            return {
                'page_number': page_number,
                'extracted_text': '',
                'method_used': 'ocr_failed',
                'timestamp': time.time(),
                'error': str(e)
            }
    
    def _extract_text_sync(self, image: Image.Image, page_number: int) -> Dict[str, Any]:
        """Synchronous OCR text extraction"""
        
        start_time = time.time()
        extracted_text = ""
        method_used = "none"
        
        # Try different OCR engines in order of preference
        if self.preferred_engine in ['auto', 'easyocr'] and self.easyocr_reader is not None:
            try:
                print(f"🔍 Using EasyOCR for page {page_number}...")
                result = self.easyocr_reader.readtext(image)
                
                # Combine all detected text
                text_parts = []
                for detection in result:
                    text = detection[1] if len(detection) > 1 else ""
                    confidence = detection[2] if len(detection) > 2 else 0
                    
                    # Only include text with reasonable confidence
                    if confidence > 0.3:
                        text_parts.append(text)
                
                extracted_text = '\n'.join(text_parts)
                method_used = "easyocr"
                
                print(f"✅ EasyOCR extracted {len(extracted_text)} characters from page {page_number}")
                
            except Exception as e:
                print(f"⚠️ EasyOCR failed for page {page_number}: {e}")
        
        # Fallback to Tesseract if EasyOCR didn't work or not available
        if not extracted_text and self.tesseract_available and self.preferred_engine in ['auto', 'tesseract']:
            try:
                print(f"🔍 Using Tesseract for page {page_number}...")
                
                # Configure Tesseract for better accuracy
                custom_config = r'--oem 3 --psm 6 -l eng+hin'
                extracted_text = pytesseract.image_to_string(image, config=custom_config)
                method_used = "tesseract"
                
                print(f"✅ Tesseract extracted {len(extracted_text)} characters from page {page_number}")
                
            except Exception as e:
                print(f"⚠️ Tesseract failed for page {page_number}: {e}")
        
        # Final fallback - basic text extraction
        if not extracted_text:
            print(f"⚠️ All OCR methods failed for page {page_number}, using basic extraction")
            extracted_text = f"[OCR failed for page {page_number}]"
            method_used = "fallback"
        
        processing_time = time.time() - start_time
        
        return {
            'page_number': page_number,
            'extracted_text': extracted_text.strip(),
            'method_used': method_used,
            'timestamp': time.time(),
            'processing_time': round(processing_time, 2)
        }
    
    def extract_text(self, image_base64: str, page_number: int) -> Dict[str, Any]:
        """Legacy synchronous method"""
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            return self._extract_text_sync(image, page_number)
        except Exception as e:
            return {
                'page_number': page_number,
                'extracted_text': '',
                'method_used': 'ocr_failed',
                'timestamp': time.time(),
                'error': str(e)
            }