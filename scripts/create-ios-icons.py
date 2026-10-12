"""Regenerate the original Qinjie icon. Requires Pillow; generated PNGs are bundled."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

root = Path(__file__).resolve().parents[1] / 'ios/Resources/Assets.xcassets'
folder = root / 'AppIcon.appiconset'
folder.mkdir(parents=True, exist_ok=True)
icon = Image.new('RGB', (1024, 1024), '#214d43')
draw = ImageDraw.Draw(icon)
draw.rounded_rectangle((180, 240, 844, 804), radius=44, fill='#efe9da')
for x in (275, 370, 465, 560, 655, 750):
    draw.line((x, 280, x, 774), fill='#214d43', width=10)
for x in (245, 340, 530, 625, 720):
    draw.rounded_rectangle((x, 240, x+60, 540), radius=10, fill='#214d43')
draw.ellipse((674, 136, 738, 200), fill='#d9ba7a')
images = []
for size, scale, idiom in [(20,1,'ipad'),(20,2,'ipad'),(29,1,'ipad'),(29,2,'ipad'),(40,1,'ipad'),(40,2,'ipad'),(76,1,'ipad'),(76,2,'ipad'),(83.5,2,'ipad'),(1024,1,'ios-marketing')]:
    name = f'icon-{size}-{scale}x.png'
    pixels = int(size*scale)
    icon.resize((pixels,pixels), Image.Resampling.LANCZOS).save(folder/name)
    images.append({'size':f'{size}x{size}','idiom':idiom,'filename':name,'scale':f'{scale}x'})
info = {'author':'xcode','version':1}
(folder/'Contents.json').write_text(json.dumps({'images':images,'info':info}, indent=2)+'\n', encoding='utf8')
(root/'Contents.json').write_text(json.dumps({'info':info}, indent=2)+'\n', encoding='utf8')
print('Created 10 opaque iPad app icons')
