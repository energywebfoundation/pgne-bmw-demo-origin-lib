import * as fs from 'fs'
import { deployEmptyContracts } from './deployEmptyContracts';
import { User, BlockchainProperties, CoOTruffleBuild, DemandLogicTruffleBuild, AssetProducingLogicTruffleBuild, AssetConsumingLogicTruffleBuild, CertificateLogicTruffleBuild, UserLogicTruffleBuild, ProducingAsset, ProducingAssetProperties, Compliance, ConsumingAsset, ConsumingProperties, TimeFrame, Currency, FullDemandProperties, Demand } from '.';
import { UserProperties } from './blockchain-facade/User';
import { AssetType } from './blockchain-facade/ProducingAsset';

const main = async () => {

    const deployConfig = JSON.parse(fs.readFileSync('connectionConfig.json', 'utf-8').toString())

    const topAdminPrivateKey = deployConfig.deployKey
    const Web3 = require("web3")

    console.log(deployConfig.web3)
    const web3 = new Web3(deployConfig.web3)
    const smartmeterAccount = "0x908713abb5c2622f454c15c13a8d416231cebc0e"

    console.log("deploying contracts with stuff")

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


    const vehicleIds = ['47P1', '41P0', '56P1', '29P0', '63P5', '44P5', '63P2', '63P3', '50P9', '56P4', '43P4', '64P7', '32P9', '36P4', '36P7', '15P9', '55P8', '66P0', '45P5', '21P8']
    console.log(vehicleIds)

    const vehiceMapping = {} as any


    let index = 0
    for (const vId of vehicleIds) {
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

        vehiceMapping[vId] = newEthAccount

        console.log("onboarding " + vId + "! Eth-Addr: " + newEthAccount.address)
        await User.CREATE_USER_RAW(userProps, blockchainProperties)

        const assetProps: ProducingAssetProperties = {
            smartMeter: smartmeterAccount,
            owner: newEthAccount.address,
            operationalSince: Number((new Date().getTime() / 1000).toFixed(0)),
            capacityWh: 40000,
            lastSmartMeterReadWh: 0,
            active: true,
            lastSmartMeterReadFileHash: "0x01",
            country: "California",
            region: "Silicon Valley",
            zip: "1234",
            city: "AnyTown",
            street: "AnyStreet",
            houseNumber: "1",
            gpsLatitude: "37.792866",
            gpsLongitude: "-122.396448",
            assetType: AssetType.Solar,
            certificatesCreatedForWh: 0,
            lastSmartMeterCO2OffsetRead: 0,
            cO2UsedForCertificate: 0,
            complianceRegistry: Compliance.none,
            otherGreenAttributes: "n.a.",
            typeOfPublicSupport: "n.a."
        }
        newEthAccount.AssetId = index

        await ProducingAsset.CREATE_ASSET_RAW(assetProps, blockchainProperties)
        index++
    }

    const writeJsonFile = require('write-json-file')
    await writeJsonFile('vehicleId.json', vehiceMapping)

}

main()