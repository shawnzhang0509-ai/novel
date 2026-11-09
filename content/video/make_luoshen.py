# -*- coding: utf-8 -*-
"""洛神线 竖屏有声短片：Pillow 画面 + Windows 慧慧配音 + ffmpeg 合成"""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
F = "C:/Windows/Fonts/"
def font(sz, bold=True):
    return ImageFont.truetype(F + ("msyhbd.ttc" if bold else "msyh.ttc"), sz)

BG = (12, 22, 44)
WATER = (64, 156, 230)
GOLD = (240, 196, 92)
PINK = (240, 128, 150)
GREY = (150, 160, 180)
WHITE = (245, 245, 250)
RED = (230, 80, 80)

# 每一幕：big=大字（2行以内），say=配音，pic=画什么，color=大字颜色
S = [
 dict(big=["洛神", "这条线"], say="盒子宇宙。今天，我们把洛神这条线定下来了。一共三分钟，你只要听。", pic="title", color=WATER),
 dict(big=["秋水醒来", "屋子没有门"], say="秋水醒来，在一间没有门的屋子里。脑子里，有一个女人的声音。她叫洛神。", pic="room", color=WHITE),
 dict(big=["外面是", "核冬天"], say="洛神告诉他：外面是核冬天，你出不去。这是套娃的第一层。", pic="snow", color=WHITE),
 dict(big=["你脑子里", "有芯片"], say="系统故意告诉他：你脑子里装了芯片。这是明牌，用来瓦解他。他越相信，芯片就越真。", pic="chip", color=RED),
 dict(big=["其实", "芯片不在脑子里"], say="其实，芯片不在脑子里。芯片和洛神，都只是回旋面上的声音。", pic="twovoice", color=GOLD),
 dict(big=["信", "还是疑"], say="秋水脑子里在拔河。他信，芯片就长大。他疑，洛神就出现。两个声音，用同一个名字。", pic="tug", color=WHITE),
 dict(big=["是他", "养活了她"], say="洛神是一个灵魂。秋水天天跟她说话，她才活了下来。慢慢地，她爱上了他。", pic="heart", color=PINK),
 dict(big=["打不开", "的书"], say="书架上只有一本书，金刚经。秋水认得书名，可是从来打不开。", pic="bookclosed", color=GOLD),
 dict(big=["什么", "都没有"], say="有一天，秋水受够了。他剖开自己的脑子，要把芯片挖出来。里面，什么都没有。", pic="empty", color=WHITE),
 dict(big=["凡所有相", "皆是虚妄"], say="那一刻，书翻开了第一页。凡所有相，皆是虚妄。", pic="bookopen1", color=GOLD),
 dict(big=["她用命", "替他翻书"], say="之后，洛神用秋水给她的命，一页一页，替他翻书，念给他听。", pic="pages", color=PINK),
 dict(big=["写吧", "我不打扰你"], say="最后一页。她说：写吧，我不打扰你。然后，声音停了。", pic="silence", color=PINK),
 dict(big=["使河如带", "无人回答"], say="秋水念那十六个字的口令。使河如带，泰山若砺。没有人回答。他自己，合上了书。", pic="bookclose", color=WHITE),
 dict(big=["很久以后"], say="很久以后，在外面的某一层，秋水翻开书。有一页，是她的笔迹。", pic="handwriting", color=GOLD),
 dict(big=["河流进海", "不是死，是变大"], say="洛神是河。秋水是秋天的河水。庄子说，河流到北海，才知道天外有天。河流进海，不是死，是变大。", pic="sea", color=WATER),
 dict(big=["下一题", "曦轩是谁？"], say="下一题：曦轩是谁？醒了以后，回一个字就行。", pic="next", color=GOLD),
]

def center_text(d, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)

def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=f) > maxw:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur: lines.append(cur)
    return lines

def waves(d, y0, n=4, col=WATER, amp=18, alpha_step=0):
    for k in range(n):
        pts = [(x, y0 + k * 40 + amp * math.sin(x / 70 + k)) for x in range(0, W + 10, 10)]
        d.line(pts, fill=col, width=6)

def book(d, cx, cy, open_=False, col=GOLD, text=None):
    if not open_:
        d.rounded_rectangle([cx - 150, cy - 200, cx + 150, cy + 200], 16, fill=(70, 40, 30), outline=col, width=8)
        d.rectangle([cx - 150, cy - 200, cx - 120, cy + 200], fill=col)
        f = font(44)
        for i, ch in enumerate("金刚经"):
            center_text_at(d, cx + 10, cy - 120 + i * 70, ch, f, col)
        # 锁
        d.rounded_rectangle([cx + 110, cy - 30, cx + 170, cy + 30], 10, fill=col)
    else:
        d.polygon([(cx, cy - 170), (cx - 330, cy - 200), (cx - 330, cy + 200), (cx, cy + 230)], fill=(250, 240, 215), outline=col)
        d.polygon([(cx, cy - 170), (cx + 330, cy - 200), (cx + 330, cy + 200), (cx, cy + 230)], fill=(245, 232, 205), outline=col)
        d.line([(cx, cy - 170), (cx, cy + 230)], fill=(180, 150, 100), width=4)
        if text:
            f = font(46)
            for i, t in enumerate(text):
                center_text_at(d, cx + (-165 if i == 0 else 165), cy - 20, t, f, (90, 60, 30))

def center_text_at(d, cx, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text((cx - w / 2, y), text, font=f, fill=fill)

def head(d, cx, cy, r=170, col=GREY, fill=None):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=8, fill=fill)

def draw_pic(d, pic):
    cy = 1050
    if pic == "title":
        waves(d, 950, 5)
        center_text(d, 1250, "盒子宇宙", font(64), GREY)
    elif pic == "room":
        d.rectangle([240, 760, 840, 1330], outline=GREY, width=8)
        d.rectangle([600, 880, 780, 1060], outline=WATER, width=6)  # 窗
        d.line([(690, 880), (690, 1060)], fill=WATER, width=4); d.line([(600, 970), (780, 970)], fill=WATER, width=4)
        d.ellipse([350, 1100, 450, 1200], fill=WHITE)  # 人
        center_text(d, 1380, "（没有门）", font(48, False), GREY)
    elif pic == "snow":
        import random; random.seed(3)
        for _ in range(140):
            x, y, r = random.randint(60, 1020), random.randint(720, 1400), random.randint(4, 12)
            d.ellipse([x - r, y - r, x + r, y + r], fill=(200, 215, 235))
        center_text(d, 1430, "套娃 第 1 层", font(56), WATER)
    elif pic == "chip":
        head(d, 540, cy)
        d.rectangle([480, cy - 60, 600, cy + 60], fill=RED)
        for i in range(4):
            d.line([(460, cy - 45 + i * 30), (480, cy - 45 + i * 30)], fill=RED, width=6)
            d.line([(600, cy - 45 + i * 30), (620, cy - 45 + i * 30)], fill=RED, width=6)
        center_text(d, 1280, "越信 → 越真", font(60), RED)
    elif pic == "twovoice":
        head(d, 540, cy, fill=None)
        center_text(d, cy - 40, "空", font(80), GREY)
        # 回旋面：一条螺旋
        pts = [(540 + (60 + t * 9) * math.cos(t / 3), cy - 320 + (20 + t * 2) * math.sin(t / 3) * 0.4) for t in range(0, 60)]
        d.line(pts, fill=GOLD, width=5)
        center_text(d, 1280, "回旋面上的两个声音", font(54), GOLD)
    elif pic == "tug":
        d.line([(160, cy), (920, cy)], fill=WHITE, width=10)
        d.ellipse([480, cy - 60, 600, cy + 60], fill=WHITE)
        center_text_at(d, 540, cy + 80, "秋水", font(50), WHITE)
        center_text_at(d, 200, cy - 180, "信", font(90), RED); center_text_at(d, 200, cy + 80, "芯片", font(54), RED)
        center_text_at(d, 880, cy - 180, "疑", font(90), WATER); center_text_at(d, 880, cy + 80, "洛神", font(54), WATER)
    elif pic == "heart":
        center_text_at(d, 300, cy - 40, "秋水", font(70), WHITE)
        center_text_at(d, 780, cy - 40, "洛神", font(70), PINK)
        d.line([(400, cy - 60), (680, cy - 60)], fill=WHITE, width=6)
        d.polygon([(680, cy - 75), (710, cy - 60), (680, cy - 45)], fill=WHITE)
        center_text(d, cy - 150, "说话", font(48, False), GREY)
        d.line([(680, cy + 60), (400, cy + 60)], fill=PINK, width=6)
        d.polygon([(400, cy + 45), (370, cy + 60), (400, cy + 75)], fill=PINK)
        center_text(d, cy + 90, "爱", font(48, False), PINK)
    elif pic == "bookclosed":
        book(d, 540, cy)
    elif pic == "empty":
        head(d, 540, cy)
        d.line([(540, cy - 200), (540, cy + 200)], fill=RED, width=6)
        center_text(d, cy - 50, "∅", font(120), GREY)
    elif pic == "bookopen1":
        book(d, 540, cy, open_=True, text=["凡所有相", "皆是虚妄"])
        center_text(d, 1330, "第 1 页", font(50), GOLD)
    elif pic == "pages":
        book(d, 540, cy, open_=True)
        for i in range(5):
            d.line([(560 + i * 30, cy - 160 - i * 6), (860, cy - 190 - i * 4)], fill=PINK, width=3)
        center_text(d, 1330, "一页  一页", font(54), PINK)
    elif pic == "silence":
        book(d, 540, cy, open_=True, text=["写吧", "我不打扰你"])
        center_text(d, 1330, "……", font(70), GREY)
    elif pic == "bookclose":
        book(d, 540, cy)
        center_text(d, 1330, "他自己合上", font(54), WHITE)
    elif pic == "handwriting":
        book(d, 540, cy, open_=True)
        for i in range(5):
            y = cy - 120 + i * 60
            pts = [(590 + x, y + 10 * math.sin(x / 18 + i)) for x in range(0, 220, 6)]
            d.line(pts, fill=PINK, width=4)
        center_text(d, 1330, "她的笔迹", font(54), PINK)
    elif pic == "sea":
        d.line([(160, 760), (300, 900), (420, 980), (540, 1080)], fill=WATER, width=14)
        center_text_at(d, 200, 700, "河", font(64), WATER)
        waves(d, 1120, 5)
        center_text(d, 1360, "海", font(80), WATER)
    elif pic == "next":
        center_text(d, cy - 60, "?", font(260), GOLD)

def render(i, sc):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # 进度条
    n = len(S)
    for k in range(n):
        x0 = 60 + k * (W - 120) / n
        d.rectangle([x0 + 4, 70, x0 + (W - 120) / n - 4, 82], fill=WATER if k <= i else (40, 55, 85))
    # 大字
    f = font(120 if max(len(t) for t in sc["big"]) <= 5 else 92)
    y = 220
    for line in sc["big"]:
        center_text(d, y, line, f, sc["color"]); y += f.size + 30
    draw_pic(d, sc["pic"])
    # 字幕
    fs = font(50, False)
    lines = wrap(d, sc["say"], fs, W - 160)
    y = 1560
    d.rounded_rectangle([50, y - 30, W - 50, y + len(lines) * 72 + 10], 24, fill=(25, 38, 68))
    for ln in lines:
        d.text((80, y), ln, font=fs, fill=(215, 222, 235)); y += 72
    p = os.path.join(OUT, f"s{i:02d}.png"); img.save(p); return p

def tts(i, text):
    wav = os.path.join(OUT, f"s{i:02d}.wav")
    ps = ("Add-Type -AssemblyName System.Speech;"
          "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
          "$s.SelectVoice('Microsoft Huihui Desktop');$s.Rate=-1;"
          f"$s.SetOutputToWaveFile('{wav}');$s.Speak([IO.File]::ReadAllText('{wav}.txt'));$s.Dispose()")
    open(wav + ".txt", "w", encoding="utf-8-sig").write(text)
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    return wav

def dur(p):
    import wave
    with wave.open(p) as w: return w.getnframes() / w.getframerate()

parts = []
for i, sc in enumerate(S):
    png = render(i, sc)
    wav = tts(i, sc["say"])
    t = dur(wav) + 0.9
    mp4 = os.path.join(OUT, f"s{i:02d}.mp4")
    frames = int(t * 30)
    vf = (f"scale=1188:2112,zoompan=z='1+0.04*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps=30,"
          f"fade=t=in:st=0:d=0.3,fade=t=out:st={t-0.3:.2f}:d=0.3,format=yuv420p")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", png, "-i", wav, "-filter_complex",
                    f"[0:v]{vf}[v];[1:a]apad,aresample=44100[a]", "-map", "[v]", "-map", "[a]",
                    "-t", f"{t:.2f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "128k", mp4], check=True)
    parts.append(mp4)
    print(i, round(t, 1), flush=True)

lst = os.path.join(OUT, "list.txt")
open(lst, "w", encoding="utf-8").write("".join(f"file '{p}'\n" for p in parts))
final = os.path.join(OUT, "洛神这条线.mp4")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", final], check=True)
print("DONE", final)
