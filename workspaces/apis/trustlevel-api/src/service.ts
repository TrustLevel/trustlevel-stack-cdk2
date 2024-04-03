import * as dto from './schema/dto';
import * as spacytextblob from './components/spacytextblobClient';
import * as biasd4data from './components/biasD4DataClient';

export interface NLPAnalyzer<T> {
  analyzeText(text: string): Promise<T>;
}

export interface Config {
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

export class Service {
  private readonly defaultConfig: Config;
  private readonly spacyTextBlobClient: NLPAnalyzer<spacytextblob.SpacyTextBlobResponse>;
  private readonly biasD4DataClient: NLPAnalyzer<biasd4data.BiasD4DataResponse>;

  constructor(
    defaultConfig: Config,
    sentimentClient: NLPAnalyzer<spacytextblob.SpacyTextBlobResponse>,
    biasClient: NLPAnalyzer<biasd4data.BiasD4DataResponse>) {
    this.defaultConfig = defaultConfig;
    this.spacyTextBlobClient = sentimentClient;
    this.biasD4DataClient = biasClient;
  }

  // TODO: rename to content-quality score
  async determineTrustlevel(
    createDto: dto.TrustlevelCreateDto,
  ): Promise<dto.TrustlevelDto> {
    console.log('determineTrustlevel called', createDto);
    const config = createDto.config ? createDto.config : this.defaultConfig;

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

    const biasD4DataClientResponse = await this.biasD4DataClient.analyzeText(
      createDto.text
    );
    const biasScore = biasToTrustLevel(biasD4DataClientResponse, {
      scaling: config.bias.scaling,
      steepness: config.bias.steepness,
      shift: config.bias.shift,
    });
  
    console.log(
      `biasD4Data response: ${JSON.stringify(biasD4DataClientResponse)} biasScore: ${biasScore}`
    );


    let response: dto.TrustlevelDto = {
      // TODO: rename to content quality score
      trustlevel: this.weightedScore(config, polarityScore, objectivityScore, biasScore),
    };

    // in case custom config are given the api returns metadata
    // TODO: eventually protect this, so only special users see the scores
    if (createDto.config) {
      response = {
        trustlevel: response.trustlevel,
        metadata: {
          config: config,
          bias: biasD4DataClientResponse,
          sentiment: spacyTextBlobResponse,
        }
      }
    }

    return response;
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
 * Convert bias score to trust level using a sigmoid function to favor non-biased content
 * 
 * @param bias score [0.0, 1.0] and a label representing whether the text is biased or not
 * @param config sigmoid parameters
 * @returns trust level score [0.0, 1.0]
 */
export function biasToTrustLevel(bias: biasd4data.BiasD4DataResponse, config: SigmoidConfig): number {
  // convert to range [-1.0, 1.0] where -1.0 is biased and 1.0 is non-biased
  const biasInput = bias.label === "Biased" ? bias.score * -1.0 : bias.score;
  return sigmoid(biasInput, config);
}

/**
 * Convert polarity of given text to trust level using a sigmoid function to favor positive content
 * 
 * @param polarity how negative or how positive a piece of text is in range [-1.0, 1.0] where -1.0 is very negative and 1.0 is very positive 
 * @param config sigmoid parameters
 * @returns trust level score [0.0, 1.0]
 */
export function polarityToTrustLevel(polarity: number, config: SigmoidConfig): number {
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