import { Controller, Get, Query } from '@nestjs/common';
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
}