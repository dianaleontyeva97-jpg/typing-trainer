import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  // Создание сессии (публичный для guest, защищённый для learning)
  @Post()
  async createSession(
    @Body() dto: CreateSessionDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.sessionsService.createSession(dto, userId);
  }

  // Завершение сессии
  @Post(':id/complete')
  async completeSession(
    @Param('id') id: string,
    @Body() dto: CompleteSessionDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.sessionsService.completeSession(id, dto, userId);
  }

  // История сессий (только для авторизованных)
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getSessions(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.sessionsService.getSessions(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }
}