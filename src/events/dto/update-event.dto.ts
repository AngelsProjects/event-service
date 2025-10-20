import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '../../common/types/event-status.enum';

export class UpdateEventDto {
  @ApiProperty({
    description: 'Updated event status',
    example: EventStatus.PUBLISHED,
    enum: EventStatus,
    enumName: 'EventStatus',
    required: false,
  })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiProperty({
    description: 'Updated internal notes for the event (admin only)',
    example: 'Event approved and ready for publication',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  internalNotes?: string;
}
