import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Enable large payload size for architectural PDF pages and high-res rendered images
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));

// Persistent directory for saving uploaded portfolios across sessions/devices
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'portfolios.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Error creating data directory:', e);
  }
}

// In-memory cache for fast lookups
let portfoliosCache: Map<string, any> = new Map();

function loadPortfoliosFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((p) => {
          if (p && p.id) {
            portfoliosCache.set(p.id, p);
          }
        });
      }
      console.log(`Loaded ${portfoliosCache.size} portfolios from server storage.`);
    }
  } catch (err) {
    console.error('Error reading portfolios from disk:', err);
  }
}

function savePortfoliosToDisk() {
  try {
    const list = Array.from(portfoliosCache.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(list), 'utf-8');
  } catch (err) {
    console.error('Error saving portfolios to disk:', err);
  }
}

// Initial load
loadPortfoliosFromDisk();

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', portfoliosCount: portfoliosCache.size, timestamp: Date.now() });
});

// GET /api/portfolios - returns summaries (without heavy page high-res blobs for speed)
app.get('/api/portfolios', (req, res) => {
  try {
    const summaries = Array.from(portfoliosCache.values()).map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      description: p.description,
      category: p.category,
      totalPages: p.totalPages || (p.pages ? p.pages.length : 0),
      fileSizeBytes: p.fileSizeBytes,
      fileSizeFormatted: p.fileSizeFormatted,
      createdAt: p.createdAt,
      coverImage: p.coverImage || (p.pages && p.pages[0] ? p.pages[0].dataUrl : ''),
      isSample: p.isSample || false,
    }));
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching portfolios' });
  }
});

// GET /api/portfolios/:id - returns full portfolio with all pages
app.get('/api/portfolios/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = portfoliosCache.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Portafolio no encontrado en el servidor' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching portfolio details' });
  }
});

// POST /api/portfolios - saves or updates a portfolio
app.post('/api/portfolios', (req, res) => {
  try {
    const portfolio = req.body;
    if (!portfolio || !portfolio.id || !portfolio.pages) {
      return res.status(400).json({ error: 'Datos de portafolio inválidos' });
    }

    portfoliosCache.set(portfolio.id, portfolio);
    savePortfoliosToDisk();

    console.log(`Saved portfolio "${portfolio.title}" (${portfolio.id}) with ${portfolio.pages.length} pages.`);
    res.json({ success: true, id: portfolio.id });
  } catch (err: any) {
    console.error('Error saving portfolio on server:', err);
    res.status(500).json({ error: err.message || 'Error al guardar portafolio en el servidor' });
  }
});

// DELETE /api/portfolios/:id - deletes a portfolio
app.delete('/api/portfolios/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (portfoliosCache.has(id)) {
      portfoliosCache.delete(id);
      savePortfoliosToDisk();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error deleting portfolio' });
  }
});

async function startServer() {
  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FolioFlip Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
