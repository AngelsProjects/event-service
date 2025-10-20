import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '../../common/types/event-status.enum';

export class EventResponseDto {
  @ApiProperty({
    description: 'Event unique identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'Event title',
    example: 'Annual Tech Conference 2026',
    type: String,
  })
  title: string;

  @ApiProperty({
    description: 'Event start date and time',
    example: '2026-06-15T09:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  startAt: string;

  @ApiProperty({
    description: 'Event end date and time',
    example: '2026-06-15T17:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  endAt: string;

  @ApiProperty({
    description: 'Event location',
    example: 'San Francisco Convention Center',
    type: String,
  })
  location: string;

  @ApiProperty({
    description: 'Event status',
    example: EventStatus.PUBLISHED,
    enum: EventStatus,
    enumName: 'EventStatus',
  })
  status: EventStatus;

  @ApiProperty({
    description: 'Event creation timestamp',
    example: '2026-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Event last update timestamp',
    example: '2026-01-16T14:20:00.000Z',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;
}

export class EventAdminResponseDto extends EventResponseDto {
  @ApiProperty({
    description: 'Internal notes (admin only)',
    example: 'Event approved and ready for publication',
    required: false,
    type: String,
  })
  internalNotes?: string;

  @ApiProperty({
    description: 'Email of the user who created the event',
    example: 'admin@example.com',
    required: false,
    type: String,
  })
  createdBy?: string;
}
