export type Locale = "zh-CN" | "en" | "es" | "ar" | "ja" | "ko";

type Dictionary = Record<string, string>;

export const LOCALES: { id: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { id: "zh-CN", label: "简体中文", dir: "ltr" },
  { id: "en", label: "English", dir: "ltr" },
  { id: "es", label: "Español", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
  { id: "ja", label: "日本語", dir: "ltr" },
  { id: "ko", label: "한국어", dir: "ltr" },
];

export const LOCALE_STORAGE_KEY = "lutcalc-workbench-locale";

const en: Dictionary = {
  "LUTCalc 中文计算器": "LUTCalc Calculator",
  "中文计算器工作台": "Calculator Workbench",
  "主工作台": "Main Workbench",
  "语言": "Language",
  "主题设置": "Theme settings",
  "选择主题": "Choose theme",
  "切换到深色模式": "Switch to dark mode",
  "切换到亮色模式": "Switch to light mode",
  "工具中心": "Tools",
  "工作台工具": "Workbench Tools",
  "关闭工具中心": "Close tools",
  "流程": "Workflows",
  "曲线": "Profiles",
  "录制当前计算器中的参数调整，并将它们保存为可重复执行的流程。": "Record calculator changes and save them as reusable workflows.",
  "流程名称": "Workflow name",
  "停止记录": "Stop recording",
  "开始记录": "Start recording",
  "{count} 步": "{count} steps",
  "保存流程": "Save workflow",
  "导出文件": "Export file",
  "导入文件": "Import file",
  "清空当前": "Clear current",
  "已保存流程": "Saved workflows",
  "保存后会出现在这里": "Saved workflows appear here.",
  "{count} 步操作": "{count} actions",
  "执行": "Run",
  "导出": "Export",
  "重命名": "Rename",
  "删除": "Delete",
  "上移": "Move up",
  "下移": "Move down",
  "导入个人或官方的日志 / 伽马配置。含 engineParams 的配置会自动注册到引擎，出现在“输入 / 输出 Gamma”下拉；“使用”中的曲线作为 LUT 标题 * 映射的“新 LOG”。": "Import personal or official log / gamma profiles. Profiles with engineParams are registered with the engine and appear in the input / output Gamma lists; the selected profile is used when an asterisk LUT title is mapped to a new log.",
  "导入配置": "Import profile",
  "已导入配置": "Imported profiles",
  "等待导入配置文件": "Waiting for a profile file",
  "日志曲线": "Log curve",
  "伽马曲线": "Gamma curve",
  "{count} 个采样点": "{count} samples",
  "公式曲线": "Formula curve",
  "使用": "Use",
  "LUT 转换": "LUT Conversion",
  "主计算器": "Main Calculator",
  "所有参数直接驱动兼容计算引擎；旧界面不再显示。": "All parameters directly drive the compatible calculation engine; the legacy interface remains hidden.",
  "引擎已连接": "Engine connected",
  "引擎加载失败": "Engine failed to load",
  "正在连接": "Connecting",
  "相机输入": "Camera Input",
  "选择相机、曝光基准与输入记录设置。": "Choose camera, exposure reference, and input recording settings.",
  "相机品牌": "Camera brand",
  "相机型号": "Camera model",
  "原生 ISO": "Native ISO",
  "挡位修正": "Stop shift",
  "色彩管线": "Color Pipeline",
  "定义记录伽马、色域与目标输出。": "Define recording gamma, gamut, and target output.",
  "记录设置": "Recording settings",
  "输出设置": "Output settings",
  "伽马品牌": "Gamma brand",
  "记录伽马": "Recording gamma",
  "色域品牌": "Gamut brand",
  "记录色域": "Recording gamut",
  "输出伽马": "Output gamma",
  "输出色域": "Output gamut",
  "当前输出使用外部 LUT 分析结果": "Current output uses external LUT analysis",
  "外部 LUT 分析状态": "External LUT analysis status",
  "生成 LUT 将使用这一已应用的原版引擎输出状态。": "Generated LUTs will use this applied original-engine output state.",
  "LUTCalc 同源计算引擎": "LUTCalc same-origin calculation engine",
  "LUT 输出": "LUT Output",
  "保留原版输出维度、范围、用途、格式与硬裁切选项。": "Preserves the original output dimension, range, usage, format, and hard-clip options.",
  "LUT 标题 / 文件名": "LUT title / filename",
  "未填写时将自动使用输入/输出管线生成文件名，避免导出为 _LUT.cube。": "If left empty, a filename is generated from the input/output pipeline to avoid exporting _LUT.cube.",
  "自动标题": "Auto title",
  "输出维度": "Output dimension",
  "输入范围": "Input range",
  "输出范围": "Output range",
  "LUT 用途": "LUT usage",
  "调色 LUT": "Grading LUT",
  "相机 / 监看 LUT（MLUT）": "Camera / monitoring LUT (MLUT)",
  "LUT 类型": "LUT type",
  "硬裁切": "Hard clip",
  "隐藏原版预览": "Hide original preview",
  "显示原版预览": "Show original preview",
  "生成 LUT": "Generate LUT",
  "生成套装": "Generate set",
  "最近一次导出已触发：": "Latest export initiated:",
  "知道了": "Got it",
  "原版预览与曲线": "Original Preview & Curves",
  "隐藏预览": "Hide preview",
  "显示预览": "Show preview",
  "原版预览类型": "Original preview type",
  "高对比度": "High contrast",
  "低对比度": "Low contrast",
  "Rec.709 色域": "Rec.709 gamut",
  "xy / uv 色度图": "xy / uv chromaticity",
  "灰度": "Grayscale",
  "载入预览…": "Load preview…",
  "预览范围": "Preview range",
  "原版 LUTCalc Canvas 预览": "Original LUTCalc canvas preview",
  "点击“显示预览”后读取原版 Canvas": "Show preview to load the original canvas.",
  "RGB 采样器": "RGB Sampler",
  "停止点击取样": "Stop click sampling",
  "开始点击取样": "Start click sampling",
  "清除": "Clear",
  "点击预览图添加采样点": "Click the preview to add samples",
  "开启后点击预览图": "Enable it, then click the preview",
  "原版波形监看": "Original waveform monitor",
  "正在生成 WFM": "Generating WFM",
  "原版矢量示波器": "Original vectorscope",
  "正在生成 Vector": "Generating vector",
  "原版 RGB Parade": "Original RGB parade",
  "正在生成 RGB Parade": "Generating RGB parade",
  "LUT 输出曲线预览": "LUT output curve preview",
  "等待引擎曲线": "Waiting for engine curves",
  "状态": "Status",
  "原版 Canvas 已桥接": "Original canvas bridged",
  "引擎不可用": "Engine unavailable",
  "加载中": "Loading",
  "鼠标移动可在原版预览中读取 10-bit RGB；载入图片会要求确认 Gamma、色彩空间与范围。": "Move the pointer over the original preview to read 10-bit RGB; loading an image requires confirming gamma, color space, and range.",
  "关于与许可": "About & License",
  "本项目是基于 原版 LUTCalc 的界面复刻与工作台扩展，并非官方发行版本。": "This project is a UI recreation and workbench extension based on original LUTCalc; it is not an official release.",
  "原版 LUTCalc 与本复刻项目均采用 GNU GPL-2.0 许可；原始项目版权归其原作者及权利人所有。": "Original LUTCalc and this recreation are licensed under GNU GPL-2.0; copyright in the original belongs to its authors and rights holders.",
  "界面与工作台扩展由 AI 维护。本版本可能不稳定，且不保证持续更新、技术支持或长期兼容性。": "The interface and workbench extensions are maintained by AI. This version may be unstable and does not guarantee ongoing updates, technical support, or long-term compatibility.",
  "调整项": "Adjustments",
  "勾选模块后直接显示参数；LUT 解析保留独立工具展开。": "Select a module to reveal its parameters; LUT analysis remains in a separate expandable tool.",
  "启用调整项": "Enable adjustments",
  "启用": "Enabled",
  "关闭": "Off",
  "从新白平衡解锁光源": "Unlock illuminant from new white balance",
  "参数变化会同步到兼容计算引擎": "Changes sync to the compatible calculation engine",
  "重置本模块": "Reset this module",
  "LUT 解析": "LUT Analysis",
  "按原版 LUTAnalyst 分析外部 LUT，并将结果同步到曲线预览": "Analyze an external LUT with original LUTAnalyst and sync the result to the curve preview",
  "已载入": "Loaded",
  "工具": "Tool",
  "原版 LUT 分析工具": "Original LUT analysis tool",
  "输入 Gamma": "Input Gamma",
  "输入 Gamut": "Input Gamut",
  "正在读取原版 Gamma 目录…": "Reading original Gamma catalog…",
  "正在读取原版色域目录…": "Reading original gamut catalog…",
  "分析设置": "Analysis settings",
  "分析维度": "Analysis dimension",
  "分析方法": "Analysis method",
  "三线性": "Trilinear",
  "四面体": "Tetrahedral",
  "三次插值（Tricubic）": "Tricubic interpolation",
  "LUT 范围": "LUT range",
  "箭头左侧为文件输入编码范围，右侧为分析后的显示输出范围。100% 表示视频合法范围，109% 保留超白；范围不符时高光裁切与灰阶结果会改变。": "The left side of the arrow is the file input encoding range; the right is the analyzed display output range. 100% is legal video range and 109% retains super-white; differing ranges change highlight clipping and greyscale results.",
  "LUT 文件": "LUT file",
  "尚未选择文件": "No file selected",
  "原始标题：": "Original title:",
  "未提供": "Not provided",
  "网格：": "Grid:",
  "未声明": "Not declared",
  "RGB 数据行：": "RGB data rows:",
  "机型：": "Model:",
  "用途：": "Usage:",
  "分析结果已同步": "Analysis result synchronized",
  "分析未完成": "Analysis incomplete",
  "分析状态": "Analysis status",
  "当前输出：": "Current output:",
  "完成时间：": "Completed:",
  "正在分析…": "Analyzing…",
  "分析 LUT 并应用当前输出": "Analyze LUT and apply current output",
  "新建 LUT": "New LUT",
  "选择文件": "Choose file",
  "高级设置": "Advanced settings",
  "保留原始采样范围": "Preserve original sample range",
  "写入分析元数据": "Write analysis metadata",
  "高级选项由原版 LUTAnalyst 提供，默认保持关闭。": "Advanced options are supplied by original LUTAnalyst and remain off by default.",
  "自定义色彩空间": "Custom Color Space",
  "自定义工作色彩空间与色彩适配": "Custom working color space and chromatic adaptation",
  "白平衡": "White Balance",
  "参考白、色温和绿色偏移": "Reference white, color temperature, and green offset",
  "PSST-CDL": "PSST-CDL",
  "亮度、对比度、色相和饱和度调整": "Exposure, contrast, hue, and saturation adjustments",
  "ASC-CDL": "ASC-CDL",
  "Slope、Offset、Power 与 Saturation": "Slope, Offset, Power, and Saturation",
  "多色调": "Multi-tone",
  "高光、阴影与中间调的色相和饱和度": "Hue and saturation for highlights, shadows, and midtones",
  "高光色域": "Highlight Gamut",
  "高光区域的色域压缩与过渡": "Gamut compression and transition in highlights",
  "膝点": "Knee",
  "高光压缩的起点、斜率与柔和度": "Start point, slope, and softness of highlight compression",
  "黑电平 / 高光电平": "Black / Highlight Levels",
  "分别锁定黑位与高光映射": "Independently lock black level and highlight mapping",
  "黑伽马": "Black Gamma",
  "阴影区的 Power、Stop Limit 与 Feather": "Power, Stop Limit, and Feather in shadows",
  "SDR 饱和度": "SDR Saturation",
  "SDR 输出下的饱和度与亮度补偿": "Saturation and brightness compensation for SDR output",
  "显示色彩空间转换": "Display Color Space Converter",
  "显示色彩空间、白点和适配模型": "Display color space, white point, and adaptation model",
  "色域限制": "Gamut Limiter",
  "选择限制色域和压缩方式": "Choose the limiting gamut and compression method",
  "伪色": "False Color",
  "以伪色显示 IRE 区间和曝光状态": "Show IRE zones and exposure status in false color",
  "采样并读取预览中的 RGB 数值": "Sample and read RGB values in the preview",
  "工作色彩空间": "Working color space",
  "色彩适配模型": "Chromatic adaptation model",
  "参考白": "Reference white",
  "新白平衡": "New white balance",
  "曝光": "Exposure",
  "对比度": "Contrast",
  "枢轴": "Pivot",
  "饱和度": "Saturation",
  "色相": "Hue",
  "阴影色相": "Shadow hue",
  "阴影饱和度": "Shadow saturation",
  "中间调色相": "Midtone hue",
  "中间调饱和度": "Midtone saturation",
  "高光色相": "Highlight hue",
  "高光饱和度": "Highlight saturation",
  "起始阈值": "Start threshold",
  "过渡柔和度": "Transition softness",
  "去饱和": "Desaturation",
  "斜率": "Slope",
  "柔和度": "Softness",
  "黑电平": "Black level",
  "高光反射": "Highlight reflectance",
  "高光映射": "Highlight mapping",
  "亮度": "Brightness",
  "输入色彩空间": "Input color space",
  "输出色彩空间": "Output color space",
  "适配模型": "Adaptation model",
  "限制阈值": "Limit threshold",
  "压缩柔和度": "Compression softness",
  "目标色域": "Target gamut",
  "低阈值": "Low threshold",
  "高阈值": "High threshold",
  "显示模式": "Display mode",
  "采样模式": "Sampling mode",
};

Object.assign(en, {
  "LUTCalc 中文计算器工作台": "LUTCalc Calculator Workbench",
  "正在连接计算引擎": "Connecting to calculation engine",
  "正在读取原始计算引擎…": "Reading original calculation engine…",
  "原版计算引擎加载失败；预览不可用": "Original calculation engine failed to load; preview is unavailable.",
  "预览由原始计算引擎实时生成": "Preview is generated live by the original calculation engine.",
  "正在读取…": "Reading…",
  "亮色": "Light",
  "深色": "Dark",
  "步": "steps",
  "关闭工具中心": "Close tools"
});

const es: Dictionary = {
  "LUTCalc 中文计算器": "Calculadora LUTCalc", "中文计算器工作台": "Espacio de trabajo de la calculadora", "主工作台": "Espacio principal", "语言": "Idioma", "主题设置": "Tema", "选择主题": "Elegir tema", "工具中心": "Herramientas", "工作台工具": "Herramientas del espacio", "关闭工具中心": "Cerrar herramientas", "流程": "Flujos", "曲线": "Perfiles", "流程名称": "Nombre del flujo", "停止记录": "Detener grabación", "开始记录": "Iniciar grabación", "保存流程": "Guardar flujo", "导出文件": "Exportar archivo", "导入文件": "Importar archivo", "清空当前": "Limpiar actual", "已保存流程": "Flujos guardados", "执行": "Ejecutar", "导出": "Exportar", "重命名": "Renombrar", "删除": "Eliminar", "上移": "Subir", "下移": "Bajar", "导入配置": "Importar perfil", "已导入配置": "Perfiles importados", "使用": "Usar", "LUT 转换": "Conversión LUT", "主计算器": "Calculadora principal", "引擎已连接": "Motor conectado", "引擎加载失败": "Error al cargar el motor", "正在连接": "Conectando", "相机输入": "Entrada de cámara", "相机品牌": "Marca de cámara", "相机型号": "Modelo de cámara", "原生 ISO": "ISO nativo", "挡位修正": "Corrección de pasos", "色彩管线": "Flujo de color", "记录设置": "Ajustes de grabación", "输出设置": "Ajustes de salida", "伽马品牌": "Marca gamma", "记录伽马": "Gamma de grabación", "色域品牌": "Marca de gama", "记录色域": "Gama de grabación", "输出伽马": "Gamma de salida", "输出色域": "Gama de salida", "调整项": "Ajustes", "启用调整项": "Activar ajustes", "启用": "Activado", "关闭": "Desactivado", "LUT 解析": "Análisis LUT", "LUT 输出": "Salida LUT", "LUT 标题 / 文件名": "Título / archivo LUT", "自动标题": "Título automático", "输出维度": "Dimensión de salida", "输入范围": "Rango de entrada", "输出范围": "Rango de salida", "LUT 用途": "Uso LUT", "调色 LUT": "LUT de corrección", "相机 / 监看 LUT（MLUT）": "LUT de cámara / monitor (MLUT)", "LUT 类型": "Tipo de LUT", "硬裁切": "Recorte duro", "隐藏原版预览": "Ocultar vista original", "显示原版预览": "Mostrar vista original", "生成 LUT": "Generar LUT", "生成套装": "Generar conjunto", "原版预览与曲线": "Vista original y curvas", "隐藏预览": "Ocultar vista", "显示预览": "Mostrar vista", "载入预览…": "Cargar vista…", "预览范围": "Rango de vista", "高对比度": "Alto contraste", "低对比度": "Bajo contraste", "灰度": "Escala de grises", "状态": "Estado", "关于与许可": "Acerca de y licencia", "界面与工作台扩展由 AI 维护。本版本可能不稳定，且不保证持续更新、技术支持或长期兼容性。": "La interfaz y las extensiones del espacio de trabajo son mantenidas por IA. Esta versión puede ser inestable y no garantiza actualizaciones, soporte técnico ni compatibilidad a largo plazo.", "自定义色彩空间": "Espacio de color personalizado", "白平衡": "Balance de blancos", "多色调": "Multitono", "高光色域": "Gama de altas luces", "膝点": "Rodilla", "黑电平 / 高光电平": "Niveles de negro / altas luces", "黑伽马": "Gamma de negros", "SDR 饱和度": "Saturación SDR", "显示色彩空间转换": "Conversión de espacio de visualización", "色域限制": "Limitador de gama", "伪色": "Color falso", "RGB 采样器": "Muestreador RGB", "分析设置": "Ajustes de análisis", "分析维度": "Dimensión de análisis", "分析方法": "Método de análisis", "三线性": "Trilineal", "四面体": "Tetraédrico", "LUT 范围": "Rango LUT", "LUT 文件": "Archivo LUT", "选择文件": "Elegir archivo", "新建 LUT": "Nuevo LUT", "高级设置": "Ajustes avanzados"
};

const ar: Dictionary = {
  "LUTCalc 中文计算器": "حاسبة LUTCalc", "中文计算器工作台": "مساحة عمل الحاسبة", "主工作台": "مساحة العمل الرئيسية", "语言": "اللغة", "主题设置": "المظهر", "选择主题": "اختيار المظهر", "工具中心": "الأدوات", "工作台工具": "أدوات مساحة العمل", "关闭工具中心": "إغلاق الأدوات", "流程": "سير العمل", "曲线": "الملفات", "流程名称": "اسم سير العمل", "停止记录": "إيقاف التسجيل", "开始记录": "بدء التسجيل", "保存流程": "حفظ سير العمل", "导出文件": "تصدير ملف", "导入文件": "استيراد ملف", "清空当前": "مسح الحالي", "已保存流程": "سير العمل المحفوظ", "执行": "تشغيل", "导出": "تصدير", "重命名": "إعادة تسمية", "删除": "حذف", "上移": "نقل لأعلى", "下移": "نقل لأسفل", "导入配置": "استيراد ملف تعريف", "已导入配置": "الملفات المستوردة", "使用": "استخدام", "LUT 转换": "تحويل LUT", "主计算器": "الحاسبة الرئيسية", "引擎已连接": "المحرك متصل", "引擎加载失败": "فشل تحميل المحرك", "正在连接": "جارٍ الاتصال", "相机输入": "إدخال الكاميرا", "相机品牌": "علامة الكاميرا", "相机型号": "طراز الكاميرا", "原生 ISO": "ISO الأصلي", "挡位修正": "تصحيح الوقفات", "色彩管线": "مسار الألوان", "记录设置": "إعدادات التسجيل", "输出设置": "إعدادات الإخراج", "伽马品牌": "علامة غاما", "记录伽马": "غاما التسجيل", "色域品牌": "علامة النطاق اللوني", "记录色域": "نطاق التسجيل", "输出伽马": "غاما الإخراج", "输出色域": "نطاق الإخراج", "调整项": "التعديلات", "启用调整项": "تمكين التعديلات", "启用": "مفعل", "关闭": "متوقف", "LUT 解析": "تحليل LUT", "LUT 输出": "إخراج LUT", "LUT 标题 / 文件名": "عنوان / اسم ملف LUT", "自动标题": "عنوان تلقائي", "输出维度": "أبعاد الإخراج", "输入范围": "نطاق الإدخال", "输出范围": "نطاق الإخراج", "LUT 用途": "استخدام LUT", "调色 LUT": "LUT للتلوين", "相机 / 监看 LUT（MLUT）": "LUT للكاميرا / المراقبة", "LUT 类型": "نوع LUT", "硬裁切": "قص حاد", "隐藏原版预览": "إخفاء المعاينة الأصلية", "显示原版预览": "عرض المعاينة الأصلية", "生成 LUT": "إنشاء LUT", "生成套装": "إنشاء مجموعة", "原版预览与曲线": "المعاينة والمنحنيات الأصلية", "隐藏预览": "إخفاء المعاينة", "显示预览": "عرض المعاينة", "载入预览…": "تحميل معاينة…", "预览范围": "نطاق المعاينة", "高对比度": "تباين مرتفع", "低对比度": "تباين منخفض", "灰度": "تدرج رمادي", "状态": "الحالة", "关于与许可": "حول والترخيص", "界面与工作台扩展由 AI 维护。本版本可能不稳定，且不保证持续更新、技术支持或长期兼容性。": "تتم صيانة الواجهة وامتدادات مساحة العمل بالذكاء الاصطناعي. قد تكون هذه النسخة غير مستقرة ولا تضمن التحديثات أو الدعم الفني أو التوافق طويل الأمد.", "自定义色彩空间": "مساحة لون مخصصة", "白平衡": "توازن الأبيض", "多色调": "متعدد الدرجات", "高光色域": "نطاق الإبرازات", "膝点": "الركبة", "黑电平 / 高光电平": "مستويات الأسود / الإبرازات", "黑伽马": "غاما الأسود", "SDR 饱和度": "تشبع SDR", "显示色彩空间转换": "تحويل مساحة ألوان العرض", "色域限制": "محدد النطاق اللوني", "伪色": "لون زائف", "RGB 采样器": "أداة أخذ عينات RGB", "分析设置": "إعدادات التحليل", "分析维度": "أبعاد التحليل", "分析方法": "طريقة التحليل", "三线性": "ثلاثي خطي", "四面体": "رباعي السطوح", "LUT 范围": "نطاق LUT", "LUT 文件": "ملف LUT", "选择文件": "اختيار ملف", "新建 LUT": "LUT جديد", "高级设置": "إعدادات متقدمة"
};

const ja: Dictionary = {
  "LUTCalc 中文计算器": "LUTCalc 計算機", "中文计算器工作台": "計算機ワークベンチ", "主工作台": "メインワークベンチ", "语言": "言語", "主题设置": "テーマ", "选择主题": "テーマを選択", "工具中心": "ツール", "工作台工具": "ワークベンチツール", "关闭工具中心": "ツールを閉じる", "流程": "ワークフロー", "曲线": "プロファイル", "流程名称": "ワークフロー名", "停止记录": "記録を停止", "开始记录": "記録を開始", "保存流程": "ワークフローを保存", "导出文件": "ファイルをエクスポート", "导入文件": "ファイルをインポート", "清空当前": "現在の内容を消去", "已保存流程": "保存済みワークフロー", "执行": "実行", "导出": "エクスポート", "重命名": "名前を変更", "删除": "削除", "上移": "上へ", "下移": "下へ", "导入配置": "プロファイルをインポート", "已导入配置": "インポート済みプロファイル", "使用": "使用", "LUT 转换": "LUT変換", "主计算器": "メイン計算機", "引擎已连接": "エンジン接続済み", "引擎加载失败": "エンジンの読み込みに失敗", "正在连接": "接続中", "相机输入": "カメラ入力", "相机品牌": "カメラブランド", "相机型号": "カメラモデル", "原生 ISO": "ネイティブISO", "挡位修正": "ストップ補正", "色彩管线": "カラーパイプライン", "记录设置": "記録設定", "输出设置": "出力設定", "伽马品牌": "ガンマブランド", "记录伽马": "記録ガンマ", "色域品牌": "色域ブランド", "记录色域": "記録色域", "输出伽马": "出力ガンマ", "输出色域": "出力色域", "调整项": "調整", "启用调整项": "調整を有効化", "启用": "有効", "关闭": "オフ", "LUT 解析": "LUT解析", "LUT 输出": "LUT出力", "LUT 标题 / 文件名": "LUTタイトル / ファイル名", "自动标题": "自動タイトル", "输出维度": "出力次元", "输入范围": "入力範囲", "输出范围": "出力範囲", "LUT 用途": "LUT用途", "调色 LUT": "グレーディングLUT", "相机 / 监看 LUT（MLUT）": "カメラ / モニターLUT（MLUT）", "LUT 类型": "LUTタイプ", "硬裁切": "ハードクリップ", "隐藏原版预览": "オリジナルプレビューを隠す", "显示原版预览": "オリジナルプレビューを表示", "生成 LUT": "LUTを生成", "生成套装": "セットを生成", "原版预览与曲线": "オリジナルプレビューとカーブ", "隐藏预览": "プレビューを隠す", "显示预览": "プレビューを表示", "载入预览…": "プレビューを読み込む…", "预览范围": "プレビュー範囲", "高对比度": "高コントラスト", "低对比度": "低コントラスト", "灰度": "グレースケール", "状态": "状態", "关于与许可": "概要とライセンス", "界面与工作台扩展由 AI 维护。本版本可能不稳定，且不保证持续更新、技术支持或长期兼容性。": "インターフェースとワークベンチ拡張はAIが保守しています。このバージョンは不安定な場合があり、継続的な更新、技術サポート、長期互換性を保証しません。", "自定义色彩空间": "カスタム色空間", "白平衡": "ホワイトバランス", "多色调": "マルチトーン", "高光色域": "ハイライト色域", "膝点": "ニー", "黑电平 / 高光电平": "黒レベル / ハイライトレベル", "黑伽马": "ブラックガンマ", "SDR 饱和度": "SDR彩度", "显示色彩空间转换": "表示色空間変換", "色域限制": "色域リミッター", "伪色": "フォルスカラー", "RGB 采样器": "RGBサンプラー", "分析设置": "解析設定", "分析维度": "解析次元", "分析方法": "解析方法", "三线性": "三線形", "四面体": "四面体", "LUT 范围": "LUT範囲", "LUT 文件": "LUTファイル", "选择文件": "ファイルを選択", "新建 LUT": "新規LUT", "高级设置": "詳細設定"
};

const ko: Dictionary = {
  "LUTCalc 中文计算器": "LUTCalc 계산기", "中文计算器工作台": "계산기 워크벤치", "主工作台": "메인 워크벤치", "语言": "언어", "主题设置": "테마", "选择主题": "테마 선택", "工具中心": "도구", "工作台工具": "워크벤치 도구", "关闭工具中心": "도구 닫기", "流程": "워크플로", "曲线": "프로필", "流程名称": "워크플로 이름", "停止记录": "기록 중지", "开始记录": "기록 시작", "保存流程": "워크플로 저장", "导出文件": "파일 내보내기", "导入文件": "파일 가져오기", "清空当前": "현재 항목 지우기", "已保存流程": "저장된 워크플로", "执行": "실행", "导出": "내보내기", "重命名": "이름 바꾸기", "删除": "삭제", "上移": "위로", "下移": "아래로", "导入配置": "프로필 가져오기", "已导入配置": "가져온 프로필", "使用": "사용", "LUT 转换": "LUT 변환", "主计算器": "메인 계산기", "引擎已连接": "엔진 연결됨", "引擎加载失败": "엔진 로드 실패", "正在连接": "연결 중", "相机输入": "카메라 입력", "相机品牌": "카메라 브랜드", "相机型号": "카메라 모델", "原生 ISO": "기본 ISO", "挡位修正": "스톱 보정", "色彩管线": "색상 파이프라인", "记录设置": "기록 설정", "输出设置": "출력 설정", "伽马品牌": "감마 브랜드", "记录伽马": "기록 감마", "色域品牌": "색역 브랜드", "记录色域": "기록 색역", "输出伽马": "출력 감마", "输出色域": "출력 색역", "调整项": "조정", "启用调整项": "조정 사용", "启用": "사용", "关闭": "끔", "LUT 解析": "LUT 분석", "LUT 输出": "LUT 출력", "LUT 标题 / 文件名": "LUT 제목 / 파일 이름", "自动标题": "자동 제목", "输出维度": "출력 차원", "输入范围": "입력 범위", "输出范围": "출력 범위", "LUT 用途": "LUT 용도", "调色 LUT": "그레이딩 LUT", "相机 / 监看 LUT（MLUT）": "카메라 / 모니터 LUT(MLUT)", "LUT 类型": "LUT 유형", "硬裁切": "하드 클립", "隐藏原版预览": "원본 미리보기 숨기기", "显示原版预览": "원본 미리보기 표시", "生成 LUT": "LUT 생성", "生成套装": "세트 생성", "原版预览与曲线": "원본 미리보기 및 곡선", "隐藏预览": "미리보기 숨기기", "显示预览": "미리보기 표시", "载入预览…": "미리보기 불러오기…", "预览范围": "미리보기 범위", "高对比度": "고대비", "低对比度": "저대비", "灰度": "그레이스케일", "状态": "상태", "关于与许可": "정보 및 라이선스", "界面与工作台扩展由 AI 维护。本版本可能不稳定，且不保证持续更新、技术支持或长期兼容性。": "인터페이스와 워크벤치 확장은 AI가 유지 관리합니다. 이 버전은 불안정할 수 있으며 지속적인 업데이트, 기술 지원 또는 장기 호환성을 보장하지 않습니다.", "自定义色彩空间": "사용자 지정 색 공간", "白平衡": "화이트 밸런스", "多色调": "멀티 톤", "高光色域": "하이라이트 색역", "膝点": "니", "黑电平 / 高光电平": "블랙 / 하이라이트 레벨", "黑伽马": "블랙 감마", "SDR 饱和度": "SDR 채도", "显示色彩空间转换": "디스플레이 색 공간 변환", "色域限制": "색역 제한", "伪色": "의사색", "RGB 采样器": "RGB 샘플러", "分析设置": "분석 설정", "分析维度": "분석 차원", "分析方法": "분석 방법", "三线性": "삼선형", "四面体": "사면체", "LUT 范围": "LUT 범위", "LUT 文件": "LUT 파일", "选择文件": "파일 선택", "新建 LUT": "새 LUT", "高级设置": "고급 설정"
};

Object.assign(es, {
  "LUTCalc 中文计算器工作台": "Espacio de trabajo de LUTCalc",
  "正在连接计算引擎": "Conectando con el motor de cálculo",
  "正在读取原始计算引擎…": "Leyendo el motor de cálculo original…",
  "原版计算引擎加载失败；预览不可用": "El motor de cálculo original no se pudo cargar; la vista previa no está disponible.",
  "预览由原始计算引擎实时生成": "La vista previa se genera en tiempo real con el motor original.",
  "正在读取…": "Leyendo…", "亮色": "Claro", "深色": "Oscuro", "步": "pasos"
});
Object.assign(ar, {
  "LUTCalc 中文计算器工作台": "مساحة عمل LUTCalc",
  "正在连接计算引擎": "جارٍ الاتصال بمحرك الحساب",
  "正在读取原始计算引擎…": "جارٍ قراءة محرك الحساب الأصلي…",
  "原版计算引擎加载失败；预览不可用": "تعذر تحميل محرك الحساب الأصلي؛ المعاينة غير متاحة.",
  "预览由原始计算引擎实时生成": "تُنشأ المعاينة مباشرة بواسطة محرك الحساب الأصلي.",
  "正在读取…": "جارٍ القراءة…", "亮色": "فاتح", "深色": "داكن", "步": "خطوات"
});
Object.assign(ja, {
  "LUTCalc 中文计算器工作台": "LUTCalc ワークベンチ",
  "正在连接计算引擎": "計算エンジンに接続中",
  "正在读取原始计算引擎…": "オリジナル計算エンジンを読み込み中…",
  "原版计算引擎加载失败；预览不可用": "オリジナル計算エンジンを読み込めません。プレビューは利用できません。",
  "预览由原始计算引擎实时生成": "プレビューはオリジナル計算エンジンでリアルタイム生成されます。",
  "正在读取…": "読み込み中…", "亮色": "ライト", "深色": "ダーク", "步": "ステップ"
});
Object.assign(ko, {
  "LUTCalc 中文计算器工作台": "LUTCalc 워크벤치",
  "正在连接计算引擎": "계산 엔진 연결 중",
  "正在读取原始计算引擎…": "원본 계산 엔진을 읽는 중…",
  "原版计算引擎加载失败；预览不可用": "원본 계산 엔진을 불러오지 못했습니다. 미리보기를 사용할 수 없습니다.",
  "预览由原始计算引擎实时生成": "미리보기는 원본 계산 엔진에서 실시간으로 생성됩니다.",
  "正在读取…": "읽는 중…", "亮色": "라이트", "深色": "다크", "步": "단계"
});

const dictionaries: Record<Locale, Dictionary> = { "zh-CN": {}, en, es, ar, ja, ko };

export function translate(locale: Locale, source: string, values: Record<string, string | number> = {}): string {
  const translated = locale === "zh-CN" ? source : dictionaries[locale][source] || en[source] || source;
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), translated);
}

export function getStoredLocale(): Locale {
  const value = typeof window === "undefined" ? null : window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return LOCALES.some((locale) => locale.id === value) ? value as Locale : "zh-CN";
}

export function applyLocale(locale: Locale): void {
  const config = LOCALES.find((item) => item.id === locale) || LOCALES[0];
  document.documentElement.lang = locale;
  document.documentElement.dir = config.dir;
  document.title = `LUTCalc · ${translate(locale, "中文计算器工作台")}`;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function localizeElementText(root: ParentNode | null, locale: Locale): void {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text & { __lutcalcSource?: string };
    const parent = textNode.parentElement;
    if (!parent || parent.closest("[data-no-i18n]")) continue;
    const source = textNode.__lutcalcSource ?? textNode.data;
    textNode.__lutcalcSource = source;
    const translated = translate(locale, source);
    if (translated !== textNode.data) textNode.data = translated;
  }
  root.querySelectorAll?.("[aria-label], [title], [placeholder]").forEach((element) => {
    const html = element as HTMLElement & { __lutcalcI18nAttributes?: Record<string, string> };
    const sources = html.__lutcalcI18nAttributes || {};
    ["aria-label", "title", "placeholder"].forEach((attribute) => {
      const current = html.getAttribute(attribute);
      if (!current) return;
      const source = sources[attribute] || current;
      sources[attribute] = source;
      html.setAttribute(attribute, translate(locale, source));
    });
    html.__lutcalcI18nAttributes = sources;
  });
}
