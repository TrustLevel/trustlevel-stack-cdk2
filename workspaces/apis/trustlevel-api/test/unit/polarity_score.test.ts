import * as service from "../../src/service";

describe('polarity score tests', () => {
  test.each([
    [
      'best score should be greater than 0.9',
      {
        polarity: 1.0,
        expected: (actual_score: number) => actual_score > 0.9,
      },    
    ],
    [
      'worst score should be less than 0.1',
      {
        polarity: -1.0,
        expected: (actual_score: number) => actual_score <  0.1,
      },    
    ],
    [
      'neither objective nor subjective should be ~ 0.3',
      {
        polarity: 0.0,
        expected: (actual_score: number) => actual_score > 0.3 && actual_score < 0.4,
      },    
    ],
  ])('%s', async (description, testCase) => {
    // given
    const result = service.polarityToTrustLevel(testCase.polarity, {
      scaling: 1.0,
      steepness: 5.0,
      shift: 0.1,
    });

    console.log(description, result, "actual:", testCase.expected(result));

    // then
    expect(testCase.expected(result)).toBe(true);
  })
});
