import * as service from "../../src/service";

describe('objectivity score tests', () => {
  test.each([
    [
      'best score should be greater than 0.9',
      {
        subjectivity: 0.0,
        expected: (actual_score: number) => actual_score > 0.9,
      },    
    ],
    [
      'worst score should be less than 0.1',
      {
        subjectivity: 1.0,
        expected: (actual_score: number) => actual_score <  0.1,
      },    
    ],
    [
      'neither objective nor subjective should be ~ 0.3',
      {
        subjectivity: 0.5,
        expected: (actual_score: number) => actual_score > 0.3 && actual_score < 0.4,
      },    
    ],
  ])('%s', async (description, testCase) => {
    // given
    const result = service.subjectivityToTrustLevel(testCase.subjectivity, {
      scaling: 1.0,
      steepness: 5.0,
      shift: 0.1,
    });

    console.log(description, result, "actual:", testCase.expected(result));

    // then
    expect(testCase.expected(result)).toBe(true);
  })
});
