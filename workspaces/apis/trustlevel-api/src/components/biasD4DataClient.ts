// biasD4DataClient.ts
import axios, {AxiosInstance} from 'axios';

export interface BiasD4DataResponse {
  label: string;
  score: number;
}

export interface BiasScore {
  score: number;
  original: BiasD4DataResponse;
}

class BiasD4DataClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    console.log(`Initialize biasD4DataClient with url: ${baseURL}`);

    this.client = axios.create({
      baseURL,
      // You can add more configuration here
    });
  }

  public async analyzeText(text: string): Promise<BiasScore> {
    try {
      const response = await this.client.post('/analyze', {text});
      // map to [-1.0, 1.0] range where -1.0 is most biased and 1.0 is least biased
      const biasScore = response.data.label === "Biased" ? response.data.score * -1.0 : response.data.score;
      return {
        score: biasScore,
        original: response.data as BiasD4DataResponse
      };
    } catch (error) {
      // Handle error (e.g., log it, throw custom error, etc.)
      console.error('Error calling BiasD4Data:', error);
      throw error;
    }
  }
}

export default BiasD4DataClient;
