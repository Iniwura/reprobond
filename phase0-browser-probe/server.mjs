import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PROBE_PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "/index.html" : pathname;
    const file = resolve(root, "." + relative);
    const servedFile = extname(file) ? file : file + ".js";
    if (!(file === root || file.startsWith(`${root}${sep}`))) throw new Error("path outside probe root");
    const body = await readFile(servedFile);
    res.writeHead(200, { "Content-Type": mime[extname(servedFile)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`ReproBond Phase 0 disposable probe: http://127.0.0.1:${port}`);
});
