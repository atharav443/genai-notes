#!/usr/bin/env python3
"""GAN/WGAN training animation v2 — every node shows its VALUE, revealed in sync with the flow."""
import os, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 900, 30
TOTAL = 1200            # 40 s = 10 s per phase

def font(sz, bold=False):
    base = "/System/Library/Fonts/"
    cands = [base+"Supplemental/Arial Bold.ttf", base+"HelveticaNeue.ttc"] if bold else \
            [base+"Supplemental/Arial.ttf", base+"HelveticaNeue.ttc"]
    for p in cands:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

INK=(24,24,30); MUT=(120,120,132); LINE=(222,220,216); BG=(251,250,247)
GREEN=(13,148,136); GREEN_L=(228,247,244)
PURPLE=(124,58,237); PURPLE_L=(242,238,255)
ORANGE=(234,88,12); ORANGE_L=(255,242,235)
RED=(220,38,60); GREY=(150,150,158); GREY_L=(242,241,238)
BLUE=(37,99,235); AMBER=(217,119,6)

def ease(t): return t*t*(3-2*t)

# ---------------- geometry ----------------
# node boxes: (x, y, w, h)
NB = {
 'z':  (46,  130, 150, 64),
 'x':  (1084,130, 150, 64),
 'G':  (300, 112, 210, 100),
 'xh': (580, 130, 160, 64),
 'D':  (250, 300, 780, 100),
 'Dx': (150, 448, 230, 64),
 'Dxh':(900, 448, 230, 64),
 'loss':(500, 560, 280, 56),
 'w':  (1010,320, 210, 64),
 'th': (300, 280, 150, 56),
}
# polyline paths (forward direction)
PTH = {
 'zG':   [(196,162),(300,162)],
 'Gxh':  [(510,162),(580,162)],
 'xD':   [(1159,194),(1159,350)],
 'xhD':  [(660,194),(660,350)],
 'DDx':  [(365,400),(365,448)],
 'DDxh': [(965,400),(965,448)],
 'DxL':  [(265,512),(265,590),(500,590)],
 'DxhL': [(1015,512),(1015,590),(780,590)],
 'LD':   [(640,560),(640,460)],
 'Dw':   [(1220,352),(1010,352)],
 'Gt':   [(330,256),(330,280)],
 'Dup':  [(660,350),(660,162)],
 'Gup':  [(510,162),(405,162),(405,256)],
}

def seg_pt(pts, p):
    tot=0; Ls=[]
    for i in range(len(pts)-1):
        L=math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]); Ls.append(L); tot+=L
    tgt=p*tot; acc=0
    for i,L in enumerate(Ls):
        if acc+L>=tgt or i==len(Ls)-1:
            t=(tgt-acc)/L if L>0 else 0; t=max(0,min(1,t))
            return (pts[i][0]+t*(pts[i+1][0]-pts[i][0]), pts[i][1]+t*(pts[i+1][1]-pts[i][1]))
        acc+=L
    return pts[-1]

def shadow(d, b, r=13, off=4):
    x,y,w,h=b; d.rounded_rectangle([x+off,y+off,x+w+off,y+h+off], radius=r, fill=(235,233,229))

def box(d, key, fill=CARD if False else (255,255,255), line=LINE, wd=2, glow=False):
    b=NB[key]; shadow(d,b)
    if glow: d.rounded_rectangle([b[0]-4,b[1]-4,b[0]+b[2]+4,b[1]+b[3]+4], radius=16, outline=line, width=4)
    d.rounded_rectangle([b[0],b[1],b[0]+b[2],b[1]+b[3]], radius=13, fill=fill, outline=line, width=wd)

def center(d, key, lines, col=INK, fs=(16,12), dy=(0,14)):
    b=NB[key]; cx=b[0]+b[2]/2; cy=b[1]+b[3]/2
    f_big, f_small = font(fs[0],1), font(fs[1])
    if len(lines)==1:
        d.text((cx,cy+dy[0]), lines[0], font=f_big, fill=col, anchor="mm")
    else:
        d.text((cx,cy+dy[0]), lines[0], font=f_big, fill=col, anchor="mm")
        d.text((cx,cy+dy[1]), lines[1], font=f_small, fill=MUT, anchor="mm")

def badge(d, xy, txt, fs, bg, fg=(255,255,255)):
    f=font(fs,1); bb=d.textbbox((0,0),txt,font=f); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
    d.rounded_rectangle([xy[0],xy[1],xy[0]+tw+18,xy[1]+th+12], radius=8, fill=bg)
    d.text((xy[0]+9,xy[1]+6-bb[1]), txt, font=f, fill=fg)

def arrow(d, pts, col=LINE, wd=3):
    for i in range(len(pts)-1): d.line([pts[i],pts[i+1]], fill=col, width=wd)

def head(d, pts, col, s=12):
    (x1,y1),(x2,y2)=pts[-2],pts[-1]; a=math.atan2(y2-y1,x2-x1)
    for k in (1,-1): d.line([(x2,y2),(x2-s*math.cos(a-k*.5), y2-s*math.sin(a-k*.5))], fill=col, width=3)

def dots(d, pts, col, prog, nd=5, gap=0.13, r=7):
    for k in range(nd):
        p=prog-k*gap
        if 0<=p<=1:
            x,y=seg_pt(pts,ease(p)); a=1-.45*k/max(nd-1,1)
            c=tuple(int(col[i]*a+BG[i]*(1-a)) for i in range(3))
            d.ellipse([x-r,y-r,x+r,y+r], fill=c)

# ---------------- phase definitions ----------------
# each phase: (start, end, key, title, subtitle, [computation lines], node-reveals)
# computation line: (reveal_frac, [text lines], color)
def phases(variant):
    w = variant=="wgan"
    D2 = "T" if w else "D"
    return [
      # ---------------- PASS 1 FORWARD ----------------
      (0, 300, "fwd1", "PASS 1 · FORWARD", "train the "+("critic T" if w else "discriminator D")+"  —  G frozen",
       [
         (0.12, ["x̂ = w_g·z + b_g = 0.8 × 0.5 + 0.1 = 0.5"], GREEN),
         (0.24, ["x = 2.0    (real)", "x̂ = 0.5    (fake)"], INK),
         (0.34, [D2+"(x) = σ(1.0×2.0 + 0) = σ(2.0) = 0.8808" if not w else
                 "T(x) = 1.0×2.0 + 0 = 2.0"], BLUE),
         (0.46, [D2+"(x̂) = σ(1.0×0.5 + 0) = σ(0.5) = 0.6225" if not w else
                 "T(x̂) = 1.0×0.5 + 0 = 0.5"], ORANGE),
         (0.58, ["loss_D = −[ log D(x) + log(1−D(x̂)) ]" if not w else
                 "loss_T = T(x̂) − T(x)"], RED),
         (0.70, ["= −[ log 0.8808 + log 0.3775 ]" if not w else
                 "= 0.5 − 2.0"], RED),
         (0.82, ["= −[ −0.1269 − 0.9741 ] = 1.1010" if not w else
                 "= −1.5000"], RED),
       ],
       {'z':0.05,'x':0.05,'G':0.10,'xh':0.15,'D':0.30,'Dx':0.36,'Dxh':0.48,'loss':0.84}),
      # ---------------- PASS 1 BACKWARD ----------------
      (300, 600, "bwd1", "PASS 1 · BACKWARD", "gradient: loss → "+D2+" → w   (stops there)",
       [
         (0.12, ["∂loss/∂w_d = −(1−D(x))·x + D(x̂)·x̂" if not w else
                 "∂loss/∂w_d = x̂ − x"], RED),
         (0.24, ["= −(0.1192)(2.0) + 0.6225(0.5)" if not w else
                 "= 0.5 − 2.0"], RED),
         (0.36, ["= −0.2384 + 0.3112 = 0.0728" if not w else
                 "= −1.5000"], RED),
         (0.50, ["w_d ← 1.0 − 0.1(0.0728) = 0.9927" if not w else
                 "w_d ← 1.0 − 0.1(−1.5) = 1.15"], GREEN),
         (0.62, ["b_d ← 0.0 − 0.1(0.5033) = −0.0503" if not w else
                 "b_d ← 0.0 − 0.1(0) = 0.0"], GREEN),
         (0.74, (["CLIP:  w_d = 1.15 → clip → 1.00"] if w else
                 ["gradient STOPS here — G_θ is never reached"]), (ORANGE if w else RED)),
         (0.88, (["this is the 1-Lipschitz constraint"] if w else
                 ["G_θ stays frozen — its weights unchanged"]), (ORANGE if w else MUT)),
       ],
       {'z':0.02,'x':0.02,'G':0.02,'xh':0.02,'D':0.02,'Dx':0.02,'Dxh':0.02,'loss':0.05,'w':0.40,'th':0.02}),
      # ---------------- PASS 2 FORWARD ----------------
      (600, 900, "fwd2", "PASS 2 · FORWARD", "train the generator  —  "+D2+" frozen",
       [
         (0.12, ["x̂ = w_g·z + b_g = 0.8 × 0.5 + 0.1 = 0.5"], GREEN),
         (0.26, [D2+"(x̂) = 0.6225   (the frozen net scores it)" if not w else
                 "T(x̂) = 0.5"], ORANGE),
         (0.42, ["loss_G = −log D(x̂)" if not w else "loss_G = −T(x̂)"], RED),
         (0.56, ["= −log(0.6225) = 0.4741" if not w else "= −0.5"], RED),
         (0.70, ["note: no real x here — only fakes"], MUT),
         (0.84, [D2+" is now a FIXED measuring stick"], MUT),
       ],
       {'z':0.05,'G':0.08,'xh':0.14,'D':0.22,'Dxh':0.28,'loss':0.58}),
      # ---------------- PASS 2 BACKWARD ----------------
      (900, 1200, "bwd2", "PASS 2 · BACKWARD", "gradient passes THROUGH "+D2+" → x̂ → G → θ",
       [
         (0.10, ["∂loss/∂x̂ = −(1−D(x̂))·w_d" if not w else
                 "∂loss/∂x̂ = −w_d"], RED),
         (0.22, ["= −(0.3775)(1.0) = −0.3775" if not w else
                 "= −1.0"], RED),
         (0.34, ["∂loss/∂w_g = −0.3775 × z = −0.1888" if not w else
                 "∂loss/∂w_g = −1.0 × 0.5 = −0.5"], GREEN),
         (0.48, ["w_g ← 0.8 − 0.1(−0.1888) = 0.8189" if not w else
                 "w_g ← 0.8 − 0.1(−0.5) = 0.85"], GREEN),
         (0.62, ["b_g ← 0.1 − 0.1(−0.3775) = 0.1378" if not w else
                 "b_g ← 0.1 − 0.1(−1.0) = 0.2"], GREEN),
         (0.74, ([D2+"'s Jacobian is USED, but its weights are NOT updated"]), PURPLE),
         (0.88, ([("grad = −(1−D)·w_d  →  0 when D is confident" if not w else
                   "grad = −w_d  CONSTANT  (never shrinks)")]), (RED if not w else GREEN)),
       ],
       {'z':0.02,'G':0.02,'xh':0.02,'D':0.02,'Dxh':0.02,'loss':0.05,'th':0.50}),
    ]

def render(variant, outpath):
    P = phases(variant)
    w = variant=="wgan"; D2="T" if w else "D"
    net2 = "CRITIC  T_w" if w else "DISCRIMINATOR  D_w"

    f11,f12,f13,f14,f15 = font(11),font(12),font(13),font(14),font(15)
    f16b,f20b,f24b = font(16,1),font(20,1),font(24,1)

    vw=cv2.VideoWriter(outpath, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W,H))
    assert vw.isOpened()

    for fi in range(TOTAL):
        img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
        # find phase
        phase=None
        for (a,b,k,t,s,lines,rev) in P:
            if a<=fi<b: phase=(a,b,k,t,s,lines,rev); break
        a,b,k,ptitle,psub,clines,rev=phase
        local=(fi-a)/max(b-a-1,1)
        prog=ease(min(1.0, local*1.25))

        # ---- header
        d.rectangle([0,0,W,72], fill=(22,22,26))
        d.text((30,20), ("WGAN" if w else "VANILLA GAN")+" — every value, forward & backward", font=f16b, fill=(255,255,255))
        d.text((30,43), ptitle, font=f13, fill=(253,186,116))
        d.text((620,44), psub, font=f12, fill=(190,190,200))
        tag = "FROZEN: G_θ" if k in("fwd1","bwd1") else ("FROZEN: "+D2+"_w")
        badge(d,(W-260,18), tag, 12, GREY)

        # ---- network boxes (color by phase)
        def state(key, hot=True):
            if k in("fwd1","bwd1"):
                if key=='D': return ('train', PURPLE_L, PURPLE) if hot else (None,)
                if key in ('z','x','G','xh'): return ('frozen', GREY_L, GREY)
            else:
                if key=='G': return ('train', GREEN_L, GREEN) if hot else (None,)
                if key=='D': return ('pass', (250,250,252), (180,178,186))
                if key in ('z','xh'): return (None, CARD, LINE)
            return (None, CARD, LINE)

        # G box
        s=state('G'); fill,line=(s[1],s[2]) if s[0] else (CARD,LINE)
        box(d,'G',fill,line,2, s[0]=='train')
        center(d,'G',["G_θ","w_g=0.8 · b_g=0.1"], INK if s[0]!='frozen' else MUT)
        if s[0]=='frozen': badge(d,(NB['G'][0]+NB['G'][2]-80,NB['G'][1]-14),"FROZEN",11,GREY)
        if s[0]=='train': badge(d,(NB['G'][0]+NB['G'][2]-88,NB['G'][1]-14),"TRAINING",11,ORANGE)

        # D box
        s=state('D'); fill,line=(s[1],s[2]) if s[0] else (CARD,LINE)
        box(d,'D',fill,line,2, s[0]=='train')
        center(d,'D',[net2, "w_d=1.0 · b_d=0.0" + ("   →  sigmoid" if not w else "   →  linear")], INK)
        if s[0]=='train': badge(d,(NB['D'][0]+NB['D'][2]-88,NB['D'][1]-14),"TRAINING",11,ORANGE)
        if s[0]=='pass': badge(d,(NB['D'][0]+NB['D'][2]-120,NB['D'][1]-14),"FROZEN (pass-through)",11,GREY)

        # io boxes
        for key,lbl,sub in [('z',"z = 0.5","noise ~ N(0,I)"),('x',"x = 2.0","real data"),('xh',"x̂ = 0.5","fake sample")]:
            box(d,key); center(d,key,[lbl,sub])
        for key,lbl in [('Dx', D2+"(x) = "+("0.8808" if not w else "2.0")),
                        ('Dxh', D2+"(x̂) = "+("0.6225" if not w else "0.5"))]:
            box(d,key); center(d,key,[lbl])
        # loss box
        box(d,'loss',(22,22,26),(22,22,26),2)
        lv = ("loss_D = 1.1010" if not w else "loss_T = −1.5") if k in("fwd1","bwd1") else ("loss_G = 0.4741" if not w else "loss_G = −0.5")
        center(d,'loss',[lv],(255,255,255),fs=(15,12))
        # update boxes
        box(d,'w'); center(d,'w',["update w_d"], INK, fs=(14,11))
        box(d,'th'); center(d,'th',["update θ"], INK, fs=(14,11))

        # arrows
        if k in ("fwd1","bwd1"):
            for n in ['zG','Gxh','xD','xhD','DDx','DDxh','DxL','DxhL']:
                arrow(d,PTH[n],LINE,3); head(d,PTH[n],LINE)
            arrow(d,PTH['Gt'],(210,200,196),3)
        elif k=="fwd2":
            for n in ['zG','Gxh','xhD','DDxh','DxhL']:
                arrow(d,PTH[n],LINE,3); head(d,PTH[n],LINE)
        else:  # bwd2
            for n in ['zG','Gxh','xhD']:
                arrow(d,PTH[n],LINE,3)
            arrow(d,PTH['Gt'],(210,200,196),3)

        # animated flow
        if k=="fwd1":
            dots(d,PTH['zG'],GREEN,prog); dots(d,PTH['Gxh'],GREEN,max(0,prog-.14))
            dots(d,PTH['xD'],ORANGE,max(0,prog-.26)); dots(d,PTH['xhD'],ORANGE,max(0,prog-.26))
            dots(d,PTH['DDx'],BLUE,max(0,prog-.42)); dots(d,PTH['DDxh'],ORANGE,max(0,prog-.52))
            dots(d,PTH['DxL'],RED,max(0,prog-.68),nd=3); dots(d,PTH['DxhL'],RED,max(0,prog-.68),nd=3)
        elif k=="bwd1":
            dots(d,PTH['LD'],RED,prog,nd=6); dots(d,PTH['Dw'],RED,max(0,prog-.5),nd=4)
            if not w:
                d.line([(540,330),(740,400)],fill=RED,width=6)
                d.line([(740,330),(540,400)],fill=RED,width=6)
                d.text((640,318),"CANNOT PASS",font=f13,fill=RED,anchor="mm")
            else:
                badge(d,(NB['w'][0]+NB['w'][2]-120,NB['w'][1]-40),"then CLIP",12,ORANGE)
        elif k=="fwd2":
            dots(d,PTH['zG'],GREEN,prog); dots(d,PTH['Gxh'],GREEN,max(0,prog-.15))
            dots(d,PTH['xhD'],ORANGE,max(0,prog-.3)); dots(d,PTH['DDxh'],ORANGE,max(0,prog-.5))
            dots(d,PTH['DxhL'],RED,max(0,prog-.68),nd=3)
        elif k=="bwd2":
            dots(d,PTH['LD'],RED,prog,nd=6); dots(d,PTH['Dup'],RED,max(0,prog-.3),nd=4)
            dots(d,PTH['Gup'],GREEN,max(0,prog-.55),nd=3); dots(d,PTH['Gt'],GREEN,max(0,prog-.78),nd=3)
            if local>0.35: d.text((640,300),D2+"'s Jacobian used, weights frozen",font=f13,fill=PURPLE,anchor="mm")

        # ---- computation panel
        d.rounded_rectangle([40,640,W-40,884], radius=12, fill=(255,255,255), outline=LINE, width=2)
        d.text((56,652),"COMPUTATION", font=font(11,1), fill=MUT)
        y=680
        for frac, txts, col in clines:
            if local>=frac:
                d.text((56, y), txts[0], font=font(15,1), fill=col)
                y += 27
        # phase progress
        d.rounded_rectangle([40,888,W-40,892], radius=2, fill=(228,226,222))
        pw=int((W-80)*((fi+1)/TOTAL))
        d.rounded_rectangle([40,888,40+pw,892], radius=2, fill=(PURPLE if not w else ORANGE))

        vw.write(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
        if fi%200==0: print("  %s %d/%d"%(variant,fi,TOTAL)); __import__("sys").stdout.flush()
    vw.release()
    print("  ->", outpath, round(os.path.getsize(outpath)/1024),"KB")

if __name__=="__main__":
    os.makedirs("/tmp/ganvid2", exist_ok=True)
    render("gan",  "/tmp/ganvid2/gan_v2.mp4")
    render("wgan", "/tmp/ganvid2/wgan_v2.mp4")
