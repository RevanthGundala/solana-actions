import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../openapi';
import {
  ActionsSpecGetResponse,
  ActionsSpecPostRequestBody,
  ActionsSpecPostResponse,
} from '../../spec/actions-spec';
import { prepareTransaction } from '../transaction-utils';

const DESTINATION_WALLET = '3h4AtoLTh3bWwaLhdtgQtcC3a3Tokb8NJbtqR9rhp7p6';
const DEFAULT_AMOUNT_SOL = 0.2;

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Predict'],
    responses: actionsSpecOpenApiGetResponse,
  }),
  (c) => {
    const { icon, title, description } = getPredictionInfo();
    const amountParameterName = 'amount';
    const response: ActionsSpecGetResponse = {
      icon,
      label: `${DEFAULT_AMOUNT_SOL} SOL`,
      title,
      description,
      links: {
        actions: [
          {
            href: `/api/predict/yes/${DEFAULT_AMOUNT_SOL}`,
            label: 'Yes',
          },
          {
            href: `/api/predict/no/${DEFAULT_AMOUNT_SOL}`,
            label: 'No',
          },
          {
            href: `/api/predict/yes/{${amountParameterName}}`,
            label: 'Yes',
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom SOL amount',
              },
            ],
          },
          {
            href: `/api/predict/no/{${amountParameterName}}`,
            label: 'No',
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom SOL amount',
              },
            ],
          },
        ],
      },
    };

    return c.json(response, 200);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{answer}/{amount}',
    tags: ['Predict'],
    request: {
      params: z.object({
        president: z.string().openapi({
          param: {
            name: 'answer',
            in: 'path',
            required: true,
          },
          type: 'string',
          example: 'yes',
        }),
        amount: z
          .string()
          .optional()
          .openapi({
            param: {
              name: 'amount',
              in: 'path',
              required: false,
            },
            type: 'number',
            example: '1',
          }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    const answer = c.req.param('answer');
    const amount = c.req.param('amount') ?? DEFAULT_AMOUNT_SOL.toString();
    const { account } = (await c.req.json()) as ActionsSpecPostRequestBody;

    const parsedAmount = parseFloat(amount);
    const transaction = await preparePredictTransaction(
      new PublicKey(account),
      new PublicKey(DESTINATION_WALLET),
      parsedAmount * LAMPORTS_PER_SOL,
    );
    const response: ActionsSpecPostResponse = {
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
    };
    return c.json(response, 200);
  },
);

function getPredictionInfo(): Pick<
  ActionsSpecGetResponse,
  'icon' | 'title' | 'description'
> {
  const icon =
    'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';
  const title = "Will Trump win tonight's debate? 🤔";
  const description = `Sleepy Joe vs Daddy Trump. Place your bets now! 🚀 (Default ${DEFAULT_AMOUNT_SOL} SOL)`;

  return { icon, title, description };
}
async function preparePredictTransaction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<VersionedTransaction> {
  const payer = new PublicKey(sender);
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(recipient),
      lamports: lamports,
    }),
  ];
  return prepareTransaction(instructions, payer);
}

export default app;
