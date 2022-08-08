import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { sendToQueue } from '../../service-manager/queue';
import { generateTransactionId } from '../../utils/tx-id-generator';

const log = logger(module);

export const relayApi = async (req: Request, res: Response) => {
  try {
    const {
      type, to, data, gasLimit, chainId, value,
    } = req.body;
    const transactionId = generateTransactionId(data);
    const queueData = {
      transactionId, type, to, data, gasLimit, chainId, value,
    };
    const response = await sendToQueue(queueData);
    if (response.error) {
      return res.status(400).json({
        msg: 'bad request',
        error: response.error,
      });
    }
    return res.json({
      msg: 'all ok',
      data: {
        transactionId,
      },
    });
  } catch (error) {
    log.error(`Error in relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
