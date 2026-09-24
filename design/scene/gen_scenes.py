# מייצר את כל מסכי חדר הבריחה (חדר + 8 תקריבים) לקובץ JS אחד
import math, random, json, re
random.seed(7)
DEFS='''<defs>
 <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6d4d"/><stop offset=".55" stop-color="#6a5038"/><stop offset="1" stop-color="#3e2c1c"/></linearGradient>
 <linearGradient id="sideL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1d140c"/><stop offset="1" stop-color="#4a3624"/></linearGradient>
 <linearGradient id="sideR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a3624"/><stop offset="1" stop-color="#1d140c"/></linearGradient>
 <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3f27"/><stop offset=".5" stop-color="#3a2817"/><stop offset="1" stop-color="#150d07"/></linearGradient>
 <linearGradient id="ceilG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140d08"/><stop offset="1" stop-color="#2e2014"/></linearGradient>
 <linearGradient id="woodG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5723c"/><stop offset=".5" stop-color="#7d5227"/><stop offset="1" stop-color="#4f3116"/></linearGradient>
 <linearGradient id="woodD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4523"/><stop offset="1" stop-color="#2f1c0c"/></linearGradient>
 <linearGradient id="ironG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a6c74"/><stop offset=".5" stop-color="#3a3b41"/><stop offset="1" stop-color="#17181c"/></linearGradient>
 <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#c8952b"/><stop offset="1" stop-color="#7a5514"/></linearGradient>
 <linearGradient id="paperG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8eed6"/><stop offset="1" stop-color="#d9c79b"/></linearGradient>
 <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".45"/><stop offset=".35" stop-color="#ffffff" stop-opacity=".05"/><stop offset=".8" stop-color="#000000" stop-opacity=".15"/><stop offset="1" stop-color="#ffffff" stop-opacity=".25"/></linearGradient>
 <linearGradient id="corkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8956a"/><stop offset="1" stop-color="#8f6f48"/></linearGradient>
 <linearGradient id="leatherG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b2424"/><stop offset="1" stop-color="#4a1010"/></linearGradient>
 <radialGradient id="lampG" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffdd99" stop-opacity=".75"/><stop offset=".3" stop-color="#ffb757" stop-opacity=".28"/><stop offset=".7" stop-color="#ff9a3c" stop-opacity=".06"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
 <radialGradient id="spotG" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#ffd98a" stop-opacity=".38"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
 <linearGradient id="coneG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd98a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></linearGradient>
 <linearGradient id="winG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5a8a"/><stop offset=".6" stop-color="#c77d4a"/><stop offset="1" stop-color="#f0b06a"/></linearGradient>
 <radialGradient id="vig" cx=".5" cy=".45" r=".78"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
 <radialGradient id="floorLight" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb757" stop-opacity=".22"/><stop offset="1" stop-color="#ffb757" stop-opacity="0"/></radialGradient>
 <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .11"/></feComponentTransfer></filter>
 <filter id="dirt"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="5"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .2 0"/></feComponentTransfer></filter>
 <filter id="sh"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity=".6"/></filter>
 <filter id="sh2"><feDropShadow dx="3" dy="4" stdDeviation="2.5" flood-color="#000" flood-opacity=".5"/></filter>
 <filter id="shBig"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#000" flood-opacity=".7"/></filter>
 <filter id="glow"><feGaussianBlur stdDeviation="4"/></filter>
</defs>'''
def gear(cx,cy,r,teeth,tw=None,fill="url(#ironG)",stroke="#b9bcc6",hole=0.3,sw=2):
    tw=tw or r*0.22; pts=[]
    for i in range(teeth*2):
        ang=math.pi*i/teeth; rr=r+tw if i%2==0 else r; a2=ang+(math.pi/teeth)*0.5
        pts.append((cx+rr*math.cos(ang),cy+rr*math.sin(ang))); pts.append((cx+rr*math.cos(a2),cy+rr*math.sin(a2)))
    d="M"+" L".join(f"{x:.1f} {y:.1f}" for x,y in pts)+"Z"
    return (f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/><circle cx="{cx}" cy="{cy}" r="{r*0.72:.1f}" fill="none" stroke="#8d9099" stroke-width="{sw+1}" opacity=".7"/><circle cx="{cx}" cy="{cy}" r="{r*hole:.1f}" fill="#0b0b0d"/><circle cx="{cx}" cy="{cy}" r="{r*hole*0.5:.1f}" fill="#3a3a40"/>'
            +"".join(f'<circle cx="{cx+r*0.5*math.cos(a):.1f}" cy="{cy+r*0.5*math.sin(a):.1f}" r="{r*0.11:.1f}" fill="#0b0b0d"/>' for a in [k*math.pi/3 for k in range(6)]))
def stones(A, x0=0,x1=900,y0=40,y1=400):
    y=y0
    while y<y1:
        h=random.choice([26,30,34,38]); x=x0+random.randint(-40,0)
        while x<x1:
            w=random.choice([60,80,100,120,140]); tint=random.choice(["#ffffff","#000000","#c9a06a","#5a3f27"]); op=random.uniform(.03,.10)
            A(f'<rect x="{x+2}" y="{y+2}" width="{w-4}" height="{h-4}" rx="3" fill="{tint}" opacity="{op:.2f}"/><path d="M{x+2} {y+h-2} h{w-4}" stroke="#000" stroke-opacity=".28" stroke-width="2"/><path d="M{x+2} {y+2} h{w-4}" stroke="#fff" stroke-opacity=".08" stroke-width="1.5"/>')
            x+=w
        y+=h
def wall_bg(A, full=True):
    A('<rect width="900" height="540" fill="url(#wallG)"/>'); stones(A,0,900,0,540); A('<rect width="900" height="540" filter="url(#dirt)"/>')
    A('<ellipse cx="450" cy="120" rx="520" ry="330" fill="url(#lampG)"/>')
def finish(A):
    for i in range(18): A(f'<circle cx="{random.randint(120,780)}" cy="{random.randint(60,420)}" r="{random.uniform(.7,1.6):.1f}" fill="#ffe9b0" opacity="{random.uniform(.3,.8):.2f}"/>')
    A('<rect width="900" height="540" fill="url(#vig)"/><rect width="900" height="540" filter="url(#grain)"/>')
def svg(body, extra_defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 540" font-family="Heebo,Arial">{DEFS}{body}</svg>'

S={}
# ================= החדר =================
out=[]; A=out.append
A('<rect width="900" height="400" fill="url(#wallG)"/>'); stones(A); A('<rect width="900" height="400" filter="url(#dirt)"/>')
A('<path d="M0 0 H900 V40 H0Z" fill="url(#ceilG)"/>')
for bx in [120,300,480,660,840]: A(f'<path d="M{bx-18} 0 L{bx+18} 0 L{bx+8} 40 L{bx-8} 40Z" fill="#3a2a1c" stroke="#120b06" stroke-width="1.5"/>')
A('<rect x="0" y="36" width="900" height="6" fill="#241910"/>')
A('<path d="M0 0 L60 40 L60 400 L0 540Z" fill="url(#sideL)"/><path d="M900 0 L840 40 L840 400 L900 540Z" fill="url(#sideR)"/>')
A('<g filter="url(#sh2)"><path d="M10 110 L50 134 L50 300 L10 330Z" fill="#2a1a0e"/><path d="M15 117 L45 138 L45 296 L15 322Z" fill="url(#winG)"/><path d="M30 127 L30 309 M15 216 L45 216" stroke="#3a2a1c" stroke-width="4"/><path d="M18 240 l6 -10 l5 6 l6 -14 l6 8 v40 h-23z" fill="#8a5a2b" opacity=".55"/><circle cx="24" cy="150" r="5" fill="#fff4cf" opacity=".9"/></g>')
A('<path d="M50 134 L250 400 L60 400 Z" fill="#f0b06a" opacity=".07"/>')
A('<g>')
for sy in [130,215,300]:
    A(f'<path d="M846 {sy} L892 {sy-30} L892 {sy-20} L846 {sy+10}Z" fill="#5a3d1e"/><path d="M846 {sy} L892 {sy-30}" stroke="#a37a4a" stroke-width="2"/>')
    for k,(px,bw,bh,col) in enumerate([(850,14,22,"#e9dcc0"),(866,12,26,"#c9a06a"),(880,10,20,"#ecd9a8")]):
        top=sy-(px-846)*0.65-bh
        A(f'<path d="M{px} {top} l{bw} -{bw*0.65:.1f} v{bh} l-{bw} {bw*0.65:.1f}z" fill="{col}" stroke="#7a5a2a" stroke-width="1"/>')
A('</g>')
A('<path d="M0 540 L60 400 L840 400 L900 540Z" fill="url(#floorG)"/>')
for i in range(0,13):
    x0=60+i*65; x1=(x0-450)*1.9+450; A(f'<path d="M{x0} 400 L{x1:.0f} 540" stroke="#000" stroke-opacity=".5" stroke-width="2"/>')
for yy,op in [(430,.35),(460,.4),(495,.45),(530,.5)]: A(f'<path d="M0 {yy}H900" stroke="#000" stroke-opacity="{op}" stroke-width="2"/>')
A('<ellipse cx="450" cy="470" rx="300" ry="70" fill="url(#floorLight)"/>')
A('<g filter="url(#sh2)"><path d="M232 468 L252 438 L648 438 L668 468 L642 522 L258 522Z" fill="#7a2626"/><path d="M248 474 L262 450 L638 450 L652 474 L630 510 L270 510Z" fill="none" stroke="#d9a441" stroke-width="2.5" opacity=".7"/><path d="M262 484 L272 460 L628 460 L638 484 L622 500 L278 500Z" fill="none" stroke="#d9a441" stroke-width="1.2" opacity=".5"/><g fill="#d9a441" opacity=".6"><path d="M450 456 l8 12 l-8 12 l-8 -12z"/><path d="M330 456 l6 9 l-6 9 l-6 -9z"/><path d="M570 456 l6 9 l-6 9 l-6 -9z"/></g></g>')
A('<g><path d="M450 0 v14 M450 22 v14" stroke="#111" stroke-width="3"/><ellipse cx="450" cy="18" rx="3" ry="5" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="450" cy="30" rx="3" ry="5" fill="none" stroke="#111" stroke-width="2"/><path d="M404 60 h92 l30 36 H374z" fill="#1b1b1e"/><path d="M410 64 h80 l24 28 H386z" fill="#2c2d33"/><path d="M412 66 h30 l-4 24 h-40z" fill="#ffffff" opacity=".08"/><ellipse cx="450" cy="96" rx="52" ry="7" fill="#fff1c4"/><ellipse cx="450" cy="96" rx="30" ry="4" fill="#fff" opacity=".9" filter="url(#glow)"/><path d="M398 96 L200 400 L700 400 L502 96Z" fill="url(#coneG)"/><ellipse cx="450" cy="150" rx="420" ry="260" fill="url(#lampG)"/></g>')
A('<g filter="url(#sh)"><rect x="300" y="26" width="300" height="46" fill="url(#paperG)" stroke="#3b2a15" stroke-width="3"/><rect x="306" y="32" width="288" height="34" fill="none" stroke="#8a6a44" stroke-width="1"/><path d="M300 26l-10-10M600 26l10-10" stroke="#3b2a15" stroke-width="3"/></g>')
A('<text x="450" y="57" text-anchor="middle" font-size="16" font-weight="800" fill="#3b2a15">בית דפוס "אחים לוי" · נוסד בשנת תרפ"ט</text>')
A('<g filter="url(#sh2)"><circle cx="266" cy="82" r="19" fill="#2a1b10"/><circle cx="266" cy="82" r="15" fill="#f4e7c6"/><path d="M266 72v10l6 4" stroke="#1a120b" stroke-width="2" fill="none"/><circle cx="266" cy="82" r="1.5" fill="#1a120b"/></g>')
A('<g filter="url(#sh2)"><rect x="548" y="236" width="44" height="60" fill="url(#paperG)"/><rect x="548" y="236" width="44" height="12" fill="#7b1e1e"/><g stroke="#8a6a44" stroke-width="1"><path d="M553 256h34M553 264h34M553 272h34M553 280h34M553 288h34"/></g><circle cx="570" cy="232" r="2.5" fill="#333"/></g>')
A('<g><circle cx="575" cy="120" r="2" fill="#333"/><path d="M575 122 v10" stroke="#8d8d8d" stroke-width="2"/><circle cx="575" cy="138" r="7" fill="none" stroke="url(#brassG)" stroke-width="3"/><path d="M575 145 v14 h5 M575 152 h4" stroke="url(#brassG)" stroke-width="3" fill="none"/></g>')
# door
A('<g filter="url(#sh)"><rect x="355" y="80" width="190" height="322" fill="#0f0a05"/><rect x="365" y="86" width="170" height="314" fill="#1d140c"/><rect x="378" y="98" width="144" height="302" fill="url(#woodG)"/>')
for i in range(8): A(f'<path d="M{384+i*18} 100 v298" stroke="#000" stroke-opacity=".12" stroke-width="{random.choice([1,1.5,2])}"/>')
A('<g fill="#4a2d13" stroke="#2a1708" stroke-width="2"><rect x="393" y="112" width="114" height="112"/><rect x="393" y="240" width="114" height="140"/></g><g fill="#5e3b18"><rect x="403" y="122" width="94" height="92"/><rect x="403" y="250" width="94" height="120"/></g><g fill="#ffffff" opacity=".07"><rect x="403" y="122" width="94" height="10"/><rect x="403" y="250" width="94" height="10"/></g><circle cx="502" cy="262" r="8" fill="url(#brassG)"/><circle cx="500" cy="260" r="3" fill="#fff" opacity=".5"/><rect x="468" y="276" width="44" height="24" fill="#2a2a2a"/><rect x="470" y="278" width="40" height="20" fill="url(#ironG)"/><circle cx="490" cy="288" r="4" fill="#000"/><path d="M378 98h144" stroke="#ffffff" stroke-opacity=".25" stroke-width="3"/></g>')
# plate
A('<g filter="url(#sh)"><rect x="40" y="70" width="190" height="110" fill="#2b2b2f" stroke="#0e0e10" stroke-width="4"/><rect x="48" y="78" width="174" height="94" fill="url(#ironG)"/>')
for j,w in enumerate([150,122,150,92]): A(f'<rect x="60" y="{90+j*17}" width="{w}" height="9" fill="#1c1c20"/><rect x="60" y="{90+j*17}" width="{w}" height="2" fill="#ffffff" opacity=".12"/>')
A('<g fill="#8d9099"><circle cx="52" cy="82" r="2.5"/><circle cx="218" cy="82" r="2.5"/><circle cx="52" cy="168" r="2.5"/><circle cx="218" cy="168" r="2.5"/></g></g>')
A('<g filter="url(#sh2)"><rect x="250" y="110" width="100" height="76" fill="url(#paperG)" stroke="#3b2a15" stroke-width="2"/><g stroke="#8a6a44" stroke-width="2"><path d="M262 130h76M262 146h76M262 162h76"/></g><circle cx="300" cy="106" r="3" fill="#c93c2c"/></g>')
A('<text x="300" y="127" text-anchor="middle" font-size="12" font-weight="800" fill="#3b2a15">לוח</text><text x="300" y="181" text-anchor="middle" font-size="12" font-weight="800" fill="#3b2a15">הגימטריה</text>')
A('<g filter="url(#sh)"><rect x="40" y="220" width="190" height="180" fill="#1f140c"/><rect x="40" y="216" width="190" height="6" fill="#a37a4a"/>')
for (x,y,w,h) in [(50,230,82,32),(138,230,82,32),(50,268,82,32),(138,268,82,32),(50,306,82,32),(138,306,82,32),(50,344,170,46)]:
    A(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#woodG)" stroke="#120b06" stroke-width="2"/><rect x="{x+3}" y="{y+3}" width="{w-6}" height="3" fill="#fff" opacity=".12"/>'+"".join(f'<path d="M{x+6} {y+8+k*8} h{w-12}" stroke="#000" stroke-opacity=".12" stroke-width="1"/>' for k in range(3))+f'<rect x="{x+6}" y="{y+6}" width="18" height="9" fill="url(#paperG)"/><circle cx="{x+w/2}" cy="{y+h/2}" r="4" fill="url(#brassG)"/>')
A('</g>')
A('<g filter="url(#sh)"><rect x="600" y="140" width="190" height="10" fill="#6b4523"/><rect x="600" y="138" width="190" height="3" fill="#a37a4a"/><rect x="600" y="150" width="190" height="36" fill="#1f140c"/><rect x="612" y="156" width="166" height="24" fill="url(#woodG)"/><circle cx="695" cy="168" r="4" fill="url(#brassG)"/>')
for i,col in enumerate(["#2e7d4f","#b91c1c","#d9a441","#1d4ed8","#0d0d0f"]):
    x=612+i*34; A(f'<rect x="{x}" y="96" width="26" height="44" rx="4" fill="{col}"/><rect x="{x}" y="96" width="26" height="44" rx="4" fill="url(#glassG)"/><rect x="{x+3}" y="112" width="20" height="14" fill="#f4e7c6" opacity=".85"/><rect x="{x+7}" y="86" width="12" height="12" fill="#5a3d1e"/><rect x="{x+5}" y="94" width="16" height="4" fill="#333"/><ellipse cx="{x+13}" cy="141" rx="14" ry="3" fill="#000" opacity=".35"/>')
A('</g>')
A('<g filter="url(#sh)"><rect x="600" y="220" width="190" height="130" fill="#a4835a" stroke="#3b2a15" stroke-width="5"/><rect x="606" y="226" width="178" height="118" fill="#b9977a" opacity=".55"/>')
for (x,y,w,h,r,cx,cy) in [(612,232,62,46,-6,643,255),(690,236,76,56,5,728,264),(640,290,86,46,-3,683,313)]:
    A(f'<g transform="rotate({r} {cx} {cy})" filter="url(#sh2)"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#paperG)"/><path d="M{x+w-8} {y+h} l8 -8 v8z" fill="#000" opacity=".15"/>'+"".join(f'<path d="M{x+8} {y+12+k*8} h{w-16-random.randint(0,20)}" stroke="#8a6a44" stroke-width="1.5" opacity=".7"/>' for k in range(int(h/9)-1))+'</g>')
A('<g fill="#c93c2c"><circle cx="643" cy="238" r="3"/><circle cx="728" cy="242" r="3"/><circle cx="683" cy="294" r="3"/></g></g>')
A('<g filter="url(#sh)"><rect x="250" y="404" width="400" height="6" fill="#b48653"/><rect x="250" y="410" width="400" height="14" fill="#8b6a44"/>'+"".join(f'<path d="M{256+i*20} 412 h14" stroke="#000" stroke-opacity=".15" stroke-width="1"/>' for i in range(20))+'<rect x="262" y="424" width="14" height="90" fill="#4a2d13"/><rect x="624" y="424" width="14" height="90" fill="#4a2d13"/><rect x="262" y="470" width="376" height="6" fill="#4a2d13"/></g>')
A('<g filter="url(#sh2)"><rect x="290" y="380" width="60" height="26" fill="url(#paperG)"/><rect x="292" y="376" width="60" height="26" fill="url(#paperG)"/><rect x="294" y="372" width="60" height="26" fill="url(#paperG)"/></g>')
A('<g filter="url(#sh2)" transform="rotate(-4 332 379)"><rect x="262" y="352" width="140" height="54" fill="#fdf8ea"/><g stroke="#999" stroke-width="1"><path d="M275 364h110M275 374h110M275 384h110M275 394h110"/></g><g fill="none" stroke="#777" stroke-width="1"><rect x="280" y="360" width="8" height="8"/><rect x="288" y="360" width="8" height="8"/><rect x="296" y="360" width="8" height="8"/><rect x="280" y="368" width="8" height="8"/><rect x="288" y="368" width="8" height="8"/></g></g><rect x="300" y="396" width="70" height="4" fill="#c98a4b" transform="rotate(-20 335 398)"/>')
A('<g filter="url(#sh2)"><rect x="470" y="356" width="150" height="50" fill="#7b1e1e"/><rect x="480" y="362" width="130" height="38" fill="#f1e2b8"/><rect x="470" y="356" width="14" height="50" fill="#5a1414"/><path d="M600 356 v-10 l4 3 l4 -3 v10z" fill="#d9a441"/></g>')
A('<text x="548" y="386" text-anchor="middle" font-size="12" fill="#3b2a15" font-weight="800">ספר הזמנות</text>')
A('<g filter="url(#sh2)"><path d="M412 380 h22 l-3 26 h-16z" fill="#d38a2a" opacity=".9"/><path d="M412 380h22l-1 8h-20z" fill="#f2c27b"/><path d="M434 386 q10 4 0 14" stroke="#c9ccd4" stroke-width="3" fill="none"/></g>')
A('<g filter="url(#sh2)"><rect x="444" y="390" width="18" height="16" fill="#0d0d12"/><rect x="448" y="384" width="10" height="8" fill="#333"/><path d="M456 386 q-6 -30 -2 -48" stroke="#f4e7c6" stroke-width="3" fill="none"/><path d="M455 372 q-4 -14 0 -30" stroke="#d9c79b" stroke-width="6" fill="none" opacity=".8"/></g>')
A('<g filter="url(#sh)"><rect x="680" y="370" width="200" height="150" fill="url(#ironG)"/><rect x="684" y="374" width="192" height="4" fill="#fff" opacity=".18"/><rect x="690" y="382" width="180" height="6" fill="#0d0d10"/><rect x="690" y="396" width="6" height="110" fill="#0d0d10"/><rect x="866" y="396" width="6" height="110" fill="#0d0d10"/>')
A(gear(730,430,28,12)); A(gear(800,420,21,9)); A(gear(848,456,15,7))
A('<path d="M676 404 l-20 -24 l6 -4 l22 26z" fill="url(#ironG)"/><circle cx="660" cy="378" r="6" fill="url(#brassG)"/><rect x="700" y="480" width="160" height="28" fill="#141416"/><rect x="720" y="487" width="120" height="14" fill="#fdf8ea"/></g>')
A('<g filter="url(#sh2)"><rect x="96" y="440" width="76" height="22" fill="#e9dcc0"/><rect x="100" y="420" width="72" height="22" fill="#d9c79b"/><rect x="104" y="402" width="66" height="20" fill="#ecd9a8"/><path d="M96 440 h76 M100 420 h72" stroke="#8a6a44" stroke-width="1"/></g>')
A('<g filter="url(#sh2)"><path d="M36 300 L48 470" stroke="#8a5a2b" stroke-width="4"/><path d="M40 468 l-14 44 h40 l-6 -44z" fill="#c9a34b"/><path d="M28 500 h34" stroke="#8a6a2a" stroke-width="2"/></g>')
A('<g fill="#0a0a12" opacity=".75"><ellipse cx="704" cy="504" rx="20" ry="6"/><ellipse cx="726" cy="512" rx="6" ry="3"/><ellipse cx="184" cy="506" rx="12" ry="4"/></g>')
for i in range(28): A(f'<circle cx="{random.randint(300,600)}" cy="{random.randint(100,320)}" r="{random.uniform(.7,1.6):.1f}" fill="#ffe9b0" opacity="{random.uniform(.3,.8):.2f}"/>')
A('<g stroke="#ffffff" stroke-opacity=".22" stroke-width="1" fill="none"><path d="M840 40 L780 100 M840 40 L806 128 M840 40 L836 150 M840 40 L760 74 M796 70 Q820 86 830 116 M780 96 Q806 112 822 144"/></g>')
A('<rect width="900" height="540" fill="url(#vig)"/><rect width="900" height="540" filter="url(#grain)"/>')
S["room"]=svg("".join(out))

# ================= תקריב 1: הגלופה =================
out=[]; A=out.append; wall_bg(A)
A('<g filter="url(#shBig)"><rect x="150" y="60" width="600" height="330" fill="#2b2b2f" stroke="#0e0e10" stroke-width="8"/><rect x="170" y="80" width="560" height="290" fill="url(#ironG)"/>')
A('<g fill="#b0b3bb"><circle cx="164" cy="74" r="6"/><circle cx="736" cy="74" r="6"/><circle cx="164" cy="376" r="6"/><circle cx="736" cy="376" r="6"/></g><g fill="#000" opacity=".4"><circle cx="165" cy="76" r="2"/><circle cx="737" cy="76" r="2"/><circle cx="165" cy="378" r="2"/><circle cx="737" cy="378" r="2"/></g>')
A('<rect x="180" y="90" width="540" height="270" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>')
for i,line in enumerate(["המנעול של ארון האותיות:","שנת הייסוד שעל השלט, בגימטריה,","ועוד מספר בקבוקי הדיו שעל המדף."]):
    y=170+i*62
    A(f'<g transform="translate(900 0) scale(-1 1)"><text x="450" y="{y+3}" text-anchor="middle" font-family="Frank Ruhl Libre,serif" font-size="40" font-weight="700" fill="#0a0a0c" opacity=".9">{line}</text><text x="450" y="{y}" text-anchor="middle" font-family="Frank Ruhl Libre,serif" font-size="40" font-weight="700" fill="#c9ccd4">{line}</text></g>')
A('</g>')
A('<g filter="url(#sh)"><rect x="120" y="420" width="660" height="14" fill="#6b4523"/><rect x="120" y="418" width="660" height="3" fill="#a37a4a"/><rect x="136" y="434" width="12" height="40" fill="#4a2d13"/><rect x="752" y="434" width="12" height="40" fill="#4a2d13"/></g>')
finish(A); S["p1"]=svg("".join(out))

# ================= תקריב 2: המגירה הפתוחה (פורמה) =================
out=[]; A=out.append; wall_bg(A)
A('<rect x="0" y="330" width="900" height="210" fill="url(#woodD)"/><path d="M0 330 H900" stroke="#a37a4a" stroke-width="3"/>')
A('<g filter="url(#shBig)"><rect x="70" y="60" width="440" height="440" fill="#3a2410"/><rect x="82" y="72" width="416" height="416" fill="url(#woodG)"/>')
for r in range(3):
    for c in range(3):
        x=98+c*136; y=88+r*136; A(f'<rect x="{x}" y="{y}" width="120" height="120" fill="#2a1708"/><rect x="{x+4}" y="{y+4}" width="112" height="112" fill="#1a0f06"/><rect x="{x+4}" y="{y+4}" width="112" height="4" fill="#000" opacity=".5"/>')
A('<path d="M82 72 h416" stroke="#fff" stroke-opacity=".2" stroke-width="3"/><rect x="230" y="500" width="120" height="14" fill="url(#brassG)"/></g>')
A('<g filter="url(#sh)" transform="rotate(2 700 250)"><rect x="560" y="70" width="280" height="360" fill="url(#paperG)"/><path d="M832 430 l8 -8 v8z" fill="#000" opacity=".2"/><circle cx="700" cy="76" r="5" fill="#c93c2c"/></g>')
finish(A); S["p2"]=svg("".join(out))

# ================= תקריב 3: ארון הדיו הפתוח =================
out=[]; A=out.append; wall_bg(A)
A('<g filter="url(#shBig)"><rect x="60" y="50" width="540" height="420" fill="#1f140c"/><rect x="72" y="62" width="516" height="396" fill="#2e1e10"/><rect x="72" y="62" width="516" height="396" fill="url(#dirt)"/>')
A('<rect x="72" y="250" width="516" height="16" fill="url(#woodG)"/><rect x="72" y="266" width="516" height="6" fill="#000" opacity=".4"/>')
for i in range(5):
    x=110+i*100
    A(f'<rect x="{x}" y="140" width="60" height="110" rx="8" fill="#6c6f76"/><rect x="{x}" y="140" width="60" height="110" rx="8" fill="url(#glassG)"/><rect x="{x+14}" y="112" width="32" height="30" fill="#5a3d1e"/><rect x="{x+10}" y="134" width="40" height="8" fill="#333"/><ellipse cx="{x+30}" cy="252" rx="34" ry="5" fill="#000" opacity=".4"/>')
    A(f'<circle cx="{x+30}" cy="205" r="18" fill="#f4e7c6"/><text x="{x+30}" y="213" text-anchor="middle" font-size="24" font-weight="800" fill="#3b2a15">{i+1}</text>')
A('<rect x="72" y="380" width="516" height="16" fill="url(#woodG)"/>')
for i in range(6): A(f'<rect x="{100+i*80}" y="300" width="50" height="80" fill="#2a1708"/>')
A('</g>')
A('<g filter="url(#shBig)"><path d="M610 40 L860 20 L860 520 L610 500Z" fill="url(#woodG)"/><path d="M622 56 L848 40 L848 500 L622 484Z" fill="#5a3d1e"/><path d="M640 90 L830 78 L830 440 L640 452Z" fill="url(#paperG)"/><circle cx="735" cy="86" r="5" fill="#c93c2c"/><circle cx="612" cy="270" r="8" fill="url(#brassG)"/></g>')
finish(A); S["p3"]=svg("".join(out))

# ================= תקריב 4: לוח המודעות =================
out=[]; A=out.append
A('<rect width="900" height="540" fill="url(#corkG)"/>')
for i in range(400): A(f'<circle cx="{random.randint(0,900)}" cy="{random.randint(0,540)}" r="{random.uniform(1,3):.1f}" fill="{random.choice(["#000","#fff","#7a5a2a"])}" opacity="{random.uniform(.04,.12):.2f}"/>')
A('<rect x="0" y="0" width="900" height="540" fill="none" stroke="#3b2a15" stroke-width="28"/><rect x="14" y="14" width="872" height="512" fill="none" stroke="#7a5a2a" stroke-width="4"/>')
for (x,y,w,h,r) in [(40,60,140,90,-8),(720,50,150,110,6),(60,380,160,110,4),(700,390,150,100,-5)]:
    A(f'<g transform="rotate({r} {x+w/2} {y+h/2})" filter="url(#sh2)"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#paperG)"/>'+"".join(f'<path d="M{x+12} {y+18+k*12} h{w-24-random.randint(0,30)}" stroke="#8a6a44" stroke-width="1.5" opacity=".7"/>' for k in range(int(h/13)-1))+f'<circle cx="{x+w/2}" cy="{y+6}" r="4" fill="#c93c2c"/></g>')
A('<ellipse cx="450" cy="270" rx="360" ry="240" fill="url(#spotG)"/>')
A('<rect width="900" height="540" fill="url(#vig)"/><rect width="900" height="540" filter="url(#grain)"/>')
S["p4"]=svg("".join(out))

# ================= תקריב 5: השולחן והתשבץ =================
out=[]; A=out.append
A('<rect width="900" height="540" fill="url(#woodG)"/>')
for i in range(40): A(f'<path d="M0 {i*14+random.randint(0,6)} H900" stroke="#000" stroke-opacity="{random.uniform(.05,.14):.2f}" stroke-width="{random.choice([1,1.5,2])}"/>')
A('<rect width="900" height="540" filter="url(#dirt)"/><ellipse cx="450" cy="240" rx="420" ry="280" fill="url(#spotG)"/>')
A('<g filter="url(#shBig)" transform="rotate(-1.5 450 270)"><rect x="90" y="40" width="720" height="470" fill="#fdf8ea"/><rect x="90" y="40" width="720" height="470" fill="url(#paperG)" opacity=".5"/><path d="M802 510 l8 -8 v8z" fill="#000" opacity=".15"/></g>')
A('<g filter="url(#sh2)"><rect x="700" y="470" width="150" height="8" fill="#c98a4b" transform="rotate(-25 775 474)"/><path d="M846 452 l8 -2 l-4 6z" fill="#333" transform="rotate(-25 775 474)"/></g>')
A('<g filter="url(#sh2)"><circle cx="820" cy="120" r="34" fill="none" stroke="url(#brassG)" stroke-width="8"/><circle cx="820" cy="120" r="30" fill="#ffffff" opacity=".12"/><path d="M846 146 l34 34" stroke="#5a3d1e" stroke-width="10" stroke-linecap="round"/></g>')
A('<g filter="url(#sh2)"><path d="M40 440 h26 l-4 40 h-18z" fill="#d38a2a" opacity=".9"/><path d="M40 440h26l-1 10h-24z" fill="#f2c27b"/></g>')
A('<rect width="900" height="540" fill="url(#vig)"/><rect width="900" height="540" filter="url(#grain)"/>')
S["p5"]=svg("".join(out))

# ================= תקריב 6: המכונה =================
out=[]; A=out.append; wall_bg(A)
A('<g filter="url(#shBig)"><rect x="40" y="40" width="820" height="470" fill="url(#ironG)"/><rect x="48" y="48" width="804" height="6" fill="#fff" opacity=".18"/><rect x="60" y="60" width="780" height="8" fill="#0d0d10"/>')
A('<rect x="60" y="80" width="10" height="400" fill="#0d0d10"/><rect x="830" y="80" width="10" height="400" fill="#0d0d10"/>')
A(gear(300,250,120,20,tw=24,sw=3)); A(gear(520,190,74,12,tw=16,sw=3)); A(gear(640,300,50,8,tw=12,sw=3))
for (cx,cy,r) in [(300,250,144),(520,190,90),(640,300,62)]:
    A(f'<rect x="{cx-4}" y="{cy-r-6}" width="8" height="18" fill="#fff"/>')
for (cx,cy,t,r) in [(300,250,"60",120),(520,190,"36",74),(640,300,"24",50)]:
    A(f'<rect x="{cx-26}" y="{cy+r+22}" width="52" height="26" fill="url(#brassG)" stroke="#3b2a15" stroke-width="2"/><text x="{cx}" y="{cy+r+41}" text-anchor="middle" font-size="18" font-weight="800" fill="#2a1708">{t}</text>')
A('<rect x="700" y="80" width="120" height="200" fill="#0d0d10"/><rect x="712" y="92" width="96" height="176" fill="#1a1a1e"/>'+"".join(f'<rect x="{722}" y="{104+i*22}" width="76" height="12" fill="#fdf8ea"/>' for i in range(7)))
A('<rect x="100" y="404" width="700" height="98" fill="url(#brassG)" stroke="#3b2a15" stroke-width="3"/><rect x="108" y="412" width="684" height="82" fill="none" stroke="#3b2a15" stroke-width="1"/>')
A('<g fill="#8d9099"><circle cx="56" cy="56" r="4"/><circle cx="844" cy="56" r="4"/><circle cx="56" cy="494" r="4"/><circle cx="844" cy="494" r="4"/></g></g>')
finish(A); S["p6"]=svg("".join(out))

# ================= תקריב 7: ספר ההזמנות =================
out=[]; A=out.append
A('<rect width="900" height="540" fill="url(#woodD)"/>')
for i in range(40): A(f'<path d="M0 {i*14+random.randint(0,6)} H900" stroke="#000" stroke-opacity="{random.uniform(.05,.14):.2f}" stroke-width="{random.choice([1,1.5,2])}"/>')
A('<ellipse cx="450" cy="240" rx="420" ry="280" fill="url(#spotG)"/>')
A('<g filter="url(#shBig)"><rect x="40" y="30" width="820" height="480" rx="6" fill="url(#leatherG)"/><rect x="46" y="36" width="808" height="468" rx="4" fill="none" stroke="#d9a441" stroke-width="2" opacity=".6"/>')
A('<rect x="60" y="50" width="388" height="440" fill="#f3e7c8"/><rect x="452" y="50" width="388" height="440" fill="#f6ecd2"/><rect x="446" y="50" width="8" height="440" fill="#000" opacity=".35"/>')
for i in range(6): A(f'<rect x="{60-i*2}" y="{50+i*2}" width="388" height="440" fill="none" stroke="#c9b58a" stroke-width="1"/>')
A('<g stroke="#8a6a44" stroke-width="1" opacity=".5">'+"".join(f'<path d="M80 {90+i*24} h348"/>' for i in range(16))+'</g>')
A('<g stroke="#8a6a44" stroke-width="1" opacity=".5">'+"".join(f'<path d="M472 {90+i*24} h348"/>' for i in range(16))+'</g>')
A('<g fill="#1a1a2a" opacity=".85"><ellipse cx="200" cy="470" rx="80" ry="14"/><ellipse cx="300" cy="450" rx="30" ry="8"/><ellipse cx="130" cy="440" rx="20" ry="6"/></g>')
A('<path d="M840 30 v-14 l6 4 l6 -4 v14z" fill="#d9a441"/></g>')
A('<rect width="900" height="540" fill="url(#vig)"/><rect width="900" height="540" filter="url(#grain)"/>')
S["p7"]=svg("".join(out))

# ================= תקריב 8: לוח הבקרה =================
out=[]; A=out.append; wall_bg(A)
A('<g filter="url(#shBig)"><rect x="60" y="40" width="780" height="470" fill="url(#ironG)"/><rect x="68" y="48" width="764" height="6" fill="#fff" opacity=".18"/>')
A('<rect x="90" y="70" width="720" height="60" fill="url(#brassG)" stroke="#3b2a15" stroke-width="3"/><text x="450" y="110" text-anchor="middle" font-size="26" font-weight="800" fill="#2a1708">הדף הנכון · לוח ההדפסה</text>')
for i in range(5):
    y=150+i*58; A(f'<rect x="90" y="{y}" width="720" height="48" fill="#0d0d10"/><rect x="604" y="{y+6}" width="200" height="36" fill="url(#brassG)"/><rect x="96" y="{y+6}" width="494" height="36" fill="#1a1a1e" stroke="#3a3a40" stroke-width="2"/>')
A('<rect x="300" y="450" width="300" height="46" fill="#7b1e1e" stroke="#3b1010" stroke-width="3"/><circle cx="130" cy="470" r="14" fill="#2e7d4f"/><circle cx="170" cy="470" r="14" fill="#b91c1c"/><circle cx="770" cy="470" r="18" fill="url(#brassG)"/>')
A('<g fill="#8d9099"><circle cx="76" cy="56" r="4"/><circle cx="824" cy="56" r="4"/><circle cx="76" cy="494" r="4"/><circle cx="824" cy="494" r="4"/></g></g>')
finish(A); S["p8"]=svg("".join(out))

def prefix(k,s):
    s=re.sub(r'id="([A-Za-z0-9]+)"', lambda m: f'id="{k}-{m.group(1)}"', s)
    s=re.sub(r'url\(#([A-Za-z0-9]+)\)', lambda m: f'url(#{k}-{m.group(1)})', s)
    return s
S={k:prefix(k,v) for k,v in S.items()}
js="// מסכי חדר הבריחה (נוצר אוטומטית על ידי design/scene/gen_scenes.py)\nwindow.PH_SCENES="+json.dumps(S,ensure_ascii=False)+";\n"
open("assets/img/print-house/scenes.js","w").write(js)
print("ok", {k:len(v) for k,v in S.items()})
