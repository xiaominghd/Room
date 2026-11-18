# -*- coding: utf-8 -*-
"""从 fig 的画板渲染图里采样真实色值：按钮、底色、描边。"""
from PIL import Image
from collections import Counter

Image.MAX_IMAGE_PIXELS = None
im = Image.open(r"D:\Work\IM\_design\extract\thumbnail.png").convert("RGB")

# 1) 整块内容区的主色
box = (0, 0, 2600, 1500)
crop = im.crop(box)
c = Counter(crop.getdata())
print("内容区主色：")
for col, n in c.most_common(10):
    print("   #%02X%02X%02X  %d" % (col[0], col[1], col[2], n))

# 2) 在「保存」深色胶囊上取色：先找这块区域里最暗的一批像素
def darkest(box, label, k=4):
    region = im.crop(box)
    px = list(region.getdata())
    px = [p for p in px if sum(p) < 420]  # 深色像素
    if not px:
        print(label, "（没有深色像素）")
        return
    cc = Counter(px)
    print(label)
    for col, n in cc.most_common(k):
        print("   #%02X%02X%02X  %d" % (col[0], col[1], col[2], n))

# rename 弹层里的「保存」按钮（f5 截图里大致位置）
darkest((40, 880, 240, 960), "「保存」按钮一带的深色：")
# 顶部那条「注销」按钮（锈红）
region = im.crop((300, 0, 580, 50))
px = [p for p in region.getdata() if p[0] > p[1] + 25 and p[0] > p[2] + 25]
if px:
    cc = Counter(px)
    print("「注销」按钮的锈红：")
    for col, n in cc.most_common(4):
        print("   #%02X%02X%02X  %d" % (col[0], col[1], col[2], n))
