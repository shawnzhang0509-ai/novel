# -*- coding: utf-8 -*-
"""逐字核对 复核.md 里所有「」引文：每条必须出现在同一行提到的某一章原文里（忽略空白）。
『』是外部典籍或分析记录的说法，不核对。用法：python 复核核对.py"""
import glob, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(H)
strip = lambda s: re.sub(r'\s+', '', s)
def chap(ch):
    fs = [f for f in glob.glob(os.path.join(ROOT, 'chapters', '*.md')) if re.match(r'0*' + re.escape(ch) + '_', os.path.basename(f))]
    return strip(open(fs[0], encoding='utf-8').read()) if fs else ''
ALL = {os.path.basename(f): strip(open(f, encoding='utf-8').read()) for f in glob.glob(os.path.join(ROOT, 'chapters', '*.md'))}
# 分析记录的错误写法，故意列出作对照，不要求在原文里
ANALYSIS_SIDE = {'这次没有人可以阻止我', '明明说过等时机成熟就接他们出来', '是否被情绪牵绊将是你最大的挑战', '15884 号'}
bad, n = [], 0
for ln in open(os.path.join(H, '复核.md'), encoding='utf-8'):
    for q in re.findall(r'「([^」]+)」', ln):
        if q in ANALYSIS_SIDE or len(strip(q)) < 4 and not re.search(r'[“”]', q):
            continue
        n += 1
        chs = re.findall(r'第 ?([\d.]+) ?章', ln) + re.findall(r'^\| ?\d+ ?\| ?([\d.]+) ?\|', ln)
        ok = any(strip(q) in chap(c) for c in chs) or any(strip(q) in t for t in ALL.values())
        if not ok:
            bad.append(q)
print('核对引文', n, '条，对不上', len(bad), '条')
for b in bad: print('  ✗', b)
sys.exit(1 if bad else 0)
