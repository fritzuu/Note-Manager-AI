from pathlib import Path
import zipfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.path import Path as MPath
from matplotlib.patches import PathPatch, FancyBboxPatch
from PIL import Image

matplotlib.rcParams['svg.fonttype'] = 'path'
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'output' / 'cogniva-logo-package'
OUT.mkdir(parents=True, exist_ok=True)
FOREST, SAGE, IVORY = '#173F36', '#9BAF91', '#F7F6EF'

# Reconstructed geometric interpretation of the approved open-C concept.
upper = [(226,42),(179,-6),(94,-15),(37,44),(-13,96),(-11,181),(35,223),(45,234),(68,233),(86,219),(111,198),(129,165),(150,141),(115,145),(91,132),(88,111),(81,87),(101,69),(124,68),(161,67),(192,77),(226,42)]
lower = [(48,238),(86,268),(146,273),(188,238),(223,209),(221,181),(245,179),(245,165),(245,151),(245,137),(215,132),(187,135),(169,150),(142,174),(126,210),(102,229),(86,244),(64,246),(48,238)]
def shape(ax, pts, color):
    codes = [MPath.MOVETO] + [MPath.CURVE4]*(len(pts)-1) + [MPath.CLOSEPOLY]
    ax.add_patch(PathPatch(MPath(pts+[pts[0]],codes),facecolor=color,edgecolor='none'))

def render(layout, variant, tagline=False):
    colors = {'color':(FOREST,SAGE),'black':('#111111','#111111'),'white':('#FFFFFF','#FFFFFF')}
    a,b = colors[variant]
    width,height = {'symbol':(300,300),'horizontal':(1050,300),'stacked':(620,520),'app-icon':(360,360)}[layout]
    fig = plt.figure(figsize=(width/100,height/100),dpi=200)
    ax=fig.add_axes([0,0,1,1]); ax.set_xlim(0,width); ax.set_ylim(height,0); ax.axis('off')
    if layout=='app-icon':
        ax.add_patch(FancyBboxPatch((0,0),360,360,boxstyle='round,pad=0,rounding_size=78',facecolor=FOREST,edgecolor='none'))
        a,b=IVORY,SAGE
    offsetx,offsety = {'symbol':(25,20),'horizontal':(25,20),'stacked':(185,20),'app-icon':(55,50)}[layout]
    for points,c in [(upper,a),(lower,b)]:
        shape(ax,[(x+offsetx,y+offsety) for x,y in points],c)
    if layout=='horizontal':
        ax.text(320,175,'Cogniva',fontsize=70,fontfamily='DejaVu Sans',weight='bold',color=a)
        if tagline: ax.text(327,232,'Turn habits into progress.',fontsize=23,fontfamily='DejaVu Sans',color=a)
    if layout=='stacked':
        ax.text(310,395,'Cogniva',ha='center',fontsize=64,weight='bold',fontfamily='DejaVu Sans',color=a)
        if tagline: ax.text(310,455,'Turn habits into progress.',ha='center',fontsize=23,fontfamily='DejaVu Sans',color=a)
    name=f'cogniva-{layout}-{variant}'+('-tagline' if tagline else '')
    for ext in ['svg','png','pdf']:
        fig.savefig(OUT/f'{name}.{ext}',transparent=True,dpi=300)
    plt.close(fig)

for layout in ['symbol','horizontal','stacked']:
    for variant in ['color','black','white']:
        render(layout,variant)
        if layout!='symbol': render(layout,variant,True)
render('app-icon','color')
icon=Image.open(OUT/'cogniva-app-icon-color.png').convert('RGBA')
for size in [16,32,48,64,128,256,512,1024]:
    icon.resize((size,size),Image.Resampling.LANCZOS).save(OUT/f'cogniva-app-icon-{size}.png')
icon.save(OUT/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
with zipfile.ZipFile(ROOT/'output'/'cogniva-logo-package.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(OUT.iterdir()): z.write(f,arcname=f'cogniva-logo-package/{f.name}')
print(OUT)
