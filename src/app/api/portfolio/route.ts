import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData, savePortfolioData } from '@/lib/storage';
import { PortfolioData } from '@/types/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getPortfolioData();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function PUT(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('carla_portal_auth')?.value;
    const authHeader = req.headers.get('x-portal-password');
    const expectedPassword = process.env.PORTAL_PASSWORD || 'carla2026';

    if (authCookie !== 'authenticated' && authHeader !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as PortfolioData;
    if (!body || !body.profile || !Array.isArray(body.photos)) {
      return NextResponse.json({ error: 'Invalid portfolio payload' }, { status: 400 });
    }

    const result = await savePortfolioData(body);
    return NextResponse.json({
      ok: true,
      ...result,
      data: body,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    );
  }
}
