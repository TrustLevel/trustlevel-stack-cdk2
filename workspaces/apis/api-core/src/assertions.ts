import {ValidationError} from './errors';

export const assertNotNull = <T>(object: T | null): T => {
  if (!object) {
    throw new ValidationError(); // Error will be handled by callers.
  }
  return object;
};
