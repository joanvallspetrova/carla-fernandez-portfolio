import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadFileToRepoOrLocal } from '@/lib/storage';
import { PhotoItem } from '@/types/portfolio';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('carla_portal_auth')?.value;
    const authHeader = req.headers.get('x-portal-password');
    const expectedPassword = process.env.PORTAL_PASSWORD || 'carla2026';

    if (authCookie !== 'authenticated' && authHeader !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = ((formData.get('category') as string) || 'book') as 'book' | 'digitals';
    const title = (formData.get('title') as string) || 'Portfolio Image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const cleanBase = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 32);

    const baseFilename = `${category}-${timestamp}-${cleanBase || 'photo'}`;

    const imageProcessor = sharp(inputBuffer).rotate();
    const metadata = await imageProcessor.metadata();

    const width = metadata.width || 1200;
    const height = metadata.height || 1600;
    const aspectRatio: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';

    // Generate high-definition WebP (Retina skin/eye fidelity)
    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92, smartSubsample: false })
      .toBuffer();

    // Generate high-definition JPG for Comp Card PDF compatibility
    const jpgBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const webpResult = await uploadFileToRepoOrLocal(`${baseFilename}.webp`, webpBuffer);
    const jpgResult = await uploadFileToRepoOrLocal(`${baseFilename}.jpg`, jpgBuffer);

    const newPhoto: PhotoItem = {
      id: `${category}-${timestamp}`,
      src: webpResult.url,
      jpgSrc: jpgResult.url,
      category,
      title,
      visible: true,
      blackAndWhite: false,
      span: aspectRatio === 'landscape' ? 'wide' : 'normal',
      aspectRatio,
      order: 99,
      width,
      height,
    };

    return NextResponse.json({
      ok: true,
      photo: newPhoto,
      savedLocal: webpResult.savedLocal,
      savedGitHub: webpResult.savedGitHub,
    });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
