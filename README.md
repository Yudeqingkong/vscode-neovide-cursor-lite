# VS Code Neovide Cursor Lite

一个给 VS Code 用的轻量级 Neovide 风格光标动画脚本。

它不是普通的“残影贴纸”，而是用一层透明 `canvas` 画出一个会被拉伸、回弹、追随真实光标的假光标。移动时会有一点橡皮筋一样的拖拽感，停下后尾巴会短暂停留再淡出。总之，光标终于不像在格子里瞬移了。

> English short version: a single-file Neovide-like cursor animation script for VS Code, loaded through Custom CSS and JS Loader.

## 效果

演示视频稍后补在这里：

```md
![preview](./assets/preview.gif)
```

目前的效果目标是：

- 光标移动时被拉成长方形/四边形；
- 领先的一边更快，拖尾的一边更慢；
- 拖尾颜色自动跟随 VS Code 当前光标颜色；
- 停止移动后不会立刻消失，会稍微停一下再淡出；
- 整体偏轻快，不追求“糊成一条彩带”。

## 这个项目适合谁

适合你，如果你：

- 喜欢 Neovide 那种灵动的光标动画；
- 想在 VS Code 里获得类似感觉；
- 不想安装一整套额外构建工具；
- 能接受用 Custom CSS and JS Loader 注入本地 JS；
- 愿意在 VS Code 更新后偶尔重新 reload 一下。

不太适合你，如果你：

- 完全不想修改 VS Code workbench；
- 对电量和性能特别敏感；
- 需要官方支持级别的稳定性。

## 和参考项目相比有什么不同

这个项目受 [30d98f9b2/Neovide-Cursor](https://github.com/30d98f9b2/Neovide-Cursor) 启发。核心思路一致：`canvas` 覆盖层 + 四个角点 + 弹簧追随。

但这个仓库不是把原项目完整搬过来，而是做了一个更轻的自定义版本：

| 对比项 | Neovide-Cursor | 本项目 |
| --- | --- | --- |
| 使用方式 | VS Code 扩展 + 生成注入路径 | 单个 `cursor-trail.js` 文件 |
| 配置入口 | 扩展命令打开配置 | 直接改文件顶部 `CONFIG` |
| 颜色 | 可配置固定颜色 | 默认读取 VS Code 真实光标颜色 |
| 手感 | 更完整，也更重 | 默认更轻、更快、更克制 |
| 发光阴影 | 支持 | 支持，但默认关闭 |
| 启动保护 | 完整扩展流程 | 等待 DOM 准备好再启动 |
| 安全透明度 | 扩展项目结构 | 单文件，比较容易自己审 |

坦诚一点说：参考项目功能更完整，本项目更像“我只想要这个效果，别给我端上一整桌工具”的版本。

## 安全说明

当前脚本是本地单文件，不需要 npm，不会主动联网。

它不应该做这些事：

- 发网络请求；
- 读写你的文件；
- 执行系统命令；
- 读取 cookie、本地存储或剪贴板；
- 监听你的键盘输入。

它主要做这些事：

- 找到 VS Code 编辑器里的真实光标 DOM；
- 读取光标位置、大小和颜色；
- 用 `canvas` 画动画；
- 动画时临时隐藏原生光标；
- 停止后恢复原生光标。

不过还是要说清楚：Custom CSS and JS Loader 这个机制本身很强，别随便加载陌生人的远程脚本。推荐只使用本地路径，例如：

```json
"vscode_custom_css.imports": [
  "file:///D:/OpenSource/vscode-neovide-cursor-lite/cursor-trail.js"
]
```

不要这样：

```json
"vscode_custom_css.imports": [
  "https://example.com/some-random-script.js"
]
```

## 安装教程

下面是保姆级步骤。已经会的人可以跳着看，不会的人照着做就行。

### 1. 安装 Custom CSS and JS Loader

在 VS Code 里打开扩展面板：

```txt
Ctrl + Shift + X
```

搜索并安装：

```txt
Custom CSS and JS Loader
```

扩展标识符：

```txt
be5invis.vscode-custom-css
```

### 2. 下载这个项目

如果你会 Git：

```powershell
git clone https://github.com/Yudeqingkong/vscode-neovide-cursor-lite.git D:\OpenSource\vscode-neovide-cursor-lite
```

如果你不会 Git，也可以在 GitHub 页面点：

```txt
Code -> Download ZIP
```

然后解压到一个固定位置，例如：

```txt
D:\OpenSource\vscode-neovide-cursor-lite
```

路径固定很重要。今天放桌面，明天拖到下载文件夹，后天又问为什么没效果，这种剧情我们尽量不要拍。

### 3. 打开 VS Code 设置 JSON

按：

```txt
Ctrl + Shift + P
```

输入并打开：

```txt
Preferences: Open User Settings (JSON)
```

### 4. 加入脚本路径

在 `settings.json` 里加入：

```json
"vscode_custom_css.imports": [
  "file:///D:/OpenSource/vscode-neovide-cursor-lite/cursor-trail.js"
]
```

注意 Windows 路径要写成这样：

```txt
file:///D:/OpenSource/vscode-neovide-cursor-lite/cursor-trail.js
```

不要写成这样：

```txt
D:\OpenSource\vscode-neovide-cursor-lite\cursor-trail.js
```

如果你原本已经有很多设置，记得 JSON 逗号规则：

```json
{
  "editor.fontSize": 17,
  "vscode_custom_css.imports": [
    "file:///D:/OpenSource/vscode-neovide-cursor-lite/cursor-trail.js"
  ]
}
```

### 5. 用管理员权限启动 VS Code

Windows 上通常需要这样做：

1. 关闭所有 VS Code 窗口；
2. 右键 VS Code 图标；
3. 选择“以管理员身份运行”。

### 6. 启用注入

在 VS Code 里按：

```txt
Ctrl + Shift + P
```

执行：

```txt
Enable Custom CSS and JS
```

然后再执行：

```txt
Reload Custom CSS and JS
```

最后完整重启 VS Code。

## 推荐 VS Code 设置

这不是必须，但手感会更好：

```json
{
  "editor.cursorStyle": "line",
  "editor.cursorWidth": 6,
  "editor.cursorBlinking": "phase",
  "editor.cursorSmoothCaretAnimation": "on",
  "workbench.colorCustomizations": {
    "editorCursor.foreground": "#babbf1"
  }
}
```

脚本会读取 `editorCursor.foreground`，所以你改真实光标颜色，动画颜色也会一起变。

## 调参

打开 `cursor-trail.js`，看最上面的 `CONFIG`。

常用参数：

```js
opacity: 0.88,
holdMs: 170,
fadeMs: 180,
animationLength: 0.16,
shortAnimationLength: 0.065,
rankTrailFactors: [1.05, 0.82, 0.36, 0.08],
```

想更轻快：

```js
animationLength: 0.13,
shortAnimationLength: 0.045,
holdMs: 130,
fadeMs: 140,
```

想拖尾更明显：

```js
animationLength: 0.22,
shortAnimationLength: 0.1,
holdMs: 260,
fadeMs: 240,
```

想让尾巴更亮：

```js
opacity: 1,
```

想让它少一点厚重感：

```js
maxDrawWidth: 3,
```

每次改完脚本后，都要执行：

```txt
Reload Custom CSS and JS
```

然后 reload 或重启 VS Code。

## 常见问题

### 没有效果

按顺序检查：

- `Custom CSS and JS Loader` 是否安装；
- `settings.json` 里的路径是否真的指向 `cursor-trail.js`；
- 路径是否使用了 `file:///D:/...` 格式；
- 是否用管理员权限执行过 `Enable Custom CSS and JS`；
- 是否执行过 `Reload Custom CSS and JS`；
- 是否完整重启 VS Code。

### VS Code 提示安装损坏

这是 Custom CSS and JS Loader 的常见副作用。它修改了 VS Code 的 workbench 文件，所以 VS Code 会说“我好像被动过”。

如果编辑器正常、动画也正常，可以选择：

```txt
Don't Show Again
```

VS Code 更新后，通常需要重新执行：

```txt
Reload Custom CSS and JS
```

### 更新 VS Code 后失效

重新走这两步：

```txt
Enable Custom CSS and JS
Reload Custom CSS and JS
```

然后重启 VS Code。

### 感觉有点卡

可以试试：

```js
useShadow: false,
holdMs: 120,
fadeMs: 120,
animationLength: 0.12,
scanIntervalMs: 150,
```

动画这种东西就是这样：越丝滑，越吃一点点资源。世界上没有免费的午餐，只有比较会伪装的动画帧。

## 卸载

从 `settings.json` 里删掉：

```json
"vscode_custom_css.imports": [
  "file:///D:/OpenSource/vscode-neovide-cursor-lite/cursor-trail.js"
]
```

然后执行：

```txt
Reload Custom CSS and JS
```

重启 VS Code。

## 致谢

Inspired by:

- [30d98f9b2/Neovide-Cursor](https://github.com/30d98f9b2/Neovide-Cursor)
- Original work credited there to LengineerC
- [Neovide](https://github.com/neovide/neovide)

本项目保留了“canvas + 弹簧角点追随”的核心思路，并把它整理成一个更轻、更透明、方便自己改的本地注入脚本。

## License

MIT. See [LICENSE](./LICENSE).
