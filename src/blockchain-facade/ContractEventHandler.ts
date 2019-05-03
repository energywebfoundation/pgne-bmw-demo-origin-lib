// Copyright 2018 Energy Web Foundation
//
// This file is part of the Origin Application brought to you by the Energy Web Foundation,
// a global non-profit organization focused on accelerating blockchain technology across the energy sector, 
// incorporated in Zug, Switzerland.
//
// The Origin Application is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY and without an implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details, at <http://www.gnu.org/licenses/>.
//

import Web3Type from '../types/web3'
import { BlockchainProperties } from './BlockchainProperties'

export class ContractEventHandler {
    
    lastBlockChecked: number
    unhandledEvents: any[]
    contractInstance: any

    onEventRegistry: Function[][]
    onAnyContractEventRegistry: Function[] 

    constructor(contractInstance: any, lastBlockChecked: number) {
        this.contractInstance = contractInstance
        this.lastBlockChecked = lastBlockChecked
        this.unhandledEvents = []
        this.walkThroughUnhandledEvent = this.walkThroughUnhandledEvent.bind(this)
        this.onEventRegistry = []
        this.onAnyContractEventRegistry = []

    }

    async tick(blockchainProperties: BlockchainProperties) {
        const blockNumber = await blockchainProperties.web3.eth.getBlockNumber()

        if (this.lastBlockChecked + 1 >= blockNumber) {
            return;
        }

        try {
            const events = await this.contractInstance.getPastEvents('allEvents', {fromBlock: this.lastBlockChecked + 1, toBlock: blockNumber})
            this.unhandledEvents = events.reverse().concat(this.unhandledEvents)
            this.lastBlockChecked = blockNumber > this.lastBlockChecked ? blockNumber : this.lastBlockChecked 
            this.walkThroughUnhandledEvent()
        } catch (error) {
            console.error(`Error in ContractEventHandler::tick `, error);
        }
    }

    walkThroughUnhandledEvent() {
        if (this.unhandledEvents.length > 0) {
            const event = this.unhandledEvents.pop()

            if (this.onEventRegistry[event.event]) { 
                this.onEventRegistry[event.event].forEach(onEvent => onEvent(event))
            }
            this.onAnyContractEventRegistry.forEach(onEvent => onEvent(event))
            this.walkThroughUnhandledEvent()
        } 
        
    }

    onEvent(eventName: string, onEvent: Function) {
        if (!this.onEventRegistry[eventName]) {
            this.onEventRegistry[eventName] = []
        }
        this.onEventRegistry[eventName].push(onEvent)
    }

    onAnyContractEvent(onEvent: Function) {

        this.onAnyContractEventRegistry.push(onEvent)
    }

}