import os
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['PADDLE_ONEDNN'] = 'OFF'
os.environ['FLAGS_enable_new_executor'] = '0'
from paddleocr import PaddleOCR
import fitz  # PyMuPDF
import numpy as np  
from PIL import Image
import io
import traceback
from rapidfuzz import fuzz

# document dictionary
DOCUMENT_TYPES = {
    "GFE": ["good faith estimate"],
    "URLA": ["uniform residential loan application"],
    "TIA": ["tax information authorization"],
    "LS": ["loan submission sheet"]
}

ocr = PaddleOCR(lang='en')

def classify_page(text_blocks):
    full_text = " ".join([block['text'] for block in text_blocks]).lower()

    best_match = "UNKNOWN"
    best_score = 0

    for doc_type, keywords in DOCUMENT_TYPES.items():
        for keyword in keywords:
            score = fuzz.partial_ratio(keyword, full_text)

            if score > best_score:
                best_score = score
                best_match = doc_type

    # Threshold check
    if best_score > 80:
        return best_match
    else:
        return "UNKNOWN"



def split_pdf_by_segments(pdf_path, segments, output_dir="output_docs"):
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)

    for i, segment in enumerate(segments):
        new_doc = fitz.open()

        for page_num in range(segment["start_page"] - 1, segment["end_page"]):
            new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)

        output_path = os.path.join(
            output_dir,
            f"{segment['type']}_{i+1}.pdf"
        )

        new_doc.save(output_path)
        new_doc.close()

        print(f"Saved: {output_path}")

    doc.close()


def process_pdf_with_ocr(pdf_path, output_file, ocr):
    print(f"\n{'='*60}")
    print(f"Processing PDF: {pdf_path}")
    print(f"{'='*60}\n")
    

    print("Opening PDF...")
    doc = fitz.open(pdf_path)
    zoom = 200 / 72 
    mat = fitz.Matrix(zoom, zoom)

    print(f"Total pages: {len(doc)}\n")

    
    # Run OCR
    print("Running OCR on each page...")
    print("-" * 40)
    
    all_results = []

    document_segments = []
    current_doc = None
    
    
    for page_num in range(len(doc)):
        print(f"Page {page_num + 1}:")
        page = doc[page_num]
        pix = page.get_pixmap(matrix=mat)

        img = Image.open(io.BytesIO(pix.tobytes("png")))
        img_np = np.array(img)

        result = ocr.predict(img_np)
        
        page_text = []
        
        if result and len(result) > 0:
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                page_text.append({'text': text, 'confidence': confidence})
                print(f"  [{confidence:.2%}] {text}")
        else:
            print("  No text found on this page")
        
        all_results.append({'page_num': page_num + 1, 'text_blocks': page_text})
        print()
        
    doc.close()

    for page_result in all_results:
        page_num = page_result['page_num']
        text_blocks = page_result['text_blocks']

        doc_type = classify_page(text_blocks)

        if current_doc is None:
            current_doc = {
                "type": doc_type,
                "start_page": page_num,
                "end_page": page_num
            }
        else:
            # Handle UNKNOWN pages by continuing previous document
            if doc_type == current_doc["type"] or doc_type == "UNKNOWN":
                current_doc["end_page"] = page_num
            else:
                document_segments.append(current_doc)
                current_doc = {
                    "type": doc_type,
                    "start_page": page_num,
                    "end_page": page_num
                }

    # Append last document
    if current_doc:
        document_segments.append(current_doc)

    # Print detected segments
    print("\nDetected Document Segments:")
    for seg in document_segments:
        print(seg)
    
    # Save results
    print(f"\nSaving results to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"OCR Results for: {pdf_path}\n")
        f.write(f"{'='*60}\n\n")
        
        for page_result in all_results:
            page_num = page_result['page_num']
            text_blocks = page_result['text_blocks']
            
            f.write(f"\n{'='*60}\n")
            f.write(f"PAGE {page_num}\n")
            f.write(f"{'='*60}\n\n")
            
            if not text_blocks:
                f.write("[No text found on this page]\n\n")
                continue
            
            for block in text_blocks:
                f.write(f"[Confidence: {block['confidence']:.2%}]\n")
                f.write(f"{block['text']}\n\n")
    
    print(f"Results saved successfully!")
    print(f"\nTotal pages processed: {len(all_results)}")
    
    split_pdf_by_segments(pdf_path, document_segments)

    return all_results

if __name__ == "__main__":
    # PATH to PDF file
    PDF_PATH = r"C:\Users\alisu\OneDrive\Documents\Projects\IDP\Sample PDFs\Merged all Docs.pdf"
    OUTPUT_FILE = "ocr_results2.txt"
    USE_GPU = False  # Set to True only if have an NVIDIA GPU
    LANGUAGE = 'en'  # 'en' for English
    
    try:
        results = process_pdf_with_ocr(
            pdf_path=PDF_PATH,
            output_file=OUTPUT_FILE,
            ocr=ocr
        )
        print(f"\n✅ Done! Check '{OUTPUT_FILE}' for the extracted text.")
    except FileNotFoundError:
        print(f"\n❌ Error: Could not find the PDF file at '{PDF_PATH}'")
        print("Please update the PDF_PATH variable with the correct file path.")
    except Exception as e:
        print("❌ An error occurred:")
        traceback.print_exc()