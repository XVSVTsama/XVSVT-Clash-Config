# 图标本地归档与 jsDelivr 引用实施计划

**目标：** 将仓库所有代理组及 Bettbox 脚本生成的图标纳入 `assets/icons/`，用来源前缀区分自有与上游素材，并统一通过 jsDelivr 引用。

**方案：** 盘点 YAML 与 JS 模板中的图标字段，按来源下载素材并保存来源说明；使用 `self-` 标识自有素材、`<上游组织>-<仓库>-` 标识第三方素材；更新中英文模板和脚本中的 URL，运行仓库现有校验，再开分支提交 PR。

**范围：** `mihomo.yaml`、`mihomo_en.yaml`、`script_override.js`、`script_override_en.js`、`assets/icons/`。

## 步骤

- [x] 核实图标 URL、源仓库及素材许可；下载所有静态图标到 `assets/icons/`，保留来源与许可信息。
- [x] 按约定命名，更新所有实际图标 URL 为 `https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/<filename>`。
- [x] 运行 YAML/JS 语法、模板同步和图标完整性校验；审查 diff，确认非图标远程 URL 未被误改。
- [x] 创建分支、提交变更并创建 PR。
