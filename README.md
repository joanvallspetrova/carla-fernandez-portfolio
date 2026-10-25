# Carla Fernández Oliva — Model Portfolio & Management Portal

Invisible, gallery-grade modeling portfolio and management portal built with Next.js, Tailwind CSS, Sharp (WebP Retina optimization), and client-side 300 DPI Comp Card PDF generation.

## Domains & Routing

A single Next.js deployment handles both subdomains via [`src/middleware.ts`](./src/middleware.ts):

- **`portfolio.carlafernandezoliva.com`** (and **`carlafernandezoliva.com`**): Public-facing model portfolio (`/`).
  - **< 3 Seconds Rule**: Immediate Hero portrait (`eager` + `fetchPriority="high"`) and full European metric measurements above the fold.
  - **Mobile-First for Instagram WebView**: Single full-width column on mobile for effortless thumb scrolling; 2–3 column editorial gallery on desktop.
  - **Digitals / Polaroids**: Dedicated section for natural-light, unretouched polaroids and 360° proportion video.
  - **Comp Card (PDF)**: Instant dynamic A4 landscape casting Comp Card PDF generator (`Carla-Fernandez-Oliva-CompCard.pdf`).
- **`portal.carlafernandezoliva.com`** (or `/portal` on any host): Private Management Portal for Carla.
  - Upload new Book photos or Digitals directly from mobile or desktop (automatically converted to high-sharpness Retina `.webp` and `.jpg`).
  - Reorder photos, toggle visibility, toggle editorial Black & White (`B&W`), choose the Hero cover photo, and customize the 5 photos on the downloadable Comp Card PDF.
  - Edit measurements (`160 cm`, `84-62-90`, `36 EU`, `Blonde`, `Green / Blue`, `Barcelona`) and contact info in real time.

## Vercel Setup (`carlafernandezoliva.com`)

1. Import this GitHub repository into **Vercel**.
2. In **Vercel Project → Settings → Domains**, add:
   - `carlafernandezoliva.com`
   - `portfolio.carlafernandezoliva.com`
   - `portal.carlafernandezoliva.com`
3. In **Vercel Project → Settings → Environment Variables**, configure:
   - `PORTAL_PASSWORD`: Password for Carla to log in at `portal.carlafernandezoliva.com` (default fallback: `carla2026`).
   - `GITHUB_TOKEN`: A GitHub Personal Access Token (with `repo` / `contents:write` permission) so photos uploaded and changes saved in the Portal are committed directly to the GitHub repository.
   - `GITHUB_REPO`: `Minus2002/carla-fernandez-portfolio`
