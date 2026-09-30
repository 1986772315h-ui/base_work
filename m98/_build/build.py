# -*- coding: utf-8 -*-
"""把模板中的立绘占位符替换为 base64，输出最终原型。"""
import base64, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL = os.path.join(ROOT, '_build', '原型模板.html')
IMG = os.path.join(ROOT, 'assets', 'pilot_small.jpg')
OUT = os.path.join(ROOT, 'M98_原型.html')

b64 = base64.b64encode(open(IMG, 'rb').read()).decode()
html = open(TPL, encoding='utf-8').read()
assert '__PILOT_B64__' in html, '模板缺少占位符'
open(OUT, 'w', encoding='utf-8').write(html.replace('__PILOT_B64__', 'data:image/jpeg;base64,' + b64))
print('output KB', round(os.path.getsize(OUT) / 1024, 1))
