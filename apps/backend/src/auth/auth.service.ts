import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Регистрация ──────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        nickname: dto.nickname,
        passwordHash,
        emailVerified: false,
      },
    });

    await this.sendVerificationEmail(user.email, verificationToken, user.id);

    return { message: 'Регистрация успешна. Проверьте email для подтверждения.' };
  }

  // ─── Подтверждение email ──────────────────────────────────

  async verifyEmail(token: string) {
    // Токен хранится как hash в eventLog для безопасности
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const event = await this.prisma.eventLog.findFirst({
      where: {
        eventType: 'start_session',
        payloadJson: {
          path: ['verification_token_hash'],
          equals: tokenHash,
        },
      },
    });

    if (!event || !event.userId) {
      throw new BadRequestException('Неверный или истёкший токен');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.emailVerified) {
      return { message: 'Email уже подтверждён' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    return { message: 'Email успешно подтверждён' };
  }

  // ─── Вход ─────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Подтвердите email перед входом');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  // ─── Выход ────────────────────────────────────────────────

  async logout(userId: string) {
    // Записываем событие выхода — токены инвалидируются на клиенте
    await this.prisma.eventLog.create({
      data: {
        eventType: 'end_session',
        userId,
        payloadJson: { action: 'logout', timestamp: new Date().toISOString() },
      },
    });

    return { message: 'Выход выполнен успешно' };
  }

  // ─── Повторная отправка письма ────────────────────────────

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.emailVerified) {
      throw new BadRequestException('Email уже подтверждён');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.sendVerificationEmail(user.email, verificationToken, user.id);

    return { message: 'Письмо отправлено повторно' };
  }

  // ─── Вспомогательные методы ───────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
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

  private async sendVerificationEmail(
    email: string,
    token: string,
    userId: string,
  ) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.eventLog.create({
      data: {
        eventType: 'start_session',
        userId,
        payloadJson: {
          verification_token_hash: tokenHash,
          type: 'email_verification',
        },
      },
    });

    const verificationUrl = `${this.config.get('app.url')}/verify-email?token=${token}`;

    const { Resend } = await import('resend');
    const resend = new Resend(this.config.get('mail.resendApiKey'));

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'diana.leontyeva97@gmail.com',
      subject: 'Подтвердите ваш email — Тренажёр печати',
      headers: {
    'X-Entity-Ref-ID': new Date().getTime().toString(),
  },
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
}