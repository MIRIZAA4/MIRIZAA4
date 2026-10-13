import sys
from PIL import Image
out=sys.argv[1]; files=sys.argv[2:]
ims=[Image.open(f).convert('RGB').resize((432,768)) for f in files]
cols=min(4,len(ims)); rows=(len(ims)+cols-1)//cols
M=Image.new('RGB',(cols*436,rows*772),(0,0,0))
for i,im in enumerate(ims): M.paste(im,((i%cols)*436,(i//cols)*772))
M.save(out)
