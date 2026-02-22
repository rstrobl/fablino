"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const util_1 = require("util");
const exec = (0, util_1.promisify)(require('child_process').exec);
let AudioService = class AudioService {
    async combineAudio(segments, outputPath, audioDir) {
        const silencePath = path.join(audioDir, `silence_${Date.now()}.mp3`);
        await exec(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.5 -q:a 9 "${silencePath}" 2>/dev/null`);
        const listPath = path.join(audioDir, `list_${Date.now()}.txt`);
        let listContent = '';
        for (let i = 0; i < segments.length; i++) {
            listContent += `file '${segments[i]}'\n`;
            if (i < segments.length - 1) {
                listContent += `file '${silencePath}'\n`;
            }
        }
        fs.writeFileSync(listPath, listContent);
        const tmpConcat = path.join(audioDir, `tmp_${Date.now()}.mp3`);
        await exec(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`);
        await exec(`ffmpeg -y -i "${tmpConcat}" -af "afade=t=in:d=0.5" -q:a 2 "${outputPath}"`);
        try {
            fs.unlinkSync(tmpConcat);
            fs.unlinkSync(silencePath);
            fs.unlinkSync(listPath);
        }
        catch (e) {
        }
    }
};
exports.AudioService = AudioService;
exports.AudioService = AudioService = __decorate([
    (0, common_1.Injectable)()
], AudioService);
//# sourceMappingURL=audio.service.js.map