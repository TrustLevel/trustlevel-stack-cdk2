import {TrustlevelCreateDto, TrustlevelDto} from './schema/dto';

export class Service {
  constructor() {}

  async determineTrustlevel(
    createDto: TrustlevelCreateDto
  ): Promise<TrustlevelDto> {
    console.log('determineTrustlevel called');

    // >TODO<
    return {
      trustlevel: 0.5,
    };
  }
}
