import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/** Android asset names require '/', including APKs created by Windows tools. */
public final class NormalizeApkPaths {
  public static void main(String[] args) throws Exception {
    File input=new File(args[0]).getCanonicalFile(),output=new File(args[1]).getCanonicalFile();
    if(input.equals(output))throw new IllegalArgumentException("Use a separate unsigned output");
    Set<String> names=new HashSet<String>();int fixed=0;
    try(ZipFile source=new ZipFile(input);ZipOutputStream target=new ZipOutputStream(new FileOutputStream(output))){
      Enumeration<? extends ZipEntry> entries=source.entries();byte[] buffer=new byte[8192];
      while(entries.hasMoreElements()){
        ZipEntry original=entries.nextElement();String raw=original.getName(),name=raw.replace('\\','/');
        if(name.startsWith("/")||name.matches("(^|.*/)\\.\\.?(/.*|$)")||!names.add(name))throw new IllegalArgumentException("Unsafe or duplicate APK entry: "+name);
        if(!raw.equals(name))fixed++;
        ZipEntry entry=new ZipEntry(name);entry.setTime(original.getTime());entry.setMethod(original.getMethod());
        if(original.getMethod()==ZipEntry.STORED){entry.setSize(original.getSize());entry.setCompressedSize(original.getSize());entry.setCrc(original.getCrc());}
        target.putNextEntry(entry);
        if(!original.isDirectory())try(InputStream stream=source.getInputStream(original)){int count;while((count=stream.read(buffer))!=-1)target.write(buffer,0,count);}
        target.closeEntry();
      }
    }
    try(ZipFile result=new ZipFile(output)){
      for(String name:new String[]{"assets/index.html","assets/samples/grand.js","assets/samples/upright.js","resources.arsc","classes.dex"})if(result.getEntry(name)==null)throw new IllegalStateException("Missing portable APK path: "+name);
      Enumeration<? extends ZipEntry> entries=result.entries();while(entries.hasMoreElements())if(entries.nextElement().getName().contains("\\"))throw new IllegalStateException("Nonportable APK path remains");
    }
    System.out.println("PASS: normalized "+fixed+" Windows APK paths; raw Java lookup finds both piano banks");
  }
}
