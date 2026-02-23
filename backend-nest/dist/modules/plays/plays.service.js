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
exports.PlaysService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let PlaysService = class PlaysService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async recordPlay(storyId, userAgent, ip) {
        const play = await this.prisma.play.create({
            data: {
                storyId,
                userAgent: userAgent || null,
                ip: ip || null,
            },
        });
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
            select: { title: true, id: true },
        });
        const totalPlays = await this.prisma.play.count({
            where: { storyId },
        });
        await this.notifyPlay(story?.title || 'Unbekannt', storyId, totalPlays);
        return { ok: true, totalPlays };
    }
    async getPlays(storyId) {
        const plays = await this.prisma.play.findMany({
            where: { storyId },
            orderBy: { playedAt: 'desc' },
        });
        const count = plays.length;
        return { storyId, count, plays };
    }
    async getAllPlayStats() {
        const stats = await this.prisma.play.groupBy({
            by: ['storyId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
        });
        return stats.map(s => ({ storyId: s.storyId, plays: s._count.id }));
    }
    async notifyPlay(title, storyId, totalPlays) {
        try {
            const botToken = '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
            const chatId = '5559274578';
            const text = `▶️ *Story abgespielt!*\n📖 ${title}\n🔢 Insgesamt: ${totalPlays}x\n🔗 https://fablino.de/story/${storyId}`;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: 'Markdown',
                }),
            });
        }
        catch (err) {
            console.error('Play notification error:', err);
        }
    }
};
exports.PlaysService = PlaysService;
exports.PlaysService = PlaysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PlaysService);
//# sourceMappingURL=plays.service.js.map