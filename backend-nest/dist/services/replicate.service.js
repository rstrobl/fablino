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
exports.ReplicateService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
let ReplicateService = class ReplicateService {
    constructor(configService) {
        this.configService = configService;
    }
    async generateCover(title, summary, characters, storyId, coversDir) {
        const REPLICATE_API_TOKEN = this.configService.get('REPLICATE_API_TOKEN');
        if (!REPLICATE_API_TOKEN) {
            console.warn('No REPLICATE_API_TOKEN — skipping cover generation');
            return null;
        }
        try {
            const charDesc = characters
                .filter(c => c.name !== 'Erzähler')
                .slice(0, 4)
                .map(c => c.name)
                .join(', ');
            const prompt = `Watercolor children's storybook illustration. ${title}. Characters: ${charDesc}. ${summary}. Warm magical lighting, soft colors, whimsical fairy tale style, no text, no words, no letters.`;
            const createRes = await fetch('https://api.replicate.com/v1/predictions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: 'black-forest-labs/flux-1.1-pro',
                    input: {
                        prompt,
                        aspect_ratio: '1:1',
                        output_format: 'jpg',
                        output_quality: 90,
                    },
                }),
            });
            if (!createRes.ok) {
                console.error('Replicate create error:', await createRes.text());
                return null;
            }
            let prediction = await createRes.json();
            while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
                await new Promise(r => setTimeout(r, 2000));
                const pollRes = await fetch(prediction.urls.get, {
                    headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
                });
                prediction = await pollRes.json();
            }
            if (prediction.status === 'failed') {
                console.error('Replicate prediction failed:', prediction.error);
                return null;
            }
            const imageUrl = prediction.output;
            if (!imageUrl)
                return null;
            const imgRes = await fetch(typeof imageUrl === 'string' ? imageUrl : imageUrl[0]);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const coverFilename = `${storyId}.jpg`;
            const coverPath = path.join(coversDir, coverFilename);
            fs.mkdirSync(coversDir, { recursive: true });
            fs.writeFileSync(coverPath, buffer);
            const coverUrl = `/covers/${coverFilename}`;
            try {
                const ogDir = path.join(coversDir, 'og');
                fs.mkdirSync(ogDir, { recursive: true });
                const ogPath = path.join(ogDir, `${storyId}_og.jpg`);
                (0, child_process_1.execSync)(`convert "${coverPath}" -resize 600x600 -quality 80 "${ogPath}"`);
                console.log(`OG thumbnail generated: ${ogPath}`);
            }
            catch (ogErr) {
                console.error('OG thumbnail generation error:', ogErr.message);
            }
            console.log(`Cover generated: ${coverUrl}`);
            return coverUrl;
        }
        catch (err) {
            console.error('Cover generation error:', err);
            return null;
        }
    }
};
exports.ReplicateService = ReplicateService;
exports.ReplicateService = ReplicateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ReplicateService);
//# sourceMappingURL=replicate.service.js.map