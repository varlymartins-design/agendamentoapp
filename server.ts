import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === "production";

  console.log(`Starting server in ${isProd ? 'production' : 'development'} mode`);

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  const DB_FILE = path.join(process.cwd(), 'db.json');
  let cachedDb: any = null;

  // Load database into memory on startup
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      cachedDb = JSON.parse(raw);
      console.log('Database loaded into server memory successfully');
    }
  } catch (err) {
    console.error('Error loading database on startup:', err);
  }

  // API route to resolve TikTok redirects (such as vm.tiktok.com)
  app.get("/api/resolve-tiktok", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }
    try {
      console.log(`Resolving TikTok URL: ${url}`);
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const location = response.headers.get("location");
      if (location) {
        console.log(`Resolved redirect to: ${location}`);
        return res.json({ resolvedUrl: location });
      }

      const getResponse = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const getLocation = getResponse.headers.get("location");
      if (getLocation) {
        console.log(`Resolved redirect via GET to: ${getLocation}`);
        return res.json({ resolvedUrl: getLocation });
      }

      return res.json({ resolvedUrl: url });
    } catch (err) {
      console.error("Error resolving TikTok URL:", err);
      return res.status(500).json({ error: (err as Error).message });
    }
  });

  // API route to get current server database state
  app.get("/api/db", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    try {
      if (cachedDb) {
        res.json(cachedDb);
      } else if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        cachedDb = JSON.parse(raw);
        res.json(cachedDb);
      } else {
        res.json({ empty: true });
      }
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // API route to update server database state with selective table merging
  app.post("/api/db", (req, res) => {
    try {
      const data = req.body;
      if (!cachedDb) {
        cachedDb = {};
        if (fs.existsSync(DB_FILE)) {
          try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            cachedDb = JSON.parse(raw);
          } catch (err) {
            console.warn('Failed parsing existing database, resetting to fallback database.', err);
          }
        }
      }

      // Merge only the tables that are actively supplied in the payload request,
      // retaining existing database state for any omitted tables.
      const mergedDb = {
        plans: data.plans !== undefined ? data.plans : (cachedDb.plans || []),
        sellers: data.sellers !== undefined ? data.sellers : (cachedDb.sellers || []),
        products: data.products !== undefined ? data.products : (cachedDb.products || []),
        links: data.links !== undefined ? data.links : (cachedDb.links || []),
        orders: data.orders !== undefined ? data.orders : (cachedDb.orders || []),
        clients: data.clients !== undefined ? data.clients : (cachedDb.clients || []),
      };

      cachedDb = mergedDb;

      // Persist to disk asynchronously so we don't block the API response
      fs.writeFile(DB_FILE, JSON.stringify(mergedDb, null, 2), 'utf8', (err) => {
        if (err) console.error('Failed to write db.json to disk:', err);
      });

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Vite middleware for development
  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('Vite middleware loaded');
    } catch (err) {
      console.error('Failed to load Vite middleware:', err);
    }
  } else {
    // In production, we serve from the 'dist' directory.
    // When bundled to dist/server.cjs, __dirname is 'dist'
    // When running from root (tsx server.ts), __dirname is '.'
    const distPath = path.resolve(__dirname, fs.existsSync(path.join(__dirname, 'index.html')) ? '.' : 'dist');
    
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: false
    }));

    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`Index file not found at: ${indexPath}`);
        res.status(404).send('Application build not found. Please contact support.');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
