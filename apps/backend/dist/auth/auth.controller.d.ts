import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    resendVerification(req: any): Promise<{
        message: string;
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
}
