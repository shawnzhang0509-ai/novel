# -*- coding: utf-8 -*-
"""第二轮夜间任务晨报：生成 晨报语音2.mp3 和 晨报2/index.html（音视频以文件引用，随 artifact 一起发布）。"""
import html, os, re, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(H)
TMP = sys.argv[1]
os.makedirs(TMP, exist_ok=True)
OUT = os.path.join(H, '晨报2'); os.makedirs(OUT, exist_ok=True)

SAY = """早上好。四个任务都跑完了。先说最重要的。

第一，我试写了一章。第一百四十章，洛神告别，写吧，我不打扰你。朗读六分钟，是页面上第一个播放器。我自己挑出的最大问题是：写得太干净。你的段落更长、更密，会突然转进哲理；我的段落短，像设计过的。请你听听，像不像你。

第二，我要收回一个建议。昨天我建议，第一百八十章的父亲就是秋水。复核回原文发现，这和原稿打架。第二十三章，秋水自己说起我父亲。第八十七章，秋水的父亲发明了银钞，一直不见他。第一百五十九章，秋水是二公子，要去送死的大公子是他哥哥，就是曦轩。所以这个建议我收回，要重新推。这题先不用回。

第三，编译。你昨晚那句话，原稿里有很多回响。最站得住的是：盒子本身就是编译。还有一个新发现：那条播报的发现编号，就是秋水自己的工位号。播的，可能就是他自己。视频在页面上，三分五十一秒。

第四，复核。一百八十二条主线伏笔，全部回原文查过，都找得到，改判九条。昨天说的十五条新连接，强的从九条降到三条。昨天我说得太满了。

第五，纪元表。时间数字有六处打架，比如进盒子多久，就有五个不同的数。页面上有图，不急。

今天只问一题：样稿像不像你。一，像。二，一半像。三，不像。哪里不像，直接说那一句就行，语音也可以。"""

txt = os.path.join(TMP, 'say2.txt'); raw = os.path.join(TMP, 'say2.wav')
open(txt, 'w', encoding='utf-8').write(SAY)
subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', os.path.join(ROOT, 'video', 'tts.ps1'),
                '-Voice', 'Huihui', '-TextFile', txt, '-Out', raw, '-Rate', '-5%'], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-ac', '1', '-b:a', '64k', os.path.join(OUT, '晨报语音.mp3')], check=True)
open(os.path.join(H, '晨报语音2.txt'), 'w', encoding='utf-8').write(SAY)

# 样稿正文（只取正文段落，去掉开头的引用说明）
md = open(os.path.join(H, '样稿', '样稿-写吧，我不打扰你.md'), encoding='utf-8').read()
paras = [p.strip() for p in md.split('\n\n') if p.strip() and not p.lstrip().startswith('>')]
e = html.escape
def para(p):
    if p.startswith('#'):
        return f'<h4>{e(p.lstrip("# "))}</h4>'
    if p.startswith('---'):
        return '<hr>'
    return f'<p>{e(p)}</p>'
sample = ''.join(para(p) for p in paras)

page = f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>盒子宇宙晨报 2</title>
<style>
:root{{--bg:#EEF1F4;--card:#FFF;--ink:#18202A;--mute:#5D6875;--red:#B3261E;
 --font:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;color-scheme:light}}
*{{box-sizing:border-box}}
html,body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:18px;line-height:1.7;letter-spacing:.02em}}
main{{max-width:720px;margin:0 auto;padding:18px 16px 72px}}
h1{{font-size:26px;font-weight:900;line-height:1.35;margin:0 0 12px;text-wrap:balance}}
h2{{font-size:21px;font-weight:900;margin:34px 0 10px;text-wrap:balance}}
h2 .n{{display:inline-block;min-width:1.6em}}
audio,video{{width:100%;display:block;border-radius:10px}}
video{{max-height:80vh;background:#000}}
.card{{background:var(--card);border-radius:10px;padding:14px;margin:10px 0}}
.sub{{color:var(--mute);font-size:16px;margin:6px 0}}
.tiles{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}}
.tile{{background:var(--card);border-radius:10px;padding:10px}}
.tile b{{display:block;font-size:28px;font-weight:900;line-height:1.15;font-variant-numeric:tabular-nums}}
.tile span{{font-size:14px;color:var(--mute)}}
.fix{{border-left:5px solid var(--red)}}
.fix ul{{margin:6px 0 0;padding-left:1.2em}}
.fix li{{margin-bottom:6px}}
.fix q{{quotes:"「" "」";font-weight:700}}
details{{margin-top:8px}}
summary{{cursor:pointer;font-weight:700;padding:8px 0}}
.text p{{margin:0 0 14px}}
.text h4{{font-size:19px;margin:6px 0 12px}}
.q{{background:var(--card);border-radius:10px;padding:14px;border-left:5px solid var(--red)}}
.q ol{{margin:8px 0 0;padding-left:1.4em}}
a{{color:inherit}}
</style></head><body><main>
<h1>四个任务跑完了。今天只听一章，回一题</h1>
<audio controls preload="metadata" src="晨报语音.mp3"></audio>
<p class="sub">晨报语音，2 分半</p>

<h2><span class="n">1</span>样稿：写吧，我不打扰你</h2>
<audio controls preload="metadata" src="样稿朗读.mp3"></audio>
<p class="sub">朗读 6 分钟。第 140 章，Claude 写，未经你认可</p>
<div class="card"><b>我自己挑的毛病：</b>写得太干净。你的段落更长、更密，会突然转进哲理；我的段落短，像设计过的。</div>
<details><summary>看正文</summary><div class="card text">{sample}</div></details>

<h2><span class="n">2</span>我收回一个建议</h2>
<div class="card fix"><b>「第 180 章的父亲＝秋水」和原稿打架：</b>
<ul>
<li>第 23.2 章，秋水说：<q>我觉得我父亲在做的，只不过是在满足他的个人野心。</q></li>
<li>第 87 章：<q>秋水还是不太明白，为什么父亲一直不见他。</q></li>
<li>第 159 章，秋水是二公子，要去送死的大公子是他哥哥曦轩：<q>二公子，我服侍了老主人和二公子一辈子。</q></li>
</ul>
<p class="sub">要重新推。这题先不用回。</p></div>

<h2><span class="n">3</span>编译：你那句话有回响</h2>
<video controls preload="metadata" playsinline src="编译这条线.mp4"></video>
<p class="sub">视频 3 分 51 秒。最站得住：盒子本身就是编译。新发现：播报的发现编号就是秋水的工位号。</p>

<h2><span class="n">4</span>复核：我昨天说得太满</h2>
<div class="tiles">
<div class="tile"><b>182</b><span>条主线伏笔回原文查过</span></div>
<div class="tile"><b>9</b><span>条改判</span></div>
<div class="tile"><b>9→3</b><span>条强连接</span></div>
</div>

<h2><span class="n">5</span>纪元表</h2>
<div class="card"><b>6 处打架。</b>比如进盒子多久，有 5 个数：500 年、千年、2022 年、旧历 4000 年、五千年。<br><a href="纪元表.html">看时间线图 →</a></div>

<h2>今天只回一题</h2>
<div class="q"><b>样稿像不像你？</b><ol><li>像</li><li>一半像</li><li>不像</li></ol>
<p class="sub">哪里不像，直接说那一句，语音也行。</p></div>
<p class="sub" style="margin-top:12px">全部是推论。原稿和决定记录没动。</p>
</main></body></html>'''
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
print('OK')
