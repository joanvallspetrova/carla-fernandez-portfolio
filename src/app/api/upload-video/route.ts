import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToRepoOrLocal } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const DEFAULT_REPO = process.env.GITHUB_REPO || 'joanvallspetrova/carla-fernandez-portfolio';
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || 'main';

function isAuthorized(req: NextRequest): boolean {
  const authCookie = req.cookies.get('carla_portal_auth')?.value;
  const authHeader = req.headers.get('x-portal-password');
  const expectedPassword = process.env.PORTAL_PASSWORD || 'carla2026';
  return authCookie === 'authenticated' || authHeader === expectedPassword;
}

/**
 * Returns GitHub upload config to authenticated Portal sessions so large videos (>4.5MB)
 * can be uploaded directly from the browser to GitHub API without hitting Vercel's body size limit.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    token: process.env.GITHUB_TOKEN || null,
    repo: DEFAULT_REPO,
    branch: DEFAULT_BRANCH,
    isVercel: Boolean(process.env.VERCEL),
  });
}

/**
 * Fallback / local upload handler for videos.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const safeExt = ['mp4', 'mov', 'webm', 'm4v'].includes(ext) ? ext : 'mp4';
    const filename = `digital-video-${Date.now()}.${safeExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadFileToRepoOrLocal(filename, buffer);

    return NextResponse.json({
      ok: true,
      url: result.url,
      savedLocal: result.savedLocal,
      savedGitHub: result.savedGitHub,
    });
  } catch (err: unknown) {
    console.error('Video upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Video upload failed' },
      { status: 500 }
    );
  }
}
