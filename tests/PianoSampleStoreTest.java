package cn.qinjie.piano;

import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.zip.ZipFile;

public final class PianoSampleStoreTest {
  private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
  private static String sha(String value) throws Exception {
    byte[] bytes=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));StringBuilder result=new StringBuilder();
    for(byte b:bytes)result.append(String.format("%02x",b&255));return result.toString();
  }
  public static void main(String[] args) throws Exception {
    try(final ZipFile apk=new ZipFile(args[0])){
      final int[] reads={0};PianoSampleStore store=new PianoSampleStore(new PianoSampleStore.Source(){public InputStream open(String path) throws java.io.IOException {reads[0]++;java.util.zip.ZipEntry entry=apk.getEntry("assets/"+path);if(entry==null)throw new java.io.IOException("APK_SAMPLE_ENTRY_MISSING: assets/"+path);return apk.getInputStream(entry);}});
      int bank=0;for(String id:new String[]{"grand","upright"}){
        String data=store.json(id);StringBuilder joined=new StringBuilder();
        for(int offset=0;offset<data.length();offset+=PianoSampleStore.CHUNK_SIZE){String chunk=store.chunk(id,offset);check(chunk.length()>0&&chunk.length()<=16384,"unbounded bridge payload");joined.append(chunk);}
        check(sha(joined.toString()).equals(args[++bank]),id+" changed during native extraction/chunking");
        try{store.chunk(id,1);throw new AssertionError("accepted bad offset");}catch(PianoSampleStore.Failure error){check("CHUNK_OFFSET_INVALID".equals(error.code),"offset code");}
      }
      check(reads[0]==2,"asset was unnecessarily reopened for each chunk");
      try{store.json("../grand");throw new AssertionError("arbitrary asset path accepted");}catch(PianoSampleStore.Failure error){check("BANK_ID_INVALID".equals(error.code),"id code");}
      store.release("grand");store.json("grand");check(reads[0]==3,"retry release not effective");
    }
    PianoSampleStore malformed=new PianoSampleStore(path->new ByteArrayInputStream("PianoAudio.register(\"grand\",[]);".getBytes(StandardCharsets.UTF_8)));
    try{malformed.json("grand");throw new AssertionError("accepted malformed asset");}catch(PianoSampleStore.Failure error){check("ASSET_FORMAT_INVALID".equals(error.code),"format code");}
    PianoSampleStore huge=new PianoSampleStore(path->new ByteArrayInputStream(new byte[5000001]));
    try{huge.json("grand");throw new AssertionError("accepted oversized asset");}catch(PianoSampleStore.Failure error){check("ASSET_TOO_LARGE".equals(error.code),"size code");}
    System.out.println("PASS: real Java store reads APK banks, exact canonical hashes, <=16 KB chunks, bounded asset size, cache/release and error codes. Android AssetManager/bridge not a device test.");
  }
}
