package cn.qinjie.piano;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.JavascriptInterface;
import android.net.Uri;
import android.graphics.Color;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

public final class MainActivity extends Activity {
  private WebView web;
  private String pendingExport;
  private final PianoSampleStore sampleStore=new PianoSampleStore(new PianoSampleStore.Source(){@Override public InputStream open(String path) throws java.io.IOException{return getAssets().open(path);}});
  private static final String ORIGIN="https://appassets.androidplatform.net/";

  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    web=new WebView(this);
    web.setBackgroundColor(Color.rgb(245,244,238));
    WebSettings settings=web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setBlockNetworkLoads(true);
    settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setSupportZoom(false);
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !request.getUrl().toString().equals(ORIGIN+"index.html");}
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        String url=request.getUrl().toString();
        if(url.startsWith(ORIGIN)){
          String file=url.substring(ORIGIN.length());
          if(file.matches("index\\.html|style\\.css|app\\.js|core\\.js|content\\.js|teaching\\.js|repertoire\\.js|notation\\.js|audio\\.js|library\\.js|training\\.js|practice-review\\.js|rhythm-core\\.js|rhythm-ui\\.js|learning-content\\.js|learning-core\\.js|learning-ui\\.js|coach\\.js|drill-content\\.js|exam-core\\.js|exam-content\\.js|exam\\.js|samples/(grand|upright)\\.js")){
            try{String type=file.endsWith(".html")?"text/html":file.endsWith(".css")?"text/css":"text/javascript";return new WebResourceResponse(type,"UTF-8",getAssets().open(file));}catch(Exception ignored){}
          }
        }
        return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));
      }
    });
    web.addJavascriptInterface(new RecordsBridge(),"Android");
    setContentView(web);
    web.loadUrl(ORIGIN+"index.html");
  }
  public final class RecordsBridge {
    @JavascriptInterface public String audioDeviceInfo(){
      try{
        JSONObject info=new JSONObject();
        info.put("manufacturer",android.os.Build.MANUFACTURER);info.put("model",android.os.Build.MODEL);
        info.put("android",android.os.Build.VERSION.RELEASE);info.put("sdk",android.os.Build.VERSION.SDK_INT);
        info.put("nativeVersion",getPackageManager().getPackageInfo(getPackageName(),0).versionName);
        android.content.pm.PackageInfo provider=WebView.getCurrentWebViewPackage();
        if(provider!=null){info.put("webView",provider.packageName);info.put("webViewVersion",provider.versionName);}
        return info.toString();
      }catch(Exception e){return "{}";}
    }
    // Only bundled piano banks are exposed; no arbitrary paths or network access.
    @JavascriptInterface public String readPianoSampleBank(String id){
      try{return sampleStore.json(id);}catch(Exception e){return "";}
    }
    @JavascriptInterface public String pianoSampleBankInfo(String id){
      try{return new JSONObject().put("ok",true).put("length",sampleStore.json(id).length()).put("chunkSize",PianoSampleStore.CHUNK_SIZE).toString();}
      catch(Exception e){return sampleFailure(e);}
    }
    @JavascriptInterface public String pianoSampleBankChunk(String id,int offset){
      try{return sampleStore.chunk(id,offset);}catch(Exception e){return "";}
    }
    @JavascriptInterface public void releasePianoSampleBank(String id){sampleStore.release(id);}
    private String sampleFailure(Exception error){
      try{return new JSONObject().put("ok",false).put("code",error instanceof PianoSampleStore.Failure?((PianoSampleStore.Failure)error).code:"ASSET_READ_FAILED").put("detail",error.getClass().getSimpleName()).toString();}catch(Exception ignored){return "{\"ok\":false,\"code\":\"NATIVE_METADATA_FAILED\"}";}
    }
    @JavascriptInterface public void exportData(String data){exportDocument(data,10,"琴阶记录-", ".json");}
    @JavascriptInterface public void exportSongs(String data){exportDocument(data,13,"琴阶曲库-", ".qinjie.json");}
    private void exportDocument(String data,final int code,final String prefix,final String suffix){
      if(data==null||data.length()>2000000)return;
      pendingExport=data;
      runOnUiThread(new Runnable(){@Override public void run(){try{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,prefix+new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).format(new Date())+suffix);startActivityForResult(i,code);}catch(Exception e){notice("当前设备没有文件保存组件");}}});
    }
    @JavascriptInterface public void importData(){importDocument(11);}
    @JavascriptInterface public void importSongs(){importDocument(12);}
    private void importDocument(final int code){runOnUiThread(new Runnable(){@Override public void run(){try{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");startActivityForResult(i,code);}catch(Exception e){notice("当前设备没有文件选择组件");}}});}
  }
  private void notice(String text){web.evaluateJavascript("window.nativeNotice("+JSONObject.quote(text)+")",null);}
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(result!=RESULT_OK||data==null||data.getData()==null){pendingExport=null;return;}
    Uri uri=data.getData();
    try{
      if((request==10||request==13)&&pendingExport!=null){try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new Exception();out.write(pendingExport.getBytes(StandardCharsets.UTF_8));}notice("文件已保存");pendingExport=null;}
      else if(request==11||request==12){try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){if(in==null)throw new Exception();byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1){if(out.size()+count>2000000)throw new Exception();out.write(buffer,0,count);}String text=new String(out.toByteArray(),StandardCharsets.UTF_8);web.evaluateJavascript((request==12?"window.importPianoSongs(":"window.importPianoState(")+JSONObject.quote(text)+")",null);}}
    }catch(Exception e){notice("文件操作失败，请选择2MB以内有效JSON或换一个保存位置");pendingExport=null;}
  }
  @Override protected void onPause(){web.evaluateJavascript("window.pausePiano&&window.pausePiano()",null);web.onPause();super.onPause();}
  @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
  @Override public void onBackPressed(){web.evaluateJavascript("window.backPiano&&window.backPiano()",null);}
  @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
}
