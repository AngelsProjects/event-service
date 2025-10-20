import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { EventRepository } from '../src/events/repositories/event.repository';
import { EventStatus } from '../src/common/types/event-status.enum';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

interface EventResponse {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  status: EventStatus;
  internalNotes?: string;
  createdBy?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface PublicEventResponse {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  status: EventStatus;
  isUpcoming: boolean;
}

interface PaginatedEventResponse {
  events: EventResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaginatedPublicEventResponse {
  events: PublicEventResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

describe('Event Service E2E Tests', () => {
  let app: INestApplication;
  let httpServer: Server;
  let eventRepository: EventRepository;
  const authToken = 'admin-token-123';

  // Helper function to get typed http server
  const getHttpServer = (): Server => httpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    eventRepository = moduleFixture.get<EventRepository>(EventRepository);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    eventRepository.clear();
  });

  describe('Health Check', () => {
    it('should return health status', () => {
      return request(getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });

  describe('Authentication', () => {
    it('POST /events should return 401 without auth', () => {
      return request(getHttpServer())
        .post('/events')
        .send({
          title: 'Test Event',
          startAt: new Date(Date.now() + 86400000).toISOString(),
          endAt: new Date(Date.now() + 90000000).toISOString(),
          location: 'Test Location',
        })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.error.code).toBe('UNAUTHORIZED');
        });
    });

    it('GET /events should return 401 without auth', () => {
      return request(getHttpServer())
        .get('/events')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /public/events should return 200 without auth', () => {
      return request(getHttpServer())
        .get('/public/events')
        .expect(HttpStatus.OK);
    });
  });

  describe('Event Creation and Public Visibility', () => {
    it('should create event and verify it appears in public endpoint when PUBLISHED', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      // Create event
      const createResponse = await request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Go Live',
          startAt: tomorrow.toISOString(),
          endAt: endTime.toISOString(),
          location: 'São Paulo',
          status: EventStatus.PUBLISHED,
          internalNotes: 'VIP list pending',
          createdBy: 'cto@example.com',
        })
        .expect(HttpStatus.CREATED);

      const eventResponse = createResponse.body as EventResponse;
      const eventId = eventResponse.id;

      // Query via admin endpoint
      const adminResponse = await request(getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const adminBody = adminResponse.body as PaginatedEventResponse;
      expect(adminBody.events).toHaveLength(1);
      expect(adminBody.events[0]).toMatchObject({
        id: eventId,
        title: 'Go Live',
        location: 'São Paulo',
        status: EventStatus.PUBLISHED,
        internalNotes: 'VIP list pending',
        createdBy: 'cto@example.com',
      });

      // Verify in public endpoint - without location filter first
      const publicResponseAll = await request(getHttpServer())
        .get('/public/events')
        .expect(HttpStatus.OK);

      const publicBodyAll =
        publicResponseAll.body as PaginatedPublicEventResponse;
      expect(publicBodyAll.events).toHaveLength(1);
      expect(publicBodyAll.events[0]).toMatchObject({
        id: eventId,
        title: 'Go Live',
        location: 'São Paulo',
        status: EventStatus.PUBLISHED,
        isUpcoming: true,
      });

      // Now verify with location filter
      const publicResponse = await request(getHttpServer())
        .get('/public/events?locations=Paulo')
        .expect(HttpStatus.OK);

      const publicBody = publicResponse.body as PaginatedPublicEventResponse;
      expect(publicBody.events).toHaveLength(1);
      const publicEvent = publicBody.events[0];

      // Verify public fields
      expect(publicEvent).toMatchObject({
        id: eventId,
        title: 'Go Live',
        location: 'São Paulo',
        status: EventStatus.PUBLISHED,
        isUpcoming: true,
      });

      // Verify private fields are not exposed
      expect(publicEvent).not.toHaveProperty('internalNotes');
      expect(publicEvent).not.toHaveProperty('createdBy');
      expect(publicEvent).not.toHaveProperty('updatedAt');
    });
  });

  describe('Status Transition Flow', () => {
    it('should handle complete event lifecycle with notifications', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      // Create DRAFT event
      const createResponse = await request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Event Lifecycle Test',
          startAt: tomorrow.toISOString(),
          endAt: endTime.toISOString(),
          location: 'Test Location',
          status: EventStatus.DRAFT,
        })
        .expect(HttpStatus.CREATED);

      const eventResponse = createResponse.body as EventResponse;
      const eventId = eventResponse.id;

      // Verify not in public endpoint
      let publicResponse = await request(getHttpServer())
        .get('/public/events')
        .expect(HttpStatus.OK);

      let publicBody = publicResponse.body as PaginatedPublicEventResponse;
      expect(publicBody.events).toHaveLength(0);

      // Publish event
      await request(getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: EventStatus.PUBLISHED })
        .expect(HttpStatus.OK);

      // Verify now in public endpoint
      publicResponse = await request(getHttpServer())
        .get('/public/events')
        .expect(HttpStatus.OK);

      publicBody = publicResponse.body as PaginatedPublicEventResponse;
      expect(publicBody.events).toHaveLength(1);
      expect(publicBody.events[0].status).toBe(EventStatus.PUBLISHED);

      // Cancel event
      await request(getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: EventStatus.CANCELLED })
        .expect(HttpStatus.OK);

      // Verify still in public endpoint but with CANCELLED status
      publicResponse = await request(getHttpServer())
        .get('/public/events')
        .expect(HttpStatus.OK);

      publicBody = publicResponse.body as PaginatedPublicEventResponse;
      expect(publicBody.events).toHaveLength(1);
      expect(publicBody.events[0].status).toBe(EventStatus.CANCELLED);
    });
  });

  describe('Validation Tests', () => {
    it('should reject event with start date in the past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Past Event',
          startAt: yesterday.toISOString(),
          endAt: tomorrow.toISOString(),
          location: 'Test Location',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.error.code).toBe('VALIDATION_ERROR');
          expect(body.error.details).toContainEqual({
            field: 'startAt',
            message: 'Must be in the future',
          });
        });
    });

    it('should reject event with startAt >= endAt', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Date Event',
          startAt: tomorrow.toISOString(),
          endAt: tomorrow.toISOString(),
          location: 'Test Location',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.error.code).toBe('VALIDATION_ERROR');
          expect(body.error.details).toContainEqual({
            field: 'startAt',
            message: 'startAt must be before endAt',
          });
        });
    });

    it('should reject empty title', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      return request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          startAt: tomorrow.toISOString(),
          endAt: dayAfter.toISOString(),
          location: 'Test Location',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    it('should reject title over 200 characters', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      return request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'a'.repeat(201),
          startAt: tomorrow.toISOString(),
          endAt: dayAfter.toISOString(),
          location: 'Test Location',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid status transition from PUBLISHED to DRAFT', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const createResponse = await request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event',
          startAt: tomorrow.toISOString(),
          endAt: dayAfter.toISOString(),
          location: 'Test Location',
          status: EventStatus.PUBLISHED,
        })
        .expect(HttpStatus.CREATED);

      const eventResponse = createResponse.body as EventResponse;
      const eventId = eventResponse.id;

      return request(getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: EventStatus.DRAFT })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.error.code).toBe('VALIDATION_ERROR');
          expect(body.error.details?.[0]?.message).toContain(
            'Cannot transition from PUBLISHED to DRAFT',
          );
        });
    });
  });

  describe('Query and Filtering', () => {
    beforeEach(async () => {
      // Create test events
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 1);

      const events = [
        {
          title: 'São Paulo Event',
          location: 'São Paulo',
          status: EventStatus.PUBLISHED,
          startAt: new Date(baseDate.getTime() + 86400000),
        },
        {
          title: 'Rio Event',
          location: 'Rio de Janeiro',
          status: EventStatus.PUBLISHED,
          startAt: new Date(baseDate.getTime() + 172800000),
        },
        {
          title: 'Draft Event',
          location: 'São Paulo',
          status: EventStatus.DRAFT,
          startAt: new Date(baseDate.getTime() + 259200000),
        },
      ];

      for (const event of events) {
        const endAt = new Date(event.startAt);
        endAt.setHours(endAt.getHours() + 2);

        await request(getHttpServer())
          .post('/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...event,
            startAt: event.startAt.toISOString(),
            endAt: endAt.toISOString(),
          });
      }
    });

    it('should filter by location (case-insensitive)', async () => {
      const response = await request(getHttpServer())
        .get('/public/events?locations=paulo')
        .expect(HttpStatus.OK);

      const body = response.body as PaginatedPublicEventResponse;
      expect(body.events).toHaveLength(1);
      expect(body.events[0].location).toBe('São Paulo');
    });

    it('should filter by date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const twoDaysFromNow = new Date(tomorrow);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 1);

      const response = await request(getHttpServer())
        .get(
          `/events?dateFrom=${tomorrow.toISOString().split('T')[0]}&dateTo=${twoDaysFromNow.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const body = response.body as PaginatedEventResponse;
      expect(body.events.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(getHttpServer())
        .get('/events?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const body = response.body as PaginatedEventResponse;
      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(body.events).toHaveLength(2);
    });
  });

  describe('AI Summary Streaming', () => {
    it('should stream event summary with cache headers', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const createResponse = await request(getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Summary Test Event',
          startAt: tomorrow.toISOString(),
          endAt: dayAfter.toISOString(),
          location: 'Test Location',
          status: EventStatus.PUBLISHED,
        })
        .expect(HttpStatus.CREATED);

      const eventResponse = createResponse.body as EventResponse;
      const eventId = eventResponse.id;

      // First request - cache MISS
      const firstResponse = await request(getHttpServer())
        .get(`/public/events/${eventId}/summary`)
        .expect(HttpStatus.OK)
        .expect('Content-Type', /text\/event-stream/);

      expect(firstResponse.header['x-summary-cache']).toBe('MISS');

      // Second request - cache HIT
      const secondResponse = await request(getHttpServer())
        .get(`/public/events/${eventId}/summary`)
        .expect(HttpStatus.OK);

      expect(secondResponse.header['x-summary-cache']).toBe('HIT');
    });

    it('should return 404 for non-existent event', () => {
      return request(getHttpServer())
        .get('/public/events/non-existent-id/summary')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
