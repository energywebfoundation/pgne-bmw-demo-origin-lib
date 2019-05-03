import { BlockchainProperties } from './blockchain-facade/BlockchainProperties'
import * as fs from 'fs';
import { CertificateLogicTruffleBuild } from '.';
import { Asset, AssetProperties, AssetType, Compliance } from './blockchain-facade/Asset'
import { ProducingAsset, ProducingAssetProperties } from './blockchain-facade/ProducingAsset'
import { General } from './blockchain-facade/General'
import { Certificate } from './blockchain-facade/Certificate';

const Web3 = require('web3')

let web3;
let topAdminAccount;
let blockchainProperties: BlockchainProperties;

const cooAddress = process.argv[2]
const privateKey = process.argv[3] || '0x50764e302e4ed8ce624003deca642c03ce06934fe77585175c5576723f084d4c'
const assetId = parseInt(process.argv[4], 10) || 0
const newMeterRead = parseInt(process.argv[5], 10) || 28000 * 2 
const sessionId = process.argv[6] || "0x0000000000000000000000000000000000000000000000000000000000000001"
const rpcUrl = process.argv[7] || 'https://tobalaba-rpc.slock.it'
const co2 = parseInt(process.argv[8], 10) || 50



const init = async () => {
    web3 = new Web3(rpcUrl)
    topAdminAccount = await web3.eth.accounts.wallet.add(privateKey)

    console.log('rpc url: ' + rpcUrl)
    console.log('using coo contract: ' + cooAddress)
    

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

const createsTxs = async () => {
    
    console.log('Sendning tx from account: ' + topAdminAccount.address)

    const pa = await (new ProducingAsset(assetId, blockchainProperties)).syncWithBlockchain()
    const watts = newMeterRead - pa.lastSmartMeterReadWh
    const greenPoints = Math.floor(watts * (co2/ 1000)) + pa.lastSmartMeterCO2OffsetRead

    console.log('asset id: ' + assetId)
    console.log('newMeterRead: ' + newMeterRead)
    console.log('sessionId: ' + sessionId)
    console.log('greenPoints: ' + greenPoints)

    const gas = await blockchainProperties.producingAssetLogicInstance.methods
        .saveSmartMeterRead(assetId, newMeterRead, false, sessionId, greenPoints, false)
    .   estimateGas({from: topAdminAccount.address})

    const tx = await blockchainProperties.producingAssetLogicInstance.methods
    .saveSmartMeterRead(assetId, newMeterRead, false, sessionId, greenPoints, false)
        .send({from: topAdminAccount.address, gas: Math.round(gas * 1.1)})

    const oldMeterRead = parseInt(tx.events.LogNewMeterRead.returnValues._oldMeterRead, 10)
    
    console.log('saved meter read')
    console.log('whForCertificate: ' + (newMeterRead - oldMeterRead))
    
    await General.createCertificateForAssetOwner(blockchainProperties, watts, assetId )
    console.log('created certificate')


}

const initAndSendTxs = async () => {
    if (process.argv[2] === 'help' || !process.argv[2]) {
        console.log('cooAddress privateKey assetId  newMeterRead sessionId rpcUrl co2')

    } else {
        
        await init()
        await createsTxs();
    }
    
}

initAndSendTxs()