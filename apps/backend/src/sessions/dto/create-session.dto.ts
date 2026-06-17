import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum SessionTypeEnum {
  GUEST = 'guest',
  LEARNING = 'learning',
}

export class CreateSessionDto {
  @IsString()
  text_id!: string;

  @IsEnum(SessionTypeEnum)
  session_type!: SessionTypeEnum;

  @IsString()
  @IsOptional()
  lesson_id?: string;
}