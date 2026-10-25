import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PASSWORD = process.env.PORTAL_PASSWORD || 'carla2026';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password === DEFAULT_PASSWORD) {
      const res = NextResponse.json({ authenticated: true });
      res.cookies.set('carla_portal_auth', 'authenticated', {
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      });
      return res;
    }
    return NextResponse.json(
      { authenticated: false, error: 'Contraseña incorrecta / Invalid password' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.delete('carla_portal_auth');
  return res;
}
