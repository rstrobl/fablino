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
exports.SharingController = void 0;
const common_1 = require("@nestjs/common");
const sharing_service_1 = require("./sharing.service");
let SharingController = class SharingController {
    constructor(sharingService) {
        this.sharingService = sharingService;
    }
    async shareStory(id, res) {
        return this.sharingService.serveOgPage(id, res);
    }
    async ogStory(id, res) {
        return this.sharingService.serveOgPage(id, res);
    }
    async publicStoryPage(id, res) {
        return this.sharingService.serveOgPage(id, res);
    }
    async previewPage(jobId, res) {
        return this.sharingService.servePreviewPage(jobId, res);
    }
};
exports.SharingController = SharingController;
__decorate([
    (0, common_1.Get)('share/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SharingController.prototype, "shareStory", null);
__decorate([
    (0, common_1.Get)('og/story/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SharingController.prototype, "ogStory", null);
__decorate([
    (0, common_1.Get)('story/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SharingController.prototype, "publicStoryPage", null);
__decorate([
    (0, common_1.Get)('preview/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SharingController.prototype, "previewPage", null);
exports.SharingController = SharingController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [sharing_service_1.SharingService])
], SharingController);
//# sourceMappingURL=sharing.controller.js.map