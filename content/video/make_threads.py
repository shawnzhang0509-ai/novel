# -*- coding: utf-8 -*-
"""七根线：竖屏启发短片。原文（康康）→ 红线 → 问题（慧慧），不给结论。
用法：python make_threads.py <临时目录> [--preview]
引文先逐字核对原稿，对不上就退出。"""
import glob, math, os, re, subprocess, sys, wave
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TMP = sys.argv[1]
PREVIEW = '--preview' in sys.argv
os.makedirs(TMP, exist_ok=True)
W, H, FPS = 1080, 1920, 24
BG = (12, 22, 44); PAPER = (250, 243, 224); INK = (40, 32, 26)
RED = (232, 72, 72); DIM = (120, 62, 78); GOLD = (240, 196, 92); GREY = (150, 160, 180); WHITE = (245, 245, 250); LINE = (70, 84, 115)
FD = 'C:/Windows/Fonts/'
_fc = {}
def font(sz, bold=True):
    return _fc.setdefault((sz, bold), ImageFont.truetype(FD + ('msyhbd.ttc' if bold else 'msyh.ttc'), sz))

# (章, 引文, 配音文字, 高亮)
LINKS = [
 dict(a=('1', '发现编号，C1000015884号', '第一章。发现编号，C一零零零零一五八八四号。', '15884'),
      b=('159', '我是曦轩。１５８８４号编译人。', '第一百五十九章。我是曦轩。一五八八四号编译人。', '１５８８４'),
      q='第一章那段铃声，是谁发来的？', say='只有后五位一样。第一章那段铃声，是谁发来的？', note='只有后五位一样'),
 dict(a=('15', '秋水！秋水！你振作一些！不要睡过去！秋水！', '第十五章。秋水！秋水！你振作一些！不要睡过去！', '不要睡过去'),
      b=('67', '秋水一闭眼，再一睁眼，他已经来到了另外一个世界。', '第六十七章。秋水一闭眼，再一睁眼，他已经来到了另外一个世界。', '另外一个世界'),
      q='曦轩喊的，是别昏过去，还是别被带走？', say='曦轩喊的，是别昏过去，还是别被带走？'),
 dict(a=('28', '乔梓落有一双通灵死亡的眼睛', '第二十八章。乔梓落有一双通灵死亡的眼睛。', '通灵死亡的眼睛'),
      b=('180', '当他看清楚自己父亲脸庞的时候，这个业力就结算完毕了', '第一百八十章。当他看清楚自己父亲脸庞的时候，这个业力就结算完毕了。', '看清楚'),
      q='这双眼睛，五百年里还看见过什么？', say='这双眼睛，五百年里还看见过什么？'),
 dict(a=('23.2', '人在濒死境遇里，经常会以极慢的速度来体验自己的一生', '第二十三章。人在濒死境遇里，经常会以极慢的速度来体验自己的一生。', '极慢的速度'),
      b=('180', '这一刻，他想慢慢来。', '第一百八十章。这一刻，他想慢慢来。', '慢慢来'),
      q='第二次死的时候，他记得第一次吗？', say='第二次死的时候，他记得第一次吗？'),
 dict(a=('129', '至人之用心若镜', '第一百二十九章。至人之用心若镜。', '镜'),
      b=('180', '“镜子。”他伸出一只手。', '第一百八十章。镜子。他伸出一只手。', '镜子'),
      q='看清父亲之前，他为什么先要看自己？', say='看清父亲之前，他为什么先要看自己？'),
 dict(a=('146', '那个声音被关在一个遥远的牢笼里，正在奋力地向他呼唤。', '第一百四十六章。那个声音被关在一个遥远的牢笼里，正在奋力地向他呼唤。', '牢笼'),
      b=('决定', '洛神是回旋面上的一个灵魂', '你自己说过。洛神是回旋面上的一个灵魂。', '灵魂'),
      q='如果那是她，她在喊什么？', say='如果那是她，她在喊什么？'),
 dict(a=('1', '使河如带，泰山若砺，国以永宁，爱及苗裔。', '第一章。使河如带，泰山若砺，国以永宁，爱及苗裔。', '苗裔'),
      b=('98', '主人公有苗家的血', '第九十八章。主人公有苗家的血。', '苗家的血'),
      q='这十六个字，是谁留给谁的？', say='这十六个字，是谁留给谁的？'),
]

# ---------- 核对引文 ----------
strip = lambda s: re.sub(r'\s+', '', s)
def source(ch):
    if ch == '决定':
        return strip(open(os.path.join(ROOT, '作者原话', '决定记录.md'), encoding='utf-8').read())
    fs = [f for f in glob.glob(os.path.join(ROOT, 'chapters', '*.md')) if re.match(r'0*' + re.escape(ch) + '_', os.path.basename(f))]
    return strip(open(fs[0], encoding='utf-8').read())
bad = [(k[0], k[1]) for l in LINKS for k in (l['a'], l['b']) if strip(k[1]) not in source(k[0])]
if bad:
    print('引文对不上：', bad); sys.exit(1)
print('引文全部对上', len(LINKS) * 2)

# ---------- 配音 ----------
SR = 44100
def tts(key, text, voice):
    txt, raw, wav = [os.path.join(TMP, f'{key}{e}') for e in ('.txt', '.raw.wav', '.wav')]
    open(txt, 'w', encoding='utf-8').write(text)
    if not (os.path.exists(wav) and open(txt + '.done', encoding='utf-8').read() == voice + text if os.path.exists(txt + '.done') else False):
        subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', os.path.join(HERE, 'tts.ps1'),
                        '-Voice', voice, '-TextFile', txt, '-Out', raw, '-Rate', '-8%'], check=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-ac', '1', '-ar', str(SR), '-sample_fmt', 's16', wav], check=True)
        open(txt + '.done', 'w', encoding='utf-8').write(voice + text)
    with wave.open(wav) as w:
        return w.readframes(w.getnframes())

audio = bytearray()
def now(): return len(audio) / 2 / SR
def put(pcm): audio.extend(pcm)
def gap(s): audio.extend(b'\0\0' * int(s * SR))

# ---------- 时间线 ----------
TL = []  # 每幕：dict(kind, start, end, ...)
def text_scene(key, big, say, hold=1.0, arcs=0, hi=(), big_axis=False, color=GOLD):
    start = now(); gap(.3); put(tts(key, say, 'Huihui')); gap(hold)
    TL.append(dict(kind='text', start=start, end=now(), big=big, arcs=arcs, hi=hi, big_axis=big_axis, color=color))

text_scene('open', ['七根线'], '这条视频没有答案。下面七组句子，都是你写的。红线是我牵的，可能牵错。每组后面有一个问题，不用答，听着就好。', 1.0)
for i, l in enumerate(LINKS):
    start = now(); gap(.3)
    ta = now(); put(tts(f'l{i}a', l['a'][2], 'Kangkang')); gap(.3)
    tl = now(); gap(1.0)
    tb = now(); put(tts(f'l{i}b', l['b'][2], 'Kangkang')); gap(.6)
    tq = now(); put(tts(f'l{i}q', l['say'], 'Huihui')); gap(3.2)
    TL.append(dict(kind='link', start=start, end=now(), i=i, ta=ta, tl=tl, tb=tb, tq=tq))
    if i == 4:
        text_scene('conv', ['这三根', '都落在第 180 章'], '刚才这三根，都落在同一章。第一百八十章，父与子。', 2.0, arcs=5, hi=(2, 3, 4))
text_scene('end', ['你脑子里', '那一根呢？'], '这七根，每一根都可能是错的。想剪掉哪一根，或者你想到一根我没看到的，说一句就行，语音也可以。', 2.5, arcs=7, big_axis=True)
TOTAL = now()
print('总时长', round(TOTAL, 1))

# ---------- 画面 ----------
def ease(x):
    x = max(0, min(1, x)); return x * x * (3 - 2 * x)
def xof(ch):
    return 1020 if ch == '决定' else 60 + float(ch) / 189 * 900
ARCS = [(l['a'][0], l['b'][0]) for l in LINKS]
def axis(d, y, arcs, active=None, prog=1.0, hi=(), hmax=150, width=6):
    d.line([(60, y), (960, y)], fill=LINE, width=5)
    for c, lab in (('1', '1'), ('180', '180')):
        d.text((xof(c) - d.textlength(lab, font=font(30, False)) / 2, y + 12), lab, font=font(30, False), fill=GREY)
    d.ellipse([1020 - 10, y - 10, 1020 + 10, y + 10], fill=GOLD)
    d.text((1020 - 45, y + 12), '你说的', font=font(30, False), fill=GOLD)
    items = list(range(arcs)) + ([active] if active is not None else [])
    for k in items:
        x0, x1 = xof(ARCS[k][0]), xof(ARCS[k][1])
        h = 30 + (x1 - x0) / 960 * hmax
        p = prog if k == active else 1
        n = max(2, int(50 * p))
        pts = [(x0 + (x1 - x0) * t / 49, y - h * math.sin(math.pi * t / 49)) for t in range(n)]
        col = RED if (k == active or k in hi or (not hi and active is None)) else DIM
        d.line(pts, fill=col, width=width if col == RED else 3, joint='curve')
        d.ellipse([x0 - 7, y - 7, x0 + 7, y + 7], fill=col)
        if p >= 1: d.ellipse([x1 - 7, y - 7, x1 + 7, y + 7], fill=col)

def wrap(d, text, f, maxw, keep=None):
    """按宽度断行；keep 指定的词不拆开。"""
    lines, cur = [], ''
    toks = re.findall(re.escape(keep) + '|.', text) if keep else text
    for ch in toks:
        if d.textlength(cur + ch, font=f) > maxw and ch not in '，。！？、”」':
            lines.append(cur); cur = ch
        else:
            cur += ch
    return lines + ([cur] if cur else [])

def qwrap(d, q):
    """问题优先在逗号处断行，不把词拆开。"""
    out = []
    for part in re.findall(r'[^，]+，?', q):
        out += wrap(d, part, font(80), 960)
    return out

def card(y, tag, quote, hl, alpha):
    """返回 (RGBA 图层, 高度)。高亮只作用于引文中第一次出现的片段。"""
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    f = font(66)
    lines = wrap(probe, '「' + quote + '」', f, 840, keep=hl)
    h = 110 + len(lines) * 94 + 30
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    a = int(255 * alpha)
    d.rounded_rectangle([60, y, W - 60, y + h], 22, fill=PAPER + (a,))
    d.text((100, y + 26), '你的原话' if tag == '决定' else f'第 {tag} 章', font=font(38), fill=(150, 110, 60, a))
    full = ''.join(lines); s = full.find(hl); e = s + len(hl)
    pos = 0; yy = y + 100
    for ln in lines:
        x = 100
        for ch in ln:
            d.text((x, yy), ch, font=f, fill=((200, 40, 40, a) if s <= pos < e else INK + (a,)))
            x += d.textlength(ch, font=f); pos += 1
        yy += 94
    return layer, h

_cache = {}
def layout(i):
    if i not in _cache:
        l = LINKS[i]
        _, ha = card(0, l['a'][0], l['a'][1], l['a'][3], 1)
        _, hb = card(0, l['b'][0], l['b'][1], l['b'][3], 1)
        _cache[i] = (ha, hb)
    return _cache[i]

def frame(t):
    sc = next(s for s in TL if t < s['end'] or s is TL[-1])
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    fade = min(ease((t - sc['start']) / .35), ease((sc['end'] - t) / .35))
    if sc['kind'] == 'text':
        if sc['big_axis']:
            axis(d, 1120, sc['arcs'], hi=sc['hi'], hmax=420, width=7)
        else:
            axis(d, 360, sc['arcs'], hi=sc['hi'])
        f = font(120 if max(map(len, sc['big'])) <= 5 else 88)
        y = 240 if sc['big_axis'] else 720
        for ln in sc['big']:
            d.text(((W - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=sc['color']); y += f.size + 40
        if sc['big'] == ['七根线']:
            d.text(((W - d.textlength('盒子宇宙', font=font(56, False))) / 2, y + 20), '盒子宇宙', font=font(56, False), fill=GREY)
        if sc['big_axis']:
            s = '每一根都可能是错的'
            d.text(((W - d.textlength(s, font=font(50, False))) / 2, 1320), s, font=font(50, False), fill=GREY)
    else:
        i = sc['i']; l = LINKS[i]
        ha, hb = layout(i)
        prog = ease((t - sc['tl']) / 1.0)
        axis(d, 330, i, active=i, prog=prog)
        qlines = qwrap(d, l['q'])
        gapy = 150; total = ha + gapy + hb + 90 + len(qlines) * 112 + (70 if l.get('note') else 0)
        ya = 420 + max(0, (1440 - total) // 2); yb = ya + ha + gapy; yq = yb + hb + 90
        la, _ = card(ya, l['a'][0], l['a'][1], l['a'][3], ease((t - sc['ta'] + .1) / .3))
        img.paste(la, (0, 0), la)
        n = max(2, int(40 * prog))
        if t >= sc['tl']:
            y0, y1 = ya + ha, yb
            pts = [(540 + 26 * math.sin(k / 39 * math.pi * 3), y0 + (y1 - y0) * k / 39) for k in range(n)]
            d = ImageDraw.Draw(img)
            d.line(pts, fill=RED, width=8, joint='curve')
        if t >= sc['tb'] - .2:
            lb, _ = card(yb, l['b'][0], l['b'][1], l['b'][3], ease((t - sc['tb'] + .2) / .3))
            img.paste(lb, (0, 0), lb)
        d = ImageDraw.Draw(img)
        if t >= sc['tq'] - .1:
            fq = font(80)
            yy = yq
            for ln in qlines:
                d.text(((W - d.textlength(ln, font=fq)) / 2, yy), ln, font=fq, fill=GOLD); yy += 112
            if l.get('note'):
                d.text(((W - d.textlength(l['note'], font=font(44, False))) / 2, yy + 10), l['note'], font=font(44, False), fill=GREY)
        s = f'{i + 1} / {len(LINKS)}'
        d.text(((W - d.textlength(s, font=font(40, False))) / 2, 50), s, font=font(40, False), fill=GREY)
    if fade < 1:
        img = Image.blend(Image.new('RGB', (W, H), BG), img, fade)
    return img

if PREVIEW:
    probes = []
    for s in TL:
        probes.append(s['end'] - .5)
    sheet = Image.new('RGB', (270 * 5, 480 * 2), (0, 0, 0))
    for k, t in enumerate(probes[:10]):
        sheet.paste(frame(t).resize((270, 480)), (270 * (k % 5), 480 * (k // 5)))
    p = os.path.join(TMP, 'contact.png'); sheet.save(p); print(p)
    sys.exit(0)

wavp = os.path.join(TMP, 'all.wav')
with wave.open(wavp, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(audio))
final = os.path.join(HERE, '七根线.mp4')
ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-i', wavp, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
                       '-shortest', '-movflags', '+faststart', final], stdin=subprocess.PIPE)
frames = int(TOTAL * FPS)
last_key, last = None, None
for n in range(frames):
    t = n / FPS
    sc = next(s for s in TL if t < s['end'] or s is TL[-1])
    # 静止段复用上一帧，省时间
    moving = t - sc['start'] < .4 or sc['end'] - t < .4
    if sc['kind'] == 'link':
        moving = moving or any(-.3 <= t - sc[k] <= 1.1 for k in ('ta', 'tl', 'tb', 'tq'))
    if moving or last is None or last_key is not sc:
        last = frame(t).tobytes(); last_key = sc
    ff.stdin.write(last)
ff.stdin.close(); ff.wait()
print('DONE', final, round(os.path.getsize(final) / 1e6, 1), 'MB')
