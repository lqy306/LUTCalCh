import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // 工作台入口和同源引擎入口必须随发布立即重新验证，避免浏览器复用旧版完整 iframe 页面。
  app.use((req, res, next) => {
    if (req.path === "/" || req.path.endsWith(".html") || req.path.startsWith("/lutcalc/")) {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    }
    next();
  });

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
