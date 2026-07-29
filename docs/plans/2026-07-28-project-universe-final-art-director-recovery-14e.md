# Task 14.17–14.20 最终 Art Director 恢复计划

## 状态

- ChangeId: `build-project-universe`
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- 当前预览：既有 production build 仅运行于 `127.0.0.1:3100`
- 禁止：其他端口、Vercel、commit、依赖/预算/路由/catalog/真实链接/Canvas 与 shader 扩围
- 公开表面：继续全英文

## 设计结论

专业 Art Director 的最终 `NO_GO` 不要求重做世界观，而要求把现有 Living Monument 从“技术成立”推进到“感知成立”：

1. `Carrier Spine`：用一个局部 track/mass/signal 贯穿 600ms handoff，删除沉浸式和详情页的深色全屏 veil。
2. `Editorial Instrument Cut`：四个详情页保留三章和全部事实，但以媒体优先、横向 mechanism 和更短垂直节奏替代长报告。
3. `Perceptible Preview`：Home 的 effective target 同时改变主 mass、horizon 和 accent；committed 语义仍只在 commit 更新。
4. `Density / Rhythm`：Rialo 390px inactive 阶段只显示编号与短信号；沉浸舞台到 footer 收到 0–48px。

## 切片与顺序

### Slice A — Carrier Spine

- Executor: GPT-5.6 Sol Implementation worker
- 先执行，可与 Slice C 并行。
- 允许修改 cinematic bridge、新 carrier CSS、UniverseShell 旧黑幕、详情旧 veil 接口/样式及 cinematic 单元/E2E。
- 不修改 transition-machine、storage schema、Canvas、Three 或 timing。

### Slice C — Home / Rialo Motion Density

- Executor: GPT-5.6 Sol Implementation worker
- 可与 Slice A 并行，文件完全不重叠。
- 允许修改 Home stage、InstrumentStage CSS、Rialo CSS、immersive page rhythm 及其测试。
- 不修改 scene target controller、Canvas、Three、Rialo TSX 或 catalog。

### Slice B — Editorial Instrument Cut

- Executor: GPT-5.6 Sol Implementation worker
- 必须在 Slice A handback 与 Architecture 集成检查后开始，因为 project-case-study TSX/CSS 与旧 veil 清理存在串行交点。
- 允许修改 case-study TSX/CSS、gallery、signature CSS 及详情单元/E2E。
- 不修改 catalog、Project 类型、媒体注册、资源、SEO、route 或真实 URL。

## 跨切片冻结契约

- Bridge 的 carrier destination/target/token/progress 与 `captain-dock:cinematic-handoff` schema 不变；progress 继续从 persisted start 重算，不新增字段。
- carrier token/target 与 Canvas route transition token/target 独立；不得为视觉接力耦合两套状态机。
- Carrier 只拦截 `[data-universe-content]` 内既有链接；Header/Footer/history/modified click/direct load 保持原生且无 stale actor。
- 总 handoff 600ms、router push 120ms、Canvas 终态不超过 700ms。
- `CinematicDetailArrival` 复用 carrier 视觉投影，不再接受或渲染项目自定义深色 veil。
- B 只消费 A 的最终 arrival API，不自行创建第二套 handoff。
- C 的 `visualProject` 仅由 effective target 派生；`activeProject`、文案、CTA、pressed/current、live region 仅由 committed target 派生。
- E2E 只能增加 fail-closed 断言，不降低现有 50ms、frame、像素、性能、可访问性或预算门槛。

## TDD 顺序

每个切片都执行：

1. 在 allowlist 测试中建立精确 RED。
2. 保存 RED 命令、失败断言与数量。
3. 完成最小生产实现。
4. 运行 focused Vitest、scoped ESLint、typecheck、Playwright `--list` 与 `git diff --check`。
5. 不运行 browser、build、server、Lighthouse、端口或部署。
6. 回传 changed files、逐文件 SHA-256、测试证据、需求覆盖与剩余风险。

## Architecture 集成与最终验证

1. 检查三份 handback 的 allowlist、hash、dirty baseline 与跨切片契约。
2. 独立运行 focused/full unit、lint、typecheck 与 OpenSpec strict。
3. 只停止既有 3100 进程，production build 后仍只恢复 `127.0.0.1:3100`；确认 3000 未被占用。
4. 运行 development/production E2E、build gates、links、budgets、axe、Lighthouse。
5. 生成 1440×1000 与 390×844 的 Home/Arc/Rialo/代表详情原图、Home normal-motion、Home→Arc handoff 中段/终态和详情全页证据。
6. 独立 Review Codex 必须 `PASS`。
7. 专业 Art Director 必须 `GO`；否则回到 DESIGN。

## Stop Conditions

- 需要修改 allowlist 外生产文件、公共 API、transition timing、Canvas/Three、catalog/事实、依赖、预算或 Playwright 全局配置。
- 现有测试只能通过降低阈值、删除帧、跳过 collector 或放宽无障碍/性能要求。
- 发现真实媒体、route 或 URL 缺失。
- 需要启动 browser/build/server、占用任何端口或部署。
- 与其他 worker 产生文件重叠或 baseline 漂移。
