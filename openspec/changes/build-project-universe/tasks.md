## 1. 工程基线与测试骨架

- [x] 1.1 记录用户已有 `main.py`、`.gitignore`、`.agents/` 与无提交 Git 基线，建立不得覆盖的文件清单
- [x] 1.2 创建 Next.js 16.2 Active LTS、React 19.2、TypeScript 和 App Router 的最小工程文件与锁文件
- [x] 1.3 添加 ESLint、类型检查、Vitest、Testing Library、Playwright、axe 和 Lighthouse CI 依赖与脚本
- [x] 1.4 配置 `npm run verify` 的可重复执行入口，并确认空实现阶段的预期失败项

## 2. 类型化项目目录

- [x] 2.1 先编写目录测试，覆盖四个项目、唯一 slug、生态归属、必填字段、HTTPS 外链和绝对路径泄露
- [x] 2.2 实现 Ecosystem、Project、Evidence、Gallery、Theme 与 SEO 类型
- [x] 2.3 录入 Arc、Rialo 与 SIGNAL/LEDGER、HADRON、ArcPredict、Rialo Captain 的真实内容和在线地址
- [x] 2.4 实现从目录派生生态、项目、下一项目与八条公开路由的 selector
- [x] 2.5 运行目录和 selector 测试，重构重复的路由与项目常量

## 3. 静态路由与全局壳层

- [x] 3.1 先编写八条路由、动态参数与未知 slug 的失败测试
- [x] 3.2 创建根布局、全局导航、跳至正文、页脚、错误页和真正的 404 页面
- [x] 3.3 创建 `(immersive)`、`(case-files)`、`(content)` route group 与对应动态路由
- [x] 3.4 从目录实现 `generateStaticParams()`、`dynamicParams = false` 和 `notFound()` 行为
- [x] 3.5 添加 Playwright 路由冒烟测试，验证八条公开路由和未知路由

## 4. 设计系统、字体与媒体

- [x] 4.1 建立全局颜色、排版、间距、层级、焦点和动效 CSS token
- [x] 4.2 配置本地 WOFF2 展示/正文/等宽字体与许可证，并提供中文系统字体 fallback
- [x] 4.3 实现主题化链接、按钮、状态标签、章节轨、项目卡和外链组件
- [x] 4.4 从四个本地项目筛选公开截图，完成脱敏、裁切、现代格式压缩与来源记录
- [x] 4.5 为全部媒体配置静态导入、尺寸、`sizes`、alt、caption 与非首屏默认懒加载（14.18 后批准的每页唯一代表证据媒体除外）

## 5. 首页与 About

- [x] 5.1 先编写首页测试，要求一个 `h1`、两个生态入口和四个项目入口
- [x] 5.2 实现无 3D 也完整可用的 Project Universe 首页内容和项目索引
- [x] 5.3 实现 About 页面、个人定位和返回项目入口，个人资料未知字段保持可替换且不编造
- [x] 5.4 添加首页与 About 的桌面、移动和键盘端到端测试

## 6. Arc 与 Rialo 生态页

- [x] 6.1 先编写生态过滤测试，固定 Arc 三个项目、Rialo 一个项目
- [x] 6.2 实现共享 Ecosystem 页面骨架与 Arc 的轨道/项目选择内容
- [x] 6.3 先编写 Rialo 五阶段默认状态、点击、触摸与键盘激活测试
- [x] 6.4 实现服务端完整输出、客户端渐进增强的 Observe/Cover/Trigger/Settle/Explain 任务轨
- [x] 6.5 添加无 JavaScript、减少动态效果和移动端纵向时间线测试

## 7. 通用项目案例页

- [x] 7.1 先编写案例模板测试，覆盖 Hero、问题、核心闭环、三组证据、图库、技术泳道、限制和 CTA
- [x] 7.2 实现统一 ProjectCaseStudy Server Component 和项目主题令牌
- [x] 7.3 实现 SIGNAL/LEDGER 的预算、付费来源、报告与 Receipt 签名模块
- [x] 7.4 实现 HADRON 的发行、订单簿、成交、USDC 结算与持仓签名模块
- [x] 7.5 实现 ArcPredict 的市场、结果提议、挑战/确认、Claim 与 AI 边界签名模块
- [x] 7.6 实现 Rialo Captain 的航班、保障、触发、结算、Evidence 与解释签名模块
- [x] 7.7 验证四个在线 CTA、状态说明、下一项目导航和无 iframe 要求

## 8. 3D 渐进增强

- [x] 8.1 先编写质量决策测试，覆盖 WebGL、视口、`prefers-reduced-motion`、`saveData` 与用户选择
- [x] 8.2 实现 CapabilityGate、High/Medium/Low/Static 决策和服务端 Static fallback
- [x] 8.3 先编写 Canvas 初始化失败、context loss、卸载清理和单 Canvas 约束测试
- [x] 8.4 实现仅覆盖沉浸式 route group 的持久 UniverseShell、错误边界和按路由动态加载
- [x] 8.5 实现 HomeAstrolabe、ArcOrbitalCircuit 与 RialoReactiveField 三个程序化场景
- [x] 8.6 实现 DOM focus/hover 与场景信标同步，确保 Canvas 不承载唯一操作
- [x] 8.7 实现可取消路由过渡、快速导航、防后台持续渲染和 `frameloop="demand"` 切换
- [x] 8.8 实现运行时 FPS 降级、DPR/几何/后处理预算和一次会话只降不升策略
- [x] 8.9 添加 WebGL 禁用、减少动态效果、低数据、快速切换与资源释放的 Playwright 测试

## 9. 响应式与无障碍

- [x] 9.1 添加 320、375、768、1440 和 1920 视口的溢出与首屏可读性测试
- [x] 9.2 完成移动端单列、纵向闭环、44px 触控目标与宽屏可读行宽
- [x] 9.3 添加完整键盘路径、焦点顺序、跳至正文和覆盖层焦点恢复测试
- [x] 9.4 添加 axe 自动扫描并修复全部 serious/critical 违规
- [ ] 9.5 人工验证对比度、非颜色状态表达、400% 缩放和减少动态效果终态

## 10. SEO、结构化数据与安全

- [x] 10.1 先编写元数据测试，要求八条路由具有唯一 title、description、canonical 和分享信息
- [x] 10.2 实现 metadata 工厂、`metadataBase`、OG/Twitter 数据和本地分享图
- [x] 10.3 实现 `sitemap.ts`、`robots.ts` 与首页/生态/项目的 JSON-LD
- [x] 10.4 先编写外链协议、目标、`noopener noreferrer` 和可访问名称测试
- [x] 10.5 实现 `nosniff`、referrer policy、Permissions Policy 和 CSP 基线响应头
- [x] 10.6 扫描生产构建，确认不存在绝对本地路径、不安全链接、编造数据或未知草稿路由

## 11. 性能与部署前门禁

- [x] 11.1 建立非 3D 页面、3D 增量包、图片、draw call、三角形和 DPR 预算检查
- [x] 11.2 配置 Lighthouse CI，验证 Performance ≥ 90 且 Accessibility/Best Practices/SEO ≥ 95
- [x] 11.3 运行 lint、typecheck、unit、build、E2E、a11y、链接、安全头和 Lighthouse 全量验证
- [ ] 11.4 使用真实桌面与移动视口检查控制台、hydration、路由后退/前进和静态降级
- [ ] 11.5 更新本文件任务状态，运行 OpenSpec strict validation 并准备独立 Review Codex 输入
- [ ] 11.6 保持 Vercel 部署为待办，等待用户确认最终视觉和正式域名后再创建 Preview/Production
- [ ] 11.7 部署前重新运行依赖审计并检查稳定版 Next 是否已包含 PostCSS 8.5.10+ 与 Sharp 0.35.0+；不得以降级 Next 9、默认切换 preview/canary 或未经验证的强制 override 规避告警

## 12. 用户确认的 A 版视觉重构

- [x] 12.1 先添加全英文公开表面 RED 门禁，覆盖 catalog、可见/隐藏文案、aria、alt/caption、metadata、OG/Twitter、JSON-LD、404/error、`html lang` 与 `inLanguage`
- [x] 12.2 在不改变 slug、项目顺序、状态、live URL、事实边界和 schema 的前提下，把八条公开路由及辅助表面迁移为英文
- [x] 12.3 先重写设计契约测试，固定 Georgia/Times 展示层、Geist 正文、Geist Mono 数据层、允许的 tracking、颜色关系和四级控件权重
- [x] 12.4 实现本地控件 primitive、安静全局导航、单一主要 CTA、次级动作与领域选择器，并删除重复 bordered-link 和厚重卡片视觉
- [x] 12.5 建立共享 Instrument Stage，按 A 版重构首页四项目轨道、Arc 三状态观测仪与 Rialo 五阶段雷达首屏，同时保留现有 Canvas/Static/scene-target 架构
- [x] 12.6 重构项目详情与 About 的视觉外壳，形成左文案/CTA、右签名仪器的非对称首屏和扁平章节轨，保留语义内容与真实项目媒体
- [x] 12.7 添加 Static 模式确定性视觉回归，覆盖 1440px 的首页/Arc/Rialo/代表详情和 390px 的首页/Arc，并由 Architecture 人工查看候选图
- [x] 12.8 重新运行 unit、build、完整 E2E、axe、链接、预算、生产 Playwright、Lighthouse 和 OpenSpec strict，确认 3100 释放且 3000 未触碰
- [x] 12.9 形成 Integration Evidence 并交给独立 Review Codex；Reviewer PASS 后再向用户启动本地预览，11.4/11.5/9.5 仍需基于新视觉重新完成

## 13. 用户确认的无边界电影化画布增量

- [x] 13.1 先添加无边界与动效 RED 契约，覆盖主舞台无闭合外框、readout/签名开放侧轨、低频动效 token、hover/focus 等价反馈和 reduced-motion 静态终态
- [x] 13.2 以 CSS-first 方式重构首页、Arc 与 Rialo：保留 InstrumentStage 语义 owner、项目/阶段 DOM、scene-target 和单 Canvas，移除舞台外框、内缩完整框、不透明面板与常驻节点卡片
- [x] 13.3 重构四个项目详情的 Hero 与签名场域：删除签名双层闭合容器，保留内部轴线、项目色、真实内容、唯一主要 CTA 和扁平章节轨
- [x] 13.4 实现首屏入场、环境微动、交互反馈和现有路由状态机的视觉连续性；不新增依赖、不让 Canvas 长期 60fps，并在移动端/Low/Static/reduced-motion 关闭持续循环
- [x] 13.5 扩展 320–1920px、键盘、reduced-motion、saveData、WebGL unavailable 与快速路由切换测试，确认无水平溢出、无信息丢失、无高频闪烁且只使用 3100
- [x] 13.6 更新六张确定性 Static 视觉基线，由 Architecture 查看原图，并重新运行 verify、build、完整 E2E、axe、链接、预算、生产 Playwright、Lighthouse 与 OpenSpec strict
- [x] 13.7 形成无边界增量 Integration Evidence，交给独立 Review Codex；Reviewer PASS 后才恢复 3100 本地预览供用户最终视觉验收，Vercel 部署继续待独立授权

## 14. 用户确认的 Living Monument / Cinematic Project Reel 重构

- [ ] 14.1 先更新 OpenSpec 与设计契约并添加 RED 测试，固定“一屏一个主角、一句判断、一个主要动作”、公开文案删减、四项目持续可发现、三章详情和新的电影化动效尺度
- [ ] 14.2 建立 committed / preview / effective scene target 契约，使 Home、Arc 与 Rialo 的活动项目或阶段在 pointer/focus 离开后仍保持；只有 commit 更新语义标题、CTA、pressed/current 与 live region，preview 只更新装饰性 DOM、Static fallback highlight 和 Canvas
- [ ] 14.3 把 Home 重构为近单屏 Project Reel：一次突出一个项目、保留四项目与两生态的语义化索引及无 JavaScript 可见真实链接，删除重复 Ecosystems、Projects 卡片墙和 About 说明段
- [ ] 14.4 把 Arc 与 Rialo 重构为同一电影化状态语言：Arc 三种价值机器产生可感知的构型变化，Rialo 五阶段只展开当前说明且 Trigger 成为最强叙事事件；删除重复项目索引与 route 解释，同时保留无 JavaScript 的项目真实链接/五阶段等价文字
- [ ] 14.5 为 committed target、项目切换和沉浸式路由实现 650–900ms 的有限 Canvas/DOM morph 与不超过 700ms 的可取消 handoff；动画结束回到 demand，详情页继续保持无 Canvas
- [ ] 14.6 把四个详情页重组为 `Problem / Mechanism / Proof` 三个主章节，保留真实截图、核心闭环、技术/限制事实、live URL、返回生态与下一项目，并把次级技术事实渐进披露而非丢失
- [ ] 14.7 扩展单元、键盘、触摸、无 JavaScript、320–1920px、reduced-motion、saveData、WebGL unavailable、快速路由、≤200ms 首次交互反馈、normal-motion 分帧和六张 Static 视觉回归；Architecture 必须查看正常动效证据与所有候选原图
- [ ] 14.8 重新运行 verify、build、build-gates、links、budgets、完整 E2E、axe、生产 Playwright、Lighthouse 与 OpenSpec strict，形成 Integration Evidence 并交给独立 Review Codex；Reviewer PASS 后才更新 3100 预览，Vercel 继续待独立授权
- [ ] 14.9 在不改公共 Stage API 的前提下先添加真实几何 RED，再使用 `data-stage-*` 修复 Rialo 桌面 60–70% scene / 28–36ch readout、整词标题、独立五阶段轨与 390px 单列无重叠终态
- [ ] 14.10 收束 Home、Arc 与 Rialo 的模板化文案层级：每页只保留一个主角、一句判断和一个主要动作，同时保留四项目、两生态、三状态、五阶段、no-JS、live region、路由与真实链接
- [ ] 14.11 为 Home、Arc 与 Rialo 添加场景专属、CSS-first 且主体可感知的环境姿态与 rim/highlight；只在桌面 High/Medium normal-motion ready 状态运行，Low/Static/saveData/移动端/隐藏/离视口/reduced-motion 为静态终态，Canvas 继续 demand
- [ ] 14.12 把详情页收束为编辑式 `Problem / Mechanism / Proof` 阅读画布：删除重复框线、窄列断词和全宽扫描面，把 limits、技术事实与长描述移动到可访问渐进披露，不改 catalog、SEO、项目事实或链接
- [ ] 14.13 扩展 Rialo 390px、主体多帧空间变化、内容层级和详情渐进披露 RED；在不放宽 50ms 门槛的前提下修复 normal-motion 证据吞吐，并由 Architecture 查看所有 Static 与 normal-motion 原图
- [ ] 14.14 运行完整 verify/build/gates/links/budgets/E2E/axe/Lighthouse/OpenSpec strict，冻结 Integration Evidence，交给独立 Review Codex 与专业 Art Director 双重验收；两者均为 PASS/GO 后才更新现有 3100，继续禁止 Vercel
- [ ] 14.15 根据第二轮专业预检与真实 320px RED 羽化 Home/Arc/详情的容器边界、提高 Home/Arc 主体中间调、把 beacon/signal path/motion trace 固定为唯一方向性辅助运动载体，并在不使用全局 overflow 隐藏的前提下消除 Home、Arc 与详情的真实正向溢出
- [x] 14.16 以 TDD 修复首帧 shader 能力分支：只有 `KHR_parallel_shader_compile` 可用时才使用 `compileAsync` gate，unsupported context 立即释放既有有限渲染；Playwright 改用完整 Chromium/new headless，保持 cold Home LongTask `<=50ms`、normal-motion lateness、collector 与全部预算阈值不变，并由独立 Review Codex 复审
- [x] 14.17 以 TDD 用单一 `Carrier Spine` 替换 `[data-universe-content]` 内导航与详情的深色全屏 veil：保持既有 600ms timeline、storage schema、carrier target/token/elapsed progress 和 ≤700ms Canvas 终态；透明 viewport root 无背景，120/300/480ms 的真实 track/mass/signal rect 总面积 ≤35%，只动画 transform/opacity、快速导航只保留最新 token，Header/Footer/history/reduced-motion/隐藏/直接加载原生终态且无 stale actor
- [x] 14.18 把四个详情页压缩为 media-led `Editorial Instrument Cut`：Hero 约 70–78svh、Problem 紧凑导语、Mechanism 桌面横向 sequencer、Proof 媒体优先；每页 `gallery[0]` 确定性 eager 但不 priority/preload、`gallery[1..]` 保持 lazy，默认收起高度 1440px ≤3200px、390px ≤3400px，三章、事实、真实链接与 no-JS 不变
- [x] 14.19 让 Home 的 220ms preview 以 effective target 同时驱动主 mass/outline、horizon 与 accent field，但 committed 文案/CTA/ARIA 只在 780ms commit 更新；增强三页既有环境 owner 的可感知中段相位，压缩 Rialo ≤420px inactive 行并把 immersive stage→footer 间距收至 0–48px
- [x] 14.20 修复首次 production Chromium 暴露的 React eager-image preload、四详情高度、Home/Arc stage 内部横溢、单次 off-DOM WebGL2 probe 与 development/production evidence 分层；修复完整 production 矩阵暴露的 same-committed pointer/focus leave 将 780ms commit 截短为 preview budget 的两文件 controller race，并把 Static radial 断言迁移为 stage-local containment；在 E2 复验证明 780ms commit 完整但 Rialo ambient / committed 空间通道仍竞争后，以 TDD 把 8.8s 主循环从 `.radar` 祖先解耦到真实大体量 corridor plane、把 route 收为 opacity 辅助并以稳定 animation identity 在 morph 时 pause，保持 controller/Canvas/780/220ms/四步/50ms 门槛冻结；同步迁移共享测试对真实 corridor owner、稳定 paused / idle running、independent `translate` compositor 通道与简写 reduced-motion terminal 的识别，并在 full production 只剩一个旧运行时 owner 断言时，把 progressive E2E 拆成 `.radar` spatial scope、首块 corridor main owner 与 scope subtree main+route 契约，同时继续强制 High/Medium/Low/mobile/demand/时长/负 delay/真实 target 且不降低任何契约；在该 Fix 获得独立 PASS 后若 full production 再次出现 CDP timestamp order collector 异常，只允许 selector 与其单测建立 raw arrival identity + unique timestamp canonical chronology：合法 PNG encode-completion inversion 必须可排序，duplicate timestamp 仍 fail closed，event boundary/checkpoint/facts path 改按真实 frame time 前进，ACK、stopping exclusion、50ms、session、ring、bytes 与 unique-frame guards 保持；Architecture 查看七张候选与 normal-motion/Carrier/详情全页证据、独立 Review Codex PASS、专业 Art Director GO 后才更新七张正式 snapshot；随后运行 focused/full unit、typecheck、lint、OpenSpec strict、build/gates/links/budgets、完整 development/production E2E、axe、Lighthouse 与 full-Chromium normal-motion/Static 原图；全部 GREEN 后才把仅 127.0.0.1:3100 的构建交给用户查看，不得启动、停止或占用 3100 之外任何端口，尤其保持 3000 空闲
