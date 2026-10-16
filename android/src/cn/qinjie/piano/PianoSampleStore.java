package cn.qinjie.piano;

import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Bounded offline asset reading, independent of Android's JSON implementation. */
public final class PianoSampleStore {
  public static final int CHUNK_SIZE=16384;
  public interface Source { InputStream open(String path) throws IOException; }
  public static final class Failure extends IOException {
    public final String code;
    public Failure(String code){super(code);this.code=code;}
  }
  private final Source source;
  private final Map<String,String> cache=new HashMap<String,String>();
  public PianoSampleStore(Source source){this.source=source;}
  private void validate(String id) throws Failure {if(!"grand".equals(id)&&!"upright".equals(id))throw new Failure("BANK_ID_INVALID");}
  public synchronized String json(String id) throws IOException {
    validate(id);if(cache.containsKey(id))return cache.get(id);
    try(InputStream in=source.open("samples/"+id+".js");ByteArrayOutputStream out=new ByteArrayOutputStream()){
      if(in==null)throw new Failure("ASSET_MISSING");byte[] buffer=new byte[8192];int count;
      while((count=in.read(buffer))!=-1){if(out.size()+count>5000000)throw new Failure("ASSET_TOO_LARGE");out.write(buffer,0,count);}
      String script=new String(out.toByteArray(),StandardCharsets.UTF_8),marker="PianoAudio.register(\""+id+"\",";
      int start=script.indexOf(marker),end=script.lastIndexOf(");");
      if(start<0||end<start+marker.length())throw new Failure("ASSET_FORMAT_INVALID");
      String json=script.substring(start+marker.length(),end).trim();
      if(!json.startsWith("{")||!json.endsWith("}"))throw new Failure("ASSET_FORMAT_INVALID");
      cache.put(id,json);return json;
    }
  }
  public synchronized String chunk(String id,int offset) throws IOException {
    String json=json(id);if(offset<0||offset>=json.length()||offset%CHUNK_SIZE!=0)throw new Failure("CHUNK_OFFSET_INVALID");
    return json.substring(offset,Math.min(json.length(),offset+CHUNK_SIZE));
  }
  public synchronized void release(String id){cache.remove(id);}
}
