import {Service} from './service';
import {readEnvVar} from '@trustlevel/api-core/dist/env';

const SPACYTEXTBLOB_URL = readEnvVar<string>('SPACYTEXTBLOB_URL');

export const buildService = (): Service => {
  return new Service(SPACYTEXTBLOB_URL);
};
