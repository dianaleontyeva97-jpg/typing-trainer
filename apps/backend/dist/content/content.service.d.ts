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
    getAllTexts(role: string): Promise<{
        id: string;
        title: string;
        content: string;
        languageId: string;
        category: string;
        difficulty: string;
        lengthChars: number;
        isPublished: boolean;
        createdAt: Date;
    }[]>;
    createText(role: string, dto: any): Promise<{
        id: string;
        title: string;
        content: string;
        languageId: string;
        category: string;
        difficulty: string;
        lengthChars: number;
        isPublished: boolean;
        createdAt: Date;
    }>;
    togglePublish(role: string, id: string, dto: any): Promise<{
        id: string;
        title: string;
        content: string;
        languageId: string;
        category: string;
        difficulty: string;
        lengthChars: number;
        isPublished: boolean;
        createdAt: Date;
    }>;
    updateText(role: string, id: string, dto: any): Promise<{
        id: string;
        title: string;
        content: string;
        languageId: string;
        category: string;
        difficulty: string;
        lengthChars: number;
        isPublished: boolean;
        createdAt: Date;
    }>;
    deleteText(role: string, id: string): Promise<{
        message: string;
    }>;
}
