import { ICacheService } from '../../../../common/cache';
import { ITransactionDAO } from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { RetryTransactionQueueData } from '../../../../common/queue/types';
import {
  EVMRawTransactionType,
  SocketEventType,
  TransactionQueueMessageType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { getRetryTransactionCountKey, getTokenPriceKey } from '../../../../common/utils';
import { IEVMAccount } from '../account';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  EVMTransactionListenerParamsType,
  NewTransactionDataToBeSavedInDatabaseType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionDataToBeUpdatedInDatabaseType,
  TransactionListenerNotifyReturnType,
} from './types';
import { IRelayerBalanceManager } from '../../../../common/service-manager/interface/IRelayerBalanceManager';
import { config } from '../../../../config';

const log = logger(module);

export class EVMTransactionListener implements
  ITransactionListener<IEVMAccount, EVMRawTransactionType>,
  ITransactionPublisher<TransactionQueueMessageType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionQueue: IQueue<TransactionQueueMessageType>;

  retryTransactionQueue: IQueue<RetryTransactionQueueData>;

  relayerBalanceManager: IRelayerBalanceManager | undefined;

  transactionDao: ITransactionDAO;

  cacheService: ICacheService;

  constructor(
    evmTransactionListenerParams: EVMTransactionListenerParamsType,
  ) {
    const {
      options,
      networkService,
      transactionQueue,
      retryTransactionQueue,
      transactionDao,
      cacheService,
    } = evmTransactionListenerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.transactionQueue = transactionQueue;
    this.retryTransactionQueue = retryTransactionQueue;
    this.transactionDao = transactionDao;
    this.cacheService = cacheService;
  }

  async setRelayerBalanceManager(_relayerBalanceManager: IRelayerBalanceManager) {
    this.relayerBalanceManager = _relayerBalanceManager;
  }

  async publishToTransactionQueue(data: TransactionQueueMessageType): Promise<boolean> {
    await this.transactionQueue.publish(data);
    return true;
  }

  async publishToRetryTransactionQueue(data: RetryTransactionQueueData): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(onTranasctionSuccessParams: OnTransactionSuccessParamsType) {
    const {
      transactionExecutionResponse,
      transactionReceipt,
      transactionId,
      relayerManagerName,
    } = onTranasctionSuccessParams;
    if (!transactionReceipt) {
      log.error(`Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return;
    }

    log.info(`Publishing to transaction queue on success for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: transactionReceipt,
      event: SocketEventType.onTransactionMined,
    });
    if (transactionExecutionResponse) {
      log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
      let transactionFee: number;
      let transactionFeeInUSD: number;
      let transactionFeeCurrency: string;
      if (!transactionReceipt.gasUsed || !transactionReceipt.effectiveGasPrice) {
        log.info(`gasUsed or effectiveGasPrice field not found in ${JSON.stringify(transactionExecutionResponse)}`);
        transactionFee = 0;
        transactionFeeInUSD = 0;
        transactionFeeCurrency = '';
      } else {
        transactionFee = Number(transactionReceipt.gasUsed.mul(
          transactionReceipt.effectiveGasPrice,
        ));
        transactionFeeCurrency = config.chains.currency[this.chainId];
        const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
        if (!coinsRateObj) {
          log.info('Coins Rate Obj not fetched from cache'); // TODO should it make call to token price service?
        }
        // TODO @kunal047 can add this logic to save fee in USD
        transactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId];
      }
      await this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        receipt: transactionReceipt,
        transactionFee,
        transactionFeeInUSD,
        transactionFeeCurrency,
        status: TransactionStatus.SUCCESS,
        updationTime: Date.now(),
      }, transactionId, transactionExecutionResponse?.hash);
    }
  }

  private async onTransactionFailure(onTranasctionFailureParams: OnTransactionFailureParamsType) {
    const {
      transactionExecutionResponse,
      transactionId,
      transactionReceipt,
      relayerManagerName,
    } = onTranasctionFailureParams;
    if (!transactionReceipt) {
      log.error(`Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return;
    }
    log.info(`Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: transactionReceipt,
      event: SocketEventType.onTransactionMined,
    });

    if (transactionExecutionResponse) {
      log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
      let transactionFee: number;
      let transactionFeeInUSD : number;
      let transactionFeeCurrency: string;
      if (!transactionReceipt.gasUsed || !transactionReceipt.effectiveGasPrice) {
        log.info(`gasUsed or effectiveGasPrice field not found in ${JSON.stringify(transactionExecutionResponse)}`);
        transactionFee = 0;
        transactionFeeInUSD = 0;
        transactionFeeCurrency = '';
      } else {
        transactionFee = Number(transactionReceipt.gasUsed.mul(
          transactionReceipt.effectiveGasPrice,
        ));
        transactionFeeCurrency = config.chains.currency[this.chainId];
        const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
        if (!coinsRateObj) {
          log.info('Coins Rate Obj not fetched from cache'); // TODO should it make call to token price service?
        }
        // TODO @kunal047 can add this logic to save fee in USD
        transactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId];
      }
      await this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        receipt: transactionReceipt,
        transactionFee,
        transactionFeeInUSD,
        transactionFeeCurrency,
        status: TransactionStatus.FAILED,
        updationTime: Date.now(),
      }, transactionId, transactionExecutionResponse?.hash);
    }
  }

  private async updateTransactionDataToDatabase(
    transactionDataToBeUpdatedInDatabase: TransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionId(
      this.chainId,
      transactionId,
      transactionDataToBeUpdatedInDatabase,
    );
  }

  private async saveNewTransactionDataToDatabase(
    newTransactionDataToBeSavedInDatabase: NewTransactionDataToBeSavedInDatabaseType,
  ): Promise<void> {
    await this.transactionDao.save(
      this.chainId,
      newTransactionDataToBeSavedInDatabase,
    );
  }

  private async updateTransactionDataToDatabaseByTransactionIdAndTransactionHash(
    transactionDataToBeUpdatedInDatabase: TransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
    transactionHash: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionIdAndTransactionHash(
      this.chainId,
      transactionId,
      transactionHash,
      transactionDataToBeUpdatedInDatabase,
    );
  }

  private async waitForTransaction(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ) {
    const {
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      previousTransactionHash,
      walletAddress,
      metaData,
      transactionType,
      relayerManagerName,
    } = notifyTransactionListenerParams;
    if (!transactionExecutionResponse) {
      return;
    }
    // TODO : add error check
    const tranasctionHash = transactionExecutionResponse.hash;
    log.info(`Transaction hash is: ${tranasctionHash} for transactionId: ${transactionId} on chainId ${this.chainId}`);

    const transactionReceipt = await this.networkService.waitForTransaction(tranasctionHash);
    log.info(`Transaction receipt is: ${JSON.stringify(transactionReceipt)} for transactionId: ${transactionId} on chainId ${this.chainId}`);

    // TODO: reduce pending count of relayer via RelayerManager
    await this.cacheService.delete(getRetryTransactionCountKey(transactionId, this.chainId));

    if (transactionReceipt.status === 1) {
      log.info(`Transaction is a success for transactionId: ${transactionId} on chainId ${this.chainId}`);
      this.onTransactionSuccess({
        transactionExecutionResponse,
        transactionId,
        transactionReceipt,
        relayerAddress,
        transactionType,
        previousTransactionHash,
        walletAddress,
        metaData,
        relayerManagerName,
      });
    }
    if (transactionReceipt.status === 0) {
      log.info(`Transaction is a failure for transactionId: ${transactionId} on chainId ${this.chainId}`);
      this.onTransactionFailure({
        transactionExecutionResponse,
        transactionId,
        transactionReceipt,
        relayerAddress,
        transactionType,
        previousTransactionHash,
        walletAddress,
        metaData,
        relayerManagerName,
      });
    }

    if (transactionType !== TransactionType.FUNDING && transactionType !== TransactionType.AA) {
      this.relayerBalanceManager!.onTransaction(transactionReceipt, transactionType, this.chainId);
    }
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<TransactionListenerNotifyReturnType> {
    const {
      transactionExecutionResponse,
      transactionId,
      rawTransaction,
      relayerAddress,
      transactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      previousTransactionHash,
      error,
    } = notifyTransactionListenerParams;

    if (!transactionExecutionResponse) {
      await this.publishToTransactionQueue({
        transactionId,
        relayerManagerName,
        error,
        event: SocketEventType.onTransactionError,
      });
      log.error('transactionExecutionResponse is null');
      return {
        isTransactionRelayed: false,
        transactionExecutionResponse: null,
      };
    }

    if (!previousTransactionHash) {
      // Save initial transaction data to database
      this.updateTransactionDataToDatabase({
        transactionHash: transactionExecutionResponse.hash,
        rawTransaction: transactionExecutionResponse,
        relayerAddress,
        gasPrice: transactionExecutionResponse.gasPrice,
        status: TransactionStatus.PENDING,
        updationTime: Date.now(),
      }, transactionId);
    } else {
      this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        resubmitted: true,
        status: TransactionStatus.DROPPED,
        updationTime: Date.now(),
      }, transactionId, previousTransactionHash);
      this.saveNewTransactionDataToDatabase({
        transactionId,
        transactionType,
        transactionHash: transactionExecutionResponse.hash,
        previousTransactionHash,
        status: TransactionStatus.PENDING,
        rawTransaction: transactionExecutionResponse,
        chainId: this.chainId,
        gasPrice: transactionExecutionResponse.gasPrice,
        relayerAddress,
        walletAddress,
        metaData,
        resubmitted: false,
        creationTime: Date.now(),
        updationTime: Date.now(),
      });
    }

    // transaction queue is being listened by socket service to notify the client about the hash
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: undefined,
      event: previousTransactionHash
        ? SocketEventType.onTransactionHashChanged : SocketEventType.onTransactionHashGenerated,
    });
    // retry txn service will check for receipt
    log.info(`Publishing transaction data of transactionId: ${transactionId} to retry transaction queue on chainId ${this.chainId}`);
    await this.publishToRetryTransactionQueue({
      relayerAddress,
      transactionType,
      transactionHash: transactionExecutionResponse.hash,
      transactionId,
      rawTransaction: rawTransaction as EVMRawTransactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      event: SocketEventType.onTransactionHashGenerated,
    });

    // wait for transaction
    this.waitForTransaction(notifyTransactionListenerParams);

    return {
      isTransactionRelayed: true,
      transactionExecutionResponse,
    };
  }
}
