# A 版视觉重构 12C Integration Evidence

- ChangeId: `build-project-universe`
- TaskId: `12.7-12.9`
- Implementation Executor: `/root/implement_redesign_12c`，`gpt-5.6-sol`，`xhigh`
- IntegrationOwner: Architecture Codex `/root`
- Review mode: 独立 Review Codex，只读
- Git baseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`
- 部署状态: 未授权、未执行

## 实现范围与冻结哈希

实现只新增一份视觉测试和六张 Static 视觉基线：

- `tests/e2e/visual-reference.spec.ts`
  - SHA-256 `2d4f6c19ffa98a8a3de75e35ba72af1f9de0c4d2d33d56f8168f3dbf519e6c60`
- `arc-1440-chromium-darwin.png`
  - SHA-256 `0e59c91775e8ce4c44b80164143b9a9e79ce46fd283b9d7ece2dae07e6f2c23b`
- `arc-390-chromium-darwin.png`
  - SHA-256 `6da788e4365ccb5e9fc3944a88459989842f7ee4b47572d30bc63c28892946cd`
- `home-1440-chromium-darwin.png`
  - SHA-256 `5117e74320e0acd28b572d85074e742fbfddb4a5bd313053d9f44770836aef8b`
- `home-390-chromium-darwin.png`
  - SHA-256 `ee6549485c1fa1dd69708c6f0cb0b9d134718ac2db9afc8755d0be447070dc90`
- `rialo-1440-chromium-darwin.png`
  - SHA-256 `a439d630e43fcacf65070c559e27f4cde28dd0ed5a27d037b705ac47bd34a6cd`
- `signal-ledger-1440-chromium-darwin.png`
  - SHA-256 `74fe3a82a4b0de7136bd1e00c3ebd0ec73a9a19c5792e56665c7f837393066bd`

保护文件 SHA-1 仍为：

- `.gitignore`: `613e0fce4c277f89e2b71560729e5f9ec7fb1029`
- `main.py`: `5208159b5d005aa3948e987504fe0b9468de43f7`
- `AGENTS.md`: `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`
- `.agents` aggregate: `4883e15249ea055bafb35cb37ef9c440db7e0991`

## TDD 与视觉证据

- RED：六个 case 仅因 expected snapshot 缺失失败，结构、路由、Static、运行时和
  overflow 断言已通过。
- 初次生成后发现 Next 开发调试入口进入候选图；worker 只隐藏
  `nextjs-portal`，并断言产品 dialog/alertdialog/popover inventory 未改变。
- 修正后旧候选得到 `5 diff / 1 pass` 的定向 RED。
- 更新六张基线后 `6/6`，随后无 update 独立运行继续 `6/6`。
- Architecture 使用原图查看全部六张基线；桌面 Home/Arc/Rialo/代表详情与
  390px Home/Arc 均保持 A 版机械仪器构图、英文公开表面、清晰层级和无碰撞终态。
- Architecture 此前还查看了
  `/private/tmp/captain-dock-architecture-visual-matrix/` 的 20 张桌面、移动、
  compact、reduced-motion、saveData 与 WebGL-unavailable 集成图。

冻结设计源：

- `project-universe-design.html`
  - SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `rialo-detail-design.html`
  - SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

## Worker 全量门禁

- `npm run verify`: 29 files / 187 tests
- `npm run build`: 14/14
- `npm run test:build-gates`: 45/45
- `npm run check:links`: 133 total / 121 local / 12 HTTPS
- `npm run check:budgets`: full enhanced 249.5 KiB / 260 KiB；各沉浸式路由
  均低于 250 KiB
- `npm run test:e2e`: 78 passed / 10 production-only skipped
- production Playwright: 13/13
- OpenSpec strict validation: PASS
- 3100 已释放；未探测或使用 3000

## Architecture fresh verification

- `npm run verify`: 29 files / 187 tests
- `npm run test:build-gates`: 45/45
- `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build`: 14/14
- `npm run check:links`: 133 total / 121 local / 12 HTTPS
- `npm run check:budgets`: PASS，full enhanced 249.5 KiB / 260 KiB
- `npm run test:e2e`: 78 passed / 10 production-only skipped
- `openspec validate build-project-universe --strict --no-interactive`: PASS
- 最终生产重建后 `npm run lighthouse`：
  - production Playwright 13/13
  - 三个 URL 各运行三次，共九次；固定中位数规则全部 PASS
  - `/`: Performance `0.98`，A11y/BP/SEO `1.00`，LCP
    `2336.0595ms`，CLS `0`
  - `/arc/signal-ledger`: Performance `0.98`，A11y/BP/SEO `1.00`，
    LCP `2331.389ms`，CLS `0`
  - `/about`: Performance `0.99`，A11y/BP/SEO `1.00`，LCP
    `2183.7981ms`，CLS `0`
  - 原始报告位于 `.next/lighthouse/reports/`，九份 JSON、九份 HTML 及 manifest
  - assertion 结果位于
    `.next/lighthouse/.lighthouseci/assertion-results.json`
- `lsof -nP -iTCP:3100 -sTCP:LISTEN`: 无输出

## Review 边界

Reviewer 必须检查实现范围、冻结哈希、六张原图、OpenSpec 12.7–12.9、
12A/12B 上游 PASS、全量门禁和 Lighthouse 原始报告，只能给出
`PASS`、`FIX_REQUIRED` 或 `DOWNGRADE`。

本轮不包含 Vercel 部署。OpenSpec 9.5、11.4、11.5、11.6、11.7 仍保持独立待办；
Reviewer PASS 后只启动本地 3100 生产预览供用户验收。
