import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';

/**
 * Supabase auth sessions (access + refresh token + user object) can exceed
 * SecureStore's historical ~2048-byte comfort zone on iOS. Only a small,
 * fixed-size AES key goes into SecureStore; the encrypted session blob (any
 * size) goes into AsyncStorage. This is the storage adapter passed to
 * `createClient(..., { auth: { storage } })`.
 */
export class LargeSecureStore {
  private async getEncryptionKey(keyName: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) {
      return aesjs.utils.hex.toBytes(existing);
    }
    const newKey = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(keyName, aesjs.utils.hex.fromBytes(newKey));
    return newKey;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const keyName = `${key}_key`;
    const encryptionKey = await this.getEncryptionKey(keyName);
    const cipherBytes = aesjs.utils.hex.toBytes(encrypted);
    const aesCtr = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = aesCtr.decrypt(cipherBytes);
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const keyName = `${key}_key`;
    const encryptionKey = await this.getEncryptionKey(keyName);
    const aesCtr = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = aesCtr.encrypt(aesjs.utils.utf8.toBytes(value));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}_key`);
  }
}
