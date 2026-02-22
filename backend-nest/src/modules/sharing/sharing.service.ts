import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as path from 'path';

@Injectable()
export class SharingService {
  constructor(private prisma: PrismaService) {}

  async serveOgPage(storyId: string, res: Response) {
    try {
      const story = await this.prisma.story.findUnique({
        where: { id: storyId },
        include: {
          characters: {
            select: { name: true },
          },
        },
      });

      if (!story) {
        res.status(HttpStatus.NOT_FOUND).send('<h1>Geschichte nicht gefunden</h1>');
        return;
      }

      const charNames = story.characters.map(c => c.name).join(', ');
      const summary = story.summary || 'Ein personalisiertes Hörspiel für kleine Ohren';
      const desc = summary;
      const storyUrl = `https://fablino.de/story/${story.id}`;

      // Use OG thumbnail (600x600 JPEG, <150KB) for fast WhatsApp/social previews
      const ogImage = story.coverUrl
        ? `https://fablino.de/covers/og/${path.basename(story.coverUrl, path.extname(story.coverUrl))}_og.jpg`
        : `https://fablino.de/logo.png`;
      const ogImageType = story.coverUrl ? 'summary_large_image' : 'summary';

      // Escape HTML entities in dynamic content
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(story.title)} — Fablino</title>
<meta property="og:title" content="${esc(story.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="600">
<meta property="og:type" content="website">
<meta property="og:url" content="${storyUrl}">
<meta property="og:site_name" content="Fablino · Hörspiele für kleine Helden">
<meta name="twitter:card" content="${ogImageType}">
<meta name="twitter:title" content="${esc(story.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<meta http-equiv="refresh" content="0;url=${storyUrl}">
<script>window.location.replace("${storyUrl}");</script>
</head>
<body><p>Weiterleitung zu <a href="${storyUrl}">Fablino</a>...</p></body>
</html>`);
    } catch (err) {
      console.error('Sharing error:', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('<h1>Fehler</h1>');
    }
  }

  servePreviewPage(jobId: string, res: Response) {
    // Simple preview page redirect for job previews
    const previewUrl = `https://fablino.de/preview/${jobId}`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Fablino Vorschau</title>
<meta property="og:title" content="Fablino Hörspiel Vorschau">
<meta property="og:description" content="Ein personalisiertes Hörspiel wird gerade erstellt...">
<meta property="og:image" content="https://fablino.de/logo.png">
<meta property="og:type" content="website">
<meta property="og:url" content="${previewUrl}">
<meta property="og:site_name" content="Fablino · Hörspiele für kleine Helden">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url=${previewUrl}">
<script>window.location.replace("${previewUrl}");</script>
</head>
<body><p>Weiterleitung zu <a href="${previewUrl}">Fablino</a>...</p></body>
</html>`);
  }
}