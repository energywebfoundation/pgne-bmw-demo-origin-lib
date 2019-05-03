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
import axios from 'axios'

export interface CertificateProperties {
    assetId: number
    owner: string
    powerInW: number
    retired: boolean
    dataLog: string
    coSaved: number

}

//const wattTimeApiUrl = 'https://api.watttime.org/api/v1'

export class Certificate implements CertificateProperties {
    id: number
    assetId: number
    owner: string
    powerInW: number
    retired: boolean
    dataLog: string
    coSaved: number
    creationTime: number
    escrow: string

    blockchainProperties: BlockchainProperties

    constructor(id: number, blockchainProperties: BlockchainProperties) {
 
        this.id = id
        this.blockchainProperties = blockchainProperties

    }

    static async GET_CERTIFICATE_LIST_LENGTH(blockchainProperties: BlockchainProperties) {

        return parseInt(await blockchainProperties.certificateLogicInstance.methods.getCertificateListLength().call(), 10)
    }

    static async GET_ALL_CERTIFICATES(blockchainProperties: BlockchainProperties) {

        const assetsPromises = Array(await Certificate.GET_CERTIFICATE_LIST_LENGTH(blockchainProperties))
            .fill(null)
            .map((item, index) => (new Certificate(index, blockchainProperties)).syncWithBlockchain())

        return Promise.all(assetsPromises)

    }

    static async GET_ALL_CERTIFICATES_OWNED_BY(owner: string, blockchainProperties: BlockchainProperties, wattTimeUser: string, wattTimePassword: string) {
        return (await Certificate.GET_ALL_CERTIFICATES(blockchainProperties,))
            .filter((certificate: Certificate) => certificate.owner === owner)
    }

    static async GET_ALL_CERTIFICATES_WITH_ESCROW(escrow: string, blockchainProperties: BlockchainProperties, wattTimeUser: string, wattTimePassword: string) {
        return (await Certificate.GET_ALL_CERTIFICATES(blockchainProperties))
            .filter((certificate: Certificate) => certificate.escrow === escrow)
    }

    async syncWithBlockchain(): Promise<Certificate> {



  

        if (this.id != null) {

            const tx = await this.blockchainProperties.certificateLogicInstance.methods.getCertificate(this.id).call()

            this.assetId = parseInt(tx._assetId, 10)
            this.owner = tx._owner
            this.powerInW = parseInt(tx._powerInW, 10)
            this.retired = tx._retired
            this.dataLog = tx._dataLog
            this.coSaved = parseInt(tx._coSaved, 10)
            this.escrow = tx._escrow
            this.creationTime = parseInt(tx._creationTime, 10)

        }
        return this
    }

    async claim(account: string) {
        const gasCreate = await this.blockchainProperties.certificateLogicInstance.methods
            .retireCertificate(this.id)
            .estimateGas({ from: account })
        const txCreate = await this.blockchainProperties.certificateLogicInstance.methods
            .retireCertificate(this.id)
            .send({ from: account, gas: Math.round(gasCreate * 1.5) })
    }

    // async getWattTimeToken(wattTimeUser: string, wattTimePassword: string): Promise<string> {

       
    //     const token = (await axios.post(wattTimeApiUrl + '/obtain-token-auth/', {
    //         username: wattTimeUser,
    //         password: wattTimePassword
    //       })).data.token


    //     return token

    // }

    // async getCo2(wattTimeUser: string, wattTimePassword: string) {

    //     const creationDate = new Date(this.creationTime * 1000)
    //     const timeString = `${creationDate.getFullYear()}-${creationDate.getMonth() }-${creationDate.getDate() - 1}T${creationDate.getHours()}:${creationDate.getMinutes()}:${creationDate.getSeconds()}`
    //     const timeStringPlusTen = `${creationDate.getFullYear()}-${creationDate.getMonth() }-${creationDate.getDate() - 1}T${creationDate.getHours()}:${creationDate.getMinutes() + 10}:${creationDate.getSeconds()}`
    //     const marginalQuery = {
    //         ba: 'FR',
    //         start_at: timeString,
    //         end_at: timeStringPlusTen,
    //         page_size: 1,
    //         market: 'RTHR'
    //     }

    //     console.log(Certificate.objectToUrlParams(marginalQuery))
        

    //     const co2 = await axios.get(wattTimeApiUrl + '/marginal/' + Certificate.objectToUrlParams(marginalQuery), {
    //         headers: {'Authorization': 'Token ' + await this.getWattTimeToken(wattTimeUser, wattTimePassword)}
    //       })

    //     console.log( co2.data)
        

        
   // }

    async getCertificateEvents() {

        return (await this.blockchainProperties.certificateLogicInstance.getPastEvents('allEvents', {
            fromBlock: 0,
            toBlock: 'latest',
            topics: [null, this.blockchainProperties.web3.utils.padLeft(this.blockchainProperties.web3.utils.fromDecimal(this.id), 64, '0')]
        }))
    }

    static objectToUrlParams(input: any): string {
        return Object.keys(input)
            .map((key: string, index: number) => `${index === 0 ? '?' : '&'}${key}=${input[key]}`)
            .reduce((accumulator: string, current: string) => accumulator + current)
    }

}