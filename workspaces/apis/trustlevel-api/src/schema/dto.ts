import Joi from 'joi';

export const TrustlevelCreateDtoSchema = Joi.object({
  text: Joi.string().min(2).required(),
});

export interface TrustlevelCreateDto {
  text: string;
}

export interface TrustlevelDto {
  trustlevel: number;
}
