import { Event } from './event.entity';
import { EventStatus } from '../../common/types/event-status.enum';

describe('Event Entity', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  describe('constructor', () => {
    it('should create event with all fields', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
        status: EventStatus.DRAFT,
        internalNotes: 'Test notes',
        createdBy: 'test@example.com',
      });

      expect(event.id).toBe('test-id');
      expect(event.title).toBe('Test Event');
      expect(event.status).toBe(EventStatus.DRAFT);
      expect(event.internalNotes).toBe('Test notes');
      expect(event.createdBy).toBe('test@example.com');
    });

    it('should default status to DRAFT', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
      });

      expect(event.status).toBe(EventStatus.DRAFT);
    });

    it('should set timestamps', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
      });

      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('isUpcoming', () => {
    it('should return true for future events', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
      });

      expect(event.isUpcoming).toBe(true);
    });

    it('should return false for past events', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: yesterday,
        endAt: new Date(),
        location: 'Test Location',
      });

      expect(event.isUpcoming).toBe(false);
    });
  });

  describe('toPublicResponse', () => {
    it('should exclude private fields', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
        internalNotes: 'Private notes',
        createdBy: 'admin@example.com',
      });

      const response = event.toPublicResponse();

      expect(response).not.toHaveProperty('internalNotes');
      expect(response).not.toHaveProperty('createdBy');
      expect(response).not.toHaveProperty('updatedAt');
      expect(response).toHaveProperty('isUpcoming');
    });
  });

  describe('toAdminResponse', () => {
    it('should include all fields', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
        internalNotes: 'Private notes',
        createdBy: 'admin@example.com',
      });

      const response = event.toAdminResponse();

      expect(response).toHaveProperty('internalNotes');
      expect(response).toHaveProperty('createdBy');
      expect(response).toHaveProperty('updatedAt');
      expect(response).toHaveProperty('createdAt');
    });
  });

  describe('canTransitionTo', () => {
    it('should allow DRAFT -> PUBLISHED', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test',
        status: EventStatus.DRAFT,
      });

      expect(event.canTransitionTo(EventStatus.PUBLISHED)).toBe(true);
    });

    it('should allow DRAFT -> CANCELLED', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test',
        status: EventStatus.DRAFT,
      });

      expect(event.canTransitionTo(EventStatus.CANCELLED)).toBe(true);
    });

    it('should allow PUBLISHED -> CANCELLED', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test',
        status: EventStatus.PUBLISHED,
      });

      expect(event.canTransitionTo(EventStatus.CANCELLED)).toBe(true);
    });

    it('should not allow PUBLISHED -> DRAFT', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test',
        status: EventStatus.PUBLISHED,
      });

      expect(event.canTransitionTo(EventStatus.DRAFT)).toBe(false);
    });

    it('should not allow any transitions from CANCELLED', () => {
      const event = new Event({
        id: 'test-id',
        title: 'Test',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test',
        status: EventStatus.CANCELLED,
      });

      expect(event.canTransitionTo(EventStatus.DRAFT)).toBe(false);
      expect(event.canTransitionTo(EventStatus.PUBLISHED)).toBe(false);
    });
  });
});
