import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.verification_token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('resend-verification')
  resendVerification(@Request() req) {
    return this.authService.resendVerification(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }
}