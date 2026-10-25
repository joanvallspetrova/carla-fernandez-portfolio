import fs from 'fs';
import path from 'path';
import { PortfolioData } from '@/types/portfolio';
import defaultData from '@/data/portfolio.json';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'portfolio.json');
const DEFAULT_REPO = process.env.GITHUB_REPO || 'Minus2002/carla-fernandez-portfolio';
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || 'main';

export async function getPortfolioData(): Promise<PortfolioData> {
  const token = process.env.GITHUB_TOKEN;
  const repo = DEFAULT_REPO;

  // 1. Try reading latest from GitHub Contents API if token or public repo is available in production
  if (process.env.VERCEL || token) {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3.raw',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/src/data/portfolio.json?ref=${DEFAULT_BRANCH}`,
        {
          headers,
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const remoteData = (await res.json()) as PortfolioData;
        if (remoteData && remoteData.profile && Array.isArray(remoteData.photos)) {
          return remoteData;
        }
      }
    } catch (err) {
      // Fallback to local file below
      console.warn('GitHub fetch fallback to bundled JSON:', err);
    }
  }

  // 2. Read from local filesystem if available
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(raw) as PortfolioData;
    }
  } catch (err) {
    console.warn('Local file read fallback to bundled JSON:', err);
  }

  return defaultData as PortfolioData;
}

export async function savePortfolioData(
  data: PortfolioData
): Promise<{ savedLocal: boolean; savedGitHub: boolean; message?: string }> {
  data.updatedAt = new Date().toISOString();
  const contentStr = JSON.stringify(data, null, 2);
  let savedLocal = false;
  let savedGitHub = false;
  let message = '';

  // 1. Save locally if not on read-only serverless filesystem
  try {
    if (!process.env.VERCEL) {
      fs.writeFileSync(DATA_FILE_PATH, contentStr, 'utf-8');
      savedLocal = true;
    }
  } catch (err) {
    console.warn('Could not write local file (expected on serverless):', err);
  }

  // 2. Commit to GitHub if GITHUB_TOKEN is configured
  const token = process.env.GITHUB_TOKEN;
  const repo = DEFAULT_REPO;

  if (token) {
    try {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/src/data/portfolio.json`;
      const getRes = await fetch(`${apiUrl}?ref=${DEFAULT_BRANCH}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      });

      let sha: string | undefined;
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update portfolio configuration via Portal (${new Date().toISOString()})`,
          content: Buffer.from(contentStr, 'utf-8').toString('base64'),
          branch: DEFAULT_BRANCH,
          ...(sha ? { sha } : {}),
        }),
      });

      if (putRes.ok) {
        savedGitHub = true;
      } else {
        const errText = await putRes.text();
        message = `GitHub API error (${putRes.status}): ${errText}`;
      }
    } catch (err: unknown) {
      message = err instanceof Error ? err.message : 'GitHub commit failed';
    }
  } else if (process.env.VERCEL) {
    message =
      'GITHUB_TOKEN environment variable is not set in Vercel. Set GITHUB_TOKEN in Vercel Project Settings to persist Portal changes to GitHub.';
  }

  return { savedLocal, savedGitHub, message };
}

export async function uploadFileToRepoOrLocal(
  filename: string,
  buffer: Buffer
): Promise<{ url: string; savedLocal: boolean; savedGitHub: boolean }> {
  let savedLocal = false;
  let savedGitHub = false;
  const relativePublicPath = `/photos/${filename}`;
  const localFilePath = path.join(process.cwd(), 'public', 'photos', filename);

  // 1. Write locally if writable
  try {
    if (!process.env.VERCEL) {
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localFilePath, buffer);
      savedLocal = true;
    }
  } catch (err) {
    console.warn('Local upload skipped:', err);
  }

  // 2. Upload to GitHub if GITHUB_TOKEN is available
  const token = process.env.GITHUB_TOKEN;
  const repo = DEFAULT_REPO;

  if (token) {
    const repoPath = `public/photos/${filename}`;
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    let sha: string | undefined;

    try {
      const checkRes = await fetch(`${apiUrl}?ref=${DEFAULT_BRANCH}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Upload photo ${filename} via Portal`,
          content: buffer.toString('base64'),
          branch: DEFAULT_BRANCH,
          ...(sha ? { sha } : {}),
        }),
      });

      if (putRes.ok) {
        savedGitHub = true;
        // Return raw.githubusercontent URL when on Vercel so the image works immediately before rebuild finishes
        if (process.env.VERCEL) {
          return {
            url: `https://raw.githubusercontent.com/${repo}/${DEFAULT_BRANCH}/${repoPath}`,
            savedLocal,
            savedGitHub,
          };
        }
      }
    } catch (err) {
      console.error('GitHub photo upload failed:', err);
    }
  }

  return {
    url: relativePublicPath,
    savedLocal,
    savedGitHub,
  };
}
