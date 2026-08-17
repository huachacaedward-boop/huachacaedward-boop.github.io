import { ExtractedImage } from '../types';

/**
 * Checks if a pixel in RGBA array is a background/gutter pixel (e.g. white, off-white, or transparent)
 */
function isGutterPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 30) return true;
  // White or light neutral paper background (> 238 on all channels)
  if (r > 238 && g > 238 && b > 238) return true;
  return false;
}

/**
 * Dynamically extracts and crops ONLY the specific photograph, render, or graphic
 * directly under the user's click point (xPercent, yPercent) on the page.
 */
export function extractImageAtPoint(
  imgSource: HTMLImageElement | HTMLCanvasElement,
  xPercent: number,
  yPercent: number,
  pageNumber: number
): ExtractedImage | null {
  try {
    const srcW = imgSource instanceof HTMLImageElement ? imgSource.naturalWidth || imgSource.width : imgSource.width;
    const srcH = imgSource instanceof HTMLImageElement ? imgSource.naturalHeight || imgSource.height : imgSource.height;

    if (!srcW || !srcH) return null;

    // Create analysis canvas
    const sampleW = Math.min(600, srcW);
    const sampleH = Math.round((sampleW * srcH) / srcW);

    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(imgSource, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    const clickX = Math.max(0, Math.min(sampleW - 1, Math.round((xPercent / 100) * sampleW)));
    const clickY = Math.max(0, Math.min(sampleH - 1, Math.round((yPercent / 100) * sampleH)));

    const clickIdx = (clickY * sampleW + clickX) * 4;
    const isClickOnBlank = isGutterPixel(
      data[clickIdx],
      data[clickIdx + 1],
      data[clickIdx + 2],
      data[clickIdx + 3]
    );

    // If clicked on completely empty background margin, return null to fallback to full page
    if (isClickOnBlank) {
      // Look around 15px radius to see if near a photo edge
      let foundNearby = false;
      for (let dy = -10; dy <= 10 && !foundNearby; dy += 2) {
        for (let dx = -10; dx <= 10 && !foundNearby; dx += 2) {
          const nx = clickX + dx;
          const ny = clickY + dy;
          if (nx >= 0 && nx < sampleW && ny >= 0 && ny < sampleH) {
            const idx = (ny * sampleW + nx) * 4;
            if (!isGutterPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              foundNearby = true;
            }
          }
        }
      }
      if (!foundNearby) return null;
    }

    // Horizontal and vertical edge projection scanning from the click point
    // 1. Find Left Boundary (scan left until a column with >85% white/gutter or page edge)
    let minX = 0;
    for (let x = clickX; x >= 0; x--) {
      // Check column segment around clickY +/- 20% height
      const ySpan = Math.round(sampleH * 0.15);
      const yStart = Math.max(0, clickY - ySpan);
      const yEnd = Math.min(sampleH - 1, clickY + ySpan);
      let gutterCount = 0;
      let total = 0;
      for (let y = yStart; y <= yEnd; y++) {
        const idx = (y * sampleW + x) * 4;
        total++;
        if (isGutterPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
          gutterCount++;
        }
      }
      if (gutterCount / total > 0.88) {
        minX = x + 1;
        break;
      }
    }

    // 2. Find Right Boundary
    let maxX = sampleW - 1;
    for (let x = clickX; x < sampleW; x++) {
      const ySpan = Math.round(sampleH * 0.15);
      const yStart = Math.max(0, clickY - ySpan);
      const yEnd = Math.min(sampleH - 1, clickY + ySpan);
      let gutterCount = 0;
      let total = 0;
      for (let y = yStart; y <= yEnd; y++) {
        const idx = (y * sampleW + x) * 4;
        total++;
        if (isGutterPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
          gutterCount++;
        }
      }
      if (gutterCount / total > 0.88) {
        maxX = x - 1;
        break;
      }
    }

    // 3. Find Top Boundary
    let minY = 0;
    for (let y = clickY; y >= 0; y--) {
      let gutterCount = 0;
      let total = 0;
      for (let x = minX; x <= maxX; x += 2) {
        const idx = (y * sampleW + x) * 4;
        total++;
        if (isGutterPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
          gutterCount++;
        }
      }
      if (gutterCount / total > 0.88) {
        minY = y + 1;
        break;
      }
    }

    // 4. Find Bottom Boundary
    let maxY = sampleH - 1;
    for (let y = clickY; y < sampleH; y++) {
      let gutterCount = 0;
      let total = 0;
      for (let x = minX; x <= maxX; x += 2) {
        const idx = (y * sampleW + x) * 4;
        total++;
        if (isGutterPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
          gutterCount++;
        }
      }
      if (gutterCount / total > 0.88) {
        maxY = y - 1;
        break;
      }
    }

    // Refine bounds into percentages
    const boxW = Math.max(1, maxX - minX + 1);
    const boxH = Math.max(1, maxY - minY + 1);

    const outXPct = (minX / sampleW) * 100;
    const outYPct = (minY / sampleH) * 100;
    const outWPct = (boxW / sampleW) * 100;
    const outHPct = (boxH / sampleH) * 100;

    // Must be at least 4% width and 4% height to be a valid photo
    if (outWPct < 4 || outHPct < 4) {
      return null;
    }

    // High resolution crop from original full-size source
    const cropX = Math.round((outXPct / 100) * srcW);
    const cropY = Math.round((outYPct / 100) * srcH);
    const cropW = Math.max(10, Math.round((outWPct / 100) * srcW));
    const cropH = Math.max(10, Math.round((outHPct / 100) * srcH));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.fillStyle = '#ffffff';
    cropCtx.fillRect(0, 0, cropW, cropH);
    cropCtx.drawImage(imgSource, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.95);

    return {
      id: `crop_${pageNumber}_${Math.round(outXPct)}_${Math.round(outYPct)}`,
      pageNumber,
      dataUrl,
      xPercent: Math.round(outXPct * 10) / 10,
      yPercent: Math.round(outYPct * 10) / 10,
      widthPercent: Math.round(outWPct * 10) / 10,
      heightPercent: Math.round(outHPct * 10) / 10,
      title: `Imagen recortada (Pág. ${pageNumber})`,
      width: cropW,
      height: cropH,
    };
  } catch (err) {
    console.error('Point extraction failed:', err);
    return null;
  }
}

/**
 * Scans a rendered canvas or image data for individual photographic/artwork regions.
 * Recursively segments by horizontal & vertical gutters to isolate every individual photo.
 */
export async function detectImagesFromCanvas(
  canvas: HTMLCanvasElement,
  pageNumber: number
): Promise<ExtractedImage[]> {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const extracted: ExtractedImage[] = [];

  try {
    const sampleW = 240;
    const sampleH = Math.round((240 * height) / width);
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) return [];

    sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // Grid of content vs gutter
    const grid: boolean[][] = [];
    for (let y = 0; y < sampleH; y++) {
      grid[y] = [];
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        grid[y][x] = !isGutterPixel(r, g, b, a);
      }
    }

    // Multi-pass recursive gutter splitting to find bounding boxes of photos
    const boxes: { minX: number; maxX: number; minY: number; maxY: number }[] = [];

    function findRegions(minX: number, maxX: number, minY: number, maxY: number, depth: number = 0) {
      if (depth > 6 || maxX - minX < 12 || maxY - minY < 12) return;

      // 1. Trim empty outer borders
      let rx1 = minX, rx2 = maxX, ry1 = minY, ry2 = maxY;

      // Trim top
      while (ry1 < ry2) {
        let hasContent = false;
        for (let x = rx1; x <= rx2; x++) {
          if (grid[ry1][x]) { hasContent = true; break; }
        }
        if (hasContent) break;
        ry1++;
      }

      // Trim bottom
      while (ry2 > ry1) {
        let hasContent = false;
        for (let x = rx1; x <= rx2; x++) {
          if (grid[ry2][x]) { hasContent = true; break; }
        }
        if (hasContent) break;
        ry2--;
      }

      // Trim left
      while (rx1 < rx2) {
        let hasContent = false;
        for (let y = ry1; y <= ry2; y++) {
          if (grid[y][rx1]) { hasContent = true; break; }
        }
        if (hasContent) break;
        rx1++;
      }

      // Trim right
      while (rx2 > rx1) {
        let hasContent = false;
        for (let y = ry1; y <= ry2; y++) {
          if (grid[y][rx2]) { hasContent = true; break; }
        }
        if (hasContent) break;
        rx2--;
      }

      const w = rx2 - rx1 + 1;
      const h = ry2 - ry1 + 1;
      if (w < 12 || h < 12) return;

      // Check if there is a strong vertical gutter dividing this block into sub-columns
      let bestVGapStart = -1, bestVGapLen = 0;
      let curVGapStart = -1;
      for (let x = rx1 + 4; x <= rx2 - 4; x++) {
        let isGutterCol = true;
        for (let y = ry1; y <= ry2; y++) {
          if (grid[y][x]) {
            isGutterCol = false;
            break;
          }
        }
        if (isGutterCol) {
          if (curVGapStart === -1) curVGapStart = x;
        } else {
          if (curVGapStart !== -1) {
            const len = x - curVGapStart;
            if (len > bestVGapLen) {
              bestVGapLen = len;
              bestVGapStart = curVGapStart;
            }
            curVGapStart = -1;
          }
        }
      }

      if (bestVGapLen >= 2 && bestVGapStart > rx1 + 6 && bestVGapStart + bestVGapLen < rx2 - 6) {
        // Split vertically into left and right subregions
        findRegions(rx1, bestVGapStart - 1, ry1, ry2, depth + 1);
        findRegions(bestVGapStart + bestVGapLen, rx2, ry1, ry2, depth + 1);
        return;
      }

      // Check if there is a strong horizontal gutter dividing this block into rows
      let bestHGapStart = -1, bestHGapLen = 0;
      let curHGapStart = -1;
      for (let y = ry1 + 4; y <= ry2 - 4; y++) {
        let isGutterRow = true;
        for (let x = rx1; x <= rx2; x++) {
          if (grid[y][x]) {
            isGutterRow = false;
            break;
          }
        }
        if (isGutterRow) {
          if (curHGapStart === -1) curHGapStart = y;
        } else {
          if (curHGapStart !== -1) {
            const len = y - curHGapStart;
            if (len > bestHGapLen) {
              bestHGapLen = len;
              bestHGapStart = curHGapStart;
            }
            curHGapStart = -1;
          }
        }
      }

      if (bestHGapLen >= 2 && bestHGapStart > ry1 + 6 && bestHGapStart + bestHGapLen < ry2 - 6) {
        // Split horizontally into top and bottom subregions
        findRegions(rx1, rx2, ry1, bestHGapStart - 1, depth + 1);
        findRegions(rx1, rx2, bestHGapStart + bestHGapLen, ry2, depth + 1);
        return;
      }

      // If no strong internal gutters exist, this is an isolated atomic photo/drawing block!
      const wPct = (w / sampleW) * 100;
      const hPct = (h / sampleH) * 100;
      if (wPct >= 5 && hPct >= 5) {
        boxes.push({ minX: rx1, maxX: rx2, minY: ry1, maxY: ry2 });
      }
    }

    findRegions(0, sampleW - 1, 0, sampleH - 1, 0);

    // Crop each detected region into its own high-res image
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const xPercent = (box.minX / sampleW) * 100;
      const yPercent = (box.minY / sampleH) * 100;
      const widthPercent = ((box.maxX - box.minX + 1) / sampleW) * 100;
      const heightPercent = ((box.maxY - box.minY + 1) / sampleH) * 100;

      const srcX = Math.round((xPercent / 100) * width);
      const srcY = Math.round((yPercent / 100) * height);
      const srcW = Math.max(50, Math.round((widthPercent / 100) * width));
      const srcH = Math.max(50, Math.round((heightPercent / 100) * height));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = srcW;
      cropCanvas.height = srcH;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.fillStyle = '#ffffff';
        cropCtx.fillRect(0, 0, srcW, srcH);
        cropCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.94);

        extracted.push({
          id: `img_p${pageNumber}_${i + 1}_${Math.random().toString(36).substring(2, 6)}`,
          pageNumber,
          dataUrl,
          xPercent: Math.round(xPercent * 10) / 10,
          yPercent: Math.round(yPercent * 10) / 10,
          widthPercent: Math.round(widthPercent * 10) / 10,
          heightPercent: Math.round(heightPercent * 10) / 10,
          title: `Imagen ${i + 1} (Pág. ${pageNumber})`,
          width: srcW,
          height: srcH,
        });
      }
    }
  } catch (err) {
    console.warn('Image detection fallback:', err);
  }

  return extracted;
}

/**
 * Generates smart multi-photo hotspots for sample portfolios if not already populated
 */
export function generateSamplePageImages(
  pageDataUrl: string,
  pageNumber: number,
  category: string = 'arquitectura'
): ExtractedImage[] {
  const layouts = [
    [
      { xPercent: 2, yPercent: 12, widthPercent: 52, heightPercent: 84, title: 'Perspectiva Principal (Render Hero)' },
      { xPercent: 56, yPercent: 12, widthPercent: 20, heightPercent: 84, title: 'Planos y Cortes' },
      { xPercent: 78, yPercent: 12, widthPercent: 20, heightPercent: 26, title: 'Detalle Exterior' },
      { xPercent: 78, yPercent: 41, widthPercent: 20, heightPercent: 26, title: 'Vista Aérea' },
      { xPercent: 78, yPercent: 70, widthPercent: 20, heightPercent: 26, title: 'Vista Nocturna' },
    ],
    [
      { xPercent: 4, yPercent: 10, widthPercent: 44, heightPercent: 80, title: 'Render Izquierdo' },
      { xPercent: 52, yPercent: 10, widthPercent: 44, heightPercent: 38, title: 'Interior / Living' },
      { xPercent: 52, yPercent: 52, widthPercent: 44, heightPercent: 38, title: 'Terraza y Piscina' },
    ],
    [
      { xPercent: 4, yPercent: 12, widthPercent: 44, heightPercent: 38, title: 'Vista 1' },
      { xPercent: 52, yPercent: 12, widthPercent: 44, heightPercent: 38, title: 'Vista 2' },
      { xPercent: 4, yPercent: 54, widthPercent: 44, heightPercent: 38, title: 'Vista 3' },
      { xPercent: 52, yPercent: 54, widthPercent: 44, heightPercent: 38, title: 'Vista 4' },
    ],
  ];

  const chosenLayout = layouts[(pageNumber + (category.length || 0)) % layouts.length];

  return chosenLayout.map((item, idx) => ({
    id: `sample_img_p${pageNumber}_${idx + 1}`,
    pageNumber,
    dataUrl: pageDataUrl,
    xPercent: item.xPercent,
    yPercent: item.yPercent,
    widthPercent: item.widthPercent,
    heightPercent: item.heightPercent,
    title: item.title,
  }));
}
