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
exports.BasicAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let BasicAuthGuard = class BasicAuthGuard {
    constructor(configService) {
        this.configService = configService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const auth = request.headers.authorization;
        if (!auth) {
            response.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
            throw new common_1.UnauthorizedException('Authentication required');
        }
        const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
        const username = credentials[0];
        const password = credentials[1];
        const adminPassword = this.configService.get('ADMIN_PASSWORD') || 'fablino2026';
        if (username !== 'admin' || password !== adminPassword) {
            response.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return true;
    }
};
exports.BasicAuthGuard = BasicAuthGuard;
exports.BasicAuthGuard = BasicAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BasicAuthGuard);
//# sourceMappingURL=basic-auth.guard.js.map