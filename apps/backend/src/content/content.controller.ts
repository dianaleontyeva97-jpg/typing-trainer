import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContentService } from './content.service';

@Controller('texts')
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Get()
  getTexts(@Query('language') language?: string) {
    return this.contentService.getTexts(language);
  }

  @Get('random')
  getRandomText(@Query('language') language = 'ru') {
    return this.contentService.getRandomText(language);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin')
  getAllTexts(@Request() req: any) {
    return this.contentService.getAllTexts(req.user.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin')
  createText(@Request() req: any, @Body() dto: any) {
    return this.contentService.createText(req.user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('admin/:id')
  updateText(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.contentService.updateText(req.user.role, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/:id')
  deleteText(@Request() req: any, @Param('id') id: string) {
    return this.contentService.deleteText(req.user.role, id);
  }
}