import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType, TransactionStatus } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  EVMTransactionListenerParamsType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionMessageType,
} from './types';

const log = logger(module);

export class EVMTransactionListener implements
ITransactionListener<IEVMAccount, EVMRawTransactionType>,
ITransactionPublisher<TransactionMessageType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionQueue: IQueue<TransactionMessageType>;

  retryTransactionQueue: IQueue<TransactionMessageType>;

  transactionDao: ITransactionDAO;

  constructor(
    evmTransactionListenerParams: EVMTransactionListenerParamsType,
  ) {
    const {
      options, networkService, transactionQueue, retryTransactionQueue, transactionDao,
    } = evmTransactionListenerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.transactionQueue = transactionQueue;
    this.retryTransactionQueue = retryTransactionQueue;
    this.transactionDao = transactionDao;
  }

  async publishToTransactionQueue(data: TransactionMessageType): Promise<boolean> {
    await this.transactionQueue.publish(data);
    return true;
  }

  async publishToRetryTransactionQueue(data: TransactionMessageType): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(onTranasctionSuccessParams: OnTransactionSuccessParamsType) {
    const {
      transactionExecutionResponse, transactionId, relayerAddress, userAddress,
    } = onTranasctionSuccessParams;

    log.info(`Publishing transaction data of transactionId: ${transactionId} to transaction queue`);
    await this.publishToTransactionQueue(transactionExecutionResponse);

    log.info(`Saving transaction data in database for ${transactionId}`);
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      userAddress,
    );
  }

  private async onTransactionFailure(onTranasctionFailureParams: OnTransactionFailureParamsType) {
    const {
      transactionExecutionResponse, transactionId, relayerAddress, userAddress,
    } = onTranasctionFailureParams;

    log.info(`Publishing transaction data of transactionId: ${transactionId} to transaction queue`);
    await this.publishToTransactionQueue(transactionExecutionResponse);

    log.info(`Saving transaction data in database for ${transactionId}`);
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      userAddress,
    );
  }

  private async saveTransactionDataToDatabase(
    transactionExecutionResponse: ethers.providers.TransactionResponse,
    transactionId: string,
    relayerAddress: string,
    userAddress?: string,
  ): Promise<void> {
    const transactionDataToBeSaveInDatabase = {
      transactionId,
      transactionHash: transactionExecutionResponse.hash,
      status: TransactionStatus.PENDING,
      rawTransaction: transactionExecutionResponse,
      chainId: this.chainId,
      gasPrice: transactionExecutionResponse.gasPrice,
      receipt: {},
      relayerAddress,
      userAddress,
      creationTime: Date.now(),
      updationTime: Date.now(),
    };
    await this.transactionDao.save(this.chainId, transactionDataToBeSaveInDatabase);
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<void> {
    const {
      transactionExecutionResponse, transactionId, relayerAddress, userAddress,
    } = notifyTransactionListenerParams;
    if (!transactionExecutionResponse) {
      log.error('transactionExecutionResponse is null');
      return;
    }
    const tranasctionHash = transactionExecutionResponse.hash;
    log.info(`Transaction hash is: ${tranasctionHash} for transactionId: ${transactionId}`);

    // publish to queue with expiry header
    log.info(`Publishing transaction data of transactionId: ${transactionId} to retry transaction queue`);
    await this.publishToRetryTransactionQueue(transactionExecutionResponse);
    // pop happens when expiry header expires
    // retry txn service will check for receipt
    const transactionReceipt = await this.networkService.waitForTransaction(tranasctionHash);
    log.info(`Transaction receipt is: ${JSON.stringify(transactionReceipt)} for transactionId: ${transactionId}`);

    if (transactionReceipt.status === 1) {
      log.info(`Transaction is a success for transactionId: ${transactionId}`);
      this.onTransactionSuccess({
        transactionExecutionResponse, transactionId, relayerAddress, userAddress,
      });
    } else if (transactionReceipt.status === 0) {
      log.info(`Transaction is a failure for transactionId: ${transactionId}`);
      this.onTransactionFailure({
        transactionExecutionResponse, transactionId, relayerAddress, userAddress,
      });
    }
  }
}
