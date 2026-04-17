import os
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['PADDLE_ONEDNN'] = 'OFF'
os.environ['FLAGS_enable_new_executor'] = '0'
os.environ['FLAGS_enable_new_ir'] = '0'
os.environ['OMP_NUM_THREADS'] = '1'

import numpy as np
from paddleocr import PaddleOCR
try:
    print("Initializing...")
    ocr = PaddleOCR(lang='en')
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    print("Testing predict...")
    res = ocr.predict(img)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
