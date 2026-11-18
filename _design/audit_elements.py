# -*- coding: utf-8 -*-
"""清点 demo 里所有可点元素：有处理 / 目标存在 / 是否双跳。输出到文件（UTF-8）。"""
import io, re
from lxml import html

HTML = r"D:\Work\IM\demo\index.html"
JS = r"D:\Work\IM\demo\app.js"
OUT = r"D:\Work\IM\_design\audit-report.txt"

src = io.open(HTML, encoding="utf-8").read()
doc = html.parse(io.StringIO(src)).getroot()
js = io.open(JS, encoding="utf-8").read()

pages = [e.get("data-page") for e in doc.xpath('//section[contains(@class,"page")]')]
sheets = [e.get("data-overlay") for e in doc.xpath('//div[contains(@class,"sheet")][@data-overlay]')]

js_acts = set(re.findall(r"a === '([a-z0-9-]+)'", js))
js_acts |= {m for m in re.findall(r"data-act=\"([a-z0-9-]+)\"", js)}

def text_of(el):
    return re.sub(r"\s+", " ", " ".join(el.itertext())).strip()[:26]

lines = []
seen = set()
for el in doc.xpath("//button | //*[@data-act] | //*[@data-goto] | //*[@data-overlay] | //*[@data-toggle] | //*[@data-back]"):
    page = None
    p = el.getparent()
    while p is not None:
        if p.get("data-page"):
            page = p.get("data-page")
            break
        p = p.getparent()
    act, goto, ov = el.get("data-act"), el.get("data-goto"), el.get("data-overlay")
    tg, bk, cl = el.get("data-toggle"), el.get("data-back"), el.get("data-close")
    if act:
        kind, target = "act", act
    elif goto:
        kind, target = "goto", goto
    elif ov:
        kind, target = "overlay", ov
    elif tg is not None:
        kind, target = "toggle", ""
    elif bk is not None:
        kind, target = "back", ""
    elif cl is not None:
        kind, target = "close", ""
    else:
        kind, target = "NONE", ""

    key = (page or "-", kind, target, text_of(el))
    if key in seen:
        continue
    seen.add(key)

    note = ""
    if kind == "NONE":
        note = "!! 点了没反应"
    elif kind == "act" and target not in js_acts:
        note = "!! 没有处理分支"
    elif kind == "goto" and target not in pages:
        note = "!! 目标页面不存在"
    elif kind == "overlay" and target not in sheets:
        note = "!! 目标弹层不存在"
    lines.append(f"{note:18} {str(page or '-'):16} {kind:8} {target:18} {text_of(el)}")

# 页面骨架
lines.append("\n--- 页面骨架 ---")
for sec in doc.xpath('//section[contains(@class,"page")]'):
    name = sec.get("data-page")
    back = bool(sec.xpath('.//*[@data-back]'))
    home = bool(sec.xpath('.//*[contains(@class,"homebar")]'))
    pad = bool(sec.xpath('.//*[contains(@class,"pad")]')) or bool(sec.xpath('.//*[contains(@class,"feed")]')) or bool(sec.xpath('.//*[contains(@class,"launch")]'))
    lines.append(f"{name:18} back={int(back)} homebar={int(home)} 内容区={int(pad)}")

# 入口统计
lines.append("\n--- 每页入口数（来自 data-goto / 侧栏）---")
gotos = re.findall(r"data-goto=\"([a-z0-9-]+)\"", src) + re.findall(r"data-goto=\"([a-z0-9-]+)\"", js)
side = re.findall(r"\['[^']*', '([a-z0-9-]+)'", js)
for p in pages:
    n = gotos.count(p) + side.count(p)
    lines.append(f"{p:18} 入口 {n}")

lines.append("\n--- 弹层触发 ---")
for s in sheets:
    n = src.count(f'data-overlay="{s}"')
    lines.append(f"{s:18} 静态触发 {n}")

lines.append(f"\npages={len(pages)} sheets={len(sheets)}")
io.open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print("wrote", OUT, len(lines), "lines")
