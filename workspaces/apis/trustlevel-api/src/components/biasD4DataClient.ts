// biasD4DataClient.ts
import axios, {AxiosInstance} from 'axios';

export type BiasD4DataResponse = BiasD4DataItem[]

export interface BiasD4DataItem {
  label: string;
  score: number;
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

  public async analyzeText(text: string): Promise<BiasD4DataResponse> {
    try {
      const response = await this.client.post('/analyze', {text});
      return response.data as BiasD4DataResponse;
    } catch (error) {
      // Handle error (e.g., log it, throw custom error, etc.)
      console.error('Error calling BiasD4Data:', error);
      throw error;
    }
  }
}

export default BiasD4DataClient;
