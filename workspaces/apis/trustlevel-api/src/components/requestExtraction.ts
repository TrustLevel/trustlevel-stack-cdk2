import {assertNotNull} from '@trustlevel/api-core/dist/assertions';
import {ValidationError} from '@trustlevel/api-core/dist/errors';
import {APIGatewayProxyEvent} from 'aws-lambda';
import {TrustlevelCreateDto, TrustlevelCreateDtoSchema} from '../schema/dto';
import Joi from 'joi';

export const extractBody = (
  event: APIGatewayProxyEvent
): TrustlevelCreateDto => {
  const obj = assertNotNull(event.body);
  const dto = JSON.parse(obj);

  const validationResult: Joi.ValidationResult =
    TrustlevelCreateDtoSchema.validate(dto) as Joi.ValidationResult;

  if (validationResult.error || validationResult.warning) {
    console.debug(`Validation error: ${validationResult.error?.message}`);
    console.debug(`Validation warning: ${validationResult.warning?.message}`);
    throw new ValidationError();
  }

  return validationResult.value;
};
