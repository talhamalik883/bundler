import Joi from 'joi';

const {
  number,
  object,
  string,
  alternatives,
  array,
} = Joi.types();

// eth_sendUserOperation
const userOpForSendUserOp = object.keys({
  sender: string.regex(/^0x[a-fA-F0-9]{40}$/).required().error(new Error('sender address is required')),
  nonce: string.required().error(new Error('nonce is required and should be a hex string')),
  initCode: string,
  callData: string.required().error(new Error('callData is required and should be a hex string')),
  callGasLimit: string.required().error(new Error('callGasLimit is required and should be a hex string')),
  verificationGasLimit: string.required().error(new Error('verificationGasLimit is required and should be a hex string')),
  preVerificationGas: string.required().error(new Error('preVerificationGas is required and should be a hex string')),
  maxFeePerGas: string.required().error(new Error('maxFeePerGas is required and should be a hex string')),
  maxPriorityFeePerGas: string.required().error(new Error('maxPriorityFeePerGas is required and should be a hex string')),
  paymasterAndData: string,
  signature: string.required().error(new Error('signature is required')),
});

const entryPointAddress = string.required().error(new Error('entryPointAddress is required'));

export const bundlerSendUserOpRequestSchema = object.keys({
  method: string.regex(/eth_sendUserOperation/),
  params: array.items(alternatives.try(
    userOpForSendUserOp,
    entryPointAddress,
  )),
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

// eth_estimateUserOperationGas
/**
 * Parameters: same as eth_sendUserOperation gas limits (and prices) parameters are optional,
 * but are used if specified.
 * maxFeePerGas and maxPriorityFeePerGas default to zero,
 *  so no payment is required by neither account nor paymaster.
 */
const userOpEstimateUserOpGas = object.keys({
  sender: string.regex(/^0x[a-fA-F0-9]{40}$/).required().error(new Error('sender address is required')),
  nonce: string.required().error(new Error('nonce is required and should be a hex string')),
  initCode: string.required().error(new Error('initCode is required and should be a hex string. Send 0x if not applicable')),
  callData: string.required().error(new Error('callData is required and should be a hex string')),
  callGasLimit: string,
  verificationGasLimit: string,
  preVerificationGas: string,
  maxFeePerGas: string,
  maxPriorityFeePerGas: string,
  paymasterAndData: string.required().error(new Error('paymasterAndData is required and should be a hex string. Send 0x if not applicable')),
  signature: string,
});

export const bundlerEstimateUserOpGasRequestSchema = object.keys({
  method: string.regex(/eth_estimateUserOperationGas/),
  params: array.items(alternatives.try(
    userOpEstimateUserOpGas,
    entryPointAddress,
  )),
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

// eth_getUserOperationByHash
const userOpHash = string.required().error(new Error('userOpHash is required'));

export const bundlerGetUserOpByHashRequestSchema = object.keys({
  method: string.regex(/eth_getUserOperationByHash/),
  params: array.items(alternatives.try(
    userOpHash,
  )),
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

// eth_getUserOperationReceipt
export const bundlerGetUserOpReceiptRequestSchema = object.keys({
  method: string.regex(/eth_getUserOperationReceipt/),
  params: array.items(alternatives.try(
    userOpHash,
  )),
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

// eth_supportedEntryPoints
export const bundlerSupportedEntryPointsRequestSchema = object.keys({
  method: string.regex(/eth_supportedEntryPoints/),
  params: array,
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

// eth_chainId
export const bundlerChainIdRequestSchema = object.keys({
  method: string.regex(/eth_chainId/),
  params: array,
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

export const gasAndGasPricesRequestSchema = object.keys({
  method: string.regex(/eth_getUserOpGasFields/),
  params: array,
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});

const getUserOperationsByApiKeyBody = object.keys({
  startTime: string,
  endTime: string,
  limit: number,
  offset: number,
});
// eth_getUserOperationsByApiKey
export const bundlerGetUserOpsByApiKeyRequestSchema = object.keys({
  method: string.regex(/eth_getUserOperationsByApiKey/),
  params: array.items(alternatives.try(
    getUserOperationsByApiKeyBody,
  )),
  jsonrpc: string.required().error(new Error('jsonrpc is required')),
  id: number.required().error(new Error('id is required')),
});
