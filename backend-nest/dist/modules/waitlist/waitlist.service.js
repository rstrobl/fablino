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
exports.WaitlistService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let WaitlistService = class WaitlistService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async createWaitlistEntry(dto) {
        const { email, heroName, heroAge, prompt, sideCharacters } = dto;
        if (!email || !email.includes('@')) {
            throw new common_1.HttpException('Bitte gib eine gültige Email-Adresse ein.', common_1.HttpStatus.BAD_REQUEST);
        }
        const storyId = dto['storyId'];
        if (!storyId) {
            throw new common_1.HttpException('Story-ID fehlt.', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const cleanEmail = email.toLowerCase().trim();
            const existing = await this.prisma.waitlist.findFirst({
                where: {
                    email: cleanEmail,
                    storyId: storyId,
                },
            });
            if (existing) {
                return {
                    ok: true,
                    storyId,
                    message: 'Du bist bereits vorgemerkt! Wir melden uns, sobald dein Hörspiel fertig ist.',
                };
            }
            await this.prisma.waitlist.create({
                data: {
                    email: cleanEmail,
                    heroName: heroName || null,
                    heroAge: heroAge || null,
                    prompt: prompt || null,
                    sideCharacters: sideCharacters ? JSON.stringify(sideCharacters) : null,
                    storyId: storyId,
                },
            });
            await this.notifyTelegram(cleanEmail, heroName, heroAge, prompt, storyId);
            await this.createTrelloCard(cleanEmail, heroName, heroAge, prompt, storyId);
            return {
                ok: true,
                storyId,
                message: 'Du bist dabei! Wir melden uns per Email, sobald dein Hörspiel fertig gezaubert ist.',
            };
        }
        catch (err) {
            console.error('Waitlist error:', err);
            throw new common_1.HttpException('Etwas ist schiefgelaufen. Bitte versuche es später noch mal.', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async checkWaitlist(storyId) {
        try {
            const waitlist = await this.prisma.waitlist.findFirst({
                where: { storyId },
                select: { email: true },
            });
            return { registered: !!waitlist };
        }
        catch (err) {
            return { registered: false };
        }
    }
    async notifyTelegram(email, heroName, heroAge, prompt, storyId) {
        try {
            const botToken = '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
            const chatId = '5559274578';
            const parts = [`📬 *Email eingetragen!*\n✉️ ${email}`];
            if (heroName)
                parts.push(`🦸 ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}`);
            if (prompt)
                parts.push(`💬 „${prompt}"`);
            if (storyId)
                parts.push(`🔗 https://fablino.de/story/${storyId}`);
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: parts.join('\n'),
                    parse_mode: 'Markdown',
                }),
            });
        }
        catch (err) {
            console.error('Telegram notification error:', err);
        }
    }
    async createTrelloCard(email, heroName, heroAge, prompt, storyId) {
        try {
            const trelloKey = this.configService.get('TRELLO_API_KEY');
            const trelloToken = this.configService.get('TRELLO_TOKEN');
            if (!trelloKey || !trelloToken)
                return;
            const trelloListNeu = '6998aebd8a96dd70e0c03438';
            const cardName = `${heroName || 'Unbekannt'}${heroAge ? ` (${heroAge} J.)` : ''} — ${email}`;
            const cardDesc = [
                `**Email:** ${email}`,
                heroName ? `**Held:** ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}` : null,
                prompt ? `**Wunsch:** ${prompt}` : null,
                `\n🔗 **Story:** https://fablino.de/story/${storyId}`,
                `\n### Status`,
                `- [ ] Script generieren`,
                `- [ ] Audio generieren`,
                `- [ ] An Kunde senden`,
            ].filter(Boolean).join('\n');
            await fetch(`https://api.trello.com/1/cards?key=${trelloKey}&token=${trelloToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idList: trelloListNeu,
                    name: cardName,
                    desc: cardDesc,
                }),
            });
        }
        catch (err) {
            console.error('Trello card creation error:', err);
        }
    }
};
exports.WaitlistService = WaitlistService;
exports.WaitlistService = WaitlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], WaitlistService);
//# sourceMappingURL=waitlist.service.js.map