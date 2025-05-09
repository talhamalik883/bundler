import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import {
  transactionDao,
  userOperationV07Dao,
  userOperationStateDao,
  routeTransactionToRelayerMap,
} from "../../../../common/service-manager";
import {
  generateTransactionId,
  getPaymasterFromPaymasterAndDataV7,
  parseError,
} from "../../../../common/utils";
import {
  isError,
  TransactionStatus,
  TransactionType,
  UserOperationStateEnum,
} from "../../../../common/types";
import { STATUSES } from "../../shared/statuses";
import { BUNDLER_ERROR_CODES } from "../../shared/errors/codes";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const bundleUserOperation = async (req: Request, res: Response) => {
  try {
    const start = performance.now();
    const { id } = req.body;
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    let gasLimitFromSimulation = req.body.params[2] + 500000;
    const userOpHash = req.body.params[3];
    const { chainId, apiKey } = req.params;

    const chainIdInNum = parseInt(chainId, 10);
    if (chainIdInNum === 5000) {
      gasLimitFromSimulation += 5000000000;
    }


    if (!routeTransactionToRelayerMap[chainIdInNum][TransactionType.BUNDLER]) {
      const end = performance.now();
      log.info(`bundleUserOperation took: ${end - start} milliseconds`);
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: BUNDLER_ERROR_CODES.BAD_REQUEST,
          message: `${TransactionType.BUNDLER} method not supported for chainId: ${chainId}`,
        },
      });
    }

    const transactionId = generateTransactionId(Date.now().toString());
    log.info(
      `transactionId: ${transactionId} for userOpHash: ${userOpHash} on chainId: ${chainIdInNum} for apiKey: ${apiKey}`,
    );
    const walletAddress = userOp.sender.toLowerCase();

    transactionDao.save(chainIdInNum, {
      transactionId,
      transactionType: TransactionType.BUNDLER,
      status: TransactionStatus.PENDING,
      chainId: chainIdInNum,
      walletAddress,
      resubmitted: false,
      creationTime: Date.now(),
    });

    log.info(
      `Saving userOp state: ${UserOperationStateEnum.BUNDLER_MEMPOOL} for transactionId: ${transactionId} on chainId: ${chainIdInNum}`,
    );

    userOperationStateDao.save(chainIdInNum, {
      transactionId,
      userOpHash,
      state: UserOperationStateEnum.BUNDLER_MEMPOOL,
    });

    const {
      sender,
      nonce,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature,
      paymasterData,
      factory,
      factoryData,
      paymasterPostOpGasLimit,
      paymasterVerificationGasLimit,
    } = userOp;

    const paymaster = getPaymasterFromPaymasterAndDataV7(paymasterAndData);

    userOperationV07Dao.save(chainIdInNum, {
      transactionId,
      apiKey,
      status: TransactionStatus.PENDING,
      entryPoint: entryPointAddress,
      sender,
      nonce,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      signature,
      userOpHash,
      chainId: chainIdInNum,
      paymaster,
      paymasterData,
      paymasterPostOpGasLimit,
      paymasterVerificationGasLimit,
      factory,
      factoryData,
      creationTime: Date.now(),
    });

    const response = routeTransactionToRelayerMap[chainIdInNum][
      TransactionType.BUNDLER
    ].sendUserOperation({
      type: TransactionType.BUNDLER,
      to: entryPointAddress,
      data: "0x0",
      gasLimit: `0x${Number(gasLimitFromSimulation).toString(16)}`,
      chainId: chainIdInNum,
      value: "0x0",
      userOp,
      transactionId,
      walletAddress,
    });

    if (isError(response)) {
      const end = performance.now();
      log.info(`bundleUserOperation took: ${end - start} milliseconds`);
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: BUNDLER_ERROR_CODES.BAD_REQUEST,
          message: response.error,
        },
      });
    }

    const end = performance.now();
    log.info(`bundleUserOperation took: ${end - start} milliseconds`);
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: userOpHash,
    });
  } catch (error) {
    const { id } = req.body;
    log.error(`Error in bundle user op ${parseError(error)}`);

    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: id || 1,
      error: {
        code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
