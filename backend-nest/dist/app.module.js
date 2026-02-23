"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const prisma_module_1 = require("./modules/prisma/prisma.module");
const stories_module_1 = require("./modules/stories/stories.module");
const generation_module_1 = require("./modules/generation/generation.module");
const voices_module_1 = require("./modules/voices/voices.module");
const audio_module_1 = require("./modules/audio/audio.module");
const waitlist_module_1 = require("./modules/waitlist/waitlist.module");
const sharing_module_1 = require("./modules/sharing/sharing.module");
const admin_module_1 = require("./modules/admin/admin.module");
const plays_module_1 = require("./modules/plays/plays.module");
const settings_module_1 = require("./modules/settings/settings.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'covers'),
                serveRoot: '/covers',
            }),
            prisma_module_1.PrismaModule,
            stories_module_1.StoriesModule,
            generation_module_1.GenerationModule,
            voices_module_1.VoicesModule,
            audio_module_1.AudioModule,
            waitlist_module_1.WaitlistModule,
            sharing_module_1.SharingModule,
            admin_module_1.AdminModule,
            plays_module_1.PlaysModule,
            settings_module_1.SettingsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map