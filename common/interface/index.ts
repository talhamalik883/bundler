import { ConsumeMessage } from 'amqplib';
import { BigNumber } from 'ethers';

export interface IQueue<TransactionMessageType> {
  chainId: number;
  transactionType?: string;
  connect(): Promise<void>
  publish(arg0: TransactionMessageType): Promise<boolean>
  consume(): Promise<boolean>
  ack(arg0: ConsumeMessage): Promise<void>
}

export type AccessListItem = {
  address: string;
  storageKeys: string[];
};

export type EVMRawTransactionType = {
  from: string;
  gasPrice?: string | BigNumber;
  maxFeePerGas?: string | BigNumber;
  maxPriorityFeePerGas?: string | BigNumber;
  gasLimit: string;
  to: string;
  value: string | number;
  data: string;
  chainId: number;
  nonce: number | string;
  accessList?: AccessListItem[];
  type?: number;
};

export interface IRetryPolicy {
  maxTries: number;
  shouldRetry: (err: any) => Promise<boolean>;
  incrementTry: () => void;
}
