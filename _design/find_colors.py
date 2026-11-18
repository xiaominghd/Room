# -*- coding: utf-8 -*-
"""在 canvas.fig 的消息里，围着某个画板名找它附近的颜色（float 四元组）。"""
import struct, sys

msg = open(r"D:\Work\IM\_design\extract\message.bin", "rb").read()

def near_colors(name, span=1200, limit=12):
    key = name.encode("utf-8")
    hits = []
    start = 0
    while True:
        i = msg.find(key, start)
        if i < 0:
            break
        hits.append(i)
        start = i + 1
    print(f"### {name}: {len(hits)} 处命中")
    for h in hits[:3]:
        lo, hi = max(0, h - span), min(len(msg), h + span)
        seg = msg[lo:hi]
        # 找连续的 4 个 float（0..1 之间）
        found = []
        for off in range(0, len(seg) - 16, 4):
            try:
                a, b, c, d = struct.unpack_from("<4f", seg, off)
            except struct.error:
                break
            if all(-0.001 <= v <= 1.001 for v in (a, b, c, d)) and any(v > 0.01 for v in (a, b, c)):
                # 排除全 0 / 全 1 之类无信息
                if not (a == b == c):
                    found.append((lo + off - h, (a, b, c, d)))
        seen = []
        for rel, rgba in found:
            r, g, b, a = rgba
            hexs = "#%02X%02X%02X" % (
                max(0, min(255, round(r * 255))),
                max(0, min(255, round(g * 255))),
                max(0, min(255, round(b * 255))),
            )
            if (hexs, round(a, 2)) in seen:
                continue
            seen.append((hexs, round(a, 2)))
            print(f"    rel={rel:6d}  {hexs}  a={a:.2f}")
            if len(seen) >= limit:
                break
        print("    ---")

for n in sys.argv[1:]:
    near_colors(n)
