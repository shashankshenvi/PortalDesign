package org.Project.ServiceImpl;

import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.spec.KeySpec;
import java.util.Base64;

@Service
public class Encryption {

    private static final String HEX_SALT = "dc0da04af8fee58593442bf834b30739";
    private static final String HEX_IV = "dc0da04af8fee58593442bf834b30739";
    private static final String PASSPHRASE = "48d6b976d7135745b47b407cd8e659a45d8ebaca4ee95f87d5d939604f472268";
    private static final int ITERATION_COUNT = 65556;
    private static final int KEY_SIZE = 256;

    private static final IvParameterSpec ivspec = new IvParameterSpec(new byte[16]);

    public String encrypt(String plainText) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            SecretKey key = generateKey();
            cipher.init(Cipher.ENCRYPT_MODE, key, ivspec);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed");
        }
    }

    public String decrypt(String cipherText) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            SecretKey key = generateKey();
            cipher.init(Cipher.DECRYPT_MODE, key, ivspec);
            byte[] decoded = Base64.getDecoder().decode(cipherText);
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed");
        }
    }

    public boolean matches(String rawValue, String encryptedValue) {
        try {
            String decrypted = decrypt(encryptedValue);
            return rawValue.equals(decrypted);
        } catch (Exception e) {
            return false;
        }
    }

    private static SecretKey generateKey() throws Exception {
        byte[] saltBytes = HEX_SALT.getBytes();
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(PASSPHRASE.toCharArray(), saltBytes, ITERATION_COUNT, KEY_SIZE);
        byte[] keyBytes = factory.generateSecret(spec).getEncoded();
        return new SecretKeySpec(keyBytes, "AES");
    }
}