package com.kevthedev.pocketworkshop;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name="WorkshopVault")
public class WorkshopVaultPlugin extends Plugin {
    private static final String ALIAS="PocketWorkshopWallet";
    private String scope(PluginCall call) { return "test".equals(call.getString("scope")) ? "test" : "release"; }
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if(store.containsAlias(ALIAS))return (SecretKey)store.getKey(ALIAS,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    @PluginMethod public synchronized void load(PluginCall call) {
        try {
            String data=getContext().getSharedPreferences("workshop_vault",Context.MODE_PRIVATE).getString(scope(call),null);
            JSObject result=new JSObject();
            if(data==null){result.put("value","");call.resolve(result);return;}
            String[] parts=data.split("\\.",-1);
            if(parts.length!=2)throw new IllegalStateException();
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
            cipher.updateAAD(scope(call).getBytes(StandardCharsets.UTF_8));
            result.put("value",new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8));call.resolve(result);
        }catch(Exception error){call.reject("Secure wallet storage could not be read. Use your saved recovery code.");}
    }
    @PluginMethod public synchronized void save(PluginCall call) {
        try {
            String value=call.getString("value");
            if(value==null||value.getBytes(StandardCharsets.UTF_8).length>16384){call.reject("Invalid wallet storage value.");return;}
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
            cipher.updateAAD(scope(call).getBytes(StandardCharsets.UTF_8));
            String data=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+"."+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
            if(!getContext().getSharedPreferences("workshop_vault",Context.MODE_PRIVATE).edit().putString(scope(call),data).commit())throw new IllegalStateException();
            call.resolve();
        }catch(Exception error){call.reject("Could not save your wallet securely.");}
    }
}
