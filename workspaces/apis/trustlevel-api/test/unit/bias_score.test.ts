import * as service from "../../src/service";

describe('bias score tests', () => {
  test.each([
    [
      'best score should be greater than 0.9',
      {
        bias: {
          label: "Non Biased",
          score: 1.0,
        },
        expected: (actual_score: number) => actual_score > 0.9,
      },    
    ],
    [
      'worst score should be less than 0.1',
      {
        bias: {
          label: "Biased",
          score: 1.0,
        },
        expected: (actual_score: number) => actual_score < 0.1,
      },    
    ],
    [
      'low biased score should be ~ 0.2',
      {
        bias: {
          label: "Biased",
          score: 0.1,
        },
        expected: (actual_score: number) => actual_score > 0.2 && actual_score < 0.3,
      },    
    ],
    [
      'low non biased score should be ~ 0.5',
      {
        bias: {
          label: "Non Biased",
          score: 0.1,
        },
        expected: (actual_score: number) => actual_score > 0.4 && actual_score < 0.6,
      },    
    ],
  ])('%s', async (description, testCase) => {
    // given
    const result = service.biasToTrustLevel(testCase.bias, {
      scaling: 1.0,
      steepness: 5.0,
      shift: 0.1,
    });

    // then
    expect(testCase.expected(result)).toBe(true);
  })
});
