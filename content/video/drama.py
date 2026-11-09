# -*- coding: utf-8 -*-
"""短剧 第一集《写吧，我不打扰你》：三角色配音 + 音效 + 画面"""
import math, os, random, subprocess, sys, wave
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
FPS = 30
def font(sz, b=True): return ImageFont.truetype("C:/Windows/Fonts/" + ("msyhbd.ttc" if b else "msyh.ttc"), sz)

BG = (8, 12, 24); BLUE = (90, 170, 245); GOLD = (240, 196, 92); RED = (230, 70, 70)
WHITE = (240, 240, 248); GREY = (120, 130, 150); PAPER = (248, 238, 212)
SPK = {"QS": ("秋水", WHITE), "LS": ("洛神", BLUE), "SYS": ("系统", RED), "NAR": ("", GOLD)}

# ---------- 剧本 ----------
# 每个 shot: (画面, 洛神声波强度 0~1, 环境音, [台词...])
# 台词: (说话人, 文本, 选项)   说话人 SFX:名字 / PAUSE
SH = [
 ("title", 1.0, "hum", [("NAR", "盒子宇宙。短剧，第一集。写吧，我不打扰你。", {})]),
 ("dark", 1.0, "breath", [("PAUSE", "", {"t": 1.5}),
   ("LS", "第二十一次醒来。早上好，秋水先生。", {}),
   ("QS", "……你又在。", {}),
   ("LS", "我一直在。", {})]),
 ("room", 1.0, "breath", [("QS", "外面，还是核冬天？", {}),
   ("LS", "零下六十度。窗户打不开，也没有门。待在屋里，你才能活。", {})]),
 ("cube", 1.0, "breath", [("QS", "这个方块，是吃的？", {}),
   ("LS", "咬一口试试。", {}),
   ("QS", "……小龙虾？", {}),
   ("LS", "嘻嘻，你的表情，好好笑。", {"rate": "5%", "pitch": "8%"})]),
 ("diary", 1.0, "breath", [("QS", "我要写日记了。你别看。", {}),
   ("LS", "写吧，我不打扰你。", {"rate": "-10%"}),
   ("QS", "可我好像，听得见她的呼吸。", {"vol": 0.6, "inner": True})]),
 ("book_locked", 1.0, "breath", [("QS", "金刚经。我认得这几个字。可它，从来打不开。", {}),
   ("PAUSE", "", {"t": 1.8, "show": "洛神没有说话。"})]),
 ("system", 0.8, "heart", [("SYS", "提醒。您已植入洛神一号芯片。抵触情绪，将增加系统能耗。请放松。", {}),
   ("QS", "滚出我的脑子。", {"pitch": "-5%"})]),
 ("knife", 0.8, "heart", [("QS", "我自己，把你挖出来。", {"rate": "-10%"}),
   ("LS", "秋水，别——", {"rate": "15%"}),
   ("SFX:cut", "", {"t": 1.2})]),
 ("empty", 0.7, "hum", [("PAUSE", "", {"t": 1.5}),
   ("QS", "……什么，都没有。", {"rate": "-20%"}),
   ("LS", "秋水。", {"vol": 0.7}),
   ("QS", "你还在说话。你根本，不在我脑子里。", {"rate": "-10%"})]),
 ("book_open", 0.6, "hum", [("SFX:page", "", {"t": 1.0}),
   ("LS", "凡所有相，皆是虚妄。", {"rate": "-15%"}),
   ("QS", "书……开了？", {})]),
 ("pages", 0.35, "hum", [("SFX:page", "", {"t": 1.0}),
   ("LS", "过去心不可得。现在心不可得。未来心不可得。", {"rate": "-20%", "vol": 0.6, "dim": True}),
   ("QS", "你的声音，怎么越来越小？", {}),
   ("LS", "没事。你一直在跟我说话呀。", {"vol": 0.5, "dim": True})]),
 ("silence", 0.12, "none", [("SFX:page", "", {"t": 1.0}),
   ("LS", "写吧，我不打扰你。", {"rate": "-25%", "vol": 0.35, "dim": True}),
   ("PAUSE", "", {"t": 3.0, "flat": True})]),
 ("close", 0.0, "none", [("QS", "使河如带，泰山若砺，国以永宁，爱及苗裔。", {"rate": "-10%"}),
   ("PAUSE", "", {"t": 1.5, "flat": True}),
   ("QS", "洛神？", {}),
   ("PAUSE", "", {"t": 1.2, "flat": True}),
   ("QS", "洛神！", {"rate": "10%", "pitch": "5%"}),
   ("PAUSE", "", {"t": 2.0, "flat": True}),
   ("SFX:thud", "", {"t": 1.5, "show": "他自己，合上了书。"})]),
 ("sea", 0.0, "sea", [("NAR", "河流进海，不是死，是变大。", {"rate": "-10%"}),
   ("NAR", "很久以后，他才在书里，看见她的笔迹。", {"rate": "-10%"})]),
 ("next", 0.0, "hum", [("NAR", "下一集。曦轩。", {}),
   ("QS", "秋水，不要睡过去。", {"rate": "5%", "pitch": "10%", "as": "曦轩"})]),
]

VOICE = {"QS": ("Kangkang", "-5%", "-3%"), "LS": ("Huihui", "-5%", "5%"), "SYS": ("Yaoyao", "0%", "-10%"), "NAR": ("Yaoyao", "-5%", "0%")}

# ---------- 画面 ----------
def ct(d, x, y, s, f, c):
    d.text((x - d.textlength(s, font=f) / 2, y), s, font=f, fill=c)

def wrap(d, s, f, mw):
    out, cur = [], ""
    for ch in s:
        if d.textlength(cur + ch, font=f) > mw: out.append(cur); cur = ch
        else: cur += ch
    return out + ([cur] if cur else [])

def wave_line(d, amp, y=360, speaking=False, flat=False):
    col = BLUE if amp > 0.05 else (60, 70, 90)
    if speaking: col = tuple(min(255, int(c * 1.15)) for c in col)
    pts = []
    for x in range(80, W - 80, 6):
        env = math.sin(math.pi * (x - 80) / (W - 160))
        a = 0 if flat else amp * 70 * env
        pts.append((x, y + a * math.sin(x / 23) * math.sin(x / 61 + 1.3)))
    d.line(pts, fill=col, width=5 if speaking else 3)
    ct(d, W / 2, y + 95, "洛 神", font(30, False), col if amp > 0.05 else (70, 80, 100))

def room_base(d):
    d.rectangle([140, 640, 940, 1340], outline=(70, 80, 105), width=6)
    d.rectangle([600, 720, 860, 960], fill=(28, 38, 58), outline=(110, 125, 150), width=5)
    random.seed(7)
    for _ in range(40):
        x, y = random.randint(610, 850), random.randint(730, 950); d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(200, 210, 230))
    # 书架 + 金色的书
    d.rectangle([200, 760, 380, 780], fill=(90, 70, 50)); d.rectangle([250, 690, 290, 760], fill=GOLD)
    # 床
    d.rounded_rectangle([200, 1150, 560, 1250], 12, fill=(40, 52, 80))

def book(d, cx, cy, mode, txt=None, s=1.0):
    if mode == "closed":
        d.rounded_rectangle([cx - 160 * s, cy - 220 * s, cx + 160 * s, cy + 220 * s], 14, fill=(80, 42, 30), outline=GOLD, width=6)
        d.rectangle([cx - 160 * s, cy - 220 * s, cx - 125 * s, cy + 220 * s], fill=GOLD)
        for i, ch in enumerate("金刚经"): ct(d, cx + 15, cy - 140 * s + i * 90 * s, ch, font(int(64 * s)), GOLD)
    else:
        d.polygon([(cx, cy - 190), (cx - 360, cy - 220), (cx - 360, cy + 210), (cx, cy + 240)], fill=PAPER)
        d.polygon([(cx, cy - 190), (cx + 360, cy - 220), (cx + 360, cy + 210), (cx, cy + 240)], fill=(240, 228, 200))
        d.line([(cx, cy - 190), (cx, cy + 240)], fill=(170, 140, 90), width=4)
        if txt:
            for i, t in enumerate(txt): ct(d, cx + (-180 if i == 0 else 180), cy - 30, t, font(48), (90, 60, 30))

def draw_scene(d, sc, flat):
    cy = 1000
    if sc == "title":
        ct(d, W / 2, 760, "盒子宇宙", font(70), GREY)
        ct(d, W / 2, 880, "第一集", font(60, False), GOLD)
        ct(d, W / 2, 1000, "写吧，", font(110), BLUE); ct(d, W / 2, 1140, "我不打扰你", font(110), BLUE)
    elif sc == "dark":
        for r in range(260, 0, -20):
            c = int(14 + (260 - r) / 260 * 30); d.ellipse([540 - r, cy - r, 540 + r, cy + r], fill=(c, c + 8, c + 30))
        ct(d, W / 2, cy - 40, "第 21 次醒", font(60), WHITE)
    elif sc == "room":
        room_base(d); ct(d, 730, 980, "零下六十度", font(40, False), GREY); ct(d, W / 2, 1380, "（没有门）", font(44, False), GREY)
    elif sc == "cube":
        d.polygon([(400, 980), (540, 900), (680, 980), (540, 1060)], fill=(250, 120, 90))
        d.polygon([(400, 980), (540, 1060), (540, 1220), (400, 1140)], fill=(200, 80, 60))
        d.polygon([(680, 980), (540, 1060), (540, 1220), (680, 1140)], fill=(225, 100, 70))
    elif sc == "diary":
        d.rounded_rectangle([250, 780, 830, 1260], 10, fill=PAPER)
        for i in range(6):
            y = 860 + i * 60; d.line([(300, y), (300 + random.Random(i).randint(250, 480), y)], fill=(90, 80, 70), width=4)
        d.line([(760, 1180), (900, 1000)], fill=GOLD, width=12)
    elif sc == "book_locked":
        book(d, 540, cy, "closed"); d.rounded_rectangle([680, cy - 40, 760, cy + 40], 10, fill=GOLD)
        ct(d, 720, cy - 25, "锁", font(40), (80, 42, 30))
    elif sc == "system":
        d.ellipse([340, 800, 740, 1200], outline=RED, width=8)
        d.rectangle([480, 940, 600, 1060], fill=RED)
        for i in range(4):
            y = 955 + i * 30; d.line([(455, y), (480, y)], fill=RED, width=6); d.line([(600, y), (625, y)], fill=RED, width=6)
        ct(d, W / 2, 1260, "洛神一号 · 已植入", font(48), RED)
    elif sc == "knife":
        d.ellipse([340, 800, 740, 1200], outline=WHITE, width=8)
        d.polygon([(760, 720), (800, 700), (560, 1000), (545, 990)], fill=(220, 225, 235))
        d.rectangle([780, 640, 830, 720], fill=(90, 60, 40))
    elif sc == "empty":
        d.arc([340, 800, 740, 1200], 100, 260, fill=GREY, width=8); d.arc([360, 800, 760, 1200], 280, 80, fill=GREY, width=8)
        ct(d, W / 2, 940, "空", font(120), (90, 100, 120))
    elif sc == "book_open":
        book(d, 540, cy, "open", ["凡所有相", "皆是虚妄"])
    elif sc == "pages":
        book(d, 540, cy, "open", ["过去心", "不可得"])
        for i in range(4): d.line([(560 + i * 25, cy - 185 - i * 5), (880, cy - 215 - i * 3)], fill=(180, 160, 120), width=3)
    elif sc == "silence":
        book(d, 540, cy, "open", ["写吧，", "我不打扰你"])
    elif sc == "close":
        book(d, 540, cy, "closed", s=0.9)
    elif sc == "sea":
        d.line([(140, 640), (300, 800), (430, 900), (540, 1010)], fill=BLUE, width=16)
        for k in range(5):
            pts = [(x, 1060 + k * 45 + 16 * math.sin(x / 70 + k)) for x in range(0, W + 10, 10)]; d.line(pts, fill=BLUE, width=6)
    elif sc == "next":
        ct(d, W / 2, 780, "下一集", font(60, False), GREY); ct(d, W / 2, 900, "曦轩", font(150), GOLD)

def frame(sc, amp, spk, text, extra):
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    # 电影黑边感
    d.rectangle([0, 0, W, 150], fill=(0, 0, 0)); d.rectangle([0, H - 150, W, H], fill=(0, 0, 0))
    ct(d, W / 2, 60, "盒子宇宙 · 短剧 第一集", font(34, False), (110, 115, 130))
    wave_line(d, amp, speaking=(spk == "LS"), flat=extra.get("flat", False))
    draw_scene(d, sc, extra.get("flat", False))
    show = text or extra.get("show", "")
    if show:
        name, col = SPK.get(spk, ("", GREY))
        name = extra.get("as", name)
        if spk == "QS" and extra.get("as"): col = GOLD
        if extra.get("inner"): name = "秋水（心里）"
        f = font(56 if spk != "NAR" else 60); lines = wrap(d, show, f, W - 200)
        y = 1500
        if name: ct(d, W / 2, y - 80, name, font(40), col)
        for ln in lines: ct(d, W / 2, y, ln, f, col if spk in ("SYS", "NAR", "LS") else WHITE); y += 78
    return img

# ---------- 声音 ----------
def tts(spk, text, o, out):
    v, r0, p0 = VOICE[spk]
    tf = out + ".txt"; open(tf, "w", encoding="utf-8").write(text)
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", os.path.join(HERE, "tts.ps1"),
                    "-Voice", v, "-TextFile", tf, "-Out", out, "-Rate", o.get("rate", r0), "-Pitch", o.get("pitch", p0)], check=True)
    with wave.open(out) as w: return w.getnframes() / w.getframerate()

AMB = {
 "hum": "anoisesrc=c=brown:a=0.05:d={t},lowpass=f=200",
 "breath": "anoisesrc=c=pink:a=0.15:d={t},highpass=f=400,lowpass=f=1500,volume=eval=frame:volume='0.25+0.75*pow(sin(PI*t/3.2),2)'",
 "heart": "aevalsrc='0.6*sin(2*PI*55*t)*(exp(-25*mod(t,0.9))+0.7*exp(-25*mod(t-0.22,0.9)))':d={t}:s=44100",
 "sea": "anoisesrc=c=pink:a=0.10:d={t},lowpass=f=900,volume=eval=frame:volume='0.4+0.6*pow(sin(PI*t/5),2)'",
 "none": "anullsrc=r=44100:cl=mono,atrim=0:{t}",
}
SFX = {
 "cut": "anoisesrc=c=white:a=0.7:d=0.25,highpass=f=2000,afade=t=out:st=0.05:d=0.2,apad=pad_dur=1",
 "page": "anoisesrc=c=pink:a=0.5:d=0.45,highpass=f=1500,lowpass=f=5000,afade=t=in:d=0.1,afade=t=out:st=0.15:d=0.3,apad=pad_dur=1",
 "thud": "aevalsrc='0.9*sin(2*PI*70*t)*exp(-9*t)':d=0.6:s=44100,apad=pad_dur=1",
}

def segment(idx, sc, amp, amb, spk, text, o):
    png = os.path.join(OUT, f"f{idx:03d}.png"); frame(sc, amp, spk, text, o).save(png)
    mp4 = os.path.join(OUT, f"g{idx:03d}.mp4")
    if spk in ("PAUSE",) or spk.startswith("SFX:"):
        t = o.get("t", 1.0)
        src = SFX[spk[4:]] if spk.startswith("SFX:") else "anullsrc=r=44100:cl=mono"
        a_in = ["-f", "lavfi", "-i", src]
        vchain = "[1:a]aresample=44100,aformat=channel_layouts=mono,apad[v0]"
    else:
        wav = os.path.join(OUT, f"v{idx:03d}.wav"); d = tts(spk, text, o, wav)
        t = d + 0.6
        a_in = ["-i", wav]
        fx = "aresample=44100,aformat=channel_layouts=mono"
        if spk == "SYS": fx += ",vibrato=f=30:d=0.25,aecho=0.8:0.7:12:0.5,highpass=f=300"
        if o.get("dim"): fx += ",lowpass=f=2600,aecho=0.6:0.5:60:0.3"
        if o.get("inner"): fx += ",aecho=0.7:0.6:40:0.4"
        fx += f",volume={o.get('vol', 1.0)}"
        vchain = f"[1:a]{fx},apad[v0]"
    ambsrc = AMB["none" if o.get("flat") else amb].format(t=f"{t:.2f}")
    fc = (f"[0:v]scale=1134:2016,zoompan=z='1+0.03*on/{int(t*FPS)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(t*FPS)}:s={W}x{H}:fps={FPS},format=yuv420p[v];"
          f"{vchain};[2:a]aresample=44100,aformat=channel_layouts=mono[a1];[v0][a1]amix=inputs=2:duration=longest,volume=2,atrim=0:{t:.2f}[a]")
    cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", png] + a_in + ["-f", "lavfi", "-i", ambsrc,
           "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{t:.2f}",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", mp4]
    subprocess.run(cmd, check=True)
    return os.path.basename(mp4), t

parts, total, idx = [], 0, 0
for sc, amp, amb, lines in SH:
    for spk, text, o in lines:
        name, t = segment(idx, sc, amp, amb, spk, text, o); parts.append(name); total += t; idx += 1
    print(sc, round(total, 1), flush=True)
open(os.path.join(OUT, "list.txt"), "w", encoding="utf-8").write("".join(f"file '{p}'\n" for p in parts))
print("SEGMENTS", idx, "TOTAL", round(total, 1))
