import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private async getLanguageId(code: string): Promise<string | null> {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });
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
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        difficulty: true,
        lengthChars: true,
      },
    });
  }

  async getRandomText(languageCode = 'ru') {
    const languageId = await this.getLanguageId(languageCode);

    const texts = await this.prisma.typingText.findMany({
      where: {
        isPublished: true,
        ...(languageId && { languageId }),
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        difficulty: true,
        lengthChars: true,
      },
    });

    if (texts.length === 0) return null;
    return texts[Math.floor(Math.random() * texts.length)];
  }
}