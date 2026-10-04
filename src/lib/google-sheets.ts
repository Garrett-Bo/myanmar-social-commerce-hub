import { Product } from '@/types';

/**
 * Google Sheets 2-Way Sync Engine
 * Allows Myanmar sellers to manage products and stock counts directly via Google Sheets.
 */

export interface SheetRow {
  sku: string;
  nameMm: string;
  nameEn: string;
  category: string;
  priceMmk: number;
  stockQuantity: number;
  imageUrl: string;
}

export function parseGoogleSheetCsv(csvContent: string): Partial<Product>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const products: Partial<Product>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length >= 4) {
      const sku = cols[0] || `SKU-${i}`;
      const nameMm = cols[1] || '';
      const nameEn = cols[2] || cols[1] || '';
      const category = cols[3] || 'General';
      const priceMmk = parseInt(cols[4], 10) || 0;
      const stockQuantity = parseInt(cols[5], 10) || 0;
      const imageUrl = cols[6] || '';

      products.push({
        sku,
        nameMm,
        nameEn,
        category,
        priceMmk,
        stockQuantity,
        imageUrl,
        isAvailable: stockQuantity > 0,
      });
    }
  }

  return products;
}

export function exportProductsToCsv(products: Product[]): string {
  const headers = ['SKU', 'Name (Burmese)', 'Name (English)', 'Category', 'Price (MMK)', 'Stock Quantity', 'Image URL'];
  const rows = products.map((p) => [
    `"${p.sku}"`,
    `"${p.nameMm}"`,
    `"${p.nameEn}"`,
    `"${p.category}"`,
    p.priceMmk,
    p.stockQuantity,
    `"${p.imageUrl}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
