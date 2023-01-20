import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { scwSimulationServiceMap } from '../../../../common/service-manager';
import { STATUSES } from '../../middleware';

const log = logger(module);

export const simulateSCWTransaction = async (req: Request) => {
  try {
    const {
      to, data, chainId, refundInfo,
    } = req.body.params[0];

    const scwSimulationResponse = await scwSimulationServiceMap[chainId].simulate({
      to,
      data,
      chainId,
      refundInfo,
    });

    if (!scwSimulationResponse.isSimulationSuccessful) {
      const { message } = scwSimulationResponse;
      return {
        code: STATUSES.BAD_REQUEST,
        message,
      };
    }
    const { gasLimitFromSimulation } = scwSimulationResponse;
    req.body.params[1] = gasLimitFromSimulation;
    log.info(`Transaction successfully simulated for SCW: ${to} on chainId: ${chainId}`);
    return {
      code: STATUSES.SUCCESS,
      message: 'Transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in SCW transaction simulation ${JSON.stringify(error)}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in SCW transaction simulation ${JSON.stringify(error)}`,
    };
  }
};
