import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserOpType, VerifyingUserOpMiddlewareDataType } from './types';
import {
  paymasterAddress,
  paymasterAbi,
  paymasterFundingKey,
  ENTRY_POINT_ABI,
  ENTRY_POINT_ADDRESS,
  PROVIDER_URL,
} from './constants';
import { ethers, BigNumber } from 'ethers';
import { hexConcat } from 'ethers/lib/utils';
const abi = ethers.utils.defaultAbiCoder;
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AppService {
  readonly logger = new Logger(AppService.name);
  // provider = new ethers.providers.JsonRpcProvider('https://eth-goerli.g.alchemy.com/v2/477qAVdmEssSZbEPaUMTZXqyetQx5fxg')
  provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);
  biconomyPaymasterSigningKey = process.env.VERIFYING_SIGNER_PRIVATE_KEY;
  signer = new ethers.Wallet(this.biconomyPaymasterSigningKey);
  web3Provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);

  getHello(): string {
    return 'Hello World!';
  }
  // async signUserOpMessage(userOp: UserOpType) {
  //   try {
  //     // const {
  //     //   paymasterAddress,
  //     //   paymasterAbi,
  //     //   paymasterFundingKey,
  //     //   chainId,
  //     // } = data;

  //     this.logger.log(`userOp: ${JSON.stringify(userOp)}`);

  //     if (!paymasterAddress) {
  //       throw new HttpException(
  //         'Paymaster address could not be fetched',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     if (!paymasterAbi) {
  //       throw new HttpException(
  //         'Paymaster abi could not be fetched',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     if (!paymasterFundingKey) {
  //       throw new HttpException(
  //         'Paymaster funding key could not be fetched',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     const paymaster = new ethers.Contract(
  //       paymasterAddress,
  //       paymasterAbi,
  //       this.provider,
  //     );
  //     if (!paymaster) {
  //       throw new HttpException(
  //         `Error in creating instance of paymaster for address: ${paymasterAddress}`,
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     if (!this.biconomyPaymasterSigningKey) {
  //       throw new HttpException(
  //         'Biconomy Paymaster Signing Key not found in config',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     const paymasterSigner = new ethers.Wallet(this.biconomyPaymasterSigningKey);
  //     if (!paymasterSigner) {
  //       throw new HttpException(
  //         `Instance of paymasterSigner could not be created`,
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     const hash = await paymaster.getHash(userOp);
  //     this.logger.log(`For userOp hash is: ${hash}`);

  //     const signedMessage = await paymasterSigner.signMessage(ethers.utils.arrayify(hash));
  //     this.logger.log(`For userOp signedMessage is: ${signedMessage}`);

  //     const idAndSig = abi.encode(['address', 'bytes'], [paymasterFundingKey, signedMessage]);
  //     this.logger.log(`For userOp idAndSig is: ${idAndSig}`);

  //     const paymasterAndData = hexConcat([paymasterAddress, signedMessage]);
  //     this.logger.log(`For userOp paymasterAndData is ${paymasterAndData}`);

  //     return paymasterAndData;
  //   } catch (error) {
  //     throw new HttpException(
  //       error,
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  async signUserOpMessage(userOp: UserOpType) {
    try {
      const partialUserOp: any = userOp;
      // const {
      //   paymasterAddress,
      //   paymasterAbi,
      //   paymasterFundingKey,
      //   chainId,
      // } = data;

      this.logger.log(`userOp: ${JSON.stringify(userOp)}`);
      // const VALID_UNTIL = 1683309170;
      // const VALID_AFTER = 0;

      const VALID_UNTIL = '0x00000000deadbeef';
      const VALID_AFTER = '0x0000000000001234';

      const MOCK_SIG = '0x1234';
      const ERC20_ADDR = '0xdA5289fCAAF71d52a80A254da614a192b693e977';
      const EX_RATE = '1002100';
      const MOCK_FEE = '0';
      const paymaster = new ethers.Contract(
        paymasterAddress,
        paymasterAbi,
        this.provider,
      );

      const encodedData =
        '0x00000000000000000000000000000000000000000000000000000000deadbeef00000000000000000000000000000000000000000000000000000000000012340000000000000000000000009fe46736679d2d9a65f0992f2272de9f3c7fa6e000000000000000000000000000000000000000000000000000000000000ee8cc0000000000000000000000000000000000000000000000000000000000000000';
      const signature = '0x' + '00'.repeat(65);
      partialUserOp.paymasterAndData = hexConcat([
        paymasterAddress,
        ethers.utils.hexlify(1).slice(0, 4),
        encodedData,
        signature,
      ]);
      console.log(partialUserOp.paymasterAndData);

      const paymasterSigner = new ethers.Wallet(
        this.biconomyPaymasterSigningKey,
      );

      const hash = await paymaster.getHash(
        partialUserOp,
        ethers.utils.hexlify(1).slice(2, 4),
        VALID_UNTIL,
        VALID_AFTER,
        ERC20_ADDR,
        EX_RATE,
        MOCK_FEE,
      );
      this.logger.log(`For userOp hash is: ${hash}`);

      const signedMessage = await paymasterSigner.signMessage(
        ethers.utils.arrayify(hash),
      );
      this.logger.log(`For userOp signedMessage is: ${signedMessage}`);

      const idAndSig = ethers.utils.defaultAbiCoder.encode(
        ['uint48', 'uint48', 'address', 'uint256', 'uint256'],
        [VALID_UNTIL, VALID_AFTER, ERC20_ADDR, EX_RATE, MOCK_FEE],
      );
      this.logger.log(`For userOp idAndSig is: ${idAndSig}`);

      const paymasterAndData = hexConcat([
        paymasterAddress,
        ethers.utils.hexlify(1).slice(0, 4),
        idAndSig,
        signedMessage,
      ]);
      this.logger.log(`For userOp paymasterAndData is ${paymasterAndData}`);

      return paymasterAndData;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async relay(req) {
    console.log('req', req);
    const userOp = req.params[0];
    const entryPointAddress = req.params[1];
    const chainId = req.params[2];
    const metaData = req.params[3];
    const gasLimitFromSimulation = req.params[4];
    // const walletAddress = userOp.sender.toLowerCase();

    // console.log('userOp', userOp);
    // return

    const entryPointContract = new ethers.Contract(
      entryPointAddress,
      ENTRY_POINT_ABI,
      this.web3Provider,
    );

    console.log(entryPointAddress);

    const errorResult = await entryPointContract.callStatic
      .simulateValidation(userOp)
      .catch((e) => e);
    console.log('errorResult ', errorResult);
    const { returnInfo } = errorResult.errorArgs;
    console.log('returnInfo ', returnInfo);

    // let {
    //   preOpGas,
    //   deadline
    // } = returnInfo

    // console.log(entryPointAddress, userOp.sender, userOp.callData);
    // console.log(preOpGas, deadline);

    // const callGasLimit = await this.web3Provider.estimateGas({
    //   from: entryPointAddress,
    //   to: userOp.sender,
    //   data: userOp.callData
    // }).then(b => b.toNumber()).catch(err => {
    //   const message = err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted'
    //   console.log('reverted ', message);
    //   throw new Error(message)
    // })
    // console.log('dead line', deadline);

    // if (deadline)
    // deadline = BigNumber.from(deadline)
    // console.log('deadline ', deadline);

    // if (deadline === 0) {
    //   deadline = undefined
    // }
    // console.log('callGasLimit ', callGasLimit);
    // return
    // const userOp = [
    //   {
    //     "sender": "0xC08cF4F0dA3bcfC33e54c71adb788AA8aA23eA83",
    //     "nonce": "0x2",
    //     "initCode": "0x",
    //     "callData": "0x51eb2aa90000000000000000000000002f65bed438a30827d408b7c6818ec5a22c022dd1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000001848d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000013200da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000066aad3dc0f9aac8a31e07f0787d3d476489d75d300000000000000000000000000000000000000000000000000000000000f424000da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000066aad3dc0f9aac8a31e07f0787d3d476489d75d300000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    //     "callGasLimit": "0x1267e",
    //     "verificationGasLimit": "0x30d40",
    //     "maxFeePerGas": "0x59682f20",
    //     "maxPriorityFeePerGas": "0x22ecb25c00",
    //     "paymasterAndData": "0x570cd2df2c49574c0715ea1bb73ae3492145af3a0000000000000000000000004e720e21d8befa24da71f2eace864137e0166c6c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000413500ac196609cc82d12e4cef4e1ed76b2292bf32975fa430f4bedda8f4eb4029101c9b08884f845ff633b1bb04d45cc716e993426df4d802722be1349b35f87f1b00000000000000000000000000000000000000000000000000000000000000",
    //     "preVerificationGas": "0x6590",
    //     "signature": "0x9d1e734b7e63a07ed7d1b9757be98b1faf430e8083231e6cbd306c628bea676f524904617af91756254dbbc0f4438a04e23fa9845b9be9e8a29ea317fb31ecf31b"
    //   },
    //   {
    //     "sender": "0xD93e19b8c88eff00Cb860F4B700980CeaCecA537",
    //     "nonce": "0x29",
    //     "initCode": "0x",
    //     "callData": "0x51eb2aa90000000000000000000000002f65bed438a30827d408b7c6818ec5a22c022dd1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000001848d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000013200da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000066aad3dc0f9aac8a31e07f0787d3d476489d75d300000000000000000000000000000000000000000000000000000000000f424000da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000066aad3dc0f9aac8a31e07f0787d3d476489d75d300000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    //     "callGasLimit": "0x1267e",
    //     "verificationGasLimit": "0x30d40",
    //     "maxFeePerGas": "0x59682f20",
    //     "maxPriorityFeePerGas": "0x22ecb25c00",
    //     "paymasterAndData": "0x570cd2df2c49574c0715ea1bb73ae3492145af3a0000000000000000000000004e720e21d8befa24da71f2eace864137e0166c6c00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041a553d0b9e1722730225944ee89e04151c2ca207ba65eed1648c919ef3738ff5e1efdca08a2cedf7a0220935b16382eb1fe3a250e1fe719d342ee1756d061ed8f1b00000000000000000000000000000000000000000000000000000000000000",
    //     "preVerificationGas": "0x6590",
    //     "signature": "0xbe81bee6748a39212800c82b3552f2e76c74cd3cab64da25c9679e31e6a6b10346650e00153f092aa4d3e11686cb968101311e5f135014c2a796d9ca00052ff01c"
    // }
    // ]

    const { data } = await entryPointContract.populateTransaction.handleOps(
      [userOp],
      await this.signer.getAddress(),
    );
    const nonce = await this.provider.getTransactionCount(
      this.signer.getAddress(),
      'pending',
    );
    let maxFeePerGas, maxPriorityFeePerGas, gasPrice;
    const feeData = await this.provider.getFeeData();
    console.log(feeData);
    if (maxFeePerGas == null) {
      maxFeePerGas = feeData.maxFeePerGas ?? undefined;
    }
    if (maxPriorityFeePerGas == null) {
      maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? undefined;
    }
    if (gasPrice == null) {
      gasPrice = feeData.gasPrice ?? undefined;
    }

    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      const gasFee = await this.provider.getGasPrice(); // Could be from bundler/ oracle
      maxFeePerGas = gasFee;
      maxPriorityFeePerGas = gasFee;
      gasPrice = gasFee;
    }
    const callGasLimit = await this.provider.estimateGas({
      from: await this.signer.getAddress(),
      to: entryPointAddress,
      data,
    });
    console.log('callGasLimit ', callGasLimit);

    // Type 1 TRX
    const rawTransaction: ethers.providers.TransactionRequest = {
      from: await this.signer.getAddress(),
      to: entryPointAddress,
      value: '0x0',
      gasLimit: callGasLimit,
      data,
      chainId,
      nonce,
      gasPrice: ethers.utils.hexlify(Number(gasPrice)),
    };
    // type 2 trx
    // const rawTransaction: ethers.providers.TransactionRequest = {
    //   from: await this.signer.getAddress(),
    //   to: entryPointAddress,
    //   value: '0x0',
    //   gasLimit: 900000,
    //   data,
    //   chainId,
    //   nonce,
    //   type: 2,
    //   maxFeePerGas: ethers.utils.hexlify(Number(maxFeePerGas)),
    //   maxPriorityFeePerGas: ethers.utils.hexlify(Number(maxPriorityFeePerGas)),
    // }
    console.log('rawTrx', rawTransaction);

    const tx = await this.signer.signTransaction(rawTransaction);
    const receipt = await this.provider.sendTransaction(tx);
    console.log('receipt ', receipt);
    return receipt;
  }
}
