import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  verification_token: string;
}