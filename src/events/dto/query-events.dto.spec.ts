import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryEventsDto } from './query-events.dto';
import { EventStatus } from '../../common/types/event-status.enum';

describe('QueryEventsDto', () => {
  it('should accept valid query parameters', async () => {
    const dto = plainToInstance(QueryEventsDto, {
      page: 1,
      limit: 20,
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.999Z',
      locations: ['New York', 'Los Angeles'],
      status: EventStatus.PUBLISHED,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should use default values', () => {
    const dto = plainToInstance(QueryEventsDto, {});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should convert locations string to array', () => {
    const dto = plainToInstance(QueryEventsDto, {
      locations: 'New York',
    });

    expect(dto.getLocationsArray()).toEqual(['New York']);
  });

  it('should handle locations array', () => {
    const dto = plainToInstance(QueryEventsDto, {
      locations: ['New York', 'Los Angeles'],
    });

    expect(dto.getLocationsArray()).toEqual(['New York', 'Los Angeles']);
  });

  it('should return empty array when no locations', () => {
    const dto = plainToInstance(QueryEventsDto, {});

    expect(dto.getLocationsArray()).toEqual([]);
  });

  it('should parse comma-separated status values', () => {
    const dto = plainToInstance(QueryEventsDto, {
      status: 'PUBLISHED,DRAFT',
    });

    expect(dto.getStatusArray()).toEqual([
      EventStatus.PUBLISHED,
      EventStatus.DRAFT,
    ]);
  });

  it('should return empty array when no status', () => {
    const dto = plainToInstance(QueryEventsDto, {});

    expect(dto.getStatusArray()).toEqual([]);
  });

  it('should reject page less than 1', async () => {
    const dto = plainToInstance(QueryEventsDto, {
      page: 0,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should reject limit greater than 100', async () => {
    const dto = plainToInstance(QueryEventsDto, {
      limit: 101,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should reject invalid date format', async () => {
    const dto = plainToInstance(QueryEventsDto, {
      dateFrom: 'invalid-date',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dateFrom')).toBe(true);
  });
});
