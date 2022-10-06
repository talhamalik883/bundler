import { ethers } from 'ethers';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { ITransactionService } from '../../transaction-service';

export type TransactionQueueMessageType = ethers.providers.TransactionResponse;

export type EVMRetryTransactionServiceParamsType = {
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  retryTransactionQueue: IQueue<TransactionQueueMessageType>,
  options: {
    chainId: number
  },
};
