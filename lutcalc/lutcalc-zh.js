/* LutCalc 简体中文运行时本地化层。仅处理用户可见文本，不改动计算公式与参数值。 */
(() => {
  const textMap = new Map([
    ["LUTCalc - 1D & 3D Cube LUT Calculator", "LUTCalc · 1D 与 3D 立方体 LUT 计算器"],
    ["LUTCalc v4.09", "LUTCalc · 中文计算器 v4.09"],
    ["Please Allow Javascript To Run On This Page", "请允许此页面运行 JavaScript"],
    ["Input Signal", "输入信号"],
    ["Working Space", "工作色彩空间"],
    ["Output", "输出"],
    ["Output Format", "输出格式"],
    ["LUT Type", "LUT 类型"],
    ["Hard Clip", "硬裁切"],
    ["LUT Size", "LUT 尺寸"],
    ["LUT Dimension", "LUT 维度"],
    ["Grid Size", "网格尺寸"],
    ["Generate LUT", "生成 LUT"],
    ["Generate Set", "生成套装"],
    ["Preview", "预览"],
    ["Auto Title", "自动命名"],
    ["Save", "保存"],
    ["Cancel", "取消"],
    ["Reset", "重置"],
    ["Close", "关闭"],
    ["Camera", "相机"],
    ["Camera Model", "相机型号"],
    ["Native ISO", "原生 ISO"],
    ["CineEI ISO", "CineEI ISO"],
    ["Stop Correction", "挡位修正"],
    ["Record Gamma", "记录伽马"],
    ["Record Gamut", "记录色域"],
    ["Output Gamma", "输出伽马"],
    ["Output Gamut", "输出色域"],
    ["Input Gamma", "输入伽马"],
    ["Input Gamut", "输入色域"],
    ["White Balance", "白平衡"],
    ["ASC-CDL", "ASC-CDL"],
    ["PSST-CDL", "PSST-CDL"],
    ["Highlight Gamut", "高光色域"],
    ["Black Level", "黑电平"],
    ["Black Gamma", "黑伽马"],
    ["Display Converter", "显示转换"],
    ["Gamut Limiter", "色域限制"],
    ["False Colour", "伪色"],
    ["False Color", "伪色"],
    ["Knee", "膝点"],
    ["Multitone", "多色调"],
    ["LUTAnalyst", "LUT分析"],
    ["Import New LUT", "导入新的 LUT"],
    ["Load Existing Analysed LA LUT", "加载已分析的 LA LUT"],
    ["New LUT", "新建 LUT"],
    ["Re-Analyse", "重新分析"],
    ["Save Cube", "保存 Cube"],
    ["Save Binary", "保存二进制"],
    ["Analyse", "分析"],
    ["Analysis Dimension:", "分析尺寸："],
    ["Analysis Method:", "分析方法："],
    ["Analysis Range", "分析范围"],
    ["LUT Range", "LUT 范围"],
    ["General cube LUT (.cube)", "通用立方体 LUT（.cube）"],
    ["Black Only", "仅黑场"],
    ["Passthrough", "直通"],
    ["Legal", "合法范围"],
    ["Full Range", "全范围"],
    ["None", "无"],
    ["Loading", "加载中"],
    ["Ready", "就绪"],
    ["Error", "错误"],
    ["File Name", "文件名"],
    ["Filename", "文件名"],
    ["Title", "标题"],
    ["Exposure", "曝光"],
    ["Compensation", "补偿"],
    ["Batch", "批量"],
    ["Set", "套装"],
    ["Custom LUT", "自定义 LUT"],
    ["输出 Range", "输出范围"],
    ["输出 gamma including any customisations:", "包含调整项的输出伽马："],
    ["黑电平 / Highlight Level", "黑电平 / 高光电平"],
    ["相机 / Monitor LUT (MLUT)", "相机 / 监视器 LUT（MLUT）"],
    ["Native", "原生"],
    ["Rec Gamma", "记录伽马"],
    ["Rec Gamut", "记录色域"],
    ["Out Gamma", "输出伽马"],
    ["Out Gamut", "输出色域"],
    ["Input Range", "输入范围"],
    ["Output Range", "输出范围"],
    ["LUT Title / Filename", "LUT 标题 / 文件名"],
    ["Input Range", "输入范围"],
    ["Output Range", "输出范围"],
    ["Grading LUT", "调色 LUT"],
    ["Camera / Monitor LUT (MLUT)", "相机 / 监视器 LUT（MLUT）"],
    ["Customisation", "调整项"],
    ["Black Level / Highlight Level", "黑电平 / 高光电平"],
    ["Display Colourspace Converter", "显示色彩空间转换"],
    ["Settings", "设置"],
    ["Instructions", "使用说明"],
    ["Tables", "数据表"],
    ["Charts", "图表"],
    ["Print Chart", "打印图表"],
    ["Ref/IRE", "参考 / IRE"],
    ["Stop/IRE", "挡位 / IRE"],
    ["LUT In/Out", "LUT 输入 / 输出"],
    ["Output gamma including any customisations:", "包含调整项的输出伽马："],
    ["Reflected %", "反射 %"],
    ["LUTted % IRE", "LUT 后 % IRE"],
    ["10-bit Values", "10 位数值"],
    ["All", "全部"],
  ]);

  const normalize = (value) => value.replace(/\s+/g, " ").trim();
  const translateTextNode = (node) => {
    if (!node.nodeValue || node.parentElement?.closest("script,style,option")) return;
    let translated = node.nodeValue;
    textMap.forEach((to, from) => { translated = translated.split(from).join(to); });
    if (translated !== node.nodeValue) node.nodeValue = translated;
  };

  const translateElement = (element) => {
    if (element.matches("option")) {
      const original = element.dataset.lcOriginalText || normalize(element.textContent || "");
      const translated = textMap.get(original);
      if (translated) {
        element.dataset.lcOriginalText = original;
        if (element.textContent !== translated) element.textContent = translated;
      }
    }
    if (element.matches("input[type=text]")) {
      /* 只翻译当前值本身是英文原词的输入框；用户输入（如 LUT 标题）不属于翻译表时不得覆盖，
         避免用陈旧的 data-lc-original-value 在后续 MutationObserver 触发时重置用户内容。 */
      const translated = textMap.get(normalize(element.value));
      if (translated) {
        element.dataset.lcOriginalValue = element.value;
        if (element.value !== translated) element.value = translated;
      }
    }
    if (element.matches("input[type=button], input[type=submit], button")) {
      const original = element.dataset.lcOriginalValue || element.value || normalize(element.textContent || "");
      const translated = textMap.get(normalize(original));
      if (translated) {
        element.dataset.lcOriginalValue = original;
        if ("value" in element && element.value && element.value !== translated) element.value = translated;
        else if (element.textContent && element.textContent !== translated) element.textContent = translated;
      }
    }
    ["title", "aria-label"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      const translated = value && textMap.get(normalize(value));
      if (translated) element.setAttribute(attribute, translated);
    });
  };

  const translate = (root = document.body) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
    root.querySelectorAll?.("option,input,button,[title],[aria-label]").forEach(translateElement);
  };

  const start = () => {
    translate();
    const observer = new MutationObserver(() => translate());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.setTimeout(translate, 200);
    window.setTimeout(translate, 800);
    window.setTimeout(() => document.getElementById("javascriptwarning")?.classList.add("lc-hide-splash"), 1400);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
