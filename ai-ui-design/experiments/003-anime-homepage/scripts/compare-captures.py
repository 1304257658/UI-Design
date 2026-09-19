"""Make evidence sheets only; never alters app assets or reference screenshots."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[3] / 'docs/evidence/anime-replica'
for state in ['hero','exploded','drag']:
    paths = [root/f'{side}-desktop-{state}-final.png' for side in ['source','local']]
    images = [Image.open(path).convert('RGB') for path in paths]
    assert images[0].size == images[1].size, (state, [i.size for i in images])
    width,height=images[0].size
    sheet=Image.new('RGB',(width*2,height+30),'#e5e1db')
    draw=ImageDraw.Draw(sheet)
    for i,im in enumerate(images):
        sheet.paste(im,(i*width,30));draw.text((i*width+12,9),['SOURCE','LOCAL'][i],fill='black')
    sheet.save(root/f'compare-desktop-{state}.png')
    if state=='hero':
        crops=[im.crop((35,115,390,380)) for im in images]
        focus=Image.new('RGB',(710,295),'#e5e1db')
        for i,im in enumerate(crops):focus.paste(im,(355*i,30))
        d=ImageDraw.Draw(focus);d.text((12,9),'SOURCE',fill='black');d.text((367,9),'LOCAL',fill='black')
        focus.save(root/'compare-desktop-type.png')
    print(state, width, height)

for state, source_name in [('hero','source-mobile-hero-final.png'),('menu','source-mobile-menu.png')]:
    images=[Image.open(root/source_name).convert('RGB'),Image.open(root/f'local-mobile-{state}-final.png').convert('RGB')]
    assert images[0].size == images[1].size, (state,[i.size for i in images])
    w,h=images[0].size
    sheet=Image.new('RGB',(w*2,h+30),'#e5e1db');d=ImageDraw.Draw(sheet)
    for i,im in enumerate(images):
        sheet.paste(im,(i*w,30));d.text((i*w+12,9),['SOURCE','LOCAL'][i],fill='black')
    sheet.save(root/f'compare-mobile-{state}.png')
    print('mobile',state,w,h)
