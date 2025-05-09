import { Request, Response } from "express";
import { toHex } from "viem";
import { logger } from "../../../../common/logger";
import { gasPriceServiceMap } from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";
import { STATUSES } from "../../shared/statuses";
import { BUNDLER_ERROR_CODES } from "../../shared/errors/codes";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const getGasFeeValues = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    const gasPrice = await gasPriceServiceMap[Number(chainId)]?.getGasPrice();

    let maxFeePerGas: bigint;
    let maxPriorityFeePerGas: bigint;

    if (typeof gasPrice !== "bigint") {
      log.info(
        `Gas price for chainId: ${chainId} is: ${customJSONStringify(
          gasPrice,
        )}`,
      );
      maxFeePerGas = gasPrice?.maxFeePerGas || 1n;
      maxPriorityFeePerGas = gasPrice?.maxPriorityFeePerGas || 1n;
    } else {
      maxFeePerGas = gasPrice;
      maxPriorityFeePerGas = gasPrice;
    }

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        slow: {
          maxPriorityFeePerGas: toHex(maxPriorityFeePerGas)?.toString(),
          maxFeePerGas: toHex(maxFeePerGas)?.toString(),
        },
        standard: {
          maxPriorityFeePerGas: toHex(maxPriorityFeePerGas)?.toString(),
          maxFeePerGas: toHex(maxFeePerGas)?.toString(),
        },
        fast: {
          maxPriorityFeePerGas: toHex(maxPriorityFeePerGas)?.toString(),
          maxFeePerGas: toHex(maxFeePerGas)?.toString(),
        },
      },
    });
  } catch (error) {
    log.error(`Error in getGasFeeValues handler ${parseError(error)}`);
    const { id } = req.body;

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
