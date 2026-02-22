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
exports.GenerationController = void 0;
const common_1 = require("@nestjs/common");
const generation_service_1 = require("./generation.service");
const generation_dto_1 = require("../../dto/generation.dto");
let GenerationController = class GenerationController {
    constructor(generationService) {
        this.generationService = generationService;
    }
    async generateStory(dto) {
        return this.generationService.generateStory(dto);
    }
    async confirmScript(id) {
        return this.generationService.confirmScript(id);
    }
    async previewLine(dto, res) {
        return this.generationService.previewLine(dto, res);
    }
    async getJobStatus(id) {
        return this.generationService.getJobStatus(id);
    }
};
exports.GenerationController = GenerationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generation_dto_1.GenerateStoryDto]),
    __metadata("design:returntype", Promise)
], GenerationController.prototype, "generateStory", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GenerationController.prototype, "confirmScript", null);
__decorate([
    (0, common_1.Post)('preview-line'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generation_dto_1.PreviewLineDto, Object]),
    __metadata("design:returntype", Promise)
], GenerationController.prototype, "previewLine", null);
__decorate([
    (0, common_1.Get)('status/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GenerationController.prototype, "getJobStatus", null);
exports.GenerationController = GenerationController = __decorate([
    (0, common_1.Controller)('api/generate'),
    __metadata("design:paramtypes", [generation_service_1.GenerationService])
], GenerationController);
//# sourceMappingURL=generation.controller.js.map