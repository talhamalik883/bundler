/* eslint-disable no-continue */
import { EVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { EVMRawTransactionType } from '../../types';
import { parseError } from '../../utils';
import { SimulateHandleOpsParamsType } from '../types';
import { logger } from '../../log-config';
import { config } from '../../../config';

const log = logger(module);

export class AlchemySimulationService {
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  constructor(networkSerivce: INetworkService<EVMAccount, EVMRawTransactionType>) {
    this.networkService = networkSerivce;
  }

  async simulateHandleOps(simualteHandleOpsData: SimulateHandleOpsParamsType) {
    try {
      const {
        userOp,
        entryPointContract,
        chainId,
      } = simualteHandleOpsData;

      const {
        publicKey,
      } = config.relayerManagers[0].ownerAccountDetails[chainId];
      log.info(`Simulating with from address: ${publicKey} on chainId: ${chainId}`);

      const {
        data,
      } = await entryPointContract.populateTransaction.handleOps([userOp], publicKey);

      const simulateExecutionStart = performance.now();
      const response = await this.networkService.sendRpcCall(
        'alchemy_simulateExecution',
        [
          {
            from: publicKey,
            to: entryPointContract.address,
            value: '0x0',
            data,
          },
        ],
      );
      const simulateExecutionEnd = performance.now();
      log.info(`Network call to alchemy_simulateExecution took: ${simulateExecutionEnd - simulateExecutionStart} milliseconds`);

      const {
        calls,
        logs,
      } = response.data.result;

      // If no logs then transaction reverted, so inside the if it is a successful txn
      if (logs.length !== 0) {
        const start = performance.now();
        const userOperationEvent = logs.find((events: any) => events.topics[0] === '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f');
        const successData = userOperationEvent.decoded.inputs[4];
        if (successData !== 'true') {
          return {
            reason: 'userOp execution failed',
            totalGas: 0,
            data,
          };
        }
        const end = performance.now();
        log.info(`Checking userOp execution took: ${end - start} milliseconds`);
      } else {
        const start = performance.now();
        const transactionCall = calls.find((call: any) => call.error === 'execution reverted');
        const error = entryPointContract.interface.parseError(transactionCall.output);
        const {
          args,
        } = error;
        const end = performance.now();
        log.info(`Checking transaction execution revert took: ${end - start} milliseconds`);
        return {
          reason: args.reason,
          totalGas: 0,
          data,
        };
      }

      const totalGasStart = performance.now();
      const totalGas = calls.reduce((total: any, call: any) => total + Number(call.gasUsed), 0);
      const totalGasEnd = performance.now();
      log.info(`Calculating total gas took: ${totalGasEnd - totalGasStart} milliseconds`);

      return {
        totalGas,
      };
    } catch (error) {
      log.error(`Error in Alchemy handleOps simulation: ${parseError(error)}`);
      return {
        totalGas: 0,
      };
    }
  }
}
