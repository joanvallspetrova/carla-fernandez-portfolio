import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const sourceDir = path.join(process.cwd(), 'Photos');
const outDir = path.join(process.cwd(), 'public', 'photos');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mapping = [
  {
    src: 'WhatsApp Image 2026-10-25 at 11.08.02 (1).jpeg',
    destBase: 'book-01-beauty-closeup',
    category: 'book',
    title: 'Beauty Close-up',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 11.07.07 (1).jpeg',
    destBase: 'book-02-lace-doorway',
    category: 'book',
    title: 'Editorial Lace',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 11.07.07.jpeg',
    destBase: 'book-03-cafe-editorial',
    category: 'book',
    title: 'Urban Tailoring',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 11.08.02 (2).jpeg',
    destBase: 'book-04-studio-portrait',
    category: 'book',
    title: 'Studio Portrait I',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 11.07.07 (3).jpeg',
    destBase: 'book-05-mondrian-shadow',
    category: 'book',
    title: 'Light & Form Editorial',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 11.07.07 (2).jpeg',
    destBase: 'book-06-terracotta-swim',
    category: 'book',
    title: 'Swim / Commercial',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 11.08.02.jpeg',
    destBase: 'book-07-studio-three-quarter',
    category: 'book',
    title: 'Studio Portrait II',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 14.18.31.jpeg',
    destBase: 'digital-01-front-closeup',
    category: 'digitals',
    title: 'Headshot Neutral',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 14.19.14.jpeg',
    destBase: 'digital-02-front-smile',
    category: 'digitals',
    title: 'Half Length Expression',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 14.19.30.jpeg',
    destBase: 'digital-03-profile-half',
    category: 'digitals',
    title: 'Profile Structure',
  },
  {
    src: 'WhatsApp Image 2026-10-25 at 14.23.23.jpeg',
    destBase: 'digital-04-full-profile',
    category: 'digitals',
    title: 'Full Length Profile',
  },
];

async function run() {
  for (const item of mapping) {
    const srcPath = path.join(sourceDir, item.src);
    if (!fs.existsSync(srcPath)) {
      console.warn('Missing:', srcPath);
      continue;
    }
    const webpPath = path.join(outDir, `${item.destBase}.webp`);
    const jpgPath = path.join(outDir, `${item.destBase}.jpg`);

    const meta = await sharp(srcPath).metadata();
    // High quality WebP preserving skin and eye texture (quality 92, smartSubsample: false)
    await sharp(srcPath)
      .rotate()
      .webp({ quality: 92, smartSubsample: false, effort: 6 })
      .toFile(webpPath);

    // High quality JPG for Comp Card PDF generation
    await sharp(srcPath)
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(jpgPath);

    console.log(`Processed ${item.destBase} (${meta.width}x${meta.height})`);
  }

  // Copy video
  const videoSrc = path.join(sourceDir, 'WhatsApp Video 2026-10-25 at 14.56.55.mp4');
  const videoDest = path.join(outDir, 'digital-video-01.mp4');
  if (fs.existsSync(videoSrc)) {
    fs.copyFileSync(videoSrc, videoDest);
    console.log('Copied digital-video-01.mp4');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
