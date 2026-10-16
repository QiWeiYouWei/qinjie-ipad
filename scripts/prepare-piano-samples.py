"""Build offline sample banks. Sources are real recordings, not synthesized audio.

Install imageio-ffmpeg into .build/pydeps before running this developer tool.
Only public source files listed below are downloaded; original hashes are recorded.
"""
from pathlib import Path
import base64, concurrent.futures, hashlib, io, json, subprocess, sys, urllib.request, wave
import numpy as np

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root/'.build/pydeps'))
import imageio_ffmpeg
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
cache = root/'.build/piano-source'
dest = root/'web/samples'
cache.mkdir(parents=True, exist_ok=True)
dest.mkdir(parents=True, exist_ok=True)

def request(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Qinjie-samples'}), timeout=45) as response:
                return response.read()
        except Exception:
            if attempt == 2: raise

repos = {name:json.loads(request('https://api.github.com/repos/'+name+'/commits/master'))['sha'] for name in ['Tonejs/audio','sgossner/VSCO-2-CE']}
grand = [('Fs3',54),('A3',57),('C4',60),('Ds4',63),('Fs4',66),('A4',69),('C5',72),('Ds5',75),('Fs5',78),('A5',81),('C6',84)]
sources = [('grand',note,'Tonejs/audio','salamander/'+name+'.mp3') for name,note in grand]
sources += [('upright',21+2*i,'sgossner/VSCO-2-CE',f'Keys/Upright Piano/Player_dyn2_rr1_{i:03}.wav') for i in range(18,33,2)]

def download(item):
    bank,note,repo,path = item
    url = 'https://raw.githubusercontent.com/'+repo+'/'+repos[repo]+'/'+urllib.parse.quote(path)
    target = cache/(bank+'-'+str(note)+'-'+repos[repo][:12]+Path(path).suffix)
    if not target.exists(): target.write_bytes(request(url))
    return item,target,url

downloaded = list(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(download,sources))
records,prepared = [],{}
for (bank,note,repo,path),target,url in downloaded:
    data = subprocess.check_output([ffmpeg,'-v','error','-i',str(target),'-t','12','-ar','44100','-ac','2','-f','f32le','-'])
    pcm = np.frombuffer(data,dtype='<f4').copy().reshape(-1,2)
    peak = float(np.max(np.abs(pcm)))
    # Remove recording/codec pre-roll only; preserve 3 ms before audible attack.
    audible = np.flatnonzero(np.max(np.abs(pcm),axis=1)>peak*.006)
    cut = max(0,int(audible[0])-132) if len(audible) else 0
    pcm = pcm[cut:]
    pcm[:44] *= np.linspace(0,1,44)[:,None]
    tail = min(11025,len(pcm))
    pcm[-tail:] *= np.linspace(1,0,tail)[:,None]
    prepared[(bank,note)] = pcm
    records.append({'bank':bank,'note':note,'url':url,'sourceSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'trimmedLeadingSeconds':round(cut/44100,6)})

for bank in ['grand','upright']:
    items = [(n,p) for (b,n),p in prepared.items() if b==bank]
    # One gain per instrument retains relative note dynamics. No clipping normalization.
    rms = np.mean([np.sqrt(np.mean(p[:44100]**2)) for n,p in items])
    peak = max(float(np.max(np.abs(p))) for n,p in items)
    gain = min(.11/max(rms,1e-6),.85/peak)
    payload = {}
    for note,pcm in items:
        raw = np.round(np.clip(pcm*gain,-1,1)*32767).astype('<i2').tobytes()
        mem=io.BytesIO()
        with wave.open(mem,'wb') as wav:
            wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(44100);wav.writeframes(raw)
        encoded = subprocess.check_output([ffmpeg,'-v','error','-f','wav','-i','pipe:0','-codec:a','libmp3lame','-b:a','192k','-f','mp3','pipe:1'],input=mem.getvalue())
        payload[str(note)] = base64.b64encode(encoded).decode('ascii')
        record = next(r for r in records if r['bank']==bank and r['note']==note)
        record.update({'seconds':round(len(pcm)/44100,3),'gain':round(gain,6),'encodedSha256':hashlib.sha256(encoded).hexdigest()})
    # Script loading also works with iPad's file:// WebView without file-fetch permissions.
    (dest/(bank+'.js')).write_text('/* Real piano recordings; see docs/钢琴音源说明.md. */\nPianoAudio.register('+json.dumps(bank)+','+json.dumps(payload,separators=(',',':'))+');\n',encoding='utf8')

license_files = [('Tonejs/audio','salamander/README','Salamander-README.txt'),('sgossner/VSCO-2-CE','LICENSE','VSCO-CC0.txt'),('sgossner/VSCO-2-CE','Keys/Upright Piano/Info.txt','VSCO-Upright-Info.txt')]
for repo,path,name in license_files:
    (dest/name).write_bytes(request('https://raw.githubusercontent.com/'+repo+'/'+repos[repo]+'/'+urllib.parse.quote(path)))
(dest/'manifest.json').write_text(json.dumps({'format':'base64-mp3-192k-stereo','range':[55,83],'sources':repos,'samples':records},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Prepared',len(records),'real-recorded samples; offline banks',sum(p.stat().st_size for p in dest.glob('*.js')),'bytes')
