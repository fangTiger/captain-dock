# Handoff Task Package — A 版重构 Slice 12B5 Generic Route Label

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / generic route-label type recovery`
- AgentId: `/root/fix_redesign_12b5`
- SliceId: `generic-route-label-type-recovery`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 当前唯一问题

12B4 的初始 `npm run typecheck` 唯一失败为551行TS2345。worker 按批准方案把 `routeLabel` 输入改为 `Pick<ResponsiveRoute,'path'>` 后：

- 551错误消失
- 唯一剩余错误变为790行TS2353
- 原因是对象字面量 `{group, heading, path}` 触发 excess-property checking，不接受 Pick-only 参数

函数运行时只读取 `route.path`。正确契约应以泛型保留调用者的额外字段，同时约束 path。

## Editable file

- `tests/e2e/responsive.spec.ts`

其余全部禁止修改，包括产品、其他测试、配置、依赖、docs、OpenSpec、session-state、3000、commit、部署。

## Required TDD

1. 不改文件运行 `npm run typecheck`，必须唯一为790行TS2353。
2. 只把当前签名：

```ts
function routeLabel(route: Pick<ResponsiveRoute, 'path'>, viewportWidth: number)
```

改为：

```ts
function routeLabel<TRoute extends Readonly<{ path: string }>>(route: TRoute, viewportWidth: number)
```

等价的 `TRoute extends Pick<ResponsiveRoute,'path'>` 也可。禁止 `any`、`as`、ignore、overload、修改调用点或添加虚假字段。
3. `npm run typecheck` 必须 GREEN。
4. 聚焦 Instrument Stage 测试必须 GREEN。
5. 随后运行 `npm run verify`、`npm run build` 和12B4指定的完整9-spec。
6. 全绿后生成、实际查看并逐页报告12B4指定的14张临时候选截图。

## Stop conditions

- 初始RED不是唯一790行TS2353。
- 泛型签名后typecheck或聚焦测试仍失败。
- 需要第二个文件或改变任何测试行为。
- 完整门禁出现不能由冻结状态解释的新失败。

## Baseline

- 单文件初始 SHA-256：`5310e115ffde8257a7edcaacadee0f131e9e9aaf1cd9c345c9005afba63d359c`
- 12B3产品CSS frozen SHA-256：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`

保护、参考、Han、端口与handback要求沿用12B4；不要更新OpenSpec/docs/session-state，不要commit或部署。
