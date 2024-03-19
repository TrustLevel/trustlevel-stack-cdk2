import { TrustlevelCreateDto } from "../../src/schema/dto";
import { Service } from "../../src/service";

describe('content quality score tests', () => {
  test.each([
    [
      'best score',
      {
        weights: {
          polarity: 1.0,
          objectivity: 1.0,
          bias: 1.0,
        },
        sentiment: {
          polarity: 1.0,
          subjectivity: 0.0,
        },
        bias: {
          label: "Normal",
          score: 1.0,
        },
        expected_sore: 1.0,
      },
    ],
    [
      'worst score',
      {
        weights: {
          polarity: 1.0,
          objectivity: 1.0,
          bias: 1.0,
        },
        sentiment: {
          polarity: -1.0,
          subjectivity: 1.0,
        },
        bias: {
          label: "Biased",
          score: 1.0,
        },
        expected_sore: 0.0,
      },
    ],
    [
      'medium score',
      {
        weights: {
          polarity: 1.0,
          objectivity: 1.0,
          bias: 1.0,
        },
        sentiment: {
          polarity: 0.5,
          subjectivity: 0.5,
        },
        bias: {
          label: "Biased",
          score: 0.5,
        },
        expected_sore: 0.5
      },
    ],
    [
      'medium weights',
      {
        weights: {
          polarity: 0.5,
          objectivity: 0.5,
          bias: 0.5,
        },
        sentiment: {
          polarity: 1.0,
          subjectivity: 0.0,
        },
        bias: {
          label: "Normal",
          score: 1.0,
        },
        expected_sore: 1.0
      },
    ],
    [
      'deactive certain scores',
      {
        weights: {
          polarity: 0.0,
          objectivity: 0.0,
          bias: 1.0,
        },
        sentiment: {
          polarity: 0.6,
          subjectivity: 0.5,
        },
        bias: {
          label: "Biased",
          score: 0.9,
        },
        expected_sore: 0.05
      },
    ],
    [
      'example usecase',
      {
        weights: {
          polarity: 0.6,
          objectivity: 0.6,
          bias: 0.5,
        },
        sentiment: {
          polarity: 0.65,
          subjectivity: 0.3,
        },
        bias: {
          label: "Biased",
          score: 0.6,
        },
        expected_sore: 0.6
      },
    ],
    [
      'fallback to default weights',
      {
        weights: undefined,
        sentiment: {
          polarity: 1.0,
          subjectivity: 0.0,
        },
        bias: {
          label: "Normal",
          score: 1.0,
        },
        expected_sore: 1.0,
      },
    ],
  ])('%s', async (description, testCase) => {
    // given
    const sentimentMock = {
      analyzeText: jest.fn().mockReturnValue(Promise.resolve(testCase.sentiment))
    };
    const biasMock = {
      analyzeText: jest.fn().mockReturnValue(Promise.resolve(testCase.bias))
    };
  
    const service = new Service({bias: 1.0, polarity: 1.0, objectivity: 1.0}, sentimentMock, biasMock);

    // when
    const requestBody: TrustlevelCreateDto = {
      text: "Hello World!",
    }
    if (testCase.weights) {
      requestBody.weights = testCase.weights;
    }
    const result = await service.determineTrustlevel(requestBody);
  
    // then
    expect(result.trustlevel).toBe(testCase.expected_sore);

    // TODO extract into dedicated test
    if (testCase.weights) {
      // if custom weights are passed metadata is returned
      expect(result.metadata?.bias.label).toBe(testCase.bias.label);
      expect(result.metadata?.bias.score).toBe(testCase.bias.score);
      expect(result.metadata?.sentiment.polarity).toBe(testCase.sentiment.polarity);
      expect(result.metadata?.sentiment.subjectivity).toBe(testCase.sentiment.subjectivity);
      expect(result.metadata?.weights.bias).toBe(testCase.weights?.bias);
      expect(result.metadata?.weights.polarity).toBe(testCase.weights?.polarity);
      expect(result.metadata?.weights.objectivity).toBe(testCase.weights?.objectivity);
    } else {
      expect(result.metadata).toBeUndefined()
    }
  })
});
