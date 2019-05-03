import { BlockchainProperties } from './blockchain-facade/BlockchainProperties'
import * as fs from 'fs';
import { CertificateLogicTruffleBuild } from '.';
import { Asset, AssetProperties, AssetType, Compliance } from './blockchain-facade/Asset'
import { ProducingAsset, ProducingAssetProperties } from './blockchain-facade/ProducingAsset'
import { General } from './blockchain-facade/General'
import { Certificate } from './blockchain-facade/Certificate';

const Web3 = require('web3')

let web3;
let assetAdminAccount;
let topAdminAccount;
let blockchainProperties: BlockchainProperties;
const cooAddress = process.argv[2]
const privateKey = process.argv[3] || '0xd9066ff9f753a1898709b568119055660a77d9aae4d7a4ad677b8fb3d2a571e5'
const assetId = parseInt(process.argv[4], 10) || 0
const newMeterRead = parseInt(process.argv[5], 10) || 10000
const sessionId = process.argv[6] || "0x0000000000000000000000000000000000000000000000000000000000000002"
const greenPoints = parseInt(process.argv[7], 10) || 1000
const whForCertificate = parseInt(process.argv[8], 10) || 10





const init = async () => {
    web3 = new Web3('https://tobalaba-rpc.slock.it')
    topAdminAccount = await web3.eth.accounts.wallet.add(privateKey)
    console.log(topAdminAccount.address)

  
    const CoOTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/CoO.json', 'utf-8').toString());
    const AssetProducingLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/AssetProducingRegistryLogic.json', 'utf-8').toString());
    const AssetConsumingLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/AssetConsumingRegistryLogic.json', 'utf-8').toString());
    const UserLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/UserLogic.json', 'utf-8').toString());
    const DemandTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/DemandLogic.json', 'utf-8').toString());
    const cooContractInstance = await (new web3.eth.Contract((CoOTruffleBuild as any).abi, cooAddress))
    const assetProducingRegistryAddress = await cooContractInstance.methods.assetProducingRegistry().call()
    const demandLogicAddress = await cooContractInstance.methods.demandRegistry().call()
    const certificateLogicAddress = await cooContractInstance.methods.certificateRegistry().call()
    const assetConsumingRegistryAddress = await cooContractInstance.methods.assetConsumingRegistry().call()
    const userLogicAddress = await cooContractInstance.methods.userRegistry().call()

    blockchainProperties = {
        web3: web3,
        cooInstance: cooContractInstance,
        producingAssetLogicInstance: new web3.eth.Contract((AssetProducingLogicTruffleBuild as any).abi, assetProducingRegistryAddress),
        consumingAssetLogicInstance: new web3.eth.Contract((AssetConsumingLogicTruffleBuild as any).abi, assetConsumingRegistryAddress),
        certificateLogicInstance: new web3.eth.Contract((CertificateLogicTruffleBuild as any).abi, certificateLogicAddress),
        userLogicInstance: new web3.eth.Contract((UserLogicTruffleBuild as any).abi, userLogicAddress),
        demandLogicInstance: new web3.eth.Contract((DemandTruffleBuild as any).abi, demandLogicAddress),
        topAdminAccount: topAdminAccount.address,
        assetAdminAccount: topAdminAccount.address,
        matcherAccount: topAdminAccount.address,
        privateKey: privateKey.slice(2)
    
    }
    console.log('init: done')
  }

const createDemoData = async () => {
    const testAsset: ProducingAssetProperties = {
        smartMeter: "0xd173313a51f8fc37bcf67569b463abd89d81844f",
        owner: "0xd173313a51f8fc37bcf67569b463abd89d81844f",
        operationalSince: 2423423422342,
        capacityWh: 1000000000,
        lastSmartMeterReadWh: 0,
        active: true,
        lastSmartMeterReadFileHash: "",
        country: "Germany",
        region: "Saxony",
        zip: "09648",
        city: "Mittweida",
        street: "Markt",
        houseNumber: "16",
        gpsLatitude: "49.000000",
        gpsLongitude: "11.00000",
        assetType: 1,
        certificatesCreatedForWh: 0,
        lastSmartMeterCO2OffsetRead: 0,
        cO2UsedForCertificate: 0,
        complianceRegistry: Compliance.IREC,
        otherGreenAttributes: "N.A",
        typeOfPublicSupport: "N.A"
      }

      console.log(topAdminAccount.address)

    await ProducingAsset.CREATE_ASSET_RAW(testAsset, blockchainProperties)
    console.log('assets created')

    const gas = await blockchainProperties.producingAssetLogicInstance.methods
        .saveSmartMeterRead(assetId, newMeterRead, false, sessionId, greenPoints, false)
    .   estimateGas({from: topAdminAccount.address})

    const tx = await blockchainProperties.producingAssetLogicInstance.methods
    .saveSmartMeterRead(assetId, newMeterRead, false, sessionId, greenPoints, false)
        .send({from: topAdminAccount.address, gas: Math.round(gas * 1.1)})
    

    console.log('saved meter read')
    await General.createCertificateForAssetOwner(blockchainProperties, whForCertificate, 0)
    console.log('created certificate')


}

const mainTest = async () => {
    await init()
    //blockchainProperties.certificateLogicInstance.methods.getCertificateIdBySessionId("0x0000000000000000000000000000000000000000000000000000000000000003").call().then(console.log)
    await createDemoData();

    //const certificate = await (new Certificate(0, blockchainProperties)).syncWithBlockchain()

    //await certificate.getCo2('energyweb', 'en3rgy!web')


    
}

mainTest()
