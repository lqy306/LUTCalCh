# Leica L-Log / Cine LUT 引擎适配审计

## 资料与样本

- Leica 官方 L-Log Reference Manual V1.6：<https://leica-camera.com/sites/default/files/pm-13055-L-Log_Reference_Manual_V1.6.pdf>
- Leica 官方 Cine LUT 包：<https://leica-camera.com/sites/default/files/pm-28363-Leica-Cine.zip>
- 目标文件：`Leica_Cine_Rec2020_LLog_to_Rec709_Gamma24_65_.cube`
- SHA-256：`2a9145b2cc33a188dd208c62ee647c3e58e45904f319404a31344a1df07d35bb`
- 网格：`LUT_3D_SIZE 65`；RGB 数据行：`274625`，与 65³ 相符。

## 已核对的引擎事实

1. 原版页面实际加载 `client/public/lutcalc/js/lutcalccombined.js`；它会把 `LUTGamma` 序列化为 Blob Worker。缺少 Blob Worker 时，才回退至 `gammaworker.js` / `gammaworkerscombined.js`。
2. Leica L-Log 必须同时加入 `lutcalccombined.js` 和 `gammaworkerscombined.js` 的 `LUTGamma.prototype.gammaList()`，以覆盖主线程与回退 Worker。
3. 原版现有 `LUTGammaLog` 能表达“线性段 + 对数段”的通用曲线。报告给出的 L-Log 公式可映射为：

   ```text
   params = [0.125, -0.01125, 0.27, 1.3, 10, 0.6, 0.0115, 0.138, 0.006000000000001]
   ```

   最后一项的极小偏移仅用于适配原版通用类 `>=` 的分支判断，使 Leica 规定的 `<= 0.006` 线性段保持不变。该映射已针对报告列出的 18% 灰与高光点做数值验算；仍不得以文件名作为唯一依据。
4. `Rec2020` 已在原版色彩空间目录中定义为 D65，RGB 色度为 `(0.708,0.292)`、`(0.170,0.797)`、`(0.131,0.046)`，可作为 Leica L-Log 的配对色域，不需要重复创建矩阵。

## 线上可用性复核

在本轮审计中，正式根页面与 `/lutcalc/index.html?embed=adjustments` 均返回 HTTP 200，且真实浏览器可加载主工作台。报告中的 HTTP 500 未能复现；仍应在发布回归中保留 HTTP 状态检查，不应将该现象视为已永久消失。
