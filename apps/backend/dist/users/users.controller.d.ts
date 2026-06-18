import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        id: string;
        email: string;
        nickname: string;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
    }>;
    getStats(req: any): Promise<{
        total_sessions: number;
        avg_cpm: number;
        avg_accuracy: number;
        recent_sessions: {
            id: string;
            sessionType: import(".prisma/client").$Enums.SessionType;
            startedAt: Date;
            cpm: number | null;
            accuracy: number | null;
        }[];
    }>;
}
