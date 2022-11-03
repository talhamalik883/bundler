import { IQueue } from '../../../../../common/queue';
import {
  AATransactionMessageType,
  EntryPointMapType,
  EVMRawTransactionType,
  SCWTransactionMessageType,
  TransactionQueueMessageType,
} from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { IRelayerManager } from '../../relayer-manager';
import { ITransactionService } from '../../transaction-service';

export type AAConsumerParamsType = {
  queue: IQueue<AATransactionMessageType>,
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  options: {
    chainId: number,
    entryPointMap: EntryPointMapType
  },
};

export type SCWConsumerParamsType = {
  queue: IQueue<SCWTransactionMessageType>,
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  options: {
    chainId: number,
  },
};

export type SocketConsumerParamsType = {
  queue: IQueue<TransactionQueueMessageType>;
  options: {
    chainId: number,
    wssUrl: string,
  },
};
