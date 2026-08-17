import type {
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PERSON_TABLE_NAME!;

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const personId = event.requestContext.authorizer.jwt.claims['custom:personId'] as
    | string
    | undefined;

  if (!personId) {
    return jsonResponse(400, { message: 'Authenticated user is missing personId.' });
  }

  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { personId } }),
  );

  if (!result.Item) {
    return jsonResponse(404, { message: 'Person record not found.' });
  }

  const groupsClaim = event.requestContext.authorizer.jwt.claims['cognito:groups'];
  const groups = Array.isArray(groupsClaim)
    ? groupsClaim
    : typeof groupsClaim === 'string'
      ? groupsClaim
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((group) => group.trim())
          .filter(Boolean)
      : [];
  const userType: 'ADMIN' | 'USER' = groups.includes('admin') ? 'ADMIN' : 'USER';

  return jsonResponse(200, { ...result.Item, userType });
};
