import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from './validation.pipe';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class TestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should pass valid DTO', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
      };

      const value = { name: 'Test', description: 'Description' };

      const result = await pipe.transform(value, metadata);

      expect(result).toBeInstanceOf(TestDto);
      expect(result).toMatchObject(value);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
      };

      const value = { name: '' }; // Empty name should fail

      await expect(pipe.transform(value, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass through primitive types', async () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
      };

      const value = 'test-string';

      const result = await pipe.transform(value, metadata);

      expect(result).toBe(value);
    });

    it('should handle missing metatype', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
      };

      const value = { name: 'Test' };

      const result = await pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });

    it('should strip non-whitelisted properties', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
      };

      const value = {
        name: 'Test',
        description: 'Description',
        extraField: 'Should be removed',
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should provide detailed error messages', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
      };

      const value = { name: 123 }; // Wrong type

      try {
        await pipe.transform(value, metadata);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          error: { details: [{ message: string }]; code: string };
        };
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.details).toBeDefined();
        expect(response.error.details.length).toBeGreaterThan(0);
      }
    });
  });
});
