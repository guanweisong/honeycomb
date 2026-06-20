## Why

归档页的“猜你喜欢”列表目前整行都能 hover 和点击，视觉反馈和实际可点击文本不一致，容易让用户误以为整行都是链接内容。将命中范围收窄到文字本身，可以让交互边界更明确，也更符合当前页面的内容型列表表现。

## What Changes

- 收窄归档页“猜你喜欢”列表项的 hover 和 click 命中范围。
- 保留当前链接跳转能力，但只让文字长度范围内响应鼠标悬停和点击。
- 不修改列表内容、排序、数据来源或跳转目标。

## Capabilities

### New Capabilities
- `archive-guess-like-link-hit-area`: 归档页猜你喜欢列表链接的可交互区域仅限于文本内容本身。

### Modified Capabilities
- 

## Impact

- 影响范围主要是博客归档详情页的列表渲染与链接样式。
- 可能涉及 `src/app/(blog)/[locale]/archives/[id]/page.tsx` 中的链接 className 或包裹结构调整。
- 不涉及后端接口、数据模型、路由或翻译文案变更。
