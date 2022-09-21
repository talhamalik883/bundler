import { ConsumeMessage } from 'amqplib';
<<<<<<< HEAD
=======
import { BigNumber } from 'ethers';
>>>>>>> development-kunal

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  VANILLA_GASLESS = 'VANILLA_GASLESS',
  CROSS_CHAIN = 'CROSS_CHAIN',
}

export enum RelayerManagerType {
  AA = 0,
  SCW = 0,
  VANILLA_GASLESS = 0,
  CROSS_CHAIN = 1,
}

export interface IQueue<TransactionMessageType> {
  chainId: number;
  transactionType?: string;
  connect(): Promise<void>
  publish(arg0: TransactionMessageType): Promise<boolean>
  consume(): Promise<boolean>
  ack(arg0: ConsumeMessage): Promise<void>
}

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

export type AccessListItem = {
  address: string;
  storageKeys: string[];
};

export interface IRetryPolicy {
  maxTries: number;
  shouldRetry: (err: any) => Promise<boolean>;
  incrementTry: () => void;
}

export type AATransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
};

export type SCWTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
};

export interface IQueue<TransactionMessageType> {
  chainId: number;
  transactionType?: string;
  connect(): Promise<void>
  publish(arg0: TransactionMessageType): Promise<boolean>
  consume(): Promise<boolean>
  ack(arg0: ConsumeMessage): Promise<void>
}

export type EVMRawTransactionType = {
  nonce: string,
  to: string,
  data: string,
  chainId: number,
  value: string,
  gasPrice: string,
  gasLimit: string,
};

<<<<<<< HEAD
export interface IRetryPolicy {
  maxTries: number;
  shouldRetry: (err: any) => Promise<boolean>;
  incrementTry: () => void;
}

export enum TransactionStatus {
  IN_PROCESS = 'IN_PROCESS',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DROPPED = 'DROPPED',
=======
export function isError<T>(
  response: T | ErrorType,
): response is ErrorType {
  return (response as ErrorType).error !== undefined;
>>>>>>> development-kunal
}
