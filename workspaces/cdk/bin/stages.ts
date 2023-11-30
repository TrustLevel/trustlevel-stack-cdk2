export enum Stage {
  dev,
  prd,
}

export const stageAppendix = (stage: Stage) => `-${Stage[stage]}`;

export const stageByParam = (stageParam: string): Stage => {
  switch (stageParam) {
    case 'dev':
      return Stage.dev;
    case 'prd':
      return Stage.prd;
    default:
      throw Error(`Unknown stage param: ${stageParam}`);
  }
};
