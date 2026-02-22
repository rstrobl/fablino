"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const cors = require("cors");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(cors());
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
    }));
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'covers'), {
        prefix: '/covers',
        maxAge: '7d'
    });
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'covers', 'og'), {
        prefix: '/covers/og',
        maxAge: '7d'
    });
    app.useStaticAssets((0, path_1.join)(process.cwd(), '..', 'audio'), {
        prefix: '/audio-files'
    });
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen(port, '127.0.0.1');
    console.log(`🎧 Fablino Backend (NestJS) on 127.0.0.1:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map