# VR互动 · 面塑凤凰 — 3D 模型清单与命名规范

本目录存放「VR互动 · 面塑凤凰」游戏使用的 3D 模型。
游戏**开箱即可玩**：未放入模型时，程序化几何体会自动生成场景与凤凰。
将下方模型用 Miora 生成后按**指定文件名**放入本目录，游戏会自动检测并替换对应部件（无需改代码）。

---

## 放置路径

```
frontend/models/vr/
```

所有模型为 **GLB** 格式（`.glb`），单文件建议 **≤ 8 MB**，贴图内嵌（PNG/JPEG）。

---

## 通用风格要求（每个 prompt 都建议附加）

在下面每个模型的 prompt 末尾统一追加这段风格描述，保证与参考图一致：

```
Style: stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting,
clean fabricated-pixel 3D game asset, cute Chinese folk-art aesthetic, subtle handmade fingerprints,
no text, no watermark, isolated on plain background.
色彩参考：面团乳白 #F6F1E8，凤身紫红 #6E2B34，装饰明黄 #F6C445，黑豆近黑 #14100F。
```

---

## 模型清单

| # | 文件名 | 中文名 | 用途 | 优先级 |
|---|--------|--------|------|--------|
| 1 | `grandma.glb` | 面塑奶奶 | 站在桌子对面教学的老人 | ★★★ 高 |
| 2 | `phoenix_final.glb` | 完整凤凰 | 完成后展示的完整凤凰（最出效果） | ★★★ 高 |
| 3 | `phoenix_body.glb` | 凤凰身子 | 按压后生成的紫红凤身 | ★★ 中 |
| 4 | `dough.glb` | 白面团 | 起始的乳白色面团 | ★★ 中 |
| 5 | `yellow_deco.glb` | 金黄装饰 | 贴到凤身上的明黄面片 | ★ 可选 |
| 6 | `black_bean.glb` | 黑豆眼睛 | 点睛用的两颗黑豆 | ★ 可选 |
| 7 | `flower_tail.glb` | 带花凤尾 | 一根带小花的紫红凤尾 | ★★ 中 |

> 生成优先级建议：先做 ① 奶奶 和 ② 完整凤凰，这两个最影响观感；其余可后续补齐。

---

## 逐个 Prompt（可直接复制到 Miora）

### 1. `grandma.glb` — 面塑奶奶

```
中文：一位慈祥的中国北方老奶奶，面塑手艺人，站在木案前教学。银灰色卷发盘在脑后，
圆润面庞带着微笑，穿米白色交领上衣、卡其色围裙、深灰色灯笼裤、黑色布鞋，
双臂自然张开作教学姿态。Q版卡通比例，头身比约 1:4，站立姿势，面朝镜头。
全身模型，脚底对齐模型原点 Y=0。

English: A kind elderly Chinese northern grandmother, dough-sculpting artisan, standing in front of a wooden table teaching. Silver-grey curled hair in a bun, round smiling face, cream cross-collar blouse, khaki apron, dark grey lantern pants, black cloth shoes, arms open in a teaching gesture. Chibi cartoon proportions (head-to-body about 1:4), standing, facing camera. Full-body model, feet aligned to origin Y=0.
风格：stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting, cute Chinese folk-art aesthetic, no text, no watermark, isolated on plain background.
```

### 2. `phoenix_final.glb` — 完整凤凰

```
中文：一只中国传统面塑凤凰，紫红色面团塑成的身体与头颈，头顶与喙为明黄色面团，
黑色圆亮的小豆眼睛带白色高光，身上贴有明黄色羽衣面片，身后展开三根长长的紫红色
凤尾，每根尾巴中段有明黄色压纹、末端有一朵黄色小面团花（六瓣、深紫红花心）。
造型圆润可爱、手作 clay 质感，侧身昂首姿态，凤凰朝右前方。完整模型，
身体底部对齐原点 Y=0，整体尺寸适配放在桌面上（长约 1.5 个身位）。

English: A Chinese traditional dough-sculpted phoenix, body and neck made of deep burgundy dough, bright yellow dough crest and beak, two glossy black bean eyes with white highlights, yellow dough feather ornaments on the body, three long burgundy tail plumes spreading behind, each tail with a yellow pressed pattern in the middle and a yellow dough flower at the tip (six petals, dark burgundy center). Round cute handmade clay look, head held high facing front-right. Complete model, body bottom aligned to origin Y=0, sized to sit on a tabletop.
风格：stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting, cute Chinese folk-art aesthetic, no text, no watermark, isolated on plain background.
```

### 3. `phoenix_body.glb` — 凤凰身子（按压后生成的阶段）

```
中文：仅凤凰的身体部分（不含尾巴），紫红色面团塑成的圆润凤身与弯曲的头颈，
头顶有明黄色小冠，喙为黄色，两颗黑豆眼睛。Q版手作黏土质感，面朝前方略偏右。
模型底部对齐原点 Y=0。

English: Phoenix body only (no tail): a round burgundy dough-sculpted body with a curved neck and head, a small yellow dough crest, yellow beak, two black bean eyes. Chibi handmade clay look, facing slightly front-right. Model bottom aligned to origin Y=0.
风格：stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting, cute Chinese folk-art aesthetic, no text, no watermark, isolated on plain background.
```

### 4. `dough.glb` — 白面团

```
中文：一团圆润的乳白色面团，表面光滑带细微手工压痕，微微扁圆的半球形，
放在木案上准备捏塑。黏土质感，柔和光照。

English: A round ball of creamy white dough, smooth surface with subtle handmade indentations, slightly flattened dome shape, ready to be sculpted on a wooden table. Clay texture, soft lighting.
风格：stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting, cute Chinese folk-art aesthetic, no text, no watermark, isolated on plain background.
```

### 5. `yellow_deco.glb` — 金黄装饰

```
中文：几片明黄色的面塑羽衣装饰片，扁平椭圆、边缘圆润，表面有压出的羽纹，
用于贴附在紫红色凤凰身上做装饰。黏土质感。

English: Several bright yellow dough feather ornaments, flat oval shapes with rounded edges and pressed feather patterns, used to decorate a burgundy dough phoenix. Clay texture.
风格：stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting, cute Chinese folk-art aesthetic, no text, no watermark, isolated on plain background.
```

### 6. `black_bean.glb` — 黑豆眼睛

```
中文：两颗乌黑发亮的黑豆，圆润有光泽，带一点白色高光点，用作面塑凤凰的眼睛。
大小适配直径约 0.06 单位的模型。

English: Two glossy black beans, round and shiny with a small white highlight, used as the eyes of a dough phoenix. Model diameter about 0.06 units.
风格：stylized clay, glossy surface, soft studio lighting, no text, no watermark, isolated on plain background.
```

### 7. `flower_tail.glb` — 带花凤尾（单根）

```
中文：一根中国传统面塑凤凰的尾巴，紫红色面团压成的细长羽片，
中段有明黄色压纹线条，末端是一朵黄色小面团花（六瓣、深紫红花心）。
Q版手作黏土质感，从粗到细向后延展。模型根部对齐原点，长度约 0.8 单位。

English: A single tail plume of a Chinese dough phoenix, a long slender burgundy dough feather with bright yellow pressed pattern lines in the middle and a yellow dough flower at the tip (six petals, dark burgundy center). Chibi handmade clay look, tapering from thick root to tip. Root aligned to origin, length about 0.8 units.
风格：stylized clay / soft dough sculpture, smooth matte surface, warm soft studio lighting, cute Chinese folk-art aesthetic, no text, no watermark, isolated on plain background.
```

---

## 摆放与朝向约定

- **坐标系**：Y 轴向上，模型正面朝 **+Z**（镜头方向）。
- **原点**：底部中心对齐原点（Y=0 落在脚底 / 身体底部）；`flower_tail.glb` 根部对齐原点。
- **比例**：单位按米估算；奶奶约 1.9 单位高，凤凰约 0.6~1.0 单位。
- **贴图**：优先内嵌 PNG / JPEG；避免 WebP 内嵌贴图（部分浏览器不显示）。
- **减面**：导出前适当 simplify，控制在 8 MB 以内。

---

## 自动替换机制说明

游戏启动时会用 `HEAD` 请求检测上述文件是否存在：

- 存在 → 加载 GLB 替换对应程序化部件；
- 不存在 → 使用内置程序化几何体（游戏仍可完整通关）。

`phoenix_final.glb` 一旦存在，会直接作为完整凤凰展示（其余部件自动隐藏）。
若替换后位置 / 大小不合适，可在 `frontend/js/vr-game.js` 的 `loadOptional()` 回调里调整 `obj.scale` 与 `obj.position`。
