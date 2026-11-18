# -*- coding: utf-8 -*-
import io

p = r"D:\Work\IM\demo\index.html"
s = io.open(p, encoding="utf-8").read()
orig_len = len(s)


def rep(old, new, count=0):
    global s
    if old not in s:
        print("MISS:", old[:70].replace("\n", " "))
        return
    s = s.replace(old, new, count)


rep('<div class="pad day">', '<div class="pad day" id="dayBody">')
rep('<button class="btn primary">登录</button>', '<button class="btn primary" data-act="login">登录</button>')
rep('<button class="btn primary">注册</button>', '<button class="btn primary" data-act="register">注册</button>')
rep('<button class="btn primary">进入</button>', '<button class="btn primary" data-act="enter-room">进入</button>')
rep('<button class="btn primary">确认</button>', '<button class="btn primary" data-act="code-done">确认</button>')
rep('<button class="send">', '<button class="send" data-act="send">')
rep('<button class="btn rust">留</button>', '<button class="btn rust" data-act="keep-confirm">留</button>')
rep('<button class="btn dark">隐藏</button>', '<button class="btn dark" data-act="hide-confirm">隐藏</button>')
rep('<button class="btn rust">删除</button>', '<button class="btn rust" data-act="mark-confirm">删除</button>')
rep('<button class="btn dark">保存</button>', '<button class="btn dark" data-act="rename-save">保存</button>')
rep('<button class="btn dark">退出</button>', '<button class="btn dark" data-act="logout">退出</button>')
rep('<button class="menu-row" data-close>引用并回复</button>', '<button class="menu-row" data-act="quote">引用并回复</button>')
rep('<button class="menu-row" data-close>特别记忆</button>', '<button class="menu-row" data-act="mark">特别记忆</button>')
rep('<div class="field"><span>小满</span></div>', '<div class="field" id="renameField">小满</div>')

io.open(p, "w", encoding="utf-8").write(s)
print("len", orig_len, "->", len(s))
