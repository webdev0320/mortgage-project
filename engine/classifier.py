"""
Mock AI Classifier
-----------------
Simulates an IDP API (e.g., Google Document AI, AWS Textract) that returns
a document type label and confidence score for a page image.

Replace the body of `classify_page` with a real API call when ready.
"""

import random
from dataclasses import dataclass

DOCUMENT_TYPES = [
    "W-2",
    "1099-NEC",
    "Paystub",
    "Bank Statement",
    "Mortgage Statement",
    "Tax Return (1040)",
    "Driver's License",
    "Social Security Card",
    "Insurance Declaration",
    "Unknown",
]


@dataclass
class ClassificationResult:
    label: str
    confidence: float


def classify_page(image_bytes: bytes) -> ClassificationResult:
    """
    Mock classifier: randomly picks a document type with a realistic confidence.
    In production, replace with:
        - Google Document AI: documentai.DocumentProcessorServiceClient
        - AWS Textract: boto3.client('textract').analyze_document(...)
        - Custom ML model inference
    """
    label = random.choice(DOCUMENT_TYPES)

    # Simulate high confidence for common types, lower for Unknown
    if label == "Unknown":
        confidence = round(random.uniform(0.30, 0.55), 4)
    else:
        confidence = round(random.uniform(0.72, 0.99), 4)

    return ClassificationResult(label=label, confidence=confidence)
