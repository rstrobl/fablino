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
exports.PreviewLineDto = exports.GenerateStoryDto = exports.CharacterRequestDto = exports.HeroDto = exports.SideCharacterDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SideCharacterDto {
}
exports.SideCharacterDto = SideCharacterDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SideCharacterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SideCharacterDto.prototype, "role", void 0);
class HeroDto {
}
exports.HeroDto = HeroDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HeroDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HeroDto.prototype, "age", void 0);
class CharacterRequestDto {
}
exports.CharacterRequestDto = CharacterRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => HeroDto),
    __metadata("design:type", HeroDto)
], CharacterRequestDto.prototype, "hero", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SideCharacterDto),
    __metadata("design:type", Array)
], CharacterRequestDto.prototype, "sideCharacters", void 0);
class GenerateStoryDto {
}
exports.GenerateStoryDto = GenerateStoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateStoryDto.prototype, "prompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateStoryDto.prototype, "ageGroup", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CharacterRequestDto),
    __metadata("design:type", CharacterRequestDto)
], GenerateStoryDto.prototype, "characters", void 0);
class PreviewLineDto {
}
exports.PreviewLineDto = PreviewLineDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PreviewLineDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PreviewLineDto.prototype, "voiceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PreviewLineDto.prototype, "voiceSettings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PreviewLineDto.prototype, "previous_text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PreviewLineDto.prototype, "next_text", void 0);
//# sourceMappingURL=generation.dto.js.map