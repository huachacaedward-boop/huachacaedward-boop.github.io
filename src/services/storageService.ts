import { get, set, del, keys } from 'idb-keyval';
import { PortfolioMeta } from '../types';

const STORAGE_PREFIX = 'folioflip_portfolio_';

export async function savePortfolioToStorage(portfolio: PortfolioMeta): Promise<void> {
  try {
    await set(`${STORAGE_PREFIX}${portfolio.id}`, portfolio);
  } catch (err) {
    console.error('Error saving portfolio to IndexedDB:', err);
    throw new Error('No se pudo guardar el portafolio en el almacenamiento local.');
  }
}

export async function getPortfolioFromStorage(id: string): Promise<PortfolioMeta | undefined> {
  try {
    return await get<PortfolioMeta>(`${STORAGE_PREFIX}${id}`);
  } catch (err) {
    console.error('Error loading portfolio from IndexedDB:', err);
    return undefined;
  }
}

export async function getAllStoredPortfolios(): Promise<PortfolioMeta[]> {
  try {
    const allKeys = await keys();
    const portfolioKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(STORAGE_PREFIX));
    
    const portfolios: PortfolioMeta[] = [];
    for (const key of portfolioKeys) {
      const item = await get<PortfolioMeta>(key);
      if (item) {
        portfolios.push(item);
      }
    }
    // Sort descending by createdAt
    return portfolios.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Error reading all portfolios from IndexedDB:', err);
    return [];
  }
}

export async function deletePortfolioFromStorage(id: string): Promise<void> {
  try {
    await del(`${STORAGE_PREFIX}${id}`);
  } catch (err) {
    console.error('Error deleting portfolio from IndexedDB:', err);
  }
}
