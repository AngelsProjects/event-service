import {
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsEnum,
  IsOptional,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '../../common/types/event-status.enum';

export class CreateEventDto {
  @ApiProperty({
    description: 'Event title',
    example: 'Annual Tech Conference 2026',
    maxLength: 200,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601 format)',
    example: '2026-06-15T09:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  startAt: string; // Keep as string

  @ApiProperty({
    description: 'Event end date and time (ISO 8601 format)',
    example: '2026-06-15T17:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  endAt: string; // Keep as string

  @ApiProperty({
    description: 'Event location',
    example: 'San Francisco Convention Center',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Event status',
    example: EventStatus.DRAFT,
    enum: EventStatus,
    enumName: 'EventStatus',
    default: EventStatus.DRAFT,
    required: false,
  })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus = EventStatus.DRAFT;

  @ApiProperty({
    description: 'Internal notes for the event (admin only)',
    example: 'Remember to prepare welcome packages',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ApiProperty({
    description: 'Email of the user who created the event',
    example: 'admin@example.com',
    required: false,
    type: String,
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  createdBy?: string;

  // Helper methods to convert to Date objects when needed
  getStartAtDate(): Date {
    return new Date(this.startAt);
  }

  getEndAtDate(): Date {
    return new Date(this.endAt);
  }
}
