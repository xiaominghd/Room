# -*- coding: utf-8 -*-
"""结构自检：所有 page / sheet / scrim 必须在 #screen 里，且每个 page 有 data-page。"""
from lxml import html

doc = html.parse(r"D:\Work\IM\demo\index.html").getroot()
screen = doc.xpath('//*[@id="screen"]')
assert screen, "找不到 #screen"
screen = screen[0]

pages = doc.xpath('//section[contains(concat(" ", normalize-space(@class), " "), " page ")]')
sheets = doc.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " sheet ")]')
scrim = doc.xpath('//*[@id="scrim"]')

bad = []
for el in pages + sheets + scrim:
    owner = None
    p = el.getparent()
    while p is not None:
        if p is screen:
            owner = "screen"
            break
        p = p.getparent()
    if owner != "screen":
        bad.append(el.get("data-page") or el.get("data-overlay") or el.get("id") or el.tag)

print("pages:", len(pages), "sheets:", len(sheets), "scrim:", len(scrim))
print("不在 #screen 里:", bad if bad else "无")

ids = {e.get("id") for e in doc.xpath("//*[@id]")}
need = ["screen", "nav", "feed", "grid", "scrim", "roomInput", "dim", "toast", "dayBody", "renameField", "exportDone"]
print("缺 id:", [n for n in need if n not in ids] or "无")
