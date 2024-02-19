import Joi from 'joi';

export const TrustLevelWeightsDtoSchema = Joi.object({
  polarity: Joi.number().required(),
  subjectivity: Joi.number().required(),
  bias: Joi.number().required(),
});

export const TrustlevelCreateDtoSchema = Joi.object({
  text: Joi.string().min(2).required(),
  weights: TrustLevelWeightsDtoSchema.optional(),
});

export interface TrustlevelCreateDto {
  text: string;
  weights?: TrustLevelWeightsDto;
}

export interface TrustLevelWeightsDto {
  polarity: number;
  subjectivity: number;
  bias: number;
}

export interface TrustLevelMetadataDto {
  weights: TrustLevelWeightsDto;
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
