import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { BUNDLER_VALIDATION_STATUSES } from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { EVMRawTransactionType, UserOperationType } from '../types';
import { parseError } from '../utils';
import RpcError from '../utils/rpc-error';
import { AASimulationDataType, SimulationResponseType } from './types';

const log = logger(module);
export class BundlerSimulationAndValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async simulateAndValidate(
    simulationData: AASimulationDataType,
  ): Promise<SimulationResponseType> {
    const { userOp, entryPointContract, chainId } = simulationData;
    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    let isSimulationSuccessful = true;
    try {
      const simulationResult = await entryPointStatic.callStatic.simulateValidation(userOp)
        .catch((e: any) => e);
      log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
      BundlerSimulationAndValidationService.parseUserOpSimulationResult(userOp, simulationResult);
    } catch (error: any) {
      log.info(`AA Simulation failed: ${parseError(error)}`);
      isSimulationSuccessful = false;
      return {
        isSimulationSuccessful,
        data: {
          gasLimitFromSimulation: 0,
        },
        code: error.code,
        message: parseError(error),
      };
    }

    const estimatedGasForUserOp = await this.networkService.estimateGas(
      entryPointContract,
      'handleOps',
      [[userOp],
        config.feeOption.refundReceiver[chainId]],
      config.zeroAddress,
    );
    // const estimatedGasForUserOp = BigNumber.from('3000000');

    log.info(`Estimated gas is: ${estimatedGasForUserOp} from ethers for userOp: ${JSON.stringify(userOp)}`);
    if (!estimatedGasForUserOp || !estimatedGasForUserOp._isBigNumber) {
      return {
        isSimulationSuccessful: false,
        data: {
          gasLimitFromSimulation: 0,
        },
        message: parseError(estimatedGasForUserOp),
      };
    }

    let userOpHash: string = '';
    try {
      userOpHash = await entryPointContract.getUserOpHash(userOp);
      log.info(`userOpHash: ${userOpHash} for userOp: ${JSON.stringify(userOp)}`);
    } catch (error) {
      log.info(`Error in getting userOpHash for userOp: ${JSON.stringify(userOp)} with error: ${parseError(error)}`);
    }

    return {
      isSimulationSuccessful,
      data: {
        gasLimitFromSimulation: estimatedGasForUserOp,
        userOpHash,
      },
      message: 'Success',
    };
  }

  static parseUserOpSimulationResult(userOp: UserOperationType, simulationResult: any) {
    if (!simulationResult?.errorName?.startsWith('ValidationResult')) {
      log.info(`Inside ${!simulationResult?.errorName?.startsWith('ValidationResult')}`);
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      log.info(`simulationResult.errorArgs: ${simulationResult.errorArgs}`);
      if (!simulationResult.errorArgs) {
        throw Error(`errorArgs not present in simulationResult: ${JSON.stringify(simulationResult)}`);
      }
      let { paymaster } = simulationResult.errorArgs;
      if (paymaster === config.zeroAddress) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string = simulationResult.errorArgs?.reason ?? simulationResult.toString()

      if (paymaster == null) {
        log.info(`account validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw new RpcError(msg, BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED);
      } else {
        log.info(`paymaster validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw new RpcError(msg, BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED);
      }
    }
    return true;

    // const {
    //   returnInfo,
    //   senderInfo,
    // factoryInfo,
    // paymasterInfo,
    // aggregatorInfo, // may be missing (exists only SimulationResultWithAggregator
    // } = simulationResult.errorArgs;

    // extract address from "data" (first 20 bytes)
    // add it as "addr" member to the "stakeinfo" struct
    // if no address, then return "undefined" instead of struct.
    // function fillEntity(data: BytesLike, info: StakeInfo): StakeInfo | undefined {
    //   const addr = getAddr(data);
    //   return addr == null
    //     ? undefined
    //     : {
    //       ...info,
    //       addr,
    //     };
    // }

    // return {
    //   returnInfo,
    //   senderInfo: {
    //     ...senderInfo,
    //     addr: userOp.sender,
    //   },
    // factoryInfo: fillEntity(userOp.initCode, factoryInfo),
    // paymasterInfo: fillEntity(userOp.paymasterAndData, paymasterInfo),
    // aggregatorInfo: fillEntity(aggregatorInfo?.actualAggregator, aggregatorInfo?.stakeInfo),
    // };
  }
}
