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
exports.WaitlistController = void 0;
const common_1 = require("@nestjs/common");
const waitlist_service_1 = require("./waitlist.service");
const waitlist_dto_1 = require("../../dto/waitlist.dto");
const basic_auth_guard_1 = require("../../guards/basic-auth.guard");
let WaitlistController = class WaitlistController {
    constructor(waitlistService) {
        this.waitlistService = waitlistService;
    }
    async createWaitlistEntry(dto) {
        return this.waitlistService.createWaitlistEntry(dto);
    }
    async getAllWaitlist() {
        return this.waitlistService.getAllWaitlist();
    }
    async checkWaitlist(storyId) {
        return this.waitlistService.checkWaitlist(storyId);
    }
    async deleteWaitlistEntry(id) {
        return this.waitlistService.deleteWaitlistEntry(parseInt(id));
    }
};
exports.WaitlistController = WaitlistController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [waitlist_dto_1.CreateWaitlistDto]),
    __metadata("design:returntype", Promise)
], WaitlistController.prototype, "createWaitlistEntry", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(basic_auth_guard_1.BasicAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WaitlistController.prototype, "getAllWaitlist", null);
__decorate([
    (0, common_1.Get)(':storyId/check'),
    __param(0, (0, common_1.Param)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WaitlistController.prototype, "checkWaitlist", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(basic_auth_guard_1.BasicAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WaitlistController.prototype, "deleteWaitlistEntry", null);
exports.WaitlistController = WaitlistController = __decorate([
    (0, common_1.Controller)('api/waitlist'),
    __metadata("design:paramtypes", [waitlist_service_1.WaitlistService])
], WaitlistController);
//# sourceMappingURL=waitlist.controller.js.map