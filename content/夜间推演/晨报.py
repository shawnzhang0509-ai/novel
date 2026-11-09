# -*- coding: utf-8 -*-
"""把 晨报语音.mp3 嵌进页面，生成 晨报.html。"""
import base64, os
H = os.path.dirname(os.path.abspath(__file__))
audio = base64.b64encode(open(os.path.join(H, '晨报语音.mp3'), 'rb').read()).decode()
LAYERS = [('觉醒', 17), ('盒子', 28), ('剧本', 9), ('文明', 71), ('高我', 17), ('多重', 35), ('一切', 12)]
mx = max(v for _, v in LAYERS)
GAPS = {'盒子': 4, '文明': 57, '高我': 3, '多重': 2, '一切': 2}  # 排章草案.md 中标「缺口」的章数
def bar(n, v):
    g = GAPS.get(n, 0)
    inner = (f'<i class="gap" style="width:{g/mx*100:.1f}%"></i>' if g else '') + f'<i style="width:{(v-g)/mx*100:.1f}%"></i>'
    return f'<div class="bar"><span>{n}</span><span class="bt">{inner}</span><b>{v}</b></div>'
bars = ''.join(bar(n, v) for n, v in LAYERS)
links = [
 ('口令是留给儿子的', '第 1 章', '「爱及苗裔」', '第 98 章', '「主人公有苗家的血」', '前提：父亲＝秋水'),
 ('遗书是第二次死的说明书', '第 23.2 章', '「经常会以极慢的速度来体验自己的一生」', '第 180 章', '「这一刻，他想慢慢来」', '原稿两头都有'),
 ('那个声音就是洛神', '第 146 章', '「被关在一个遥远的牢笼里」', '决定记录', '「洛神是回旋面上的一个灵魂」', '这一章要排在她消失之后'),
]
cards = ''.join(f'<article class="lk"><h3>{t}</h3><div class="ends"><div><small>{a}</small>{b}</div><div class="to" aria-hidden="true">↓</div><div><small>{c}</small>{d}</div></div><p>{e}</p></article>' for t, a, b, c, d, e in links)
asks = [('父亲是谁', '就是秋水', '第 23.2 章的大哥要改成亲王放下去的身体'),
        ('结局', '懂了一切，再次走进盒子，去叫醒别人', '要写清这一轮和上一轮的不同'),
        ('张嘱线', '张嘱的大脑是秋水恢复记忆的地方', '苏舞、吴钩的 15 章接不上'),
        ('盒子起源', '每层一个说法，最外层是人类自己选的', '第 175 章说真实不存在，两边打架')]
rows = ''.join(f'<article class="as"><b class="no">{i+1}</b><div><h3>{a}</h3><p>{b}</p><p class="hole">漏洞：{c}</p></div></article>' for i, (a, b, c) in enumerate(asks))
page = f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>盒子宇宙晨报</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
<style>
:root{{ /* 沿用全景图的单一浅色主题。版式：一屏一个重心，自上而下读到一个问题。 */
 --bg:#EEF1F4;--card:#FFF;--ink:#18202A;--mute:#5D6875;--line:#D5DBE2;--red:#B3261E;
 --font:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;color-scheme:light}}
*{{box-sizing:border-box}}
html,body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:18px;line-height:1.65;letter-spacing:.02em}}
main{{max-width:720px;margin:0 auto;padding:18px 16px 72px}}
h1{{font-size:26px;font-weight:900;line-height:1.35;margin:0 0 12px;text-wrap:balance}}
h2{{font-size:21px;font-weight:900;margin:30px 0 10px;text-wrap:balance}}
h3{{font-size:18px;font-weight:900;margin:0 0 6px}}
audio{{width:100%;display:block}}
.sub{{color:var(--mute);font-size:16px;margin:0 0 10px}}
.tiles{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}}
.tile{{background:var(--card);border-radius:10px;padding:10px}}
.tile b{{display:block;font-size:28px;font-weight:900;line-height:1.15;font-variant-numeric:tabular-nums}}
.tile span{{font-size:14px;color:var(--mute)}}
.bar{{display:grid;grid-template-columns:48px 1fr 34px;gap:8px;align-items:center;min-height:32px;font-size:15px}}
.bt{{display:flex;height:12px;gap:2px}}
.bt i{{display:block;height:100%;background:var(--ink)}}
.bt i:last-child{{border-radius:0 4px 4px 0}}
.bt i.gap{{background:repeating-linear-gradient(135deg,var(--red) 0 4px,#E9B7B3 4px 7px)}}
.bar b{{text-align:right;font-variant-numeric:tabular-nums}}
.key{{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;color:var(--mute);margin:0 0 6px}}
.key i{{display:inline-block;width:18px;height:10px;margin-right:5px;background:var(--ink)}}
.key i.gap{{background:repeating-linear-gradient(135deg,var(--red) 0 4px,#E9B7B3 4px 7px)}}
.lk,.as{{background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px}}
.ends small{{display:block;color:var(--mute);font-size:14px}}
.to{{font-weight:900;padding:2px 0}}
.lk p{{margin:8px 0 0;color:var(--mute);font-size:15px}}
.as{{display:grid;grid-template-columns:34px 1fr;gap:8px}}
.as p{{margin:0;font-size:16px}}
.as .hole{{color:var(--mute);margin-top:4px}}
.no{{font-size:26px;font-weight:900;line-height:1.15}}
.warn{{background:var(--ink);color:#fff;border-radius:10px;padding:14px;font-size:17px;font-weight:700}}
.q{{background:var(--card);border-radius:10px;padding:14px;border-left:5px solid var(--red)}}
.q ol{{margin:8px 0 0;padding-left:1.4em}}
.q li{{margin-bottom:6px}}
</style></head><body><main>
<h1>夜里跑完了。22 条线都排上了章，还差 4 个决定</h1>
<audio controls preload="metadata" src="data:audio/mpeg;base64,{audio}"></audio>
<div class="tiles"><div class="tile"><b>530</b><span>条伏笔已判</span></div><div class="tile"><b>15</b><span>条新连接</span></div><div class="tile"><b>189</b><span>章草案</span></div></div>

<h2>最强的三条新连接</h2>
{cards}

<h2>最大的洞在第 4 层</h2>
<div class="key"><span><i></i>秋水在场或当镜头</span><span><i class="gap"></i>秋水缺席</span></div>
<p class="sub">每层章数（草案）</p>
{bars}

<h2>4 件事，我的建议</h2>
{rows}
<p class="warn">这 4 个建议互相支撑。「亲王放下去的身体」站不住，4 个都要重看。</p>

<h2>今天只回一题</h2>
<div class="q"><h3>第 180 章的父亲是谁？</h3><ol><li><b>秋水本人（建议）</b></li><li>另有其人，秋水和梓洛是兄弟</li><li>秋水的高我，秋水本人不在场</li></ol></div>
<p class="sub" style="margin-top:12px">全部是推论，没有替你定。原稿和决定记录的原话没动。</p>
</main></body></html>'''
open(os.path.join(H, '晨报.html'), 'w', encoding='utf-8').write(page)
print('OK', len(page))
