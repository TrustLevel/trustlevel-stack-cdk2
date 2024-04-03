import { TrustlevelCreateDto } from "../../src/schema/dto";
import { Service } from "../../src/service";

describe('content quality score tests', () => {
  test.each([
    [
      'best score',
      {
        config: {
          polarity: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          objectivity: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          bias: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
        },
        sentiment: {
          polarity: 1.0,
          subjectivity: 0.0,
        },
        bias: {
          label: "Normal",
          score: 1.0,
        },
        expected: (actual_score: number) => actual_score > 0.9,
      },
    ],
    [
      'worst score',
      {
        config: {
          polarity: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          objectivity: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          bias: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
        },
        sentiment: {
          polarity: -1.0,
          subjectivity: 1.0,
        },
        bias: {
          label: "Biased",
          score: 1.0,
        },
        expected: (actual_score: number) => actual_score < 0.1,
      },
    ],
    [
      'medium score',
      {
        config: {
          polarity: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          objectivity: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          bias: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
        },
        sentiment: {
          polarity: 0.5,
          subjectivity: 0.5,
        },
        bias: {
          label: "Biased",
          score: 0.5,
        },
        expected: (actual_score: number) => actual_score < 0.5 && actual_score > 0.4,
      },
    ],
    [
      'medium weights',
      {
        config: {
          polarity:{weight: 0.5, scaling: 1.0, steepness: 5.0, shift: 0.1},
          objectivity:{weight: 0.5, scaling: 1.0, steepness: 5.0, shift: 0.1},
          bias:{weight: 0.5, scaling: 1.0, steepness: 5.0, shift: 0.1},
        },
        sentiment: {
          polarity: 1.0,
          subjectivity: 0.0,
        },
        bias: {
          label: "Normal",
          score: 1.0,
        },
        expected: (actual_score: number) => actual_score > 0.9,
      },
    ],
    [
      'deactive certain scores',
      {
        config: {
          polarity: {weight: 0.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          objectivity: {weight: 0.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
          bias: {weight: 1.0, scaling: 1.0, steepness: 5.0, shift: 0.1},
        },
        sentiment: {
          polarity: 0.6,
          subjectivity: 0.5,
        },
        bias: {
          label: "Non Biased",
          score: 0.1,
        },
        expected: (actual_score: number) => actual_score == 0.5
      },
    ],
    [
      'example usecase',
      {
        config: {
          polarity: {weight: 0.6, scaling: 1.0, steepness: 5.0, shift: 0.1},
          objectivity: {weight: 0.6, scaling: 1.0, steepness: 5.0, shift: 0.1},
          bias: {weight: 0.5, scaling: 1.0, steepness: 5.0, shift: 0.1},
        },
        sentiment: {
          polarity: 0.65,
          subjectivity: 0.3,
        },
        bias: {
          label: "Biased",
          score: 0.9,
        },
        expected: (actual_score: number) => actual_score > 0.5 && actual_score < 0.7,
      },
    ],
    [
      'fallback to default weights',
      {
        config: undefined,
        sentiment: {
          polarity: 1.0,
          subjectivity: 0.0,
        },
        bias: {
          label: "Normal",
          score: 1.0,
        },
        expected: (actual_score: number) => actual_score > 0.9,
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
  
    const service = new Service({
        bias: {
          weight: 1.0,
          scaling: 1.0,
          steepness: 5.0,
          shift: 0.1,
        },
        polarity: {
          weight: 1.0,
          scaling: 1.0,
          steepness: 5.0,
          shift: 0.1,
        },
        objectivity: {
          weight: 1.0,
          scaling: 1.0,
          steepness: 5.0,
          shift: 0.1,
        }
      }, sentimentMock, biasMock);

    // when
    const requestBody: TrustlevelCreateDto = {
      text: "Hello World!",
    }
    if (testCase.config) {
      requestBody.config = testCase.config;
    }
    const result = await service.determineTrustlevel(requestBody);
  
    // then
    expect(testCase.expected(result.trustlevel)).toBe(true);

    // TODO extract into dedicated test
    if (testCase.config) {
      // if custom config are passed metadata is returned
      expect(result.metadata?.bias.label).toBe(testCase.bias.label);
      expect(result.metadata?.bias.score).toBe(testCase.bias.score);
      expect(result.metadata?.sentiment.polarity).toBe(testCase.sentiment.polarity);
      expect(result.metadata?.sentiment.subjectivity).toBe(testCase.sentiment.subjectivity);
      expect(result.metadata?.config.bias.weight).toBe(testCase.config?.bias.weight);
      expect(result.metadata?.config.polarity.weight).toBe(testCase.config?.polarity.weight);
      expect(result.metadata?.config.objectivity.weight).toBe(testCase.config?.objectivity.weight);
    } else {
      expect(result.metadata).toBeUndefined()
    }
  })
});
