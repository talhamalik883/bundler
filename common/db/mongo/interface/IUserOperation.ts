export interface IUserOperation {
  transactionId: string;
  transactionHash: string;
  entryPoint: string;
  sender: string;
  nonce: number;
  initCode: string;
  callData: string;
  callGasLimit: number;
  verificationGasLimit: number;
  preVerificationGas: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  paymasterAndData: string;
  signature: string;
  userOpHash: string;
  receipt: object;
  chainId: number;
  status: string,
  success: string,
  blockNumber: number,
  blockHash: string,
  paymaster: string,
  actualGasCost: number,
  actualGasUsed: number,
  reason: string,
  logs: any,
  creationTime: number;
}
