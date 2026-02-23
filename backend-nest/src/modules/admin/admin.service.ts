import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async renderStoriesPage(res: Response) {
    try {
      const stories = await this.prisma.story.findMany({
        include: {
          characters: true,
          _count: {
            select: { characters: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fablino Admin - Stories</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .nav {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: background 0.2s;
    }
    .nav a:hover, .nav a.active {
      background: #0056b3;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .story-item {
      border-bottom: 1px solid #eee;
      padding: 20px 0;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: start;
    }
    .story-item:last-child {
      border-bottom: none;
    }
    .story-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge.featured { background: #d4edda; color: #155724; }
    .badge.age { background: #e2e3e5; color: #495057; }
    .badge.audio { background: #d1ecf1; color: #0c5460; }
    .badge.no-audio { background: #f8d7da; color: #721c24; }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      font-size: 0.9em;
      transition: background 0.2s;
    }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #1e7e34; }
    .btn-warning { background: #ffc107; color: #212529; }
    .btn-warning:hover { background: #e0a800; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .system-prompt {
      margin-top: 15px;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
    .system-prompt details {
      cursor: pointer;
    }
    .system-prompt summary {
      font-weight: 500;
      color: #666;
      padding: 5px 0;
    }
    .system-prompt pre {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      padding: 15px;
      border-radius: 4px;
      font-size: 0.85em;
      line-height: 1.4;
      max-height: 300px;
      overflow: auto;
      white-space: pre-wrap;
    }
    @media (max-width: 768px) {
      body { padding: 10px; }
      .story-item {
        grid-template-columns: 1fr;
        gap: 15px;
      }
      .nav {
        flex-direction: column;
        gap: 10px;
      }
      .actions {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎧 Fablino Admin</h1>
    <div class="nav">
      <a href="/admin/stories" class="active">Stories</a>
      <a href="/admin/waitlist">Waitlist</a>
    </div>
  </div>

  <div class="card">
    <h2>Stories (${stories.length})</h2>
    ${stories.length === 0 ? '<p>No stories found.</p>' : stories.map(story => `
      <div class="story-item">
        <div>
          <h3>${this.escapeHtml(story.title)}</h3>
          <p style="color: #666; margin: 5px 0;">${this.escapeHtml(story.summary || 'No summary')}</p>
          <div class="story-meta">
            ${story.featured ? '<span class="badge featured">Featured</span>' : ''}
            <span class="badge age">${story.age || 'Unknown Age'}</span>
            ${story.audioPath ? '<span class="badge audio">Has Audio</span>' : '<span class="badge no-audio">No Audio</span>'}
            <span class="badge">${story._count.characters} characters</span>
          </div>
          <small style="color: #888;">Created: ${new Date(story.createdAt).toLocaleDateString()}</small>
          
          ${story.systemPrompt ? `
          <div class="system-prompt">
            <details>
              <summary>System Prompt Used</summary>
              <pre>${this.escapeHtml(story.systemPrompt)}</pre>
            </details>
          </div>
          ` : ''}
        </div>
        <div class="actions">
          <a href="/story/${story.id}" class="btn btn-primary" target="_blank">View Story</a>
          <button class="btn ${story.featured ? 'btn-warning' : 'btn-success'}" onclick="toggleFeatured('${story.id}', ${story.featured})">
            ${story.featured ? 'Unfeature' : 'Feature'}
          </button>
          <button class="btn btn-danger" onclick="deleteStory('${story.id}', '${this.escapeHtml(story.title)}')">
            Delete
          </button>
        </div>
      </div>
    `).join('')}
  </div>

  <script>
    function toggleFeatured(id, isFeatured) {
      if (confirm(\`\${isFeatured ? 'Unfeature' : 'Feature'} this story?\`)) {
        fetch(\`/admin/stories/\${id}/toggle-featured\`, { method: 'POST' })
          .then(response => response.ok ? location.reload() : alert('Error updating story'))
          .catch(() => alert('Error updating story'));
      }
    }
    
    function deleteStory(id, title) {
      if (confirm(\`Are you sure you want to delete "\${title}"? This action cannot be undone.\`)) {
        fetch(\`/admin/stories/\${id}\`, { method: 'DELETE' })
          .then(response => response.ok ? location.reload() : alert('Error deleting story'))
          .catch(() => alert('Error deleting story'));
      }
    }
  </script>
</body>
</html>`;
      
      res.send(html);
    } catch (error) {
      console.error('Admin stories error:', error);
      res.status(500).send('Error loading stories');
    }
  }

  async renderWaitlistPage(res: Response) {
    try {
      const waitlist: any[] = [];

      // Also get story titles for waitlist entries that have stories
      const waitlistWithStories = await Promise.all(
        waitlist.map(async (entry) => {
          if (entry.storyId) {
            const story = await this.prisma.story.findUnique({
              where: { id: entry.storyId },
              select: { title: true },
            });
            return { ...entry, storyTitle: story?.title || '' };
          }
          return { ...entry, storyTitle: '' };
        })
      );

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fablino Admin - Waitlist</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .nav {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: background 0.2s;
    }
    .nav a:hover, .nav a.active {
      background: #0056b3;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .waitlist-item {
      border-bottom: 1px solid #eee;
      padding: 20px 0;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: start;
    }
    .waitlist-item:last-child {
      border-bottom: none;
    }
    .request-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
      background: #e2e3e5;
      color: #495057;
    }
    .badge.completed {
      background: #d4edda;
      color: #155724;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      font-size: 0.9em;
      transition: background 0.2s;
    }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .prompt-text {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
      font-style: italic;
      max-height: 150px;
      overflow: auto;
    }
    @media (max-width: 768px) {
      body { padding: 10px; }
      .waitlist-item {
        grid-template-columns: 1fr;
        gap: 15px;
      }
      .nav {
        flex-direction: column;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎧 Fablino Admin</h1>
    <div class="nav">
      <a href="/admin/stories">Stories</a>
      <a href="/admin/waitlist" class="active">Waitlist</a>
    </div>
  </div>

  <div class="card">
    <h2>Waitlist Requests (${waitlist.length})</h2>
    ${waitlist.length === 0 ? '<p>No waitlist entries found.</p>' : waitlistWithStories.map(entry => `
      <div class="waitlist-item">
        <div>
          <h4>${this.escapeHtml(entry.email)}</h4>
          ${entry.heroName ? `<p><strong>Hero:</strong> ${this.escapeHtml(entry.heroName)}</p>` : ''}
          ${entry.prompt ? `<div class="prompt-text">${this.escapeHtml(entry.prompt)}</div>` : ''}
          <div class="request-meta">
            ${entry.storyId ? `<span class="badge completed">Story: ${this.escapeHtml(entry.storyTitle || entry.storyId)}</span>` : '<span class="badge">Pending</span>'}
          </div>
          <small style="color: #888;">Requested: ${new Date(entry.createdAt).toLocaleDateString()}</small>
        </div>
        <div>
          <button class="btn btn-danger" onclick="deleteWaitlist('${entry.id}', '${this.escapeHtml(entry.email)}')">
            Delete
          </button>
        </div>
      </div>
    `).join('')}
  </div>

  <script>
    function deleteWaitlist(id, email) {
      if (confirm(\`Delete waitlist entry for "\${email}"?\`)) {
        fetch(\`/admin/waitlist/\${id}\`, { method: 'DELETE' })
          .then(response => response.ok ? location.reload() : alert('Error deleting entry'))
          .catch(() => alert('Error deleting entry'));
      }
    }
  </script>
</body>
</html>`;
      
      res.send(html);
    } catch (error) {
      console.error('Admin waitlist error:', error);
      res.status(500).send('Error loading waitlist');
    }
  }

  async toggleFeatured(id: string) {
    try {
      const story = await this.prisma.story.findUnique({ where: { id } });
      if (!story) {
        throw new HttpException('Story not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.story.update({
        where: { id },
        data: { featured: !story.featured },
      });

      return { success: true };
    } catch (error) {
      console.error('Toggle featured error:', error);
      throw new HttpException('Failed to update story', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteStory(id: string) {
    try {
      await this.prisma.story.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('Delete story error:', error);
      throw new HttpException('Failed to delete story', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteWaitlist(id: string) {
    try {
      // waitlist table removed
      return { success: true };
    } catch (error) {
      console.error('Delete waitlist error:', error);
      throw new HttpException('Failed to delete waitlist entry', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}