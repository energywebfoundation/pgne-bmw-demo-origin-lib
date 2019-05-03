import { getAllMeterreadings, getNewMeterreadings } from "./readings";
import * as fs from 'fs'
import { User, BlockchainProperties, CoOTruffleBuild, DemandLogicTruffleBuild, AssetProducingLogicTruffleBuild, AssetConsumingLogicTruffleBuild, CertificateLogicTruffleBuild, UserLogicTruffleBuild, ProducingAsset, ProducingAssetProperties, Compliance, ConsumingAsset, ConsumingProperties, TimeFrame, Currency, FullDemandProperties, Demand } from '.';
import { UserProperties } from "./blockchain-facade/User";
import { deployEmptyContracts } from "./deployEmptyContracts";
import { Asset } from "./blockchain-facade/Asset";
import { AssetType } from "./blockchain-facade/ProducingAsset";
import { startMatcher } from "./matcherStart";

const main = async () => {




    const deployConfig = JSON.parse(fs.readFileSync('connectionConfig.json', 'utf-8').toString())

    const topAdminPrivateKey = deployConfig.deployKey
    const Web3 = require("web3")

    const web3 = new Web3(deployConfig.web3)
    const smartmeterAccount = web3.eth.accounts.create();

    const startTime = 1543883810
    const endTime = 1543893810

    // await getMeterreadings(startTime, endTime)


    /*
    const startTimeTest = new Date("2018-12-04 02:18:49+00:00")
    const endTimeTest = new Date("2018-12-04 02:30:13+00:00")
    const endTimeLess = new Date("2018-12-04 02:25:13+00:00")
    const endTimeLessLess = new Date("2018-12-04 02:19:49+00:00")


    const unixStartTimeTest = Number((startTimeTest.getTime() / 1000).toFixed(0))
    const unixEndTimeTest = Number((endTimeTest.getTime() / 1000).toFixed(0))
    const unixEndTimeLessTest = Number((endTimeLess.getTime() / 1000).toFixed(0))
    const unixEndTimeLessLessTest = Number((endTimeLessLess.getTime() / 1000).toFixed(0))

    // console.log(await getAllMeterreadings(unixStartTimeTest, unixEndTimeTest))
    //  await getAllMeterreadings(unixStartTimeTest, unixEndTimeLessTest)
    // console.log(await getAllMeterreadings(unixStartTimeTest, unixEndTimeLessLessTest))
    */
    const currentTime = Number((new Date().getTime() / 1000).toFixed(0))

    const prevTime = currentTime - 86400

    const latestMeterReadings = await getAllMeterreadings(prevTime, currentTime)

    const last6h = currentTime - (60 * 60 * 6)


    let latestReading = latestMeterReadings[0]
    for (const meterread of latestMeterReadings) {
        if (meterread.endTime > latestReading.endTime) {
            latestReading = meterread
        }
    }


    console.log(latestMeterReadings.indexOf(latestReading))
    console.log(latestReading)

    const readings6h = await getNewMeterreadings(prevTime, currentTime, last6h)

    console.log("meterreadings in the last 6h: " + readings6h.length)

    // console.log(readings6h)

    let carsIds: string[] = []
    for (const meterread of readings6h) {
        const vehicleId = meterread.vehicleId

        if (!carsIds.includes(vehicleId)) {
            carsIds.push(vehicleId)
        }
    }

    console.log("deploying contracts")

    const deployedContracts = await deployEmptyContracts()


    const blockchainProperties = {
        web3: web3,
        cooInstance: new web3.eth.Contract((CoOTruffleBuild as any).abi, (deployedContracts as any).Coo),
        demandLogicInstance: new web3.eth.Contract((DemandLogicTruffleBuild as any).abi, (deployedContracts as any).DemandLogic),
        producingAssetLogicInstance: new web3.eth.Contract((AssetProducingLogicTruffleBuild as any).abi, (deployedContracts as any).AssetProducingLogic),
        consumingAssetLogicInstance: new web3.eth.Contract((AssetConsumingLogicTruffleBuild as any).abi, (deployedContracts as any).ConsumingAssetLogic),
        certificateLogicInstance: new web3.eth.Contract((CertificateLogicTruffleBuild as any).abi, (deployedContracts as any).CertificateLogic),
        userLogicInstance: new web3.eth.Contract((UserLogicTruffleBuild as any).abi, (deployedContracts as any).UserLogic),
        topAdminAccount: (web3 as any).eth.accounts.privateKeyToAccount('0x' + topAdminPrivateKey).address,
        privateKey: topAdminPrivateKey,
        userAdmin: (web3 as any).eth.accounts.privateKeyToAccount("0x" + topAdminPrivateKey).address,
        assetAdminAccount: (web3 as any).eth.accounts.privateKeyToAccount("0x" + topAdminPrivateKey).address,
        agreementAdmin: (web3 as any).eth.accounts.privateKeyToAccount("0x" + topAdminPrivateKey).address
    }

    const userVehicleMapping = {}
    const vehicleAssetMapping = {}

    /**
     * Matcher stuff start
     */
    const exec = require('child_process').exec
    let matcherPrivateKey = "e9a63e116f72c2e368376eb88c22fecf2a5e94a93464ff8802cf97caac657548"

    if (!matcherPrivateKey.startsWith("0x"))
        matcherPrivateKey = "0x" + matcherPrivateKey
    const matcherAddress = web3.eth.accounts.privateKeyToAccount(matcherPrivateKey).address

    const userProps: UserProperties = {
        accountAddress: matcherAddress,
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
    // console.log(addressConfigFile)

    /*
    exec("node " + process.cwd() + "/node_modules/ewf-coo-matcher/build/matcher-main " + (deployedContracts as any).Coo + " " + matcherPrivateKey, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
    */

    /**
     * Matcher stuff end
     */

    const startDeployTime = Number((new Date().getTime() / 1000).toFixed(0))

    let idx = 0
    for (const vId of carsIds) {

        const newEthAccount = web3.eth.accounts.create();

        const userProps: UserProperties = {
            accountAddress: newEthAccount.address,
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

        userVehicleMapping[vId] = userProps


        console.log("onboarding " + vId + "! Eth-Addr: " + newEthAccount.address)
        await User.CREATE_USER_RAW(userProps, blockchainProperties)

        const assetProps: ProducingAssetProperties = {
            smartMeter: smartmeterAccount.address,
            owner: userVehicleMapping[vId].accountAddress,
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

        console.log("onboarding " + vId + " as asset!")
        await ProducingAsset.CREATE_ASSET_RAW(assetProps, blockchainProperties)

        vehicleAssetMapping[vId] = idx
        console.log(idx + " / " + carsIds.length)

        const currentTime = Number((new Date().getTime() / 1000).toFixed(0))
        const progress = idx / carsIds.length

        const timeSoFar = currentTime - startDeployTime

        const averageTime = (timeSoFar / progress)

        const onboardLeft = carsIds.length - idx

        console.log("timesofar: " + timeSoFar + " sec")
        console.log("timeleft: " + (averageTime * onboardLeft) + " sec = " + ((averageTime * onboardLeft) / 60) + " sec")
        idx++

    }

    console.log(vehicleAssetMapping)

    console.log('UI: http://localhost:3000/' + (deployedContracts as any).Coo)

    blockchainProperties.privateKey = smartmeterAccount.privateKey

    let index = 0
    for (const meterread of readings6h) {

        //  await sleep(1000)

        const vehicleId = meterread.vehicleId


        const oldReading = await blockchainProperties.producingAssetLogicInstance.methods.getAssetGeneral(vehicleAssetMapping[vehicleId]).call()

        console.log("-------------------------------")

        console.log(meterread)
        console.log("oldreading:")
        console.log(oldReading._lastSmartMeterReadWh)
        // console.log(oldReading)

        const newMeterread = parseInt(oldReading._lastSmartMeterReadWh) + meterread.energy_Wh
        console.log("meterreading; ")
        console.log(meterread.energy_Wh)

        console.log("new meterread")
        console.log(newMeterread)


        if (meterread.energy_Wh) {
            const txdata = blockchainProperties.producingAssetLogicInstance.methods.saveSmartMeterRead(vehicleAssetMapping[vehicleId],
                newMeterread, false, "0x00", 0, false)
                .encodeABI()

            const txParams = {
                from: smartmeterAccount.address,
                to: (deployedContracts as any).AssetProducingLogic,
                gas: (await web3.eth.getBlock('latest')).gasLimit,
                gasPrice: 0,
                nonce: await web3.eth.getTransactionCount(smartmeterAccount.address),
                data: txdata
            }
            const signedTx = await web3.eth.accounts.signTransaction(txParams, smartmeterAccount.privateKey);

            const tx = (await web3.eth.sendSignedTransaction(signedTx.rawTransaction))


            const txMatcherData = blockchainProperties.certificateLogicInstance.methods
                .createCertificateForAssetOwner(vehicleAssetMapping[vehicleId], meterread.energy_Wh)
                .encodeABI()

            const gasMatcher = await blockchainProperties.certificateLogicInstance.methods
                .createCertificateForAssetOwner(vehicleAssetMapping[vehicleId], meterread.energy_Wh)
                .estimateGas({ from: matcherAddress })


            const txMatcher = {
                from: matcherAddress,
                to: (deployedContracts as any).CertificateLogic,
                gas: Math.floor(gasMatcher * 1.5),
                gasPrice: 0,
                nonce: await web3.eth.getTransactionCount(matcherAddress),
                data: txMatcherData
            }


            const singedMatcherTx = await web3.eth.accounts.signTransaction(txMatcher, matcherPrivateKey);

            await web3.eth.sendSignedTransaction(singedMatcherTx.rawTransaction)
        }
        index++


        /*
        const txdata = blockchainProperties.producingAssetLogicInstance.methods.saveSmartMeterRead(vehicleAssetMapping[vehicleId],
            meterread.energy_Wh, false, _lastSmartMeterReadFileHash, _CO2OffsetMeterRead, false)
            .encodeABI()
            */

    }
    console.log('UI: http://localhost:3000/' + (deployedContracts as any).Coo)


    //    console.log(vehicleAssetMapping)


    // const readingLastHour = await getNewMeterreadings(prevTime, currentTime, lastHour)
    // console.log("meterreadings in the last hour: " + readingLastHour.length)


}

main()


const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}