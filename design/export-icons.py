"""Export the approved artwork without changing its design. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'design/app-icon-concept-v1.png').convert('RGB')
store = root / 'design/store-icons'
store.mkdir(exist_ok=True)
source.resize((1024, 1024), Image.Resampling.LANCZOS).save(store / 'apple-app-store-1024.png')
source.resize((512, 512), Image.Resampling.LANCZOS).convert('RGBA').save(store / 'google-play-512.png', optimize=True)
ios = root / 'mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
source.resize((1024, 1024), Image.Resampling.LANCZOS).save(ios)
res = root / 'mobile/android/app/src/main/res'
for density, size, foreground in [('mdpi',48,108),('hdpi',72,162),('xhdpi',96,216),('xxhdpi',144,324),('xxxhdpi',192,432)]:
    folder = res / f'mipmap-{density}'
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(folder / 'ic_launcher.png')
    # Older launchers use this circular variant; adaptive launchers apply their own mask.
    mask = Image.new('L', (size*4, size*4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size*4-1, size*4-1), fill=255)
    round_icon = icon.convert('RGBA')
    round_icon.putalpha(mask.resize((size,size), Image.Resampling.LANCZOS))
    round_icon.save(folder / 'ic_launcher_round.png')
    source.resize((foreground,foreground), Image.Resampling.LANCZOS).save(folder / 'ic_launcher_foreground.png')
(res / 'values/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#203E38</color></resources>\n', encoding='utf-8')
for path in [store/'apple-app-store-1024.png', store/'google-play-512.png', ios]:
    with Image.open(path) as image:
        print(path.relative_to(root), image.size, image.mode, path.stat().st_size)
