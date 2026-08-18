/* React 浏览器入口：只挂载一次根组件，不在这里放置计算引擎桥接逻辑。 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement)
{
  throw new Error("找不到应用根节点 #root");
}

createRoot(rootElement).render(<App />);
