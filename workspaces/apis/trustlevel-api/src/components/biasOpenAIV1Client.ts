import { OpenAI } from "openai";


export interface BiasScore {
  score: number;
  original: any;
}

class BiasOpenAIV1Client {

  private openai: OpenAI;

  constructor(openaiApiKey: string) {
    console.log("Initialize BiasOpenAIV1Client");

    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  public async analyzeText(text: string): Promise<BiasScore> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            "role": "system",
            "content": "You will be provided with text delimited by triple quotes for which you determine the bias score (\"bias_score\") in the range [-1.0,1.0] where 1.0 means not biased and -1.0 means the text is very biased. You only reply with a valid JSON object with the field \"bias_score\". Explain step by step how you came up with the score in an additional JSON object field called \"chain_of_thought\" but do not summarize the text."
          },
          {
            "role": "user",
            "content": `\"\"\"${text}\"\"\"`
          }
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const rawResponse = response.choices[0].message.content
      if (rawResponse === null ){
        throw new Error('No response from BiasOpenAI');
      }
      const responseModel = JSON.parse(rawResponse)

      return {
        score: responseModel.bias_score,
        original: rawResponse
      };
    } catch (error) {
      // Handle error (e.g., log it, throw custom error, etc.)
      console.error('Error calling BiasOpenAI response:', error);
      throw error;
    }
  }
}

export default BiasOpenAIV1Client;
