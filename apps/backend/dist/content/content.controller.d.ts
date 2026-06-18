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
}
