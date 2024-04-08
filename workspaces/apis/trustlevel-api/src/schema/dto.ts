import Joi from 'joi';

export const TrustLevelConfigDtoSchema = Joi.object({
  approach: Joi.string().required(),
  polarity: Joi.object({
    model: Joi.string().required(),
    weight: Joi.number().required(),
    scaling: Joi.number().required(),
    steepness: Joi.number().required(),
    shift: Joi.number().required(),
  }),
  objectivity: Joi.object({
    model: Joi.string().required(),
    weight: Joi.number().required(),
    scaling: Joi.number().required(),
    steepness: Joi.number().required(),
    shift: Joi.number().required(),
  }),
  bias: Joi.object({
    model: Joi.string().required(),
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
  approach: string;
  polarity: {
    model: string;
    weight: number;
    scaling: number;
    steepness: number;
    shift: number;
  };
  objectivity: {
    model: string;
    weight: number;
    scaling: number;
    steepness: number;
    shift: number;
  };
  bias: {
    model: string;
    weight: number;
    scaling: number;
    steepness: number;
    shift: number;
  };
}

export interface TrustLevelMetadataDto {
  config: TrustLevelConfigDto;
  objectivity: {
    score: number;
    original?: any;
  };
  polarity: {
    score: number;
    original?: any;
  };
  bias: {
    score: number;
    original?: any;
  };
}

export interface TrustlevelDto {
  trustlevel: number;
  metadata?: TrustLevelMetadataDto;
}
