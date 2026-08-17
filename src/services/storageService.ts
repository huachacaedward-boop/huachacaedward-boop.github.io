import { get, set, del, keys } from 'idb-keyval';
import { PortfolioMeta } from '../types';

const STORAGE_PREFIX = 'folioflip_portfolio_';

/**
 * Saves portfolio to both local IndexedDB and server backend for multi-device sharing
 */
export async function savePortfolioToStorage(portfolio: PortfolioMeta): Promise<void> {
  // 1. Save to local IndexedDB for immediate offline access
  try {
    await set(`${STORAGE_PREFIX}${portfolio.id}`, portfolio);
  } catch (err) {
    console.error('Error saving portfolio to local IndexedDB:', err);
  }

  // 2. Sync to backend server so any phone, tablet, or client link can open it
  try {
    const response = await fetch('/api/portfolios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(portfolio),
    });

    if (!response.ok) {
      console.warn('Server sync response not OK:', response.status);
    }
  } catch (err) {
    console.warn('Could not sync portfolio to server backend (might be offline):', err);
  }
}

/**
 * Retrieves a portfolio by ID.
 * First checks local IndexedDB; if not found (e.g. user opened link on a new phone),
 * fetches the full portfolio from the backend server and caches it locally.
 */
export async function getPortfolioFromStorage(id: string): Promise<PortfolioMeta | undefined> {
  // 1. Try local IndexedDB
  try {
    const local = await get<PortfolioMeta>(`${STORAGE_PREFIX}${id}`);
    if (local && local.pages && local.pages.length > 0) {
      return local;
    }
  } catch (err) {
    console.error('Error reading from local IndexedDB:', err);
  }

  // 2. Try fetching from server backend (enables cross-device sharing)
  try {
    const response = await fetch(`/api/portfolios/${encodeURIComponent(id)}`);
    if (response.ok) {
      const serverPortfolio: PortfolioMeta = await response.json();
      if (serverPortfolio && serverPortfolio.id) {
        // Cache in local IndexedDB for instant future reloads
        try {
          await set(`${STORAGE_PREFIX}${serverPortfolio.id}`, serverPortfolio);
        } catch (e) {
          // ignore cache error
        }
        return serverPortfolio;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch portfolio ${id} from server:`, err);
  }

  return undefined;
}

/**
 * Returns all stored portfolios from both IndexedDB and the server backend
 */
export async function getAllStoredPortfolios(): Promise<PortfolioMeta[]> {
  const map = new Map<string, PortfolioMeta>();

  // 1. Load from IndexedDB
  try {
    const allKeys = await keys();
    const portfolioKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(STORAGE_PREFIX));
    
    for (const key of portfolioKeys) {
      const item = await get<PortfolioMeta>(key);
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
  } catch (err) {
    console.error('Error reading all portfolios from IndexedDB:', err);
  }

  // 2. Fetch summaries from server and merge any missing
  try {
    const response = await fetch('/api/portfolios');
    if (response.ok) {
      const serverList = await response.json();
      if (Array.isArray(serverList)) {
        for (const item of serverList) {
          if (item && item.id && !map.has(item.id)) {
            // Need full pages if user selects it, but store metadata for library view
            map.set(item.id, {
              ...item,
              pages: item.pages || [],
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch portfolio list from server:', err);
  }

  const result = Array.from(map.values());
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Deletes a portfolio from both local storage and server
 */
export async function deletePortfolioFromStorage(id: string): Promise<void> {
  // 1. Delete from IndexedDB
  try {
    await del(`${STORAGE_PREFIX}${id}`);
  } catch (err) {
    console.error('Error deleting portfolio from IndexedDB:', err);
  }

  // 2. Delete from server
  try {
    await fetch(`/api/portfolios/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Error deleting portfolio from server:', err);
  }
}
