"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.BadRequestException('Пользователь с таким email уже существует');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.user.create({
            data: {
                email: dto.email,
                nickname: dto.nickname,
                passwordHash,
                emailVerified: false,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
            },
        });
        await this.sendVerificationEmail(dto.email, verificationToken);
        return { message: 'Регистрация успешна. Проверьте email для подтверждения.' };
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerificationToken: token,
                emailVerificationExpires: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Неверный или истёкший токен');
        }
        if (user.emailVerified) {
            return { message: 'Email уже подтверждён' };
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });
        return { message: 'Email успешно подтверждён' };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Неверный email или пароль');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Неверный email или пароль');
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('Подтвердите email перед входом');
        }
        return this.generateTokens(user.id, user.email, user.role);
    }
    async logout(userId) {
        return { message: 'Выход выполнен успешно' };
    }
    async resendVerification(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        if (user.emailVerified) {
            throw new common_1.BadRequestException('Email уже подтверждён');
        }
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
            },
        });
        await this.sendVerificationEmail(user.email, verificationToken);
        return { message: 'Письмо отправлено повторно' };
    }
    async generateTokens(userId, email, role) {
        const payload = { sub: userId, email, role };
        const accessToken = await this.jwt.signAsync(payload, {
            secret: this.config.get('jwt.accessSecret'),
            expiresIn: this.config.get('jwt.accessExpiresIn'),
        });
        const refreshToken = await this.jwt.signAsync(payload, {
            secret: this.config.get('jwt.refreshSecret'),
            expiresIn: this.config.get('jwt.refreshExpiresIn'),
        });
        return { accessToken, refreshToken };
    }
    async sendVerificationEmail(email, token) {
        const verificationUrl = `${this.config.get('app.url')}/verify-email?token=${token}`;
        const { Resend } = await import('resend');
        const resend = new Resend(this.config.get('mail.resendApiKey'));
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'diana.leontyeva97@gmail.com',
            subject: 'Подтвердите ваш email — Тренажёр печати',
            html: `
        <h2>Добро пожаловать в тренажёр печати!</h2>
        <p>Нажмите на кнопку ниже, чтобы подтвердить ваш email:</p>
        <a href="${verificationUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 16px;
        ">Подтвердить email</a>
        <p>Или перейдите по ссылке: ${verificationUrl}</p>
        <p>Ссылка действительна 24 часа.</p>
      `,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map