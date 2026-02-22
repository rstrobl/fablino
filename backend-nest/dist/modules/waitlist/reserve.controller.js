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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReserveController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const reserve_dto_1 = require("../../dto/reserve.dto");
const crypto_1 = require("crypto");
let ReserveController = class ReserveController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async reserve(dto) {
        const id = (0, crypto_1.randomUUID)();
        const title = dto.heroName ? `${dto.heroName}s Hörspiel` : 'Dein Hörspiel';
        const ageGroup = (parseInt(dto.heroAge || '5') || 5) <= 5 ? '3-5' : '6-9';
        const meta = JSON.stringify({
            heroName: dto.heroName,
            heroAge: dto.heroAge,
            prompt: dto.prompt || null,
        });
        await this.prisma.story.create({
            data: {
                id,
                title,
                prompt: dto.prompt || null,
                ageGroup,
                summary: meta,
            },
        });
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
        const chatId = process.env.TELEGRAM_CHAT_ID || '5559274578';
        const parts = ['✨ *Neuer Hörspiel-Wunsch!*'];
        if (dto.heroName)
            parts.push(`🦸 ${dto.heroName}${dto.heroAge ? ` (${dto.heroAge} J.)` : ''}`);
        if (dto.prompt)
            parts.push(`💬 „${dto.prompt}"`);
        parts.push(`🔗 https://fablino.de/story/${id}`);
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' }),
        }).catch(() => { });
        return { ok: true, storyId: id };
    }
};
exports.ReserveController = ReserveController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reserve_dto_1.ReserveDto]),
    __metadata("design:returntype", Promise)
], ReserveController.prototype, "reserve", null);
exports.ReserveController = ReserveController = __decorate([
    (0, common_1.Controller)('api/reserve'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReserveController);
//# sourceMappingURL=reserve.controller.js.map