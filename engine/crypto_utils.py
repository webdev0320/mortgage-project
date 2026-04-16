import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

KEY = bytes.fromhex('59713d2f939379854746ba1f39c0cc3f59713d2f939379854746ba1f39c0cc3f')

def decrypt_file(input_path, output_path):
    with open(input_path, 'rb') as f:
        iv = f.read(16)
        encrypted_data = f.read()
    
    cipher = Cipher(algorithms.AES(KEY), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    
    decrypted_padded = decryptor.update(encrypted_data) + decryptor.finalize()
    
    # Remove PKCS7 padding
    padding_len = decrypted_padded[-1]
    decrypted_data = decrypted_padded[:-padding_len]
    
    with open(output_path, 'wb') as f:
        f.write(decrypted_data)
