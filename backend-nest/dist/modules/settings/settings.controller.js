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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const basic_auth_guard_1 = require("../../guards/basic-auth.guard");
const fs = require("fs");
const path = require("path");
const PROMPT_PATH = path.join(__dirname, '../../../data/system-prompt.txt');
let SettingsController = class SettingsController {
    getSystemPrompt() {
        const prompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
        return { prompt };
    }
    updateSystemPrompt(body) {
        fs.writeFileSync(PROMPT_PATH, body.prompt, 'utf-8');
        return { ok: true };
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('system-prompt'),
    (0, common_1.UseGuards)(basic_auth_guard_1.BasicAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getSystemPrompt", null);
__decorate([
    (0, common_1.Put)('system-prompt'),
    (0, common_1.UseGuards)(basic_auth_guard_1.BasicAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateSystemPrompt", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('api/settings')
], SettingsController);
//# sourceMappingURL=settings.controller.js.map