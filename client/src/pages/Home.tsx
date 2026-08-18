/* 设计方向：胶片实验室 / 编辑型新粗野主义。根路由直接承载完整 LutCalc 计算器，外层只负责无缝铺满视口，不遮挡原始计算引擎。 */
import { useState } from "react";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  return (
    <main className="standalone-shell" aria-label="LUTCalc 中文计算器">
      <iframe
        className={`standalone-frame ${loaded ? "is-loaded" : ""}`}
        src="/lutcalc/index.html"
        title="LUTCalc 中文 LUT 计算器"
        onLoad={() => setLoaded(true)}
      />
      {!loaded && <div className="standalone-loading">正在加载 LUTCalc 计算器…</div>}
    </main>
  );
}
