# -*- coding: utf-8 -*-
"""纪元表：全稿的时间数字 -> 逐字核对 -> 生成 纪元表.md 和 纪元表.html。
用法：python 纪元表.py   引文对不上原文时会列出来并退出。全部是推论，不是定案。"""
import glob, html, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
strip = lambda s: re.sub(r'\s+', '', s)

def source(ch):
    if ch == '笔记': p = os.path.join(ROOT, '作者原话', '灵感笔记-2026-11-04.md')
    elif ch == '决定': p = os.path.join(ROOT, '作者原话', '决定记录.md')
    else:
        fs = [f for f in glob.glob(os.path.join(ROOT, 'chapters', '*.md')) if re.match(r'0*' + re.escape(ch) + '_', os.path.basename(f))]
        if not fs: return None
        p = fs[0]
    return strip(open(p, encoding='utf-8').read())

LINE = {'W': '世界纪元', 'B': '进盒子以来', 'F': '代码家族内史', 'P': '人物年龄'}
# (章, 原文, 量的是什么, 时间线)
ROWS = [
 ('5', '第四纪元：又称封装纪元。3501-4700年。结束于核弹集中引爆的“岩底之战”', '第四纪元起止，核战在 4700 年', 'W'),
 ('5', '第五纪元：又称扭曲纪元。4701年-5200年（一年只相当于之前的三分之二年）', '第五纪元长 500 年，是过去', 'W'),
 ('5', '第六纪元：又称回归纪元。5201年至今', '现在＝第六纪元', 'W'),
 ('29', '第六纪元：又称回归纪元。5201年至今', '同第 5 章，原样重复', 'W'),
 ('5', '从此一天变为16个小时', '核战后一天 16 小时', 'W'),
 ('19', '第一次，在第六纪元中', '现在＝第六纪元', 'W'),
 ('24', '第四纪元，又名毁灭纪元', '另一套划分：第四纪元以核战结束', 'W'),
 ('24', '现在正是第四纪元之后的第五纪元，也就是盒子纪元。', '现在＝第五纪元', 'W'),
 ('49', '虽然现在是第五纪元了', '现在＝第五纪元', 'W'),
 ('103', '这是第五纪元中的某一刻', '秋水所在＝第五纪元', 'W'),
 ('122', '这是第五纪元的第一面旗帜', '第五纪元好像刚开始', 'W'),
 ('185', '第五纪元的第一场辩论', '第五纪元好像刚开始', 'W'),
 ('7', '我们要学习的第一个内容是俄狄浦斯王，这是第三纪元时期', '俄狄浦斯＝第三纪元', 'W'),
 ('129', '王阳明就是第三纪元中能做到和代码家族类似的一个人', '王阳明＝第三纪元', 'W'),
 ('133', '这句话是第四纪元时期一个叫老子的人说的', '老子＝第四纪元', 'W'),
 ('19', '第二纪元时期一名名叫纪伯伦的诗作', '纪伯伦＝第二纪元', 'W'),
 ('22', '在第三纪元，一个叫马克.扎克伯格的人开发出facebook', '扎克伯格＝第三纪元', 'W'),
 ('134', '在第四纪元之时，有一个人名字叫埃隆马斯克', '马斯克＝第四纪元', 'W'),
 ('101', '在岩底之战时，大部分人都选择进入了盒子', '进盒子＝岩底之战', 'B'),
 ('98', '所有的核弹全部爆炸，以此显示再也不回地球', '进盒子时核弹全炸', 'B'),
 ('15', '已经过去了整整旧历4000年（新历6000年）', '人类离开地面至今', 'B'),
 ('180', '他戴着这个秘密活了500年', '进盒子至今 500 年', 'B'),
 ('180', '那扇门，已经500年没有开过了', '门 500 年没开', 'B'),
 ('103', '生活就像这样已经过了五千年了', '这样的生活过了五千年', 'B'),
 ('109', '时间：盒子纪元2022年', '盒子纪元第 2022 年', 'B'),
 ('57', '构建了这个自我运作千年的盒子帝国', '盒子运作千年', 'B'),
 ('笔记', '1000年以后，盒子重新开始苏醒', '盒子 1000 年后苏醒', 'B'),
 ('笔记', '150年前发生了什么', '叛乱在 150 年前', 'F'),
 ('笔记', '极化针是150年前', '极化针在 150 年前', 'F'),
 ('决定', '家族叛乱发生在 150 年前', '已采用 150 年', 'F'),
 ('111', '这是一百五十年前到现在的规矩', '七人会议规矩立了 150 年', 'F'),
 ('11', '200年前，一场失败的政变，留下唯一的遗产，就是极化针', '政变和极化针在 200 年前', 'F'),
 ('11', '家族从此迎来了数百年的和平', '政变后「数百年」和平', 'F'),
 ('10', '但是我感觉200年前，一定发生了什么事情', '200 年前出事', 'F'),
 ('9', '大概200多年前，代码家族竟然发现，家族内部的NT松果体居然开始觉醒', 'NT 觉醒在 200 多年前', 'F'),
 ('9', '而这也是你的六世祖改变相貌的时刻', '六代以前', 'F'),
 ('130', '为了避免再次出现两百多年前那样的政变', '政变在两百多年前', 'F'),
 ('92', '二十年前的事情他并不是不知道', '停止表演的悲剧，20 年前（不是叛乱）', 'F'),
 ('92', '从前的情况和三十年前并不一样，这次有太阳衰减', '上次评估，30 年前（不是叛乱）', 'F'),
 ('笔记', '他们其中都是100年整的寿命', '家族寿命 100 年', 'F'),
 ('3.7', '秋水想了想，自己应该有五千岁左右了', '秋水约五千岁', 'P'),
 ('3.7', '应该大概是五千圈左右了', '五千圈＝五千年', 'P'),
 ('103', '秋水想了想，自己应该有五千岁左右了', '同第 3.7 章，原样重复', 'P'),
 ('180', '这一刻在他心中留了500年', '梓洛等了 500 年', 'P'),
]

bad = [(c, q) for c, q, _, _ in ROWS if (source(c) is None or strip(q) not in source(c))]
if bad:
    print('引文对不上原文：'); [print('  ', b) for b in bad]; sys.exit(1)
print('引文全部对上', len(ROWS))

# 打架清单：(标题, 一句话, [改法])
FIGHTS = [
 ('现在是第几纪元', '第 5、29 章有六个纪元，现在是第六；第 24 章只有五个，现在是第五。第 19 章说第六，第 24、49、103 章说第五。',
  ['把第 24 章写成代码家族自己的「心境划分」（原文本来就这么说），两套并存，正文统一用一套。',
   '把第 5 章的第五、第六纪元合成「盒子纪元」，改第 19 章一处。']),
 ('进盒子多久', '同一件事有 5 个数：500 年（180）、千年（57、笔记）、2022 年（109）、旧历 4000 年（15）、五千年（103）。',
  ['套娃已定：每个数字属于一层，各层时钟不同。只要标清每个数在哪一层，原文基本不用改。',
   '统一成一个数，改其余各处。']),
 ('叛乱是 150 年还是 200 年', '已定 150 年，但第 9、10、11、130 章写 200 年。第 11 章直接写「200年前……极化针」，和笔记「极化针是150年前」正面冲突。',
  ['这 5 处的 200 改成 150。', '第 11 章「数百年的和平」也要跟着改，150 年装不下数百年。']),
 ('第 92 章不是叛乱', '决定记录写「第 92 章的 20/30 年改为 150 年」，但原文 20 年前是停止表演的悲剧，30 年前是一次评估，不是叛乱。',
  ['第 92 章不改，决定记录里这半句删掉（要你同意）。']),
 ('名人放错纪元', '老子在第四纪元（133）、俄狄浦斯在第三纪元（7），两套划分下都不对。王阳明、纪伯伦、马斯克只在其中一套下对。',
  ['不改：第 49 章说封装时中国文明丢了，家族记错历史正好是伏笔。', '改这两处的纪元。']),
 ('秋水五千岁，梓洛只等了 500 年', '第 3.7、103 章秋水约五千岁；第 180 章进盒子才 500 年。',
  ['秋水比盒子老：他进过不止一次盒子（接「爷爷就是上一轮的他」）。', '五千改成五百。']),
]
OK = ['第 5 章「一年只相当于之前的三分之二年」和第 15 章「旧历4000年（新历6000年）」正好对得上，说明作者算过。',
      '第 180 章的 500 年，正好等于第 5 章第五纪元的长度（4701-5200）。']
QUESTION = ('进盒子到现在多久？', ['每一层有自己的时钟，数字各属一层（建议）', '统一成 500 年', '统一成五千年'])

# ---------- Markdown ----------
md = ['# 纪元表（夜间推演，2026-11-08）', '', '**全部是推论，没有定案。** 原稿、决定记录、灵感笔记都没改。引文已由 纪元表.py 逐字核对。', '',
      '## 结论', '',
      '1. 全稿的时间数字分四条线：世界纪元、进盒子以来、代码家族内史、人物年龄。',
      '2. 最大的打架是两套纪元划分并存：第 5 章六个纪元，现在是第六；第 24 章五个，现在是第五，正文两种都用。',
      '3. 「进盒子到现在多久」有 5 个不同的数：500 年、千年、2022 年、旧历 4000 年、五千年。',
      '4. 叛乱已定 150 年，但正文还有 5 处写 200 年；第 92 章的 20/30 年其实不是叛乱，决定记录可能记错了。',
      '5. 也有自洽的地方：第 5 章「一年＝三分之二年」和第 15 章「旧历 4000＝新历 6000」对得上，180 章的 500 年＝第五纪元长度。', '',
      f'## 原文表（{len(ROWS)} 条）', '', '| 章 | 原文 | 量的是什么 | 时间线 |', '|---|---|---|---|']
for c, q, w, l in ROWS:
    src = '灵感笔记' if c == '笔记' else ('决定记录' if c == '决定' else f'第 {c} 章')
    md.append(f'| {src} | 「{q}」 | {w} | {LINE[l]} |')
md += ['', '没收进表的：人物在单章里的小时间（如黎安「四十年」、曦轩「二十九年」、张嘱「五岁」），只粗看过，没查出和主线打架，未逐条核对。', '',
       '另：第 180 章末尾有一段和第 111 章一字不差（「这是一百五十年前到现在的规矩」那段），像是误贴进来的。', '',
       f'## 打架清单（{len(FIGHTS)} 处）', '']
for i, (t, s, fx) in enumerate(FIGHTS, 1):
    md += [f'### {i}. {t}', '', s, ''] + [f'- 改法{"一二"[k]}（建议）：{x}' for k, x in enumerate(fx)] + ['']
md += ['## 自洽的地方', ''] + [f'- {x}' for x in OK] + ['', '## 给你的问题', '', f'**{QUESTION[0]}**', ''] + [f'{k}. {x}' for k, x in enumerate(QUESTION[1], 1)] + ['']
open(os.path.join(HERE, '纪元表.md'), 'w', encoding='utf-8').write('\n'.join(md))

# ---------- 页面 ----------
e = html.escape
# 图 1：「多少年前」竖轴（对数），每个点直接标数字和章
DOTS = [  # (年数, 显示, 章, 原文, 类别)
 (150, '150 年', '笔记（已定）', '极化针是150年前', 'F'),
 (200, '200 年', '第 9、10、11、130 章', '200年前，一场失败的政变，留下唯一的遗产，就是极化针', 'F'),
 (500, '500 年', '第 180 章', '他戴着这个秘密活了500年', 'B'),
 (1000, '千年', '第 57 章、笔记', '构建了这个自我运作千年的盒子帝国', 'B'),
 (2022, '2022 年', '第 109 章', '时间：盒子纪元2022年', 'B'),
 (4000, '旧历 4000 年', '第 15 章', '已经过去了整整旧历4000年（新历6000年）', 'B'),
 (5000, '五千年', '第 103、3.7 章', '生活就像这样已经过了五千年了', 'B'),
]
import math
VW, VH, TOP, BOT = 360, 640, 70, 610
def ypos(v): return TOP + (math.log10(v) - math.log10(100)) / (math.log10(6000) - math.log10(100)) * (BOT - TOP)
svg = [f'<svg viewBox="0 0 {VW} {VH}" class="chart" role="img" aria-label="进盒子以来和家族叛乱的年数，按多少年前排列">']
svg.append(f'<line x1="70" x2="70" y1="{TOP-30}" y2="{BOT}" class="axis"/>')
svg.append(f'<text x="70" y="{TOP-40}" class="now" text-anchor="middle">现在</text>')
for v in ():
    y = ypos(v); svg.append(f'<line x1="64" x2="76" y1="{y:.1f}" y2="{y:.1f}" class="axis"/><text x="58" y="{y+5:.1f}" class="tick" text-anchor="end">{v}</text>')
svg.append(f'<text x="58" y="{BOT+4:.1f}" class="tick" text-anchor="end">年前</text>')
for v, lab, ch, q, k in DOTS:
    y = ypos(v); ty = y + {4000: -6, 5000: 8}.get(v, 0)
    svg.append(f'<g class="dot" tabindex="0" data-tip="{e(ch)}：「{e(q)}」"><rect x="50" y="{y-20:.1f}" width="300" height="40" fill="transparent"/>'
               f'<line x1="70" x2="96" y1="{y:.1f}" y2="{y:.1f}" class="lead {k}"/><circle cx="70" cy="{y:.1f}" r="8" class="mk {k}"/>'
               f'<text x="104" y="{ty+7:.1f}" class="lab">{e(lab)}</text><text x="{104 + 17*len(lab.replace(" ",""))+14}" y="{ty+7:.1f}" class="src">{e(ch)}</text></g>')
svg.append('</svg>')
chart = ''.join(svg)

def col(title, eras, now_idx, nuke_idx, says):
    blocks = ''
    for i, n in enumerate(eras):
        cls = ' now' if i == now_idx else ''
        tag = '<b class="tag">现在</b>' if i == now_idx else ''
        nk = '<span class="nk">核战</span>' if i == nuke_idx else ''
        blocks += f'<div class="era{cls}"><span>{e(n)}</span>{nk}{tag}</div>'
    return f'<div class="col"><h3>{e(title)}</h3>{blocks}<p class="says">{e(says)}</p></div>'
eras = (col('第 5 章', ['一 偶得', '二 期望', '三 后期望', '四 封装', '五 扭曲', '六 回归'], 5, 3, '第 19 章跟它')
        + col('第 24 章', ['一 偶得', '二 发现', '三 增长', '四 毁灭', '五 盒子'], 4, 3, '第 49、103 章跟它'))

fights = ''.join(f'<details class="fg"><summary><b class="x" aria-hidden="true">✕</b><span>{e(t)}</span></summary><p>{e(s)}</p><ul>' +
                 ''.join(f'<li>{e(x)}</li>' for x in fx) + '</ul></details>' for t, s, fx in FIGHTS)
table = ''.join(f'<tr><td>{e("笔记" if c=="笔记" else ("决定" if c=="决定" else c))}</td><td>「{e(q)}」<small>{e(w)}</small></td><td><i class="sw {l}"></i>{e(LINE[l])}</td></tr>' for c, q, w, l in ROWS)
qs = ''.join(f'<li>{"<b>" + e(x) + "</b>" if k == 0 else e(x)}</li>' for k, x in enumerate(QUESTION[1]))

page = f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>纪元表</title>
<style>
:root{{ /* 浅色单主题，和晨报一致。系列色取 dataviz 参考色前三位，已跑校验；aqua 对比度不足，靠每个点的直接标签补偿。 */
 --bg:#EEF1F4;--card:#FFF;--ink:#18202A;--mute:#5D6875;--line:#C9D0D8;--red:#B3261E;
 --s-b:#2a78d6;--s-f:#eb6834;--s-p:#1baf7a;
 --font:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;color-scheme:light}}
*{{box-sizing:border-box}}
html,body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:18px;line-height:1.6}}
main{{max-width:720px;margin:0 auto;padding:18px 14px 72px}}
h1{{font-size:26px;font-weight:900;line-height:1.35;margin:0 0 6px;text-wrap:balance}}
h2{{font-size:21px;font-weight:900;margin:34px 0 8px;text-wrap:balance}}
h3{{font-size:17px;margin:0 0 6px}}
.sub{{color:var(--mute);font-size:15px;margin:0 0 8px}}
.card{{background:var(--card);border-radius:12px;padding:12px}}
.key{{display:flex;gap:16px;font-size:15px;color:var(--mute);margin:0 0 4px}}
.key i,.sw{{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:5px;vertical-align:-1px}}
.B{{fill:var(--s-b);stroke:var(--s-b);background:var(--s-b)}} .F{{fill:var(--s-f);stroke:var(--s-f);background:var(--s-f)}} .P{{background:var(--s-p)}} .W{{background:var(--mute)}}
.chart{{width:100%;height:auto;display:block}}
.axis{{stroke:var(--ink);stroke-width:2}}
.lead{{stroke-width:2;fill:none}}
.mk{{stroke:var(--card);stroke-width:2}}
.now{{font-size:16px;font-weight:900;fill:var(--ink)}}
.tick{{font-size:13px;fill:var(--mute)}}
.lab{{font-size:19px;font-weight:900;fill:var(--ink)}}
.src{{font-size:14px;fill:var(--mute)}}
.dot:hover .lab,.dot:focus .lab{{text-decoration:underline}}
#tip{{position:fixed;left:12px;right:12px;bottom:12px;max-width:520px;margin:0 auto;background:var(--ink);color:#fff;border-radius:10px;padding:10px 12px;font-size:16px;display:none;z-index:9}}
.cols{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
.col h3{{text-align:center}}
.era{{background:var(--card);border-radius:8px;padding:6px 8px;margin-bottom:4px;font-size:16px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-height:40px}}
.era.now{{outline:3px solid var(--ink)}}
.tag{{background:var(--ink);color:#fff;border-radius:6px;padding:0 6px;font-size:13px;margin-left:auto}}
.nk{{color:var(--red);font-size:13px;font-weight:700}}
.says{{font-size:14px;color:var(--mute);margin:4px 0 0;text-align:center}}
.fg{{background:var(--card);border-radius:10px;margin-bottom:8px}}
.fg summary{{padding:12px;font-weight:900;cursor:pointer;display:flex;gap:10px;align-items:center;min-height:44px}}
.fg .x{{color:var(--red)}}
.fg p,.fg ul{{margin:0;padding:0 12px 10px 34px;font-size:16px}}
.fg p{{color:var(--mute)}}
.fg li{{margin-bottom:4px}}
.ok{{background:var(--card);border-radius:10px;padding:12px;border-left:5px solid #0F8A6A;font-size:16px}}
.ok p{{margin:0 0 6px}}
.q{{background:var(--card);border-radius:10px;padding:14px;border-left:5px solid var(--red)}}
.q ol{{margin:6px 0 0;padding-left:1.4em}}
details.all summary{{font-weight:700;cursor:pointer;padding:10px 0}}
table{{border-collapse:collapse;width:100%;font-size:14px;background:var(--card)}}
td{{border-top:1px solid var(--line);padding:6px;vertical-align:top}}
td:first-child{{white-space:nowrap;font-variant-numeric:tabular-nums}}
td small{{display:block;color:var(--mute)}}
td:last-child{{white-space:nowrap}}
</style></head><body><main>
<h1>进盒子到现在多久？原稿有 5 个答案</h1>
<p class="sub">点一个数字，看原文。全部是推论，原稿没动。</p>
<div class="card">
<div class="key"><span><i class="B"></i>进盒子以来</span><span><i class="F"></i>家族叛乱</span></div>
{chart}
</div>

<h2>现在是第几纪元？两套说法</h2>
<div class="cols">{eras}</div>

<h2>{len(FIGHTS)} 处打架</h2>
<p class="sub">点开看改法，改法只是建议。</p>
{fights}

<h2>对得上的</h2>
<div class="ok">{''.join(f'<p>✓ {e(x)}</p>' for x in OK)}</div>

<h2>只回一题</h2>
<div class="q"><h3>{e(QUESTION[0])}</h3><ol>{qs}</ol></div>

<details class="all"><summary>全部原文（{len(ROWS)} 条）</summary>
<table><tbody>{table}</tbody></table></details>
</main>
<div id="tip" role="status"></div>
<script>
const tip=document.getElementById('tip');
document.querySelectorAll('.dot').forEach(g=>{{
 const show=()=>{{tip.textContent=g.dataset.tip;tip.style.display='block'}};
 g.addEventListener('mouseenter',show);g.addEventListener('focus',show);g.addEventListener('click',show);
 g.addEventListener('mouseleave',()=>tip.style.display='none');g.addEventListener('blur',()=>tip.style.display='none');
}});
</script>
</body></html>'''
open(os.path.join(HERE, '纪元表.html'), 'w', encoding='utf-8').write(page)
print('OK', len(page))
