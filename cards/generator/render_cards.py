#!/usr/bin/env python3
"""README 动态卡生成器:交易日 17:35(北京)由 GitHub Actions 调用。
产出 cards/latest/{heartbeat,zt_industry}.png。
用法: STOCKROUTE_TOKEN=xxx python3 render_cards.py [YYYYMMDD]"""
import os, sys, datetime
import requests
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE = "https://api-stock.600044.xyz"
TOK = os.environ["STOCKROUTE_TOKEN"]
OUT = os.path.join(os.path.dirname(__file__), "..", "latest")
os.makedirs(OUT, exist_ok=True)

def q(ds, **kw):
    kw.update(dataset=ds, limit=kw.pop("limit", 300))
    r = requests.get(f"{BASE}/api/query", params=kw,
                     headers={"Authorization": f"Bearer {TOK}"}, timeout=30)
    r.raise_for_status()
    return (r.json() or {}).get("rows") or []

def trade_day(date: str) -> bool:
    return len(q("sentiment.breadth_minute", start=date, end=date, limit=5)) > 0

def card_heartbeat(date: str, rows):
    rise = [int(x["rise"]) for x in rows]; fall = [-int(x["fall"]) for x in rows]
    ts = [datetime.datetime.fromtimestamp(int(x["ts_ms"]) / 1000).strftime("%H:%M") for x in rows]
    fig, ax = plt.subplots(figsize=(12, 6.3), dpi=100)
    fig.patch.set_facecolor("#0B0E14"); ax.set_facecolor("#0B0E14")
    ax.fill_between(ts, rise, color="#FF4D5E", alpha=.25)
    ax.plot(ts, rise, color="#FF4D5E", lw=2)
    ax.fill_between(ts, fall, color="#2EE6A6", alpha=.2)
    ax.plot(ts, fall, color="#2EE6A6", lw=2)
    ax.axhline(0, color="#3f3f46", lw=.8)
    ax.set_title(f"A股市场心跳 · {date[:4]}-{date[4:6]}-{date[6:]}  上涨 {max(rise)} / 下跌 {max(-min(fall),0)}",
                 color="#e4e4e7", fontsize=16, pad=14)
    ax.tick_params(colors="#71717a", labelsize=9)
    for s in ax.spines.values(): s.set_visible(False)
    plt.xticks(ts[::30])
    fig.text(.985, .02, "data · stockroute.pro", color="#52525b", ha="right", fontsize=8)
    fig.savefig(f"{OUT}/heartbeat.png", facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)

def card_zt(date: str, rows):
    from collections import Counter
    ind = Counter(x.get("industry") or x.get("所属行业") or "其他" for x in rows)
    top = ind.most_common(12)
    fig, ax = plt.subplots(figsize=(12, 6.3), dpi=100)
    fig.patch.set_facecolor("#0B0E14"); ax.set_facecolor("#0B0E14")
    names = [t[0] for t in top][::-1]; vals = [t[1] for t in top][::-1]
    bars = ax.barh(names, vals, color="#FF4D5E", alpha=.85)
    for b, v in zip(bars, vals): ax.text(b.get_width() + .1, b.get_y() + .4, str(v), color="#e4e4e7", fontsize=10)
    ax.set_title(f"今日涨停行业分布 · {date[:4]}-{date[4:6]}-{date[6:]}  共 {len(rows)} 只",
                 color="#e4e4e7", fontsize=16, pad=14)
    ax.tick_params(colors="#a1a1aa", labelsize=10)
    for s in ax.spines.values(): s.set_visible(False)
    fig.text(.985, .02, "data · stockroute.pro", color="#52525b", ha="right", fontsize=8)
    fig.savefig(f"{OUT}/zt_industry.png", facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)

def main():
    date = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().strftime("%Y%m%d")
    if not trade_day(date):
        print(f"{date} 非交易日,跳过"); return
    b = q("sentiment.breadth_minute", start=date, end=date, limit=241)
    z = q("board.zt_pools", start=date, end=date, limit=300) or q("board.zt_pools", limit=300)
    card_heartbeat(date, b)
    card_zt(date, z)
    print(f"✓ 卡片已生成 → {OUT}/ (heartbeat.png, zt_industry.png)")

if __name__ == "__main__":
    main()
