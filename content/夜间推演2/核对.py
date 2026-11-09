# -*- coding: utf-8 -*-
"""核对 夜间推演2 下 md 文件里的每一处「」引文：
带出处（第 X 章 / 灵感笔记 / 决定记录 / 用户原话）的，要逐字出现在那个出处里；
其余「」也必须逐字出现在原稿、灵感笔记或决定记录的某处。
用法：python 核对.py [文件...]   默认核对本目录所有 .md。对不上就列出来并以 1 退出。"""
import glob, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
strip = lambda s: re.sub(r'\s+', '', s)
rd = lambda p: strip(open(p, encoding='utf-8').read())
CH = {}
for f in glob.glob(os.path.join(ROOT, 'chapters', '*.md')):
    m = re.match(r'0*([\d.]+?)_', os.path.basename(f))
    if m: CH.setdefault(m.group(1), []).append(rd(f))
NOTE = rd(os.path.join(ROOT, '作者原话', '灵感笔记-2026-11-04.md'))
DEC = rd(os.path.join(ROOT, '作者原话', '决定记录.md'))
ALL = ''.join(''.join(v) for v in CH.values()) + NOTE + DEC

def src(tag):
    if tag in ('灵感笔记',): return NOTE
    if tag in ('决定记录', '用户原话'): return DEC
    return ''.join(CH.get(tag, [])) or None

files = sys.argv[1:] or sorted(glob.glob(os.path.join(HERE, '*.md')))
bad, n = [], 0
for p in files:
    for ln, line in enumerate(open(p, encoding='utf-8'), 1):
        tag = None
        m = re.search(r'(第\s*([\d.]+)\s*章|灵感笔记|决定记录|用户原话)：「', line)
        if m: tag = m.group(2) or m.group(1)
        # 取最外层「」（允许引文里嵌套「」）
        depth, start = 0, None
        for i, ch in enumerate(line):
            if ch == '「':
                if depth == 0: start = i + 1
                depth += 1
            elif ch == '」' and depth:
                depth -= 1
                if depth == 0:
                    q = strip(line[start:i]); n += 1
                    body = src(tag) if tag else ALL
                    if body is None or q not in body:
                        # 带出处时，同一行后面的引文可能来自另一出处，再查全集
                        if not (tag and q in ALL and line.count('：「') > 1):
                            bad.append((os.path.basename(p), ln, tag, line[start:i]))
print('核对引文', n, '处')
if bad:
    print('对不上：')
    for b in bad: print('  ', b)
    sys.exit(1)
print('全部对上')
