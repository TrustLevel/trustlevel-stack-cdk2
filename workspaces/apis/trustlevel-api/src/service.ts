import * as dto from './schema/dto';
import * as spacytextblob from './components/spacytextblobClient';
import * as biasd4data from './components/biasD4DataClient';
import { create } from 'domain';

export interface NLPAnalyzer<T> {
  analyzeText(text: string): Promise<T>;
}

export interface Weights {
  polarity: number;
  subjectivity: number;
  bias: number;
}

export class Service {
  private readonly defaultWeights: Weights;
  private readonly spacyTextBlobClient: NLPAnalyzer<spacytextblob.SpacyTextBlobResponse>;
  private readonly biasD4DataClient: NLPAnalyzer<biasd4data.BiasD4DataResponse>;

  constructor(
    defaultWeights: Weights,
    sentimentClient: NLPAnalyzer<spacytextblob.SpacyTextBlobResponse>,
    biasClient: NLPAnalyzer<biasd4data.BiasD4DataResponse>) {
    this.defaultWeights = defaultWeights;
    this.spacyTextBlobClient = sentimentClient;
    this.biasD4DataClient = biasClient;
  }

  // TODO: rename to content-quality score
  async determineTrustlevel(
    createDto: dto.TrustlevelCreateDto,
  ): Promise<dto.TrustlevelDto> {
    console.log('determineTrustlevel called', createDto);

    const spacyTextBlobResponse = await this.spacyTextBlobClient.analyzeText(
      createDto.text
    );

    console.log(
      `spacyTextBlob response: ${JSON.stringify(spacyTextBlobResponse)}`
    );

    const biasD4DataClientResponse = await this.biasD4DataClient.analyzeText(
      createDto.text
    );

    console.log(
      `biasD4Data response: ${JSON.stringify(biasD4DataClientResponse)}`
    );

    const weights = createDto.weights ? createDto.weights : this.defaultWeights;

    let response: dto.TrustlevelDto = {
      // TODO: rename to content quality score
      trustlevel: this.weightedScore(weights, spacyTextBlobResponse, biasD4DataClientResponse),
    };

    // in case custom weights are given the api returns metadata
    // TODO: eventually protect this, so only special users see the scores
    if (createDto.weights) {
      response = {
        trustlevel: response.trustlevel,
        metadata: {
          weights: weights,
          bias: biasD4DataClientResponse,
          sentiment: spacyTextBlobResponse,
        }
      }
    }

    return response;
  }

  // TODO: add threshold
  /**
   * Calculate a content quality based on the given scores and weights. Scores in the range 
   * of [-1.0, 1.0] are transformed to the range [0.0, 1.0] before all scores are weighted
   * (multiplied) with their corresponding weight. The sum of all scores is then normalized
   * using the sum of all weights.
   * 
   * @param sentimentScore containing polarity [-1.0, 1.0] and subjectivity [0.0, 1.0] (where 0.0 is very objective and 1.0 is very subjective) scores of the given text
   * @param biasScore score [0,1] and a label representing whether the text is biased or not
   * @returns trustlevel score range [0.0,1.0] (where 0.0 is no good content queliy and 1.0 is very good content quality)
   */
  private weightedScore(
    weights: Weights,
    sentimentScore: spacytextblob.SpacyTextBlobResponse,
    biasScore: biasd4data.BiasD4DataResponse): number {
      console.log('calculate weighted score', weights, sentimentScore, biasScore);

      // TODO: add check if weights are in the correcrt range [0.0, 1.0]
      const sumOfWeights = Math.abs(weights.subjectivity) + Math.abs(weights.polarity) + Math.abs(weights.bias);
      
      const biasInput = biasScore.label === "Biased" ? biasScore.score * -1.0 : biasScore.score;
      // normalize biase score [-1.0, 1.0] => [0.0, 1.0]
      const bias = (1.0 + biasInput) / 2.0;

      // normalize polarity score [-1.0, 1.0] => [0.0, 1.0]
      const polarity = (1.0 + sentimentScore.polarity) / 2.0;

      const subjectivity = sentimentScore.subjectivity;

      // weightedScore in the range of [-1.0, 1.0]
      const weightedScore: number = ((bias * weights.bias) 
        + (polarity * weights.polarity) 
        + (subjectivity * weights.subjectivity)) / sumOfWeights;

      console.log(`weightedScore = (
        (bias(${bias}) * weight(${weights.bias}))
        + (polarity(${polarity}) * weight(${weights.polarity})) 
        + (subjectivity(${subjectivity}) * weight(${weights.subjectivity}))
        ) / sumOfWeights(${sumOfWeights}) => ${weightedScore}`);

    return parseFloat(weightedScore.toPrecision(2))
  }
}
