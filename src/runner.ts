import { getAllMeterreadings } from "./readings";
import * as fs from 'fs'
import { User, BlockchainProperties, CoOTruffleBuild, DemandLogicTruffleBuild, AssetProducingLogicTruffleBuild, AssetConsumingLogicTruffleBuild, CertificateLogicTruffleBuild, UserLogicTruffleBuild, ProducingAsset, ProducingAssetProperties, Compliance, ConsumingAsset, ConsumingProperties, TimeFrame, Currency, FullDemandProperties, Demand } from '.';
import { calculateCredits } from "./carbonCalculator";

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const main = async (): Promise<any> => {

    const deployConfig = JSON.parse(fs.readFileSync('connectionConfig.json', 'utf-8').toString())
    const vehicleConfig = JSON.parse(fs.readFileSync('vehicleId.json', 'utf-8').toString())
    const contractConfig = JSON.parse(fs.readFileSync('contractConfig.json', 'utf-8').toString())
    const Web3 = require("web3")

    const web3 = new Web3(deployConfig.web3)

    const intervall = 2 * 60 * 1000
    let now = Math.floor(Date.now() / 1000)
    let start = now - (24 * 60 * 60)

    const smartmeterPK = "55fd6d8b19c3aa9c0ddbca20ad492f5ef18bca574804bdd956058e0f9a40d361"
    const smartmeterAccount = web3.eth.accounts.privateKeyToAccount('0x' + smartmeterPK)

    let matcherPrivateKey = "e9a63e116f72c2e368376eb88c22fecf2a5e94a93464ff8802cf97caac657548"

    const matcherAccount = web3.eth.accounts.privateKeyToAccount('0x' + matcherPrivateKey)

    if (!matcherPrivateKey.startsWith("0x")) {
        matcherPrivateKey = "0x" + matcherPrivateKey
    }

    const blockchainProperties = {
        web3: web3,
        cooInstance: new web3.eth.Contract((CoOTruffleBuild as any).abi, (contractConfig as any).Coo),
        demandLogicInstance: new web3.eth.Contract((DemandLogicTruffleBuild as any).abi, (contractConfig as any).DemandLogic),
        producingAssetLogicInstance: new web3.eth.Contract((AssetProducingLogicTruffleBuild as any).abi, (contractConfig as any).AssetProducingLogic),
        consumingAssetLogicInstance: new web3.eth.Contract((AssetConsumingLogicTruffleBuild as any).abi, (contractConfig as any).ConsumingAssetLogic),
        certificateLogicInstance: new web3.eth.Contract((CertificateLogicTruffleBuild as any).abi, (contractConfig as any).CertificateLogic),
        userLogicInstance: new web3.eth.Contract((UserLogicTruffleBuild as any).abi, (contractConfig as any).UserLogic),
        topAdminAccount: (web3 as any).eth.accounts.privateKeyToAccount('0x' + deployConfig.deployKey).address,
        privateKey: deployConfig.deployKey,
        userAdmin: (web3 as any).eth.accounts.privateKeyToAccount("0x" + deployConfig.deployKey).address,
        assetAdminAccount: (web3 as any).eth.accounts.privateKeyToAccount("0x" + deployConfig.deployKey).address,
        agreementAdmin: (web3 as any).eth.accounts.privateKeyToAccount("0x" + deployConfig.deployKey).address
    }
    //   producingAssetLogicInstance: new web3.eth.Contract((AssetProducingLogicTruffleBuild as any).abi, (deployedContracts as any).AssetProducingLogic),

    //set the conversion resolution for carbon credits calculation
    const conversionResolution: number = 20

    try {
        const allReadings = await getAllMeterreadings(start, now)

        for (const reading of allReadings) {
            if (vehicleConfig[reading.vehicleId]) {
                console.log(reading.vehicleId)
                console.log(vehicleConfig[reading.vehicleId])

                let carbonReading = await calculateCredits(reading.energy_Wh, reading.startTime, reading.endTime)
                let carbonCredits = Math.floor(carbonReading * Math.pow(10, conversionResolution))
                console.log("Initial Carbon Reading: " + carbonReading)
                console.log("Initial Carbon Credits: " + carbonCredits)


                carbonCredits = carbonCredits < 0 ? carbonCredits * (-1) : carbonCredits
                carbonReading = carbonReading < 0 ? carbonReading * (-1) : carbonReading

                //Read the last Meter reading tiem stamp amd last Meter reading Wh

                vehicleConfig[reading.vehicleId].AssetId

                const previousInfo = await blockchainProperties.producingAssetLogicInstance.methods.getAssetGeneral(vehicleConfig[reading.vehicleId].AssetId).call()
                const lastTimestamp = parseInt(previousInfo._lastSmartMeterReadFileHash.substring(2, 10), 16)
                const lastReading = parseInt(previousInfo._lastSmartMeterReadWh)

                const previousProps = await blockchainProperties.producingAssetLogicInstance.methods.getAssetProducingProperties(vehicleConfig[reading.vehicleId].AssetId).call()
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


                    console.log(vehicleConfig[reading.vehicleId].AssetId)
                    const txdata = blockchainProperties.producingAssetLogicInstance.methods.saveSmartMeterRead(vehicleConfig[reading.vehicleId].AssetId,
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

                    console.log("tx was send")

                    const txMatcherData = blockchainProperties.certificateLogicInstance.methods
                        .createCertificateForAssetOwner(vehicleConfig[reading.vehicleId].AssetId, reading.energy_Wh)
                        .encodeABI()


                    const gasMatcher = await blockchainProperties.certificateLogicInstance.methods
                        .createCertificateForAssetOwner(vehicleConfig[reading.vehicleId].AssetId, reading.energy_Wh)
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
            } else {
                console.log("vehicle with " + reading.vehicleId + " doesn't have to be checked")
            }
        }

    } catch (e) {
        console.log(e)
    }
    setTimeout(main, intervall);
}


main()
