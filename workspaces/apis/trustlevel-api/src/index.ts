import {buildService} from './service-factory';
import {Service} from './service';
import {
  buildSuccessResponse,
  buildFailureResponse,
} from '@trustlevel/api-core/dist/response-builder';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {extractBody} from './components/requestExtraction';

let service: Service;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received trustlevel event');
  //console.debug("Received an event: %s", JSON.stringify(event, null, 2));

  try {
    const createDto = extractBody(event);

    if (!service) {
      service = buildService();
    }
    const trustlevel = await service.determineTrustlevel(createDto);
    console.log('Successfully handled trustlevel event');
    return buildSuccessResponse(event, 201, trustlevel);
  } catch (err) {
    console.error('Failed to handle trustlevel event');
    console.error(err);
    return buildFailureResponse(event, err);
  }
};
