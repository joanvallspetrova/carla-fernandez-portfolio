import { jsPDF } from 'jspdf';
import { PortfolioData, PhotoItem } from '@/types/portfolio';

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Renders a cropped ("object-fit: cover") high-res image onto a canvas and returns a JPEG data URL.
 */
async function renderCroppedImageDataUrl(
  photo: PhotoItem,
  targetWidthPx: number,
  targetHeightPx: number
): Promise<string> {
  const srcToLoad = photo.jpgSrc || photo.src;
  const img = await loadImageElement(srcToLoad);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidthPx;
  canvas.height = targetHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);

  if (photo.blackAndWhite) {
    ctx.filter = 'grayscale(100%) contrast(105%)';
  }

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetWidthPx / targetHeightPx;

  let sx = 0;
  let sy = 0;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sWidth = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    sHeight = img.naturalWidth / targetRatio;
    // Bias slightly toward top (top 20%) so heads/faces are never cropped off
    sy = (img.naturalHeight - sHeight) * 0.2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidthPx, targetHeightPx);
  return canvas.toDataURL('image/jpeg', 0.94);
}

export async function generateCompCardPdf(
  data: PortfolioData,
  lang: 'en' | 'es' = 'en'
): Promise<void> {
  // Create A4 Landscape Comp Card (297mm x 210mm) - Standard Agency Casting Sheet
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = 297;
  const pageH = 210;
  const margin = 12;
  const footerH = 30;
  const contentH = pageH - margin * 2 - footerH;

  // Background pure gallery white
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Resolve Front Photo and 4 Back/Grid Photos
  const allPhotos = data.photos;
  const frontPhoto =
    allPhotos.find((p) => p.id === data.compCard.frontPhotoId) ||
    allPhotos.find((p) => p.id === data.heroPhotoId) ||
    allPhotos[0];

  const secondaryPhotos: PhotoItem[] = [];
  for (const id of data.compCard.backPhotoIds) {
    const found = allPhotos.find((p) => p.id === id);
    if (found) secondaryPhotos.push(found);
  }
  // Fill up to 4 secondary photos if needed
  for (const p of allPhotos) {
    if (secondaryPhotos.length >= 4) break;
    if (p.id !== frontPhoto?.id && !secondaryPhotos.some((s) => s.id === p.id)) {
      secondaryPhotos.push(p);
    }
  }

  // Left main image dimensions (42% of width)
  const gap = 5;
  const usableW = pageW - margin * 2;
  const leftW = Math.round(usableW * 0.42);
  const rightW = usableW - leftW - gap;

  // Draw Left Main Photo
  if (frontPhoto) {
    try {
      const mainDataUrl = await renderCroppedImageDataUrl(
        frontPhoto,
        Math.round(leftW * 8),
        Math.round(contentH * 8)
      );
      doc.addImage(mainDataUrl, 'JPEG', margin, margin, leftW, contentH);
    } catch (e) {
      console.warn('Could not load front photo for PDF:', e);
    }
  }

  // Draw Right 2x2 Grid of 4 Photos
  const cellW = (rightW - gap) / 2;
  const cellH = (contentH - gap) / 2;
  const rightStartX = margin + leftW + gap;

  for (let i = 0; i < Math.min(4, secondaryPhotos.length); i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = rightStartX + col * (cellW + gap);
    const y = margin + row * (cellH + gap);

    try {
      const cellDataUrl = await renderCroppedImageDataUrl(
        secondaryPhotos[i],
        Math.round(cellW * 7),
        Math.round(cellH * 7)
      );
      doc.addImage(cellDataUrl, 'JPEG', x, y, cellW, cellH);
    } catch (e) {
      console.warn('Could not load grid photo for PDF:', e);
    }
  }

  // Footer Divider Line
  const footerY = margin + contentH + 7;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.25);
  doc.line(margin, footerY, pageW - margin, footerY);

  // Model Name in Editorial Serif (Times/Serif built-in for clean vector rendering)
  doc.setFont('times', 'normal');
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(21);
  doc.text(data.profile.name.toUpperCase(), margin, footerY + 10);

  // Stats Row in Minimalist Sans-Serif (Helvetica)
  const s = data.profile.stats;
  const labels =
    lang === 'es'
      ? [
          ['ALTURA', s.height],
          ['PECHO', s.bust],
          ['CINTURA', s.waist],
          ['CADERA', s.hips],
          ['CALZADO', s.shoe],
          ['TALLA', s.dress],
          ['CABELLO', s.hair.es],
          ['OJOS', s.eyes.es],
          ['BASE', s.base],
        ]
      : [
          ['HEIGHT', s.height],
          ['BUST', s.bust],
          ['WAIST', s.waist],
          ['HIPS', s.hips],
          ['SHOE', s.shoe],
          ['DRESS', s.dress],
          ['HAIR', s.hair.en],
          ['EYES', s.eyes.en],
          ['BASE', s.base],
        ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const statsText = labels.map(([k, v]) => `${k}: ${v.toUpperCase()}`).join('   |   ');
  doc.setTextColor(60, 60, 60);
  doc.text(statsText, margin, footerY + 17.5);

  // Right-aligned Contact Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  const contactRightX = pageW - margin;
  doc.text(data.profile.contact.email, contactRightX, footerY + 9.5, { align: 'right' });
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${data.profile.contact.instagram}  ·  portfolio.carlafernandezoliva.com`,
    contactRightX,
    footerY + 15.5,
    { align: 'right' }
  );

  doc.save('Carla-Fernandez-Oliva-CompCard.pdf');
}
