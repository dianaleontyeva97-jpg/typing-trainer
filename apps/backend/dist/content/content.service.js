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
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ContentService = class ContentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLanguageId(code) {
        const language = await this.prisma.language.findUnique({ where: { code } });
        return language?.id || null;
    }
    async getTexts(languageCode) {
        const where = { isPublished: true };
        if (languageCode) {
            const languageId = await this.getLanguageId(languageCode);
            if (languageId)
                where.languageId = languageId;
        }
        return this.prisma.typingText.findMany({
            where,
            select: { id: true, title: true, content: true, category: true, difficulty: true, lengthChars: true },
        });
    }
    async getRandomText(languageCode = 'ru') {
        const languageId = await this.getLanguageId(languageCode);
        const texts = await this.prisma.typingText.findMany({
            where: { isPublished: true, ...(languageId && { languageId }) },
            select: { id: true, title: true, content: true, category: true, difficulty: true, lengthChars: true },
        });
        if (texts.length === 0)
            return null;
        return texts[Math.floor(Math.random() * texts.length)];
    }
    async getAllTexts(role) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Только для администраторов');
        return this.prisma.typingText.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async createText(role, dto) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Только для администраторов');
        const languageId = await this.getLanguageId(dto.language_code || 'ru');
        return this.prisma.typingText.create({
            data: {
                title: dto.title,
                content: dto.content,
                languageId: languageId,
                category: dto.category,
                difficulty: dto.difficulty,
                lengthChars: dto.content.length,
                isPublished: dto.is_published ?? false,
            },
        });
    }
    async togglePublish(role, id, dto) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Только для администраторов');
        return this.prisma.typingText.update({
            where: { id },
            data: { isPublished: dto.is_published },
        });
    }
    async updateText(role, id, dto) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Только для администраторов');
        const languageId = dto.language_code
            ? await this.getLanguageId(dto.language_code)
            : undefined;
        return this.prisma.typingText.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.content && { content: dto.content, lengthChars: dto.content.length }),
                ...(languageId && { languageId }),
                ...(dto.category && { category: dto.category }),
                ...(dto.difficulty && { difficulty: dto.difficulty }),
                ...(dto.is_published !== undefined && { isPublished: dto.is_published }),
            },
        });
    }
    async deleteText(role, id) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Только для администраторов');
        await this.prisma.typingText.delete({ where: { id } });
        return { message: 'Текст удалён' };
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContentService);
//# sourceMappingURL=content.service.js.map