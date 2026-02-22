"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const path = require("path");
let SharingService = class SharingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async serveOgPage(storyId, res) {
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
                res.status(common_1.HttpStatus.NOT_FOUND).send('<h1>Geschichte nicht gefunden</h1>');
                return;
            }
            const charNames = story.characters.map(c => c.name).join(', ');
            const summary = story.summary || 'Ein personalisiertes Hörspiel für kleine Ohren';
            const desc = summary;
            const storyUrl = `https://fablino.de/story/${story.id}`;
            const ogImage = story.coverUrl
                ? `https://fablino.de/covers/og/${path.basename(story.coverUrl, path.extname(story.coverUrl))}_og.jpg`
                : `https://fablino.de/logo.png`;
            const ogImageType = story.coverUrl ? 'summary_large_image' : 'summary';
            const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        }
        catch (err) {
            console.error('Sharing error:', err);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).send('<h1>Fehler</h1>');
        }
    }
    servePreviewPage(jobId, res) {
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
};
exports.SharingService = SharingService;
exports.SharingService = SharingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SharingService);
//# sourceMappingURL=sharing.service.js.map