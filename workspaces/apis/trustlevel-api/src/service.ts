import * as dto from './schema/dto';
import * as spacytextblob from './components/spacytextblobClient';
import * as biasd4data from './components/biasD4DataClient';
import * as biasOpenAi from './components/biasOpenAIV1Client';

export interface NLPScore {
  score: number;
  original: any;
}

export interface NLPAnalyzer<T> {
  // TODO: refactor so that it always returns a score in the range [-1.0,1.0]
  // e.g. Promise<Score<T>> where T is the original response from the service
  analyzeText(text: string): Promise<T>;
}

export interface Config {
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

export class Service {
  private readonly defaultConfig: Config;
  private readonly spacyTextBlobClient: NLPAnalyzer<spacytextblob.SpacyTextBlobResponse>;
  private readonly biasD4DataClient: NLPAnalyzer<NLPScore>;
  private readonly biasOpenAIClient: NLPAnalyzer<NLPScore>;

  constructor(
    defaultConfig: Config,
    sentimentClient: NLPAnalyzer<spacytextblob.SpacyTextBlobResponse>,
    biasClient: NLPAnalyzer<NLPScore>,
    buasOpenAIClient: NLPAnalyzer<NLPScore>) {
    this.defaultConfig = defaultConfig;
    this.spacyTextBlobClient = sentimentClient;
    this.biasD4DataClient = biasClient;
    this.biasOpenAIClient = buasOpenAIClient;
  }

  // TODO: rename to content-quality score
  async determineTrustlevel(
    createDto: dto.TrustlevelCreateDto,
  ): Promise<dto.TrustlevelDto> {
    console.log('determineTrustlevel called', createDto);
    const config = createDto.config ? createDto.config : this.defaultConfig;

    // TODO extract into own class - note: somehow make sure spacyTextBlobClient is not called twice
    const spacyTextBlobResponse = await this.spacyTextBlobClient.analyzeText(
      createDto.text
    );
    const polarityScore = polarityToTrustLevel(spacyTextBlobResponse.polarity, {
      scaling: config.polarity.scaling,
      steepness: config.polarity.steepness,
      shift: config.polarity.shift,
    });
    const objectivityScore = subjectivityToTrustLevel(spacyTextBlobResponse.subjectivity, {
      scaling: config.objectivity.scaling,
      steepness: config.objectivity.steepness,
      shift: config.objectivity.shift,
    });

    console.log(
      `spacyTextBlob response: ${JSON.stringify(spacyTextBlobResponse)} polarityScore: ${polarityScore} objectivityScore: ${objectivityScore}`
    );

    
    const biasScore = await this.biasScore(createDto.text, config)

    let response: dto.TrustlevelDto = {
      // TODO: rename to content quality score
      trustlevel: this.weightedScore(config, polarityScore, objectivityScore, biasScore.score),
    };

    // in case custom config are given the api returns metadata
    // TODO: eventually protect this, so only special users see the scores
    if (createDto.config) {
      response = {
        trustlevel: response.trustlevel,
        metadata: {
          config: config,
          bias: biasScore,
          polarity: {
            score: polarityScore,
            original: spacyTextBlobResponse.polarity,
          },
          objectivity: {
            score: objectivityScore,
            original: spacyTextBlobResponse.subjectivity,
          },
        }
      }
    }

    return response;
  }

  private async biasScore(text: string, config: Config ): Promise<{score: number, original?: any}> {
    let biasScore: NLPScore;
    if (config.bias.model === 'openai/gpt-3.5-bias-v1') {
      biasScore = await this.biasOpenAIClient.analyzeText(text);
    } else {
      biasScore = await this.biasD4DataClient.analyzeText(text);
    }
    console.log(
      `bias response: ${JSON.stringify(biasScore)}`
    );

    const score =  sigmoid(biasScore.score, {
      scaling: config.bias.scaling,
      steepness: config.bias.steepness,
      shift: config.bias.shift,
    });

    return {
      score: score,
      original: biasScore,
    }
  }

  /**
   * Calculate a content quality based on the given scores and weights. 
   * The sum of all scores is then normalized using the sum of all weights.
   * 
   * @param config
   * @param polarity
   * @param objectivity
   * @param bias
   * @returns
   */
  private weightedScore(
    config: Config,
    polarity: number,
    objectivity: number,
    bias: number): number {

    // TODO: add check if weights are in the correcrt range [0.0, 1.0]
    const sumOfWeights = Math.abs(config.objectivity.weight)
      + Math.abs(config.polarity.weight)
      + Math.abs(config.bias.weight);

    const weightedScore: number = ((bias * config.bias.weight)
      + (polarity * config.polarity.weight)
      + (objectivity * config.objectivity.weight)) / sumOfWeights;

    console.log(`weightedScore = (
        (bias(${bias}) * weight(${config.bias.weight}))
        + (polarity(${polarity}) * weight(${config.polarity.weight})) 
        + (objectivity(${objectivity}) * weight(${config.objectivity.weight}))
        ) / sumOfWeights(${sumOfWeights}) => ${weightedScore}`);

    return parseFloat(weightedScore.toPrecision(2))
  }
}

/**
 * Convert polarity of given text to trust level using a sigmoid function to favor positive content
 * 
 * @param polarity how negative or how positive a piece of text is in range [-1.0, 1.0] where -1.0 is very negative and 1.0 is very positive 
 * @param config sigmoid parameters
 * @returns trust level score [0.0, 1.0]
 */
export function polarityToTrustLevel(polarity: number, config: SigmoidConfig): number {
  if (polarity < 0) {
    polarity = polarity * -1.0;
  }
  polarity = 1.0 - polarity;
  return sigmoid(polarity, config);
}

/**
 * Convert objectivity  score [0.0, 1.0] to trust level using a sigmoid function to favor objective content
 * 
 * @param subjectivity of given text in rage [0.0, 1.0] where 0.0 is very objective and 1.0 is very subjective
 * @param config sigmoid parameters
 * @returns trust level score [0.0, 1.0]
 */
export function subjectivityToTrustLevel(subjectivity: number, config: SigmoidConfig): number {
  // see https://textblob.readthedocs.io/en/dev/api_reference.html#textblob.blob.BaseBlob.subjectivity
  // convert subjectivity score to objectivity score because 
  // trust level score should favor objectivity over subjectivity
    const objectivity = (subjectivity - 1.0) * -1.0;

  // map [0.0, 1.0] to [-1.0, 1.0] where -1.0 is very subjective and 1.0 is very objective
  const mappedObjectivity = (objectivity - 0.5) * 2.0;
  return sigmoid(mappedObjectivity, config);
}

interface SigmoidConfig {
  scaling: number,
  steepness: number,
  shift: number,
}

/**
 * Convert bias score [-1.0, 1.0] to [0.0, 1.0] with s-shaped sigmoid function to favor non-biased content
 * 
 * @param x value to be transformed [-1.0, 1.0]
 * @param scaling
 * @param steepness
 * @param shift
 * @returns 
 */
function sigmoid(x: number, config: SigmoidConfig): number {
  return config.scaling / (1.0 + Math.exp(-config.steepness * (x - config.shift)));
}