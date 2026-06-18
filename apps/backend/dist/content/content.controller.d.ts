import { ContentService } from './content.service';
export declare class ContentController {
    private contentService;
    constructor(contentService: ContentService);
    getTexts(language?: string): Promise<{
        id: string;
        title: string;
        content: string;
        category: string;
        difficulty: string;
        lengthChars: number;
    }[]>;
    getRandomText(language?: string): Promise<{
        id: string;
        title: string;
        content: string;
        category: string;
        difficulty: string;
        lengthChars: number;
    } | null>;
    getAllTexts(req: any): Promise<{
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
    createText(req: any, dto: any): Promise<{
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
    updateText(req: any, id: string, dto: any): Promise<{
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
    deleteText(req: any, id: string): Promise<{
        message: string;
    }>;
}
