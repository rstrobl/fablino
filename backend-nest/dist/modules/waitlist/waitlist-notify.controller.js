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
exports.WaitlistNotifyController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WaitlistNotifyController = class WaitlistNotifyController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerEmail(dto) {
        if (dto.storyId) {
            await this.prisma.story.update({
                where: { id: dto.storyId },
                data: { requesterContact: dto.email },
            });
        }
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
        const chatId = process.env.TELEGRAM_CHAT_ID || '5559274578';
        const parts = ['📧 *E-Mail hinterlassen!*'];
        parts.push(`✉️ ${dto.email}`);
        if (dto.heroName)
            parts.push(`🦸 ${dto.heroName}${dto.heroAge ? ` (${dto.heroAge} J.)` : ''}`);
        if (dto.storyId)
            parts.push(`🔗 https://fablino.de/story/${dto.storyId}`);
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' }),
        }).catch(() => { });
        return { ok: true, message: 'Super! Wir benachrichtigen dich, sobald dein Hörspiel fertig ist.' };
    }
    async checkRegistration(storyId) {
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
            select: { requesterContact: true },
        });
        return { registered: !!story?.requesterContact };
    }
};
exports.WaitlistNotifyController = WaitlistNotifyController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WaitlistNotifyController.prototype, "registerEmail", null);
__decorate([
    (0, common_1.Get)(':storyId'),
    __param(0, (0, common_1.Param)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WaitlistNotifyController.prototype, "checkRegistration", null);
exports.WaitlistNotifyController = WaitlistNotifyController = __decorate([
    (0, common_1.Controller)('api/waitlist'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WaitlistNotifyController);
//# sourceMappingURL=waitlist-notify.controller.js.map