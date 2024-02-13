import {TrustlevelCreateDto, TrustlevelDto} from './schema/dto';
import SpacyTextBlobClient from './components/spacytextblobClient';
import BiasD4DataClient from './components/biasD4DataClient';

export class Service {
  private readonly spacyTextBlobClient: SpacyTextBlobClient;
  private readonly biasD4DataClient: BiasD4DataClient;

  constructor(private spacytextblobUrl: string, private biasD4DataUrl: string) {
    this.spacyTextBlobClient = new SpacyTextBlobClient(spacytextblobUrl);
    this.biasD4DataClient = new BiasD4DataClient(biasD4DataUrl);
  }

  async determineTrustlevel(
    createDto: TrustlevelCreateDto
  ): Promise<TrustlevelDto> {
    console.log('determineTrustlevel called');

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

    return {
      trustlevel: spacyTextBlobResponse.subjectivity,
    };
  }
}
