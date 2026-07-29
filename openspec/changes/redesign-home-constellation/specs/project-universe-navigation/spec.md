## MODIFIED Requirements

### Requirement: 首页项目宇宙入口
首页 SHALL 在**单屏之内**同时呈现深空星场与全部作品入口，MUST NOT 要求任何滚动即可看到全部 4 个作品：星场负责氛围，底部索引条负责可扫读的信息（项目名 + `statement` + 生态·状态）。索引条 MUST 为服务端渲染的真实链接，因此在无 JavaScript / 无 WebGL 时它即为导航主路径。首页 MUST NOT 渲染站点页脚。

#### Scenario: 首屏即完整导航
- **WHEN** 用户首次以桌面视口访问首页
- **THEN** 无需滚动即可看到星场、manifesto 与全部 4 个作品的名称与判断语

#### Scenario: 零垂直滚动
- **WHEN** 用户在 1440×900、375×900 或 375×667 视口访问首页
- **THEN** 文档高度不超过视口高度，页面不产生垂直滚动条，且不渲染站点页脚

#### Scenario: 从首页进入生态
- **WHEN** 用户激活站点导航中的 Arc 或 Rialo 入口
- **THEN** 系统导航到对应的 `/arc` 或 `/rialo` 页面

#### Scenario: 不依赖视觉浏览项目
- **WHEN** 3D、动画或 CSS 装饰未加载
- **THEN** 用户仍能从索引条的真实链接找到全部四个项目

#### Scenario: 首页无 JavaScript
- **WHEN** 用户禁用 JavaScript 访问首页
- **THEN** 索引条照常渲染四个项目的可见真实链接，无需任何 sr-only 或 noscript 备用结构

## ADDED Requirements

### Requirement: 索引条即导航
首页底部 SHALL 有一条列出全部作品的索引条，每个条目为链接到 `/[ecosystem]/[project]` 的真实 `<a>`，并携带 `data-scene-target="project:<slug>"`。悬停或键盘聚焦某条目时，星场中对应节点 SHALL 高亮。键盘焦点 SHALL 统一由索引条承担，星场节点 MUST NOT 进入 Tab 顺序，以免同一导航目标出现两个 tab stop。

#### Scenario: 索引条驱动星场
- **WHEN** 用户 hover 或聚焦索引条中的某个作品
- **THEN** 场景外壳的 `data-universe-preview-target` 变为该作品，星场中对应节点随之提亮

#### Scenario: 键盘浏览作品
- **WHEN** 用户仅使用键盘浏览首页
- **THEN** 焦点依次经过站点导航与索引条各条目，Enter 进入当前作品详情

#### Scenario: 生态分簇与配色
- **WHEN** 首页可见
- **THEN** Arc 的三颗节点与 Rialo 的一颗节点在星场中分成两簇，索引条条目也按 Arc 冷蓝 / Rialo 琥珀区分

#### Scenario: 进入项目详情
- **WHEN** 用户激活索引条中的某个作品
- **THEN** 系统导航到对应的 `/[ecosystem]/[project]` 详情路由

#### Scenario: 移动端索引条
- **WHEN** 视口宽度不超过 42rem
- **THEN** 索引条改为 2×2 网格并隐藏 `statement`，四个作品名仍全部可见且保持零滚动

#### Scenario: 星座导航无 JavaScript
- **WHEN** 用户禁用 JavaScript
- **THEN** 页面提供四个项目与两个生态的可见真实链接，作为等价导航
