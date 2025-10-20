import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EventStatus } from '../../common/types/event-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class QueryEventsDto {
  @ApiProperty({
    description: 'Start date filter (ISO string)',
    example: '2026-01-01T00:00:00.000Z',
    required: false,
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'End date filter (ISO string)',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    description:
      'Filter by locations (can be a single location or array of locations)',
    example: ['New York', 'Los Angeles'],
    required: false,
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: string[] | string }) =>
    Array.isArray(value) ? value : [value],
  )
  locations?: string[];

  @ApiProperty({
    description:
      'Filter by event status (comma-separated for multiple statuses)',
    example: 'PUBLISHED,DRAFT',
    required: false,
    type: String,
    enum: EventStatus,
    enumName: 'EventStatus',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  getLocationsArray(): string[] {
    return this.locations ? this.locations : [];
  }

  getStatusArray(): EventStatus[] {
    if (!this.status) return [];
    return this.status.split(',').map((s) => s.trim() as EventStatus);
  }
}
