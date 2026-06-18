"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: function (origin, callback) {
            const allowed = [
                'http://localhost:3001',
                'https://typing-trainer-phi.vercel.app',
            ];
            if (!origin || allowed.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    });
    await app.listen(3000);
    console.log('Backend запущен на http://localhost:3000');
}
bootstrap();
//# sourceMappingURL=main.js.map