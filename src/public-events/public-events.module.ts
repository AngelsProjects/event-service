import { Module } from '@nestjs/common';
import { PublicEventsController } from './public-events.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [PublicEventsController],
})
export class PublicEventsModule {}
