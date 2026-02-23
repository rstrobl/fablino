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
exports.PlaysController = void 0;
const common_1 = require("@nestjs/common");
const plays_service_1 = require("./plays.service");
const basic_auth_guard_1 = require("../../guards/basic-auth.guard");
let PlaysController = class PlaysController {
    constructor(playsService) {
        this.playsService = playsService;
    }
    async recordPlay(storyId, req) {
        const userAgent = req.headers['user-agent'];
        const ip = req.headers['x-forwarded-for'] || req.ip;
        return this.playsService.recordPlay(storyId, userAgent, ip);
    }
    async recordComplete(storyId) {
        return this.playsService.recordComplete(storyId);
    }
    async getAllStats() {
        return this.playsService.getAllPlayStats();
    }
    async getPlays(storyId) {
        return this.playsService.getPlays(storyId);
    }
};
exports.PlaysController = PlaysController;
__decorate([
    (0, common_1.Post)(':storyId'),
    __param(0, (0, common_1.Param)('storyId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PlaysController.prototype, "recordPlay", null);
__decorate([
    (0, common_1.Post)(':storyId/complete'),
    __param(0, (0, common_1.Param)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlaysController.prototype, "recordComplete", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(basic_auth_guard_1.BasicAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlaysController.prototype, "getAllStats", null);
__decorate([
    (0, common_1.Get)(':storyId'),
    (0, common_1.UseGuards)(basic_auth_guard_1.BasicAuthGuard),
    __param(0, (0, common_1.Param)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlaysController.prototype, "getPlays", null);
exports.PlaysController = PlaysController = __decorate([
    (0, common_1.Controller)('api/plays'),
    __metadata("design:paramtypes", [plays_service_1.PlaysService])
], PlaysController);
//# sourceMappingURL=plays.controller.js.map