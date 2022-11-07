import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap } from '../../../../common/service-manager';
import { isError, TransactionType } from '../../../../common/types';
import { generateTransactionId } from '../../../../common/utils';
import { config } from '../../../../config';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relayAATransaction = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];
    const gasLimitFromSimulation = req.body.params[3];

    const transactionId = generateTransactionId(userOp);

    const walletAddress = userOp.sender;

    const response = routeTransactionToRelayerMap[chainId][TransactionType.AA]
      .sendTransactionToRelayer({
        type: TransactionType.AA,
        to: entryPointAddress,
        data: '0x0',
        gasLimit: `0x${Number(gasLimitFromSimulation).toString(16)}`,
        chainId,
        value: '0x0',
        userOp,
        transactionId,
        walletAddress,
      });
    if (isError(response)) {
      return res.status(400).json({
        code: 400,
        error: response.error,
      });
    }
    return res.status(200).json({
      code: 200,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in AA relay ${error}`);
    return res.status(500).json({
      code: 500,
      error: JSON.stringify(error) || 'Internal server error',
    });
  }
};
