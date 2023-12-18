import {TrustlevelCreateDto, TrustlevelDto} from './schema/dto';
import SpacyTextBlobClient from './components/spacytextblobClient';

export class Service {
  private readonly spacyTextBlobClient: SpacyTextBlobClient;

  constructor(private spacytextblobUrl: string) {
    this.spacyTextBlobClient = new SpacyTextBlobClient(spacytextblobUrl);
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

    return {
      trustlevel: spacyTextBlobResponse.subjectivity,
    };
  }
}
