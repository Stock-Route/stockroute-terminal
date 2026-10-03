<div align="center">

# StockRoute Terminal · A股市场驾驶舱

**开源的 A股市场可视化终端 —— 赚钱效应一目了然**

板块热度 · 连板天梯 · 游资动向 · 个股一票看懂

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vue3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![ECharts](https://img.shields.io/badge/ECharts-5.x-aa344d.svg)](https://echarts.apache.org/)
[![SDK](https://img.shields.io/pypi/v/stockroute?color=blue&label=SDK%20stockroute)](https://github.com/Stock-Route/stockroute-sdk)

[市场心跳](cards/latest/heartbeat.png)

</div>

## 这是什么

面向**想靠股票赚钱的普通用户**的市场终端:打开 3 秒看到"今天钱往哪冲、谁是龙头、这票为什么涨"。

| 页面 | 内容 | 数据 |
|---|---|---|
| **今日赚钱效应** | 温度计(红绿盘比)+ 涨停统计 + 连板龙头 + 人气榜 + 异动归因流 | 收盘后更新 |
| **市场心跳** | 全天 241 分钟涨跌家数呼吸 + 成交额脉冲,动画回放 | 分钟级 |
| 🚧 板块热度三视图 | 涨跌/主力资金/涨停密度 treemap | 规划中([投票](#roadmap)) |
| 🚧 游资动向 | 龙虎榜席位透视 + 一日游率 | 规划中 |

**所有核心页面免费可用** —— 粘贴一个免费 token 即可,不需要积分墙。

## 30 秒上手

**方式一:本地开发**

```bash
git clone https://github.com/Stock-Route/stockroute-terminal.git
cd stockroute-terminal && pnpm install && pnpm --dir web dev
# 浏览器打开 http://localhost:5173
```

**方式二:Docker 一键跑**

```bash
docker compose up   # 内置社区令牌,零配置直接跑
# 浏览器打开 http://localhost:8088
# (社区令牌仅限本终端界面用途;个人 token 可在 .env 覆盖以获得独立配额)```

**方式三:Colab 零安装体验**(不用装任何东西)

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Stock-Route/stockroute-terminal/blob/main/examples/quickstart_colab.ipynb)

**获取免费 token**:打开 [m-stock.600044.xyz](https://m-stock.600044.xyz) 注册(免积分墙)→「Token」页签发 → 粘贴进终端右上角设置。

## 为什么造这个轮子

市面不缺数据接口,缺的是**把接口变成"一眼看懂"的界面**,以及一个**不糊弄的质量承诺**:

| 维度 | StockRoute 免费档 | akshare | tushare 免费积分 | baostock |
|---|---|---|---|---|
| 免费可用数据集 | **65+ 集(60 集可直查)** | 全部(爬虫聚合) | 有限(积分墙) | 日线/财务部分 |
| 稳定性 | SLA 承诺 + **断点标注**(坏一天标一天,不静默) | 依赖上游页面,改版即失效 | 稳定 | 稳定但更新节奏慢 |
| 质量层 | PIT 点时财务 / 双源对拍 / 数值化 / 字段契约(`field_map`) | 原始爬取 | 部分 | 前复权 |
| 实时行情 | RT 自选(2 只,延迟 ≤15s) | 无 | 付费 | 无 |
| 上手门槛 | 免费注册,无积分墙 | 无需注册 | 注册 + 积分体系 | 注册 |

> 我们不贬低任何前辈——akshare 是这个生态的奠基者之一。上表说的是**我们决定自己造轮子的原因**:
> 把"质量可承诺、界面可直读、免费可真用"三件事一次做齐。

## 数据从哪来

全部数据来自 [StockRoute API](https://github.com/Stock-Route/stockroute-sdk):
**96 个数据集 / 22 个域**,分钟线(1/5/15/30/60)、筹码分布(CYQ)、龙虎榜席位画像、AI 异动归因、
点时财务(PIT)、分钟级市场宽度等。错误契约稳定(信封 error 码),字段映射公开(`field_map`)。

- 数据哲学:**质量可承诺** —— 每个数据集有 SLA,断供必标注,双源对拍常态化
- 免费档额度:200 次/日 + RT 自选 2 只 —— 够跑通本仓库全部核心页面
- 本仓库每日契约冒烟 CI 防接口漂移(见 `docs/`)

## Roadmap(👍 投票排序,呼声高的先做)

- [ ] 板块热度三视图(涨跌/主力资金/涨停密度 treemap)
- [ ] 游资动向(龙虎榜席位透视 + 一日游率)
- [ ] 筹码分布卡(成本分布可视化)
- [ ] 个股「一票看懂」聚合页(异动原因+资金流+龙虎榜+K线关卡)
- [ ] Docker 本地模式打磨 / 英文版 / 亮色主题

## 贡献

PR 欢迎:小步提交、带截图、过 `pnpm --dir web build`。开发环境 10 分钟起跑(见上方快速开始)。
安全类问题(含 token 处理)请勿公开 issue,见 `SECURITY.md`。

## License

MIT · 数据由 [StockRoute](https://m-stock.600044.xyz) 提供 · **数据仅供研究参考,不构成投资建议**
