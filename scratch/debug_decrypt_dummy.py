
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

KEY = bytes.fromhex('59713d2f939379854746ba1f39c0cc3f59713d2f939379854746ba1f39c0cc3f')

def decrypt_file(input_path, output_path):
    chunk_size = 64 * 1024
    with open(input_path, 'rb') as f_in:
        iv = f_in.read(16)
        print(f"IV: {iv.hex()}")
        cipher = Cipher(algorithms.AES(KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        with open(output_path, 'wb') as f_out:
            last_chunk = None
            while True:
                chunk = f_in.read(chunk_size)
                if not chunk: break
                if last_chunk is not None:
                    f_out.write(decryptor.update(last_chunk))
                last_chunk = chunk
            if last_chunk is not None:
                decrypted_padded = decryptor.update(last_chunk) + decryptor.finalize()
                padding_len = decrypted_padded[-1]
                if padding_len < 1 or padding_len > 16:
                    f_out.write(decrypted_padded)
                else:
                    f_out.write(decrypted_padded[:-padding_len])
            else:
                f_out.write(decryptor.finalize())

input_path = r'c:\laragon\www\doc-proj\dummy.pdf.enc'
output_path = r'c:\laragon\www\doc-proj\scratch\debug_decrypt_dummy.pdf'

try:
    decrypt_file(input_path, output_path)
    with open(output_path, 'rb') as f:
        header = f.read(10)
        print(f"Decrypted Header: {header}")
except Exception as e:
    print(f"Error: {e}")
