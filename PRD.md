# ARealMe IQ 证书体系 2.0 (iq-cert-v2) 产品需求文档与技术架构规范 (PRD)

**文档版本**: `v2.0.0`  
**创建时间**: 2026-09-21  
**状态**: 需求已批准 · 架构设计完成 · 稳扎稳打开发中  
**独立仓库**: `iq-cert-v2` (`/Users/mbplitewa/Documents/GitHub/iq-cert-v2`)  

---

## 一、 背景与业务痛点

ARealMe 官方智商测试（`https://www.arealme.com/iq/`）在 2026 年进行了旗舰级重构，合并了历年经典题库并推出了 119 题完整版（Complete Version）及 7 维认知能力分析模型（Cognitive Profile）。

在现有体系中，存在以下核心痛点：
1. **证书重新获取入口断裂**：用户完成 119 题测试后，若直接关闭网页，后续虽能在“过往成绩（History）”中看到 141 分及 7 维数据，但因当时未生成过证书，本地无图片缓存，无法重新发起证书生成。
2. **防滥用与稀缺性保护不足**：高分成绩若允许随意修改姓名，用户可能拿单次高分给不同朋友生成几十张证书，导致证书权威度与稀缺性贬值。必须实现“单次测试记录（Attempt）终身单射绑定姓名”。
3. **视觉设计与数据信息量待升级**：现行 v2.2.4 证书仅展示总分和头衔，未能体现旗舰版最硬核的“7 大认知维度剖析”，缺乏视觉说服力。
4. **缺乏社交闭环与自传播引流**：证书未印刷防伪二维码。当证书被截图发到朋友圈、X (Twitter)、Reddit、微信群时，他人无法扫码鉴真，也无法顺畅回流到 ARealMe 测试页，白白流失了巨大的自然裂变流量。
5. **部署独立性**：证书生成脚本和验证落地页应独立维护，配置自动化 GitHub Push to Deploy（Cloudflare Worker + Static Assets / Pages），彻底解耦主站 `arealme-content`，不污染测试业务代码。

---

## 二、 核心目标与产品指标

| 目标维度 | 目标定义 | 验收标准 |
| :--- | :--- | :--- |
| **功能闭环** | 凭本地成绩随时补领/重下证书；严禁篡改姓名 | 首次输入姓名后终身锁定，后续打开仅可重下或切换模板，输入框置灰/禁用 |
| **视觉呈现** | 升级 3 款高质感 Canvas 证书版式 | Academic (学术古典)、Swiss (现代网格)、Royal (皇家星盘)，均嵌入 7 维指标与防伪二维码 |
| **扫码鉴真** | 扫码直达官方证书核验页 | 手机扫码秒开验证页，展示防伪徽章、考生信息、分数及 7 维认知雷达图 |
| **裂变回流** | 从验证页直达 IQ 测试页面 | 醒目 CTA 引导用户参与同款测试，支持中英双语无缝切换，集成 `ShareKit` |
| **多语言** | 首发支持英语 (`en`) 与简体中文 (`zh-CN` / `cn`) | 文案、字体降级策略、排版单位均支持双语自适应 |
| **基础设施** | 部署于 Cloudflare Worker + Assets 架构 | 路由挂载至 `www.arealme.com/cert/iq/*`，支持动态 OpenGraph 社交卡片 |

---

## 三、 用户体验与核心业务流程

### 1. 证书生成与锁定流程（前端 SDK：`iq-cert.js`）
```
[ 用户完成测试 / 从历史记录打开 ]
                 │
                 ▼
          检查 attemptId 是否已锁定姓名？
           /                            \
       [未锁定]                        [已锁定]
          │                                │
    弹出姓名输入框 (最多16字符)        跳过输入框 / 姓名置灰只读
    (支持中文 4 字 / 英文姓名)          直接显示已发证人姓名
          │                                │
    点击「生成认证证书」                  点击「查看/重下证书」
          │                                │
          └───────────────┬────────────────┘
                          ▼
            [ 核心 Canvas 渲染引擎 ]
   1. 根据 attemptId + 分数 + 7 维 + 姓名生成防伪 Token
   2. 动态生成防伪二维码 (链接至 verification URL)
   3. 渲染指定版式 (Academic / Swiss / Royal)
   4. 绘制高清晰度 1200x630 (Retina 适配) 画布
                          │
                          ▼
            [ 证书交互弹窗 (Preview Modal) ]
   • 选项卡切换 3 款不同视觉风格 (即时无缝重绘)
   • 按钮 1：下载高清 PNG 证书图片
   • 按钮 2：在线验真与分享 (打开验证落地页)
   • 按钮 3：关闭弹窗
```

### 2. 扫码鉴真与流量回流流程（落地页：`/cert/iq/v`）
```
[ 好友或考官扫码证书上的二维码 ]
                 │
                 ▼
  [ Cloudflare Worker 接收请求 ]
  • 解析 URL 载荷（Payload）与数字签名（HMAC）
  • 若为社交网络爬虫 (Twitterbot, Facebook, WeChat等)，输出动态 OpenGraph HTML 预览卡片
  • 若为普通浏览器访问，返回验证落地页 (Verification SPA)
                 │
                 ▼
        [ 官方认证落地页 ]
  • 🟢 显示「AREALME 官方防伪认证通过」安全标识
  • 显示考生姓名、认证智商分数、发证日期、防伪序列号
  • 交互式 7 维认知能力星盘 / 数据对比条
  • 证书原图预览与另存为
  • 社交分享组件（接入 ShareKit <social-share>）
  • 🚀 转化 CTA：「立即测试我的智商 (Start IQ Test)」──► 跳转 www.arealme.com/iq/
```

---

## 四、 证书版式设计规范 (Canvas 2D Rendering)

证书画布基准分辨率定为 **1200 × 630 px**（符合国际标准 OpenGraph 社交分享黄金比例 1.91:1，高分屏可提升为 2400 × 1260 px 导出）。

### 1. 样式一：Academic (学术古典风)
* **设计基调**：常青藤名校 / 国际心理学会羊皮纸质感，双重细致描边，稳重典雅。
* **主要色彩**：象牙白背景 (`#FDFBF7`)、海军深蓝主色 (`#1B2A3A`)、香槟真金刻线 (`#C5A059`)。
* **信息布局**：
  * 顶部：AREALME CERTIFIED 官方学术认证标、拉丁文印记。
  * 中部：考生姓名、授予称号、特大号智商评分（如 `141`）、全国百分比评级。
  * 中下部：7 大认知维度紧凑微缩进度条（带刻度线与百分比数值）。
  * 底部左侧：学术理事会与日期签名线。
  * 底部右侧：官方金色烫金印章 + 高清晰度防伪二维码。

### 2. 样式二：Swiss (现代瑞士网格风)
* **设计基调**：国际主义平面设计风格（International Typographic Style），极简、高对比度、科技严谨。
* **主要色彩**：纯黑 (`#000000`) 与冷白灰 (`#F3F4F6`) 强烈对冲，翡翠绿 (`#10B981`) 作为数据激活强调色。
* **信息布局**：
  * 左侧栏（占 38% 宽度）：黑底白字，超大字号展示分数 `141`、AREALME 标识、发证年份。
  * 右侧主栏（占 62% 宽度）：冷白背景，清晰的网格系统排布考生姓名、认证头衔。
  * 数据矩阵：7 个认知维度以现代条形矩阵对齐展示，数字与图表结合。
  * 右下角：高对比黑白防伪二维码与唯一校验哈希字符串。

### 3. 样式三：Royal (皇家黑金星盘风)
* **设计基调**：至尊黑金、星空深邃感、认知雷达星盘，象征顶尖心智与认知天赋。
* **主要色彩**：深邃径向渐变黑 (`#18181B` -> `#09090B`)、耀目璀璨金 (`#EAB308` / `#FACC15`)、金粉流光粒子。
* **信息布局**：
  * 顶部：华丽哥特与古典西文字体，授予尊号。
  * 中央核心视觉：**7 维认知能力雷达图（Heptagonal Radar Chart）**，以金色几何星盘呈现各维度饱满度。
  * 星盘中央/上方嵌入醒目智商分数与姓名。
  * 底部两侧：金色防伪花纹边框，右下角嵌入暗金色调防伪二维码。

---

## 五、 数据结构与防伪签名规范

### 1. 7 维认知能力键值对照表
| Key | 英文名称 (EN) | 简体中文名称 (zh-CN) | 权重/满分 |
| :--- | :--- | :--- | :--- |
| `pattern` | Pattern Recognition | 模式识别 | 0 ~ 100% |
| `spatial` | Visual-Spatial | 视觉空间 | 0 ~ 100% |
| `numerical` | Numerical Ability | 数字能力 | 0 ~ 100% |
| `logic` | Logical Reasoning | 逻辑推理 | 0 ~ 100% |
| `memory` | Working Memory | 工作记忆 | 0 ~ 100% |
| `planning` | Planning Ability | 规划能力 | 0 ~ 100% |
| `attention` | Attention & Focus | 注意力 | 0 ~ 100% |

### 2. 二维码 Payload 载荷协议 (Stateless Signed Token)
为确保二维码易于手机镜头在任何缩放比例下瞬间识别，二维码数据量必须控制在极小范围（120 字节以内）。

```json
{
  "id": "e4f8b2",
  "n": "BILL LTL",
  "s": 141,
  "t": 1758466680,
  "m": [79, 82, 69, 93, 57, 99, 99],
  "l": "zh-CN",
  "sig": "b7c2a1e9"
}
```
* **字段说明**：
  * `id`: 对应本地测试记录的 `attemptId` 前缀或唯一哈希
  * `n`: 考生姓名（Name / Initials）
  * `s`: IQ 分数（Score）
  * `t`: 发证时间戳（秒）
  * `m`: 7 个认知维度的百分比数组（按顺序排列）
  * `l`: 语言代码（`zh-CN` 或 `en`）
  * `sig`: 基于服务端共享秘钥计算的 HMAC-SHA256 截断校验码（前 8 位十六进制）
* **编码传输**：将 JSON 字符串通过 `Base64URL` 紧凑序列化为字符串 `d`。
* **最终 URL 结构**：
  `https://www.arealme.com/cert/iq/v/<base64url-token>`
  
  Legacy query form `?d=<token>` is permanently redirected (301) to the path form.

---

## 六、 独立仓库目录结构与模块规划

```
/iq-cert-v2/
├── PRD.md                       # 本产品需求与技术架构文档
├── package.json                 # 模块构建与脚本命令
├── tsconfig.json                # TypeScript 配置
├── wrangler.jsonc               # Cloudflare Worker + Assets 部署配置
│
├── src/
│   ├── engine/                  # 供 IQ 测试页面加载的运行时 SDK (iq-cert.js)
│   │   ├── index.ts             # SDK 入口，挂载 window.ArealmeCert
│   │   ├── state.ts             # 状态管理、姓名锁定逻辑、黑名单过滤
│   │   ├── qr.ts                # 无依赖纯 JS 二维码生成模块 (Nayuki QR engine)
│   │   ├── crypto.ts            # 前端防伪验签与 token 组装工具
│   │   ├── i18n/                # 国际化文案 (en.ts, zh-CN.ts)
│   │   ├── renderers/           # 3 款 Canvas 渲染器
│   │   │   ├── common.ts        # 基础绘图辅助 (高分屏适配、多行排版、圆角、印章)
│   │   │   ├── academic.ts      # V1 学术古典版式
│   │   │   ├── swiss.ts         # V2 瑞士现代网格版式
│   │   │   └── royal.ts         # V3 皇家黑金星盘雷达版式
│   │   └── ui/                  # 证书生成弹窗 UI (纯 CSS + 极简 DOM，避免侵入宿主页)
│   │       ├── modal.ts
│   │       └── modal.css
│   │
│   ├── verify/                  # 扫码验证落地页 SPA (Verification & Landing)
│   │   ├── index.html           # 落地页 HTML 骨架
│   │   ├── main.ts              # 落地页核心控制逻辑 (解析 Token, 验真, 渲染图表)
│   │   ├── styles.css           # 落地页现代化视觉样式
│   │   ├── components/          # 雷达图组件、成绩卡片、官方印章徽章
│   │   └── i18n/                # 落地页中英双语包
│   │
│   └── shared/                  # 共享常量与类型
│       ├── types.ts
│       └── constants.ts
│
├── worker/                      # Cloudflare Worker 入口
│   ├── index.ts                 # 拦截请求、SSR 动态 OpenGraph、分发静态资产与 SDK
│   └── og-tags.ts               # 针对社交爬虫的动态 meta 标签生成
│
└── scripts/
    ├── build.ts                 # 构建引擎 SDK 与落地页资产
    └── preview.ts               # 本地全链路仿真预览服务器
```

---

## 七、 落地页接入 ShareKit 规范

* 验证落地页直接接入同级仓库 `../sharekit` 的现代社交分享组件。
* 引入方式：通过 `<script src="https://areal.me/static/libs/sharekitv6.iife.js"></script>` 或直接打包嵌入。
* 在页面底部渲染：
  ```html
  <social-share 
    style="display: block; min-height: 48px;"
    platforms="native,twitter,facebook,whatsapp,telegram,copylink"
    radius="8px"
    gap="12"
    url="[当前证书验证URL]"
    title="我的 AREALME 智商认证：141 分！超过全球 99.7% 的人群，快来看看我的 7 维认知报告："
  ></social-share>
  ```
* 移动端与桌面端自适应呈现，自带一键复制与扫码弹层。

---

## 八、 开发排期与里程碑 (Milestones)

1. **Milestone 1**: 建立工程脚手架、TypeScript 环境、Wrangler 配置与公共类型定义。（Day 1）
2. **Milestone 2**: 开发轻量级 QR 编码器与 3 款全新 Canvas 渲染器（Academic、Swiss、Royal），集成 7 维认知剖析与姓名终身锁定逻辑。（Day 1-2）
3. **Milestone 3**: 开发 SDK 交互弹窗 `iq-cert.js`，支持下载高清大图与即时切换风格。（Day 2）
4. **Milestone 4**: 开发 Cloudflare 扫码验证落地页（中英双语、认知雷达图、ShareKit 分享、跳转测试 CTA）与 Worker 动态 OpenGraph 社交卡片。（Day 2-3）
5. **Milestone 5**: 本地全流程预览调试、模拟宿主接入、自动化测试与 Cloudflare 部署配置。（Day 3）

---
*本文档为 ARealMe IQ 证书体系 2.0 的唯一需求与技术规范。*
