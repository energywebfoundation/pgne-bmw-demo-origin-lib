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

import { expect } from 'chai';
import 'mocha';
import Web3Type from './types/web3';
import * as fs from 'fs';
import * as parse from 'csv-parse'
import { getNewMeterreadings } from './readings';
import { deployEmptyContracts } from './deployEmptyContracts'
import {AssetType} from './blockchain-facade/Asset'
import {calculateCredits} from './carbonCalculator'
import { UserProperties } from "./blockchain-facade/User";
import { User, BlockchainProperties, CoOTruffleBuild, DemandLogicTruffleBuild, AssetProducingLogicTruffleBuild, AssetConsumingLogicTruffleBuild, CertificateLogicTruffleBuild, UserLogicTruffleBuild, ProducingAsset, ProducingAssetProperties, Compliance, ConsumingAsset, ConsumingProperties, TimeFrame, Currency, FullDemandProperties, Demand } from '.';

const main = async () => {

    await deployEmptyContracts()

    const conversionResolution = 10

    const deployConfig = JSON.parse(fs.readFileSync('connectionConfig.json', 'utf-8').toString())

    try{
      const vehicleInfo = JSON.parse(fs.readFileSync('vehicleConfig.json', 'utf-8').toString())
    }
    catch(e){
      console.log("couldn't read the file: " + e)
    }

    const contractConfig = JSON.parse(fs.readFileSync('contractConfig.json', 'utf-8').toString())

    const topAdminPrivateKey = deployConfig.deployKey

    const Web3 = require("Web3")
    const web3 = new Web3(deployConfig.web3)

    const currentTime = Number((new Date().getTime() / 1000).toFixed(0))

    //                             sec * min * h * days
    const prevTime = currentTime - (60 * 60 * 24 * 8)
    const last6h = currentTime - (60 * 60 * 24 * 7)

    const smartmeterAccount = web3.eth.accounts.create()

    const blockchainProperties = {
        web3: web3,
        cooInstance: new web3.eth.Contract((CoOTruffleBuild as any).abi, contractConfig.Coo),
        demandLogicInstance: new web3.eth.Contract((DemandLogicTruffleBuild as any).abi, contractConfig.DemandLogic),
        producingAssetLogicInstance: new web3.eth.Contract((AssetProducingLogicTruffleBuild as any).abi, contractConfig.AssetProducingLogic),
        consumingAssetLogicInstance: new web3.eth.Contract((AssetConsumingLogicTruffleBuild as any).abi, contractConfig.ConsumingAssetLogic),
        certificateLogicInstance: new web3.eth.Contract((CertificateLogicTruffleBuild as any).abi, contractConfig.CertificateLogic),
        userLogicInstance: new web3.eth.Contract((UserLogicTruffleBuild as any).abi, contractConfig.UserLogic),
        topAdminAccount: (web3 as any).eth.accounts.privateKeyToAccount('0x' + topAdminPrivateKey).address,
        privateKey: topAdminPrivateKey,
        userAdmin: (web3 as any).eth.accounts.privateKeyToAccount("0x" + topAdminPrivateKey).address,
        assetAdminAccount: (web3 as any).eth.accounts.privateKeyToAccount("0x" + topAdminPrivateKey).address,
        agreementAdmin: (web3 as any).eth.accounts.privateKeyToAccount("0x" + topAdminPrivateKey).address
    }


    // getting all the meterreadings where the charging finished less then 6h ago
    const readings7d = await getNewMeterreadings(prevTime, currentTime, last6h)

    console.log("meterreadings in the last 7d: " + readings7d.length)

    //onboarding the matcher
    let matcherPrivateKey = "e9a63e116f72c2e368376eb88c22fecf2a5e94a93464ff8802cf97caac657548"

    if (!matcherPrivateKey.startsWith("0x"))
        matcherPrivateKey = "0x" + matcherPrivateKey

    const matcherAccount = web3.eth.accounts.privateKeyToAccount(matcherPrivateKey)

    const userProps: UserProperties = {
        accountAddress: matcherAccount.address,
        firstName: "matcher",
        surname: "matcher",
        organization: "EWF",
        street: "anystreet",
        number: "1",
        zip: "1234",
        city: "anytown",
        country: "USA",
        state: "California",
        roles: 64
    }

    await User.CREATE_USER_RAW(userProps, blockchainProperties)


    /*
    Onboard new vehicles, save smart meter readings and generate certificates
    */

    const vehicleInfo = {} as any
    let iterator: number = 0

    const oldIds: string[] = []

    for(const reading of readings7d){

      console.log(reading)

      const vId = reading.vehicleId

      let exists: boolean = false

      if(vehicleInfo[vId]) {
        exists = await blockchainProperties.userLogicInstance.methods.doesUserExist(vehicleInfo[vId].address).call()
      }

      if(!exists && !oldIds.includes(vId)){
        console.log("New Vehicle")

        let newVehicleAccount = web3.eth.accounts.create()

        const userProps: UserProperties = {
            accountAddress: newVehicleAccount.address,
            firstName: "vehicle-ID",
            surname: vId,
            organization: vId,
            street: "anystreet",
            number: "1",
            zip: "1234",
            city: "anytown",
            country: "USA",
            state: "California",
            roles: 48
        }

        await User.CREATE_USER_RAW(userProps, blockchainProperties)
        console.log("Onboarded a new user (" + newVehicleAccount.address + ", " + vId + ")")

        const assetProps: ProducingAssetProperties = {
            smartMeter: smartmeterAccount.address,
            owner: newVehicleAccount.address,
            operationalSince: Number((new Date().getTime() / 1000).toFixed(0)),
            capacityWh: 40000,
            lastSmartMeterReadWh: 0,
            active: true,
            lastSmartMeterReadFileHash: "0x01",
            country: "Californa",
            region: "Silicon Valley",
            zip: "1234",
            city: "AnyTown",
            street: "AnyStreet",
            houseNumber: "1",
            gpsLatitude: "37.421536",
            gpsLongitude: "-122.084923",
            assetType: AssetType.Solar,
            certificatesCreatedForWh: 0,
            lastSmartMeterCO2OffsetRead: 0,
            cO2UsedForCertificate: 0,
            complianceRegistry: Compliance.none,
            otherGreenAttributes: "n.a.",
            typeOfPublicSupport: "n.a."
        }

        await ProducingAsset.CREATE_ASSET_RAW(assetProps, blockchainProperties)
        console.log("Onboarded a new Asset " + vId + ", " + iterator + ", " + newVehicleAccount.address)

        newVehicleAccount.AssetId = iterator

        vehicleInfo[vId] = newVehicleAccount

        /*
        SAVE SMART METER READINGS
        */
        let carbonReading = await calculateCredits(reading.energy_Wh, reading.startTime, reading.endTime)
        let carbonCredits = Math.floor(carbonReading * Math.pow(10, conversionResolution))
        console.log("Initial Carbon Reading: " + carbonReading)
        console.log("Initial Carbon Credits: " + carbonCredits)


        carbonCredits = carbonCredits < 0 ? carbonCredits * (-1) : carbonCredits
        carbonReading = carbonReading < 0 ? carbonReading * (-1) : carbonReading

        const timeStamp = "0x" + reading.endTime.toString(16)
        console.log("TIMESTAMP: " + timeStamp)

        if(reading.energy_Wh > 0) {
          console.log(vehicleInfo[reading.vehicleId].AssetId)
          const txdata = blockchainProperties.producingAssetLogicInstance.methods.saveSmartMeterRead(vehicleInfo[reading.vehicleId].AssetId,
              reading.energy_Wh, false, "0x" + reading.endTime.toString(16), carbonCredits, false).encodeABI()


          const txParams = {
              from: smartmeterAccount.address,
              to: (contractConfig as any).AssetProducingLogic,
              gas: 500000,
              gasPrice: 0,
              nonce: await web3.eth.getTransactionCount(smartmeterAccount.address),
              data: txdata
          }

          const signedTx = await web3.eth.accounts.signTransaction(txParams, smartmeterAccount.privateKey);
          const tx = (await web3.eth.sendSignedTransaction(signedTx.rawTransaction))


        }

        /*
        GENERATE CERTIFICATES HERE
        */
        const txMatcherData = blockchainProperties.certificateLogicInstance.methods
            .createCertificateForAssetOwner(vehicleInfo[reading.vehicleId].AssetId, reading.energy_Wh)
            .encodeABI()


        const gasMatcher = await blockchainProperties.certificateLogicInstance.methods
            .createCertificateForAssetOwner(vehicleInfo[reading.vehicleId].AssetId, reading.energy_Wh)
            .estimateGas({ from: matcherAccount.address })


        const txMatcher = {
            from: matcherAccount.address,
            to: contractConfig.CertificateLogic,
            gas: Math.floor(gasMatcher * 1.5),
            gasPrice: 0,
            nonce: await web3.eth.getTransactionCount(matcherAccount.address),
            data: txMatcherData
        }
        const singedMatcherTx = await web3.eth.accounts.signTransaction(txMatcher, matcherAccount.privateKey);
        await web3.eth.sendSignedTransaction(singedMatcherTx.rawTransaction)

        console.log("GENERATED CERTIFICATE AGAINST ASSET#" + vehicleInfo[reading.vehicleId].AssetId)

        iterator++

      }
      else{

        console.log(reading.vehicleId)
        console.log(vehicleInfo[reading.vehicleId])

        let carbonReading = await calculateCredits(reading.energy_Wh, reading.startTime, reading.endTime)
        let carbonCredits = Math.floor(carbonReading * Math.pow(10, conversionResolution))
        console.log("Initial Carbon Reading: " + carbonReading)
        console.log("Initial Carbon Credits: " + carbonCredits)


        carbonCredits = carbonCredits < 0 ? carbonCredits * (-1) : carbonCredits
        carbonReading = carbonReading < 0 ? carbonReading * (-1) : carbonReading

        //Read the last Meter reading time stamp amd last Meter reading Wh

        const previousInfo = await blockchainProperties.producingAssetLogicInstance.methods.getAssetGeneral(vehicleInfo[reading.vehicleId].AssetId).call()
        const lastTimestamp = parseInt(previousInfo._lastSmartMeterReadFileHash.substring(2, 10), 16)
        const lastReading = parseInt(previousInfo._lastSmartMeterReadWh)

        const previousProps = await blockchainProperties.producingAssetLogicInstance.methods.getAssetProducingProperties(vehicleInfo[reading.vehicleId].AssetId).call()
        const lastCredits = parseInt(previousProps.lastSmartMeterCO2OffsetRead)
        console.log("Last Credits: " + lastCredits)

        const newMeterread = Math.floor(lastReading + reading.energy_Wh)
        const newCreditsread = (lastCredits + (carbonCredits))
        console.log("NEW CREDITS READ: " + newCreditsread)
        const curTimestamp = reading.startTime

        //save meter reading
        if (lastTimestamp < curTimestamp && reading.energy_Wh > 0) {
            console.log("Same vehicle new reading")
            console.log(previousInfo)
            console.log(previousProps)
            console.log("before")
            console.log(newMeterread)


            console.log(vehicleInfo[reading.vehicleId].AssetId)

            /*
            SAVE SMART METER READINGS
            */
            const txdata = blockchainProperties.producingAssetLogicInstance.methods.saveSmartMeterRead(vehicleInfo[reading.vehicleId].AssetId,
                newMeterread, false, "0x" + reading.endTime.toString(16), newCreditsread, false).encodeABI()


            const txParams = {
                from: smartmeterAccount.address,
                to: (contractConfig as any).AssetProducingLogic,
                gas: 500000,
                gasPrice: 0,
                nonce: await web3.eth.getTransactionCount(smartmeterAccount.address),
                data: txdata
            }

            const signedTx = await web3.eth.accounts.signTransaction(txParams, smartmeterAccount.privateKey);
            const tx = (await web3.eth.sendSignedTransaction(signedTx.rawTransaction))


            /*
            GENERATE CERTIFICATES
            */
            const txMatcherData = blockchainProperties.certificateLogicInstance.methods
                .createCertificateForAssetOwner(vehicleInfo[reading.vehicleId].AssetId, reading.energy_Wh)
                .encodeABI()


            const gasMatcher = await blockchainProperties.certificateLogicInstance.methods
                .createCertificateForAssetOwner(vehicleInfo[reading.vehicleId].AssetId, reading.energy_Wh)
                .estimateGas({ from: matcherAccount.address })


            const txMatcher = {
                from: matcherAccount.address,
                to: contractConfig.CertificateLogic,
                gas: Math.floor(gasMatcher * 1.5),
                gasPrice: 0,
                nonce: await web3.eth.getTransactionCount(matcherAccount.address),
                data: txMatcherData
            }
            const singedMatcherTx = await web3.eth.accounts.signTransaction(txMatcher, matcherAccount.privateKey);
            await web3.eth.sendSignedTransaction(singedMatcherTx.rawTransaction)

        }
        else{
          console.log("Duplicate Reading")
        }

      }

    }

    const writeJsonFile = require('write-json-file')
    await writeJsonFile('vehicleConfig.json', vehicleInfo)

    console.log('UI: http://localhost:3000/' + contractConfig.Coo)

}


main()
