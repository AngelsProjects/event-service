import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Type,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { ErrorCode } from '../types/error-codes.enum';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(
      metatype as ClassConstructor<object>,
      value as Record<string, unknown>,
    );

    const errors: ValidationError[] = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const details = errors.flatMap((error) =>
        Object.values(error.constraints || {}).map((message) => ({
          field: error.property,
          message,
        })),
      );

      throw new BadRequestException({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details,
        },
      });
    }

    return object;
  }

  private toValidate(metatype: Type): boolean {
    const types: Type[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
