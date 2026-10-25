import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const authCookie = req.cookies.get('carla_portal_auth')?.value;
  const authHeader = req.headers.get('x-portal-password');
  const expectedPassword = process.env.PORTAL_PASSWORD || 'carla2026';
  return authCookie === 'authenticated' || authHeader === expectedPassword;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!isAuthorized(request)) {
          throw new Error('No autorizado para subir vídeos');
        }

        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/webm',
            'video/x-m4v',
            'video/3gpp',
            'video/mpeg',
            'application/octet-stream',
          ],
          maximumSizeInBytes: 250 * 1024 * 1024, // Up to 250 MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Video upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
