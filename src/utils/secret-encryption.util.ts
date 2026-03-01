import * as CryptoJS from 'crypto-js';

export class SecretEncryptionUtil {
  private static getSecretKey(): string {
    return process.env.SECRET_ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
  }

  // Mã hóa chuỗi văn bản thành chuỗi đã mã hóa
  static encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.getSecretKey()).toString();
  }

  // Giải mã chuỗi đã mã hóa (handles double encryption)
  static decrypt(encryptedText: string): string {
    let result = encryptedText;
    const key = this.getSecretKey();
    let attempts = 0;
    const maxAttempts = 3; // Max decryption attempts for double/triple encrypted data

    while (result.startsWith('U2FsdGVk') && attempts < maxAttempts) {
      attempts++;
      const bytes = CryptoJS.AES.decrypt(result, key);
      result = bytes.toString(CryptoJS.enc.Utf8);

      if (!result) {
        throw new Error('Decryption failed - result is empty. Check SECRET_ENCRYPTION_KEY env var.');
      }
    }

    // Validate final result
    if (result.startsWith('U2FsdGVk')) {
      throw new Error('Decryption failed after max attempts - still encrypted.');
    }

    return result;
  }
}