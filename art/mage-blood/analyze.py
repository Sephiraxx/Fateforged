from PIL import Image
import numpy as np
from pathlib import Path
from collections import deque
for p in Path('art/mage-blood').glob('*.png'):
 a=np.array(Image.open(p))[:,:,3]; mask=a>32; h,w=mask.shape; comps=[]
 for y,x in zip(*np.where(mask)):
  if not mask[y,x]:continue
  mask[y,x]=False;q=[(int(x),int(y))];i=0;lo=[x,y];hi=[x,y]
  while i<len(q):
   xx,yy=q[i];i+=1
   for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
    if 0<=nx<w and 0<=ny<h and mask[ny,nx]:
     mask[ny,nx]=False;q.append((nx,ny));lo[0]=min(lo[0],nx);lo[1]=min(lo[1],ny);hi[0]=max(hi[0],nx);hi[1]=max(hi[1],ny)
  if len(q)>150:comps.append((len(q),list(map(int,lo+hi))))
 print(p.name,sorted(comps,reverse=True)[:30],flush=True)
