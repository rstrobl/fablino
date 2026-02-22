"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationModule = void 0;
const common_1 = require("@nestjs/common");
const generation_controller_1 = require("./generation.controller");
const status_controller_1 = require("./status.controller");
const generation_service_1 = require("./generation.service");
const claude_service_1 = require("../../services/claude.service");
const tts_service_1 = require("../../services/tts.service");
const audio_service_1 = require("../../services/audio.service");
const replicate_service_1 = require("../../services/replicate.service");
let GenerationModule = class GenerationModule {
};
exports.GenerationModule = GenerationModule;
exports.GenerationModule = GenerationModule = __decorate([
    (0, common_1.Module)({
        controllers: [generation_controller_1.GenerationController, status_controller_1.StatusController],
        providers: [
            generation_service_1.GenerationService,
            claude_service_1.ClaudeService,
            tts_service_1.TtsService,
            audio_service_1.AudioService,
            replicate_service_1.ReplicateService,
        ],
        exports: [generation_service_1.GenerationService],
    })
], GenerationModule);
//# sourceMappingURL=generation.module.js.map