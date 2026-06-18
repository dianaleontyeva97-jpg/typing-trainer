import { PrismaService } from '../prisma/prisma.service';
export declare class ContentService {
    private prisma;
    constructor(prisma: PrismaService);
    private getLanguageId;
    getTexts(languageCode?: string): Promise<{
        id: string;
        title: string;
        content: string;
        category: string;
        difficulty: string;
        lengthChars: number;
    }[]>;
    getRandomText(languageCode?: string): Promise<{
        id: string;
        title: string;
        content: string;
        category: string;
        difficulty: string;
        lengthChars: number;
    } | null>;
}
