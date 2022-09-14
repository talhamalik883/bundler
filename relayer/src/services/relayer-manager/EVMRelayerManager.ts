/* eslint-disable no-param-reassign */
import { Mutex } from 'async-mutex';
import { ethers } from 'ethers';
import { RawTransactionType } from 'network-sdk/dist/types';
import hdkey from 'hdkey';
import { logger } from '../../../../common/log-config';
import { config } from '../../../../common/service-manager';
import { stringify } from '../../utils/util';
<<<<<<< HEAD:relayer/src/services/relayer-manager/evm-relayer-manager.ts
import { Relayer } from '../relayer';
import { IRelayer } from '../relayer/interface';
import { IRelayerManager } from './interface';
import { EVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
=======
import { EVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface';
import { IRelayerManager } from './interface/IRelayerManager';
import { RelayerManagerType } from '../../../../common/types';
>>>>>>> afc5151a9252383e116220d081860cfbf3cdc1a2:relayer/src/services/relayer-manager/EVMRelayerManager.ts

const log = logger(module);
const fundRelayerMutex = new Mutex();
const createRelayerMutex = new Mutex();

/**
 * Function of relayer manager
 * 1. create relayers for supported networks
 * 2. fund relayer for the first time from main account
 * 4. maintain state of relayer and choose from the algo when transactions are happening
 * 5. Update balance, nonce, check thresholds
 * 6. increase number of relayer if load
 * 7. fee manager interaction with relayer manager
 * Convert either from main account or convert per relayer
 */

export class EVMRelayerManager implements IRelayerManager<EVMAccount> {
  chainId: number;

<<<<<<< HEAD:relayer/src/services/relayer-manager/evm-relayer-manager.ts
  transactionService: ITransactionService<EVMAccount>;

  // TODO
  // Update default values to fetch from config
  minRelayerCount: number = 5;

  maxRelayerCount: number = 15;
=======
  transactionService: ITransactionService<EVMAccount>; // to fund relayers

  // TODO
  // Update default values to fetch from config
  minRelayerCount: number = 5; // minimum number of relayers to be created

  maxRelayerCount: number = 15; // maximum number of relayers to be created
>>>>>>> afc5151a9252383e116220d081860cfbf3cdc1a2:relayer/src/services/relayer-manager/EVMRelayerManager.ts

  inactiveRelayerCountThreshold: number = 0.6;

  pendingTransactionCountThreshold: number = 15;

<<<<<<< HEAD:relayer/src/services/relayer-manager/evm-relayer-manager.ts
  newRelayerInstanceCount: number = 10;
=======
  newRelayerInstanceCount: number = 2;
>>>>>>> afc5151a9252383e116220d081860cfbf3cdc1a2:relayer/src/services/relayer-manager/EVMRelayerManager.ts

  relayerMap?: Record<string, EVMAccount>;

  constructor(
    chainId: number,
    transactionService: ITransactionService<EVMAccount>,
  ) {
    this.chainId = chainId;
    this.transactionService = transactionService;
<<<<<<< HEAD:relayer/src/services/relayer-manager/evm-relayer-manager.ts

    configChangeListeners.relayerManagerService.push(this.onConfigChange.bind(this));
  }

  fundRelayers(relayer: EVMAccount): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  getRelayer(relayerAddress: string): Promise<EVMAccount> {
    throw new Error('Method not implemented.');
  }

  getActiveRelayer(): Promise<EVMAccount> {
    throw new Error('Method not implemented.');
  }

  setMinRelayerCount(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  setMaxRelayerCount(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  setInactiveRelayerCountThreshold(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  setPendingTransactionCountThreshold(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
=======
  }

  setMinRelayerCount = (minRelayerCount: number) => {
    this.minRelayerCount = minRelayerCount;
  };

  setMaxRelayerCount = (maxRelayerCount: number) => {
    this.maxRelayerCount = maxRelayerCount;
  };
>>>>>>> afc5151a9252383e116220d081860cfbf3cdc1a2:relayer/src/services/relayer-manager/EVMRelayerManager.ts

  async createRelayers(numberOfRelayers: number): Promise<void> {
    log.info(`Waiting for lock to create relayers on ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on ${this.chainId}`);

    try {
      const promises = [];
      for (let relayerIndex = 1; relayerIndex <= numberOfRelayers; relayerIndex += 1) {
        const index = this.getRelayersCount() + relayerIndex;

        const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
        const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

        const { nodePathIndex } = config.relayerService;
        const nodePath = `${nodePathRoot + nodePathIndex}/`;
        const ethNodePath: any = ethRoot.derive(nodePath + this.id);
        const privateKey = ethNodePath._privateKey.toString('hex');
        const ethPubkey = privateToPublic(ethNodePath.privateKey);

        const ethAddr = publicToAddress(ethPubkey).toString('hex');
        const ethAddress = toChecksumAddress(`0x${ethAddr}`);
        const address = ethAddress.toLowerCase();
        const relayer = new EVMAccount(
          address,
          privateKey,
        );
        promises.push(relayer.create(this.messenger));
      }
      const relayers: Relayer[] = await Promise.all(promises);

      log.info(`Relayers created on network id ${this.chainId}`);
      relayers.map(async (relayer) => {
        const relayerAddress = relayer.address.toLowerCase();
        this.relayersMap[relayerAddress] = relayer;
        await this.fundRelayer(relayerAddress);

        await this.relayersMap[relayerAddress].createChannel();
      });
    } catch (error) {
      console.log(error);
      log.error(`failed to create relayers ${stringify(error)} on network id ${this.chainId}`);
    }

    release();
    log.info(`Lock released after creating relayers on ${this.chainId}`);
  }

<<<<<<< HEAD:relayer/src/services/relayer-manager/evm-relayer-manager.ts
  async fetchMainAccountNonceFromNetwork(): Promise<number> {
    return this.network;
  }

  async fetchActiveRelayer(): Promise<IRelayer> {

  }

  static updateRelayerBalance(relayer: IRelayer): number {

  }

  updateRelayerMap(relayer: IRelayer) {
    this.relayersMap[relayer.id] = relayer;
  }

  updateRetryCountMap(relayer: IRelayer) {
    this.retryCountMap[relayer.id] += 1;
  }
=======
  async fundRelayer(address: string) {
    const BICONOMY_OWNER_PRIVATE_KEY = config?.chains.ownerAccountDetails[this.chainId].privateKey;
    const BICONOMY_OWNER_ADDRESS = config?.chains.ownerAccountDetails[this.chainId].publicKey;
>>>>>>> afc5151a9252383e116220d081860cfbf3cdc1a2:relayer/src/services/relayer-manager/EVMRelayerManager.ts

    const fundingRelayerAmount = config?.relayerManager[RelayerManagerType.AA].fundingRelayerAmount;
    const gasLimitMap = config?.relayerManager[0].gasLimitMap;



    try {
      // check funding threshold
      if (!this.hasBalanceBelowThreshold(address)) {
        log.info(`Has sufficient funds in relayer ${address} on network id ${this.chainId}`);
        return;
      }
      const release = await fundRelayerMutex.acquire();

      log.info(`Funding relayer ${address} on network id ${this.chainId}`);

      let gasLimitIndex = 0;
      // different gas limit for arbitrum
      if ([42161, 421611].includes(this.chainId)) gasLimitIndex = 1;

      const gasLimit = gasLimitMap[gasLimitIndex].toString();
      // fetch gas price
      const { gasPrice } = await this.network.getGasPrice();

      const mainAccountNonce = await this.getMainAccountNonce();

      const rawTx: RawTransactionType = {
        from: BICONOMY_OWNER_ADDRESS,
        gasPrice: ethers.BigNumber.from(
          gasPrice.toString(),
        ).toHexString(),
        gasLimit: ethers.BigNumber.from(
          gasLimit.toString(),
        ).toHexString(),
        to: address,
        value: ethers
          .utils.parseEther(fundingRelayerAmount[this.chainId].toString()).toHexString(),
        nonce: ethers.BigNumber.from(
          mainAccountNonce.toString(),
        ).toHexString(),
        chainId: this.chainId,
      };
      log.info(`Funding relayer ${address} on network id ${this.chainId} with raw tx ${stringify(rawTx)}`);
      const transaction = new Transaction({
        rawTransaction: rawTx,
        fromAddress: BICONOMY_OWNER_ADDRESS,
        privateKey: BICONOMY_OWNER_PRIVATE_KEY,
        chainId: this.chainId,
      }, this.network);
      const response: any = await transaction.execute();
      if (response.nonce) {
        this.mainAccountNonce = response.nonce + 1;
      }
      release();
      const { hash, error } = response;
      if (hash) {
        log.info(`Hash from funding relayer ${address} is ${hash} on network id ${this.chainId}`);
        this.listenForTransactionStatus(hash);
      } else if (error) {
        log.error(`Unable to fund relayer ${address} due to ${error} on network id ${this.chainId}`);
      }
    } catch (error) {
      log.error(`Error in fundRelayer ${stringify(error)}`);
    }
  }
}
