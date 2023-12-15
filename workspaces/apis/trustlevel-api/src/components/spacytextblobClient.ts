// spacytextblobClient.ts
import axios, {AxiosInstance} from 'axios';

export interface SpacyTextBlobResponse {
  polarity: number;
  subjectivity: number;
}

class SpacyTextBlobClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    console.log(`Initialize SpacyTextBlobClient with url: ${baseURL}`);

    this.client = axios.create({
      baseURL,
      // You can add more configuration here
    });
  }

  public async analyzeText(text: string): Promise<SpacyTextBlobResponse> {
    try {
      const response = await this.client.post('/analyze', {text});
      return response.data as SpacyTextBlobResponse;
    } catch (error) {
      // Handle error (e.g., log it, throw custom error, etc.)
      console.error('Error calling SpacyTextBlob:', error);
      throw error;
    }
  }
}

export default SpacyTextBlobClient;
