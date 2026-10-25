#!/usr/bin/env python3
"""GAN two-pass animation: forward/backward for both passes, rendered frame-by-frame."""
import os, sys, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30

def font(sz, bold=False):
    cands = (["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/System/Library/Fonts/HelveticaNeue.ttc",
              "/System/Library/Fonts/Helvetica.ttc"] if bold else
             ["/System/Library/Fonts/Supplemental/Arial.ttf",
              "/System/Library/Fonts/HelveticaNeue.ttc",
              "/System/Library/Fonts/Helvetica.ttc"])
    for p in cands:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

INK=(22,22,26); MUT=(122,122,132); LINE=(226,222,215); CARD=(255,255,255)
GREEN=(13,148,136); GREEN_L=(232,247,244)
PURPLE=(124,58,237); PURPLE_L=(245,240,255)
ORANGE=(234,88,12); ORANGE_L=(255,244,235)
RED=(225,29,72); GREY=(120,120,130); GREY_L=(243,242,239); BG=(251,250,248)

BOX = {
 'x':    (700,  90, 170, 58),
 'z':    ( 60, 200, 150, 58),
 'G':    (250, 188, 180, 88),
 'xh':   (470, 200, 150, 58),
 'D':    (280, 360, 700, 88),
 'Dx':   (300, 490, 190, 56),
 'Dxh':  (790, 490, 190, 56),
 'loss': (510, 590, 260, 52),
 'w':    (1000,370, 190, 66),
 'theta':(250, 300, 180, 56),
}
PATH = {
 'zG':   [(210,229),(250,229)],
 'Gxh':  [(430,232),(470,229)],
 'xD':   [(785,148),(785,360)],
 'xhD':  [(545,258),(545,360)],
 'DDx':  [(395,448),(395,490)],
 'DDxh': [(885,448),(885,490)],
 'DxL':  [(395,546),(395,616),(510,616)],
 'DxhL': [(885,546),(885,616),(770,616)],
 'LD':   [(640,590),(640,448)],
 'Dw':   [(980,404),(1000,404)],
 'Gt':   [(340,276),(340,300)],
 'Dxh_up':[(545,360),(545,258)],
 'G_up': [(430,232),(340,232),(340,276)],
}

def ease(t): return t*t*(3-2*t)

def ppoint(pts, p):
    segs=[]; tot=0
    for i in range(len(pts)-1):
        dx=pts[i+1][0]-pts[i][0]; dy=pts[i+1][1]-pts[i][1]
        L=math.hypot(dx,dy); segs.append(L); tot+=L
    tgt=p*tot; acc=0
    for i,L in enumerate(segs):
        if acc+L>=tgt or i==len(segs)-1:
            t=(tgt-acc)/L if L>0 else 0; t=max(0.0,min(1.0,t))
            return (pts[i][0]+t*(pts[i+1][0]-pts[i][0]), pts[i][1]+t*(pts[i+1][1]-pts[i][1]))
        acc+=L
    return pts[-1]

def shadow(d, box, r=14, off=4):
    x,y,w,h=box
    d.rounded_rectangle([x+off,y+off,x+w+off,y+h+off], radius=r, fill=(236,234,230))

def rbox(d, box, r=14, fill=CARD, line=LINE, wd=2, dash_y=None):
    shadow(d,box,r)
    d.rounded_rectangle([box[0],box[1],box[0]+box[2],box[1]+box[3]], radius=r, fill=fill, outline=line, width=wd)

def ctext(d, box, txt, f, col=INK, dy=0):
    d.text((box[0]+box[2]/2, box[1]+box[3]/2+dy), txt, font=f, fill=col, anchor="mm")

def badge(d, xy, txt, f, bg, fg=(255,255,255)):
    b=d.textbbox((0,0),txt,font=f); tw=b[2]-b[0]; th=b[3]-b[1]
    x,y=xy
    d.rounded_rectangle([x,y,x+tw+16,y+th+10], radius=7, fill=bg)
    d.text((x+8,y+5-b[1]), txt, font=f, fill=fg)

def arrow(d, pts, col=LINE, wd=3):
    for i in range(len(pts)-1):
        d.line([pts[i],pts[i+1]], fill=col, width=wd)

def head(d, pts, col, size=11):
    (x1,y1),(x2,y2)=pts[-2],pts[-1]
    ang=math.atan2(y2-y1,x2-x1)
    for s in (+1,-1):
        d.line([(x2,y2),(x2-size*math.cos(ang- s*0.5), y2-size*math.sin(ang- s*0.5))], fill=col, width=3)

def flow(d, pts, col, prog, nd=5, r=6, gap=0.14):
    for k in range(nd):
        p=prog-k*gap
        if 0.0<=p<=1.0:
            x,y=ppoint(pts,ease(p))
            a=1.0-0.45*k/max(nd-1,1)
            c=tuple(int(col[i]*a + BG[i]*(1-a)) for i in range(3))
            d.ellipse([x-r,y-r,x+r,y+r], fill=c)

PHASES = [
 (0,   170, "fwd1", "PASS 1  ·  FORWARD",  "Discriminator trains  —  theta FROZEN"),
 (170, 330, "bwd1", "PASS 1  ·  BACKWARD", "gradient STOPS at D  —  theta never reached"),
 (330, 450, "fwd2", "PASS 2  ·  FORWARD",  "Generator trains  —  w FROZEN"),
 (450, 600, "bwd2", "PASS 2  ·  BACKWARD", "gradient passes THROUGH D  —  Jacobian used, weights frozen"),
]
TOTAL=600

def build(variant):
    wgan = variant=="wgan"
    net2  = "T_w" if wgan else "D_w"
    net2full = "CRITIC" if wgan else "DISCRIMINATOR"
    loss1 = "loss_T = T(x_hat) - T(x)" if wgan else "loss_D = -[log D(x) + log(1-D(x_hat))]"
    loss2 = "loss_G = -T(x_hat)" if wgan else "loss_G = -log D(x_hat)"

    def frame(fi):
        img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
        f11,f12,f13,f14,f15=font(11),font(12),font(13),font(14),font(15)
        f16b,f20b,f22b,f26b=font(16,1),font(20,1),font(22,1),font(26,1)

        # ---- background grid tint
        for yy in range(0,H,40):
            d.line([(0,yy),(W,yy)], fill=(246,245,242))

        phase=None
        for a,b,k,t,s in PHASES:
            if a<=fi<b: phase=(a,b,k,t,s); break
        a,b,k,ptitle,psub = phase
        local=(fi-a)/max(b-a-1,1)

        # ---- header
        d.rectangle([0,0,W,74], fill=(22,22,26))
        d.text((28,20), "GAN training — two passes, forward and backward", font=f16b, fill=(255,255,255))
        d.text((28,44), ptitle, font=f13, fill=(253,186,116))
        d.text((560,45), psub, font=f12, fill=(190,190,200))
        tag = "WGAN" if wgan else "VANILLA GAN"
        bw=d.textbbox((0,0),tag,font=f13); tw=bw[2]-bw[0]
        d.rounded_rectangle([W-28-tw-20,26,W-28,54], radius=8, fill=(124,58,237) if not wgan else (234,88,12))
        d.text((W-28-tw-10,32), tag, font=f13, fill=(255,255,255))

        # ---- which boxes are hot this phase
        hot={}   # key -> "train" | "frozen" | "pass"
        if k=="fwd1":  hot={'G':'frozen','D':'train'}
        if k=="bwd1":  hot={'G':'frozen','D':'train'}
        if k=="fwd2":  hot={'G':'train','D':'frozen'}
        if k=="bwd2":  hot={'G':'train','D':'pass'}

        # ---- arrows (base)
        base=[('zG',),('Gxh',),('xD',),('xhD',),('DDx',),('DDxh',),('DxL',),('DxhL',)]
        if k in ("fwd1","bwd1"):
            for (n,) in base:
                arrow(d,PATH[n],LINE,3); head(d,PATH[n],LINE)
        if k=="fwd2":
            for n in ["zG","Gxh","xhD","DDx","DDxh"]:
                arrow(d,PATH[n],LINE,3); head(d,PATH[n],LINE)
        if k=="bwd2":
            for n in ["zG","Gxh","xhD"]:
                arrow(d,PATH[n],LINE,3)
            for n in ["Gxh","xhD"]:
                arrow(d,PATH[n],(226,222,215),3)

        # ---- boxes
        def draw_net(key,label,sub,hotstate,base_col,light):
            bx=BOX[key]
            fill,line=CARD,LINE
            if hotstate=="train": fill,line=light,base_col
            if hotstate=="frozen": fill,line=GREY_L,(190,188,184)
            if hotstate=="pass":  fill,line=(250,250,252),(190,188,184)
            rbox(d,bx,14,fill,line,3 if hotstate in ("train",) else 2)
            ctext(d,bx,label,f20b if key in("D",) else f16b, INK if hotstate!="frozen" else MUT, -10)
            ctext(d,bx,sub,f12,MUT,14)
            if hotstate=="train":  badge(d,(bx[0]+bx[2]-72,bx[1]-13),"TRAINING",f11,ORANGE)
            if hotstate=="frozen": badge(d,(bx[0]+bx[2]-64,bx[1]-13),"FROZEN",f11,GREY)
            if hotstate=="pass":   badge(d,(bx[0]+bx[2]-96,bx[1]-13),"PASS-THROUGH",f11,(80,80,92))

        draw_net('G', "G_theta", "generator", hot.get('G'), GREEN, GREEN_L)
        draw_net('D', net2full, net2+"   (weights w)", hot.get('D'), PURPLE, PURPLE_L)

        # io boxes
        for key,label,sub in [('x',"x ~ P_x","real data"),('z',"z ~ N(0,I)","noise"),
                              ('xh',"x_hat","fake sample")]:
            rbox(d,BOX[key],12,CARD,LINE,2)
            ctext(d,BOX[key],label,f14,INK,-9); ctext(d,BOX[key],sub,f11,MUT,12)

        for key,label in [('Dx',"D(x)" if not wgan else "T(x)"),('Dxh',"D(x_hat)" if not wgan else "T(x_hat)")]:
            rbox(d,BOX[key],12,CARD,LINE,2); ctext(d,BOX[key],label,f15,INK)

        # loss box
        rbox(d,BOX['loss'],12,(22,22,26),(22,22,26),2)
        ctext(d,BOX['loss'], loss1 if k in("fwd1","bwd1") else loss2, f12, (255,255,255))

        # w / theta badges
        rbox(d,BOX['w'],12,CARD,LINE,2); ctext(d,BOX['w'],"update w",f14,INK,-9); ctext(d,BOX['w'],"(D's weights)" if not wgan else "(critic weights)",f11,MUT,12)
        if wgan and k=="bwd1":
            rbox(d,(1000,300,190,58),12,(255,244,235),ORANGE,2)
            ctext(d,(1000,300,190,58),"then CLIP",f14,ORANGE,-9); ctext(d,(1000,300,190,58),"w = clip(w,-c,c)",f11,ORANGE,12)
            arrow(d,[(1095,358),(1095,370)],ORANGE,3); head(d,[(1095,358),(1095,370)],ORANGE)
        rbox(d,BOX['theta'],12,CARD,LINE,2); ctext(d,BOX['theta'],"update theta",f14,INK,-9); ctext(d,BOX['theta'],"(G's weights)",f11,MUT,12)
        arrow(d,PATH['Gt'],(200,198,194),3)

        # ---- animated flow
        prog=ease(min(1.0, local*1.25))
        if k=="fwd1":
            flow(d,PATH['zG'],GREEN,prog)
            flow(d,PATH['Gxh'],GREEN,max(0,prog-0.15))
            flow(d,PATH['xD'],ORANGE,max(0,prog-0.28))
            flow(d,PATH['xhD'],ORANGE,max(0,prog-0.28))
            flow(d,PATH['DDx'],PURPLE,max(0,prog-0.48))
            flow(d,PATH['DDxh'],PURPLE,max(0,prog-0.48))
            flow(d,PATH['DxL'],RED,max(0,prog-0.68),nd=3)
            flow(d,PATH['DxhL'],RED,max(0,prog-0.68),nd=3)
        elif k=="bwd1":
            flow(d,PATH['LD'],RED,prog,nd=6)
            flow(d,PATH['Dw'],RED,max(0,prog-0.45),nd=4)
            # the wall
            wall=min(1.0,local*3)
            if wall>0:
                d.text((545,272),"GRADIENT CANNOT PASS",font=f11,fill=RED,anchor="mm")
                d.line([(518,282),(572,346)],fill=RED,width=5)
                d.line([(572,282),(518,346)],fill=RED,width=5)
        elif k=="fwd2":
            flow(d,PATH['zG'],GREEN,prog)
            flow(d,PATH['Gxh'],GREEN,max(0,prog-0.16))
            flow(d,PATH['xhD'],ORANGE,max(0,prog-0.3))
            flow(d,PATH['DDxh'],PURPLE,max(0,prog-0.5))
            flow(d,PATH['DxhL'],RED,max(0,prog-0.68),nd=3)
        elif k=="bwd2":
            flow(d,PATH['LD'],RED,prog,nd=6)
            flow(d,PATH['Dxh_up'],RED,max(0,prog-0.3),nd=4)
            flow(d,PATH['Gxh'][::-1],GREEN,max(0,prog-0.5),nd=3)
            flow(d,PATH['Gt'],GREEN,max(0,prog-0.72),nd=3)
            if local>0.35:
                d.text((600,300),"Jacobian used · weights frozen",font=f12,fill=PURPLE,anchor="mm")
            if local>0.80:
                badge(d,(1050,600),"theta updated",font(13,1),GREEN)

        # ---- per-phase annotation strip
        notes={
          "fwd1": ("D sees both real x and fake x_hat   ->   loss_D","Fake is produced by a FROZEN generator"),
          "bwd1": ("gradient flows loss -> D -> w","and STOPS. G_theta never learns on this pass."),
          "fwd2": ("z -> G -> x_hat -> frozen D -> loss_G","D is now a fixed measuring stick"),
          "bwd2": ("loss_G -> through D -> x_hat -> G -> theta","D's derivative is used, its weights are not"),
        }[k]
        d.rounded_rectangle([28,652,W-28,706], radius=10, fill=(255,255,255), outline=LINE, width=1)
        d.text((44,662), notes[0], font=f13, fill=INK)
        d.text((44,684), notes[1], font=f12, fill=MUT)

        # gradient-magnitude callout
        if wgan:
            msg = "grad = -w_d   CONSTANT  (never shrinks)"
            col = GREEN
        else:
            msg = "grad = -(1-D)·w_d   -> 0 when D is confident"
            col = RED
        if k in ("bwd2",):
            d.text((W-44,662), msg, font=f12, fill=col, anchor="ra")
            d.text((W-44,684), "generator's gradient w.r.t. x_hat", font=f11, fill=MUT, anchor="ra")

        # phase progress bar
        x0,x1=28,W-28
        d.rounded_rectangle([x0,714,x1,718],radius=2,fill=(228,226,222))
        pw=int((x1-x0)*((fi+1)/TOTAL))
        d.rounded_rectangle([x0,714,x0+pw,718],radius=2,fill=(124,58,237) if not wgan else (234,88,12))
        return img

    return frame

def render(variant, outpath):
    f=build(variant)
    vw=cv2.VideoWriter(outpath, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W,H))
    assert vw.isOpened(), "VideoWriter failed"
    for i in range(TOTAL):
        im=f(i)
        vw.write(cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR))
        if i%120==0: print("  %s frame %d/%d" % (variant,i,TOTAL)); sys.stdout.flush()
    vw.release()
    print("  ->", outpath, round(os.path.getsize(outpath)/1024), "KB")

if __name__=="__main__":
    os.makedirs("/tmp/ganvid", exist_ok=True)
    render("gan",  "/tmp/ganvid/gan_two_pass.mp4")
    render("wgan", "/tmp/ganvid/wgan_two_pass.mp4")
