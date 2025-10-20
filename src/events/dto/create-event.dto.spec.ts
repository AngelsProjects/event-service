import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventDto } from './create-event.dto';
import { EventStatus } from '../../common/types/event-status.enum';

describe('CreateEventDto', () => {
  it('should accept valid event data', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const dto = plainToInstance(CreateEventDto, {
      title: 'Test Event',
      startAt: tomorrow.toISOString(),
      endAt: dayAfter.toISOString(),
      location: 'Test Location',
      status: EventStatus.DRAFT,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject empty title', async () => {
    const dto = plainToInstance(CreateEventDto, {
      title: '',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Test',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject title over 200 characters', async () => {
    const dto = plainToInstance(CreateEventDto, {
      title: 'A'.repeat(201),
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Test',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should convert ISO strings to Date objects', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dto = plainToInstance(CreateEventDto, {
      title: 'Test',
      startAt: tomorrow.toISOString(),
      endAt: tomorrow.toISOString(),
      location: 'Test',
    });

    expect(dto.getStartAtDate()).toBeInstanceOf(Date);
    expect(dto.getEndAtDate()).toBeInstanceOf(Date);
  });

  it('should default status to DRAFT if not provided', () => {
    const dto = plainToInstance(CreateEventDto, {
      title: 'Test',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Test',
    });

    expect(dto.status).toBe(EventStatus.DRAFT);
  });

  it('should reject invalid email for createdBy', async () => {
    const dto = plainToInstance(CreateEventDto, {
      title: 'Test',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Test',
      createdBy: 'invalid-email',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'createdBy')).toBe(true);
  });
});
