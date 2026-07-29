# 项目素材来源审计

本文档只用于内部素材追溯，不作为客户端运行时数据源。四张截图均来自本机已有项目产物，最终只发布为 `public/` 下的 WebP 资产；原始绝对路径不得写入 catalog、组件、public 元数据或图片文本。

统一转换参数：`sharp@0.34.5`，`rotate()` 自动旋转，最长边限制 1600px 且 `withoutEnlargement: true` 禁止上采样，`toColorspace('srgb')`，`webp({ quality: 84, effort: 6, smartSubsample: true })`，不保留源元数据。

## SIGNAL/LEDGER - /projects/arc/signal-ledger/live-research.webp

- 原始绝对路径：`/Users/captain/python/arc-lepton/docs/assets/readme/live-research.png`
- 原始文件：`live-research.png`
- source sha1：`df8de7bd283df1bbf25f6bb909967272f3cbd8e0`
- 原始编码：PNG
- 公开性判断：截图展示 Arc Testnet、区块号、截断交易线索、预算与研究报告演示数值；未见密钥、真实钱包、完整私有地址、个人账号或私有 URL。
- 需删除内容：无。
- 脱敏/转换：不做生成式编辑；仅进行确定性 WebP 转换、sRGB 归一化、元数据移除和最长边降至 1600px。
- 工具/参数：`sharp@0.34.5`；`rotate()`；`resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })`；`toColorspace('srgb')`；`webp({ quality: 84, effort: 6, smartSubsample: true })`。
- 原始尺寸：1920x1080
- 输出尺寸：1600x900
- 输出字节数：69134
- 输出 SHA-256：`c88273f31ce081c9e21a043fa4f4b70a1916c7636aba3489d0f01185be226375`
- 目标路径：`public/projects/arc/signal-ledger/live-research.webp`
- DEMO/TESTNET 语境：页面内容用于解释代理调用预算、测试网支付线索和 Receipt 记录，不声明主网收入或真实交易规模。

## HADRON - /projects/arc/hadron/hadron-market.webp

- 原始绝对路径：`/Users/captain/python/arc-hadron/docs/assets/readme/hadron-market.png`
- 原始文件：`hadron-market.png`
- source sha1：`d66934a47595e511d18dfe73579d5eb76d6b8f69`
- 原始编码：PNG
- 公开性判断：截图处于钱包未连接状态，页面明确标注 `AI-GENERATED · TESTNET ILLUSTRATIVE DATA · NOT FINANCIAL ADVICE`；未见个人身份、密钥、真实钱包或私有 URL。
- 需删除内容：无。
- 脱敏/转换：不做生成式编辑；仅进行确定性 WebP 转换、sRGB 归一化和元数据移除，原始尺寸未超过 1600px 最长边因此不缩放。
- 工具/参数：`sharp@0.34.5`；`rotate()`；`resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })`；`toColorspace('srgb')`；`webp({ quality: 84, effort: 6, smartSubsample: true })`。
- 原始尺寸：1440x1200
- 输出尺寸：1440x1200
- 输出字节数：66138
- 输出 SHA-256：`f95e3c302ce964650757ad7d44fcaec9960dd0219b1074e0a35c2677030e6e69`
- 目标路径：`public/projects/arc/hadron/hadron-market.webp`
- DEMO/TESTNET 语境：市场深度、收益率、交易按钮和资产列表均按测试网/演示数据处理，不代表投资建议、真实流动性或运营结果。

## ArcPredict - /projects/arc/arcpredict/crypto-home.webp

- 原始绝对路径：`/Users/captain/python/ArcPredict/artifacts/project-intro-video/screens/crypto-home.png`
- 原始文件：`crypto-home.png`
- source sha1：`00a34fded617bfca78e849e8cfe120d90c5165e1`
- 原始编码：JPEG（文件扩展名为 `.png`，实际编码为 JPEG）
- 公开性判断：截图展示 Arc Testnet、预测市场卡片、模拟日期和池子数值；未见密钥、真实钱包、个人账号或私有 URL。
- 需删除内容：无。
- 脱敏/转换：不做生成式编辑；仅进行确定性 WebP 转换、sRGB 归一化和元数据移除，原始尺寸未超过 1600px 最长边因此不缩放。
- 工具/参数：`sharp@0.34.5`；`rotate()`；`resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })`；`toColorspace('srgb')`；`webp({ quality: 84, effort: 6, smartSubsample: true })`。
- 原始尺寸：1265x720
- 输出尺寸：1265x720
- 输出字节数：49518
- 输出 SHA-256：`3b447b5078420d4126e104ff6fd127470ed5862d5a5520b408b4cb84512b16c3`
- 目标路径：`public/projects/arc/arcpredict/crypto-home.webp`
- DEMO/TESTNET 语境：页面为预测市场实验室的测试网演示状态，赔率、市场问题、日期和池子金额不表述为真实结算结果。

## Rialo Captain - /projects/rialo/rialo-captain/rialo-tower.webp

- 原始绝对路径：`/Users/captain/python/rialo-captain/docs/assets/readme/rialo-tower.png`
- 原始文件：`rialo-tower.png`
- source sha1：`7f9ab5ae47745a015c35da939b173d6e35cf984d`
- 原始编码：PNG
- 公开性判断：截图展示 Rialo Tower 演示航线、赔率、风险模型和 `BAL 210257 RIA` 演示余额；右上角本地演示身份需要移除，未见密钥、真实钱包、私有 URL 或其他个人数据。
- 需删除内容：右上角 `CAPTAIN@LOCAL.DEV` 文本。不得删除或替换 `BAL 210257 RIA`。
- 脱敏/转换：使用内置 `image_gen` 默认模式以原图为 edit target 移除账号文本；因工具输出为整图重采样结果，最终只从 imagegen 输出中取导航栏脱敏小区域，合成回原始截图，其余界面内容保持来自原始图，再进行确定性 WebP 转换、sRGB 归一化和元数据移除。
- 工具/参数：内置 `image_gen`；最终 prompt 为 `Remove only the small top-right account text "CAPTAIN@LOCAL.DEV" from the navigation bar. Fill only the removed text area with the adjacent near-black navigation background. Preserve logo, nav, PRESS /, BAL 210257 RIA, map, panels, odds, numbers, colors, crop, aspect ratio, typography, and every other text string.`；imagegen 中间输出路径：`/Users/captain/.codex/generated_images/019f8f03-81b3-7ef3-b48c-16a5b57c7d26/call_pfHXVbfvM10YSFoM5R959b81.png`；合成区域 `{ left: 1234, top: 20, width: 134, height: 30 }`；WebP 转换使用 `sharp@0.34.5`、`quality: 84`、`effort: 6`、`smartSubsample: true`。
- 原始尺寸：1440x960
- 输出尺寸：1440x960
- 输出字节数：77164
- 输出 SHA-256：`17f339d8c3696c7debfb90d0a27673b4ac608f78d0f7a5e0293bfd28d915c81e`
- 目标路径：`public/projects/rialo/rialo-captain/rialo-tower.webp`
- DEMO/TESTNET 语境：航线、市场赔率、风险贡献、余额和模型分数均按演示产品状态处理，不声明真实运营、保障结算或收益结果。
