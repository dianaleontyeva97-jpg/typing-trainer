import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private async getLanguageId(code: string): Promise<string | null> {
    const language = await this.prisma.language.findUnique({ where: { code } });
    return language?.id || null;
  }

  async getTexts(languageCode?: string) {
    const where: any = { isPublished: true };
    if (languageCode) {
      const languageId = await this.getLanguageId(languageCode);
      if (languageId) where.languageId = languageId;
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
    if (texts.length === 0) return null;
    return texts[Math.floor(Math.random() * texts.length)];
  }

  async getAllTexts(role: string) {
    if (role !== 'admin') throw new ForbiddenException('Только для администраторов');
    return this.prisma.typingText.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createText(role: string, dto: any) {
    if (role !== 'admin') throw new ForbiddenException('Только для администраторов');
    const languageId = await this.getLanguageId(dto.language_code || 'ru');
    return this.prisma.typingText.create({
      data: {
        title: dto.title,
        content: dto.content,
        languageId: languageId!,
        category: dto.category,
        difficulty: dto.difficulty,
        lengthChars: dto.content.length,
        isPublished: dto.is_published ?? false,
      },
    });
  }

  async togglePublish(role: string, id: string, dto: any) {
    if (role !== 'admin') throw new ForbiddenException('Только для администраторов');
    return this.prisma.typingText.update({
      where: { id },
      data: { isPublished: dto.is_published },
    });
  }
  async updateText(role: string, id: string, dto: any) {
    if (role !== 'admin') throw new ForbiddenException('Только для администраторов');
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

  async deleteText(role: string, id: string) {
    if (role !== 'admin') throw new ForbiddenException('Только для администраторов');
    await this.prisma.typingText.delete({ where: { id } });
    return { message: 'Текст удалён' };
  }
}