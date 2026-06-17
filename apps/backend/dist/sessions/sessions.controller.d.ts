import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';
export declare class SessionsController {
    private sessionsService;
    constructor(sessionsService: SessionsService);
    createSession(dto: CreateSessionDto, req: any): Promise<{
        id: string;
        session_type: import(".prisma/client").$Enums.SessionType;
        text_id: string;
        lesson_id: string | null;
        started_at: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
    }>;
    completeSession(id: string, dto: CompleteSessionDto, req: any): Promise<{
        session_id: string;
        cpm: number;
        accuracy: number;
        lesson_attempt: {
            id: string;
            is_passed: boolean;
            cpm: number;
            accuracy: number;
        } | null;
    }>;
    getSessions(req: any, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            userId: string | null;
            sessionType: import(".prisma/client").$Enums.SessionType;
            status: import(".prisma/client").$Enums.SessionStatus;
            textId: string;
            lessonId: string | null;
            startedAt: Date;
            endedAt: Date | null;
            cpm: number | null;
            accuracy: number | null;
        }[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
}
