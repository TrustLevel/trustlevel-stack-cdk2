import BiasD4DataClient from './components/biasD4DataClient';
import SpacyTextBlobClient from './components/spacytextblobClient';
import BiasOpenAIV1Client from './components/biasOpenAIV1Client';
import {Service, Config} from './service';
import {readEnvVar} from '@trustlevel/api-core/dist/env';
const SPACYTEXTBLOB_URL = readEnvVar<string>('SPACYTEXTBLOB_URL');
const BIASD4DATA_URL = readEnvVar<string>('BIASD4DATA_URL');
const OPENAI_API_KEY = readEnvVar<string>('OPENAI_API_KEY');
const DEFAULT_WEIGHTS = readEnvVar<Config>('DEFAULT_WEIGHTS');

export const buildService = (): Service => {
  console.log("buildService with default weights: ", DEFAULT_WEIGHTS);
  const spacyTextBlobClient = new SpacyTextBlobClient(SPACYTEXTBLOB_URL);
  const biasD4DataClient = new BiasD4DataClient(BIASD4DATA_URL);
  const biasOpenAIV1Client = new BiasOpenAIV1Client(OPENAI_API_KEY);
  
  return new Service(DEFAULT_WEIGHTS, spacyTextBlobClient, biasD4DataClient, biasOpenAIV1Client);
};
