import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const server = createServer(app);

(async () => {
  await registerRoutes(server, app);

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const { setupVite } = await import("./vite");
    await setupVite(server, app);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Sermon Explorer running on port ${port}`);
  });
})();
