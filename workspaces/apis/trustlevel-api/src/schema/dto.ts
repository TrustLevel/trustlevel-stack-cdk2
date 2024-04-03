import Joi from 'joi';

export const TrustLevelConfigDtoSchema = Joi.object({
  polarity: Joi.object({
    weight: Joi.number().required(),
    scaling: Joi.number().required(),
    steepness: Joi.number().required(),
    shift: Joi.number().required(),
  }),
  objectivity: Joi.object({
    weight: Joi.number().required(),
    scaling: Joi.number().required(),
    steepness: Joi.number().required(),
    shift: Joi.number().required(),
  }),
  bias: Joi.object({
    weight: Joi.number().required(),
    scaling: Joi.number().required(),
    steepness: Joi.number().required(),
    shift: Joi.number().required(),
  }),
});

export const TrustlevelCreateDtoSchema = Joi.object({
  text: Joi.string().min(2).required(),
  config: TrustLevelConfigDtoSchema.optional(),
});

export interface TrustlevelCreateDto {
  text: string;
  config?: TrustLevelConfigDto;
}

export interface TrustLevelConfigDto {
  polarity: {
    weight: number;
    scaling: number;
    steepness: number;
    shift: number;
  };
  objectivity: {
    weight: number;
    scaling: number;
    steepness: number;
    shift: number;
  };
  bias: {
    weight: number;
    scaling: number;
    steepness: number;
    shift: number;
  };
}

export interface TrustLevelMetadataDto {
  config: TrustLevelConfigDto;
  sentiment: {
    polarity: number;
    subjectivity: number;
  };
  bias: {
    label: string;
    score: number;
  };
}

export interface TrustlevelDto {
  trustlevel: number;
  metadata?: TrustLevelMetadataDto;
}
