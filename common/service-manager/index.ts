/* eslint-disable no-await-in-loop */
// make instance of config and the call setup
// make instance of Mongo
// make instance of Redis Client
// make instance of Redis PubSub
// make instance of Network Manger
// make instance of Gas Price and start updating cache
// make instance of Network Price and start updating cache
// make instance of queue for network id and transaction type - done

import { AAConsumer } from '../../relayer/src/services/consumer/AAConsumer';
import { TransactionType } from '../types';
import { AATransactionQueue } from '../queue/AATransactionQueue';
import { RedisCacheService } from '../cache';
import { Mongo } from '../db';
import { GasPriceManager } from '../gas-price';
import { AARelayService } from '../relay-service';

const queueMap: any = {}; // TODO: Add type of queue
const gasPriceMap: any = {}; // TODO: Add type of queue
const relayMap: any = {};

const redisClient = RedisCacheService.getInstance();
const dbInstance = Mongo.getInstance();

const supportedNetworks: number[] = [5, 80001];
const transactionType:{ [key: number]: string[] } = {
  5: [TransactionType.AA, TransactionType.SCW],
  80001: [TransactionType.AA, TransactionType.SCW],
};

(async () => {
  for (const chainId of supportedNetworks) {
    const gasPriceManager = new GasPriceManager(chainId, redisClient);
    gasPriceMap[chainId] = gasPriceManager.setup();
    // for each network get transaction type
    for (const type of transactionType[chainId]) {
      if (type === TransactionType.AA) {
        const queue = new AATransactionQueue(chainId, type);
        await queue.connect();
        const aaConsumer = new AAConsumer(chainId, type, queue);
        // start listening for transaction
        await queue.consume(aaConsumer.onMessageReceived);
        queueMap[chainId][type] = queue;
        const aaRelayService = new AARelayService(queue);
        relayMap[chainId][type] = aaRelayService;
      }
    }
  }
})();

export {
  queueMap,
  gasPriceMap,
  relayMap,
  redisClient,
  dbInstance,
};
