# -*- coding: utf-8 -*-
"""生成伏笔总表：核对引文 -> 统计 530 条伏笔 -> 输出 伏笔总表.md 和 ../viz/fubi.html。
用法：python build.py   引文对不上原文时会列出来并退出。"""
import glob, html, json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from threads import T, MAIN_RE, SIDE, CUT, SELF, RED, AMB, GRN, JUDGED
ROOT = os.path.dirname(HERE)
strip = lambda s: re.sub(r'\s+', '', s)
def chap(ch):
    fs = [f for f in glob.glob(os.path.join(ROOT, 'chapters', '*.md'))
          if re.match(r'0*' + re.escape(ch) + r'_', os.path.basename(f))]
    return strip(open(fs[0], encoding='utf-8').read()) if fs else None
note = strip(open(os.path.join(ROOT, '作者原话', '灵感笔记-2026-11-04.md'), encoding='utf-8').read())

bad = []
for t in T:
    for L, k, src, d in t['pts']:
        if 'q' not in d: continue
        body = note if src == '笔记' else chap(src)
        if body is None or strip(d['q']) not in body:
            bad.append((t['name'], src, d['q']))
if bad:
    print('引文对不上原文：')
    for b in bad: print('  ', b)
    sys.exit(1)

rows = []
for f in sorted(glob.glob(os.path.join(ROOT, 'analysis', 'batch*.json'))):
    rows += json.load(open(f, encoding='utf-8'))
main, side, rest = [], {n: [] for n, _ in SIDE}, []
for r in rows:
    for s in r.get('setups') or []:
        if re.search(MAIN_RE, s): main.append((r['id'], s)); continue
        for n, rx in SIDE:
            if re.search(rx, s): side[n].append((r['id'], s)); break
        else:
            rest.append((r['id'], s))
total = len(main) + sum(map(len, side.values())) + len(rest)
L4 = [r for r in rows if r.get('layer') == 4]
L4q = [r for r in L4 if '秋水' in (r.get('pov') or '') or any('秋水' in c for c in r.get('characters') or [])]
cnt = {s: sum(t['st'] == s for t in T) for s in (RED, AMB, GRN)}
print('主线', len(T), cnt, '| 伏笔', total, '主线相关', len(main), {k: len(v) for k, v in side.items()}, '零散', len(rest), '| L4', len(L4), '有秋水', len(L4q))

KIND = {'m': '埋', 's': '收', 'n': '要新写'}
ST = {RED: '等你定', AMB: '要新写', GRN: '原稿已闭环'}
# Markdown 附件
md = ['# 伏笔总表（2026-11-06）', '',
      f'主线 {len(T)} 条：等你定 {cnt[RED]}，要新写 {cnt[AMB]}，原稿已闭环 {cnt[GRN]}。', '',
      '说明：「」里是原文，已由 build.py 自动核对；没有「」的是说明。层位是暂排。530 条伏笔的分组是关键词粗分，不是逐条判断。', '']
for s in (RED, AMB, GRN):
    md += [f'## {ST[s]}', '']
    for t in [x for x in T if x['st'] == s]:
        md += [f'### {t["name"]}', '', t['why'], '', '| 层 | 类型 | 来源 | 内容 |', '|---|---|---|---|']
        for L, k, src, d in t['pts']:
            src2 = src if src in ('笔记', '决定', '待定') else f'第 {src} 章'
            md.append(f'| {L} | {KIND[k]} | {src2} | {"「"+d["q"]+"」" if "q" in d else d["t"]} |')
        md.append('')
md += ['## 我先定（不影响结局，你可以改）', ''] + [f'- {x}' for x in SELF] + ['', '## 建议砍（你可以否决）', ''] + [f'- {a}（第 {b} 章）' for a, b in CUT] + ['', f'## 原稿 {total} 条伏笔明细（关键词粗分）', '']
def dump(title, items):
    out = [f'### {title}（{len(items)} 条）', '']
    out += [f'- 第 {c} 章：{s}' for c, s in items]
    return out + ['']
md += dump('和主线相关', main)
for n, _ in SIDE: md += dump(n, side[n])
md += dump('零散', rest)
open(os.path.join(HERE, '伏笔总表.md'), 'w', encoding='utf-8').write('\n'.join(md))

# 页面
e = html.escape
LAYERS = ['觉醒', '盒子', '剧本', '文明', '高我', '多重', '一切']
LAB = {RED: '✋ 等你定', AMB: '✎ 要新写', GRN: '✓ 原稿已闭环'}
def mark(k):
    return {'m': '<circle cx="8" cy="8" r="5.5" class="mk-m"/>', 's': '<circle cx="8" cy="8" r="6" class="mk-s"/>',
            'n': '<rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.5" transform="rotate(45 8 8)" class="mk-n"/>'}[k]
def row(t):
    by = {}
    for p in t['pts']: by.setdefault(p[0], []).append(p)
    W = 700; H = 44; col = W / 7; dots = []
    for L, ps in by.items():
        for i, p in enumerate(ps):
            x = (L - 1) * col + col * (i + 1) / (len(ps) + 1)
            dots.append((x, p))
    dots.sort(key=lambda d: d[0])
    grid = ''.join(f'<line x1="{i*col:.0f}" x2="{i*col:.0f}" y1="0" y2="{H}" class="gl"/>' for i in range(1, 7))
    seg = ''
    for a, b in zip(dots, dots[1:]):
        dash = ' dash' if b[1][1] == 'n' else ''
        seg += f'<line x1="{a[0]:.1f}" x2="{b[0]:.1f}" y1="22" y2="22" class="ln {t["st"]}{dash}"/>'
    mk = ''
    for x, (L, k, src, d) in dots:
        tip = f'{KIND[k]} · {src if src in ("笔记","决定","待定") else "第"+src+"章"} · {d.get("q") or d["t"]}'
        mk += f'<g transform="translate({x-8:.1f} 14)" class="dot {t["st"]}" data-tip="{e(tip, True)}"><rect x="-8" y="-8" width="32" height="32" fill="transparent"/>{mark(k)}</g>'
    svg = f'<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="track" role="img" aria-label="{e(t["name"])}的伏笔位置">{grid}{seg}</svg>'
    # 标记单独画，不被拉伸
    pins = ''
    for x, (L, k, src, d) in dots:
        tip = f'{KIND[k]} · {src if src in ("笔记","决定","待定") else "第"+src+"章"} · {d.get("q") or d["t"]}'
        pins += f'<svg class="pin {t["st"]}" style="left:{x/W*100:.2f}%" viewBox="0 0 16 16" data-tip="{e(tip, True)}">{mark(k)}</svg>'
    items = ''
    for L, k, src, d in t['pts']:
        srcs = src if src in ('笔记', '决定', '待定') else f'第 {src} 章'
        txt = f'「{e(d["q"])}」' if 'q' in d else e(d['t'])
        items += f'<li><span class="kd {k}">{KIND[k]}</span><span class="tx">{txt}<small>{srcs}</small></span></li>'
    return (f'<details class="rw {t["st"]}"><summary><span class="nm">{e(t["name"])}</span>'
            f'<span class="tr">{svg}{pins}</span></summary><div class="dt"><p class="why">{e(t["why"])}</p><ol>{items}</ol></div></details>')
def group(s):
    ts = [t for t in T if t['st'] == s]
    return f'<h3 class="gh {s}"><span>{LAB[s]}</span><b>{len(ts)} 条</b></h3>' + ''.join(row(t) for t in ts)
axis = '<div class="ax"><span class="nm"></span><span class="axr">' + ''.join(f'<i class="{"last" if i==6 else ""}">{n}</i>' for i, n in enumerate(LAYERS)) + '</span></div>'
legend = '<div class="lg"><span><svg viewBox="0 0 16 16">' + mark('m') + '</svg>埋</span><span><svg viewBox="0 0 16 16">' + mark('s') + '</svg>收</span><span><svg viewBox="0 0 16 16">' + mark('n') + '</svg>要新写</span></div>'
ask = [t for t in T if t['st'] == RED]
ASK_NOTE = {'shen': '建议：是。漏洞：要加一条规则，第 23.2 章的大哥是亲王放下去的身体。',
            'end': '建议：秋水懂了一切后再次走进盒子，去叫醒别人。漏洞：要写清这一轮和上一轮的不同。',
            'zhang': f'第 4 层 {len(L4)} 章，只有 {len(L4q)} 章有秋水。建议：张嘱的大脑是秋水恢复记忆的地方。漏洞：苏舞、吴钩的 15 章还接不上。',
            'orig': '建议：每层一个说法，最外层是人类自己选的。漏洞：第 175 章说真实不存在，两边打架。'}
cards = ''.join(f'<article class="ask"><div class="no">{i+1}</div><div><h3>{e(t["name"])}</h3><p>{e(t["why"])}</p><p class="sg">{e(ASK_NOTE[t["id"]])}</p></div></article>' for i, t in enumerate(ask))
vals = JUDGED
mx = max(v for _, v in vals)
bars = ''.join(f'<div class="bar" title="{e(n)}：{v} 条"><span class="bn">{e(n)}</span><span class="bt"><i style="width:{v/mx*100:.1f}%"></i></span><b>{v}</b></div>' for n, v in vals)
TEMPLATE = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
page = (TEMPLATE
  .replace('%%N%%', str(len(T))).replace('%%R%%', str(cnt[RED])).replace('%%A%%', str(cnt[AMB])).replace('%%G%%', str(cnt[GRN]))
  .replace('%%AXIS%%', axis).replace('%%LEGEND%%', legend).replace('%%GROUPS%%', group(RED) + group(AMB) + group(GRN))
  .replace('%%ASK%%', cards).replace('%%BARS%%', bars).replace('%%TOTAL%%', str(total))
  .replace('%%SELF%%', ''.join(f'<li>{e(x)}</li>' for x in SELF))
  .replace('%%CUT%%', ''.join(f'<li>{e(a)}<small>第 {b} 章</small></li>' for a, b in CUT)))
out = os.path.join(ROOT, 'viz', 'fubi.html')
open(out, 'w', encoding='utf-8').write(page)
print('OK', out, len(page))
