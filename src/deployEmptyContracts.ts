import * as fs from 'fs'
import { deployCoo, deployContract, logicInit, initCoo } from './Deployment';
import { DemandLogicTruffleBuild, AssetProducingLogicTruffleBuild, AssetConsumingLogicTruffleBuild, CertificateLogicTruffleBuild, CoOTruffleBuild, UserLogicTruffleBuild } from '.'
import { DemandDBTruffleBuild, AssetProducingDBTruffleBuild, AssetConsumingDBTruffleBuild, CertificateDBTruffleBuild, UserDBTruffleBuild } from '.'


export const deployEmptyContracts = async (): Promise<JSON> => {

    const deployConfig = JSON.parse(fs.readFileSync('connectionConfig.json', 'utf-8').toString())


    const Web3 = require('web3')
    const web3 = new Web3(deployConfig.web3)

    const resultMapping = {} as any;

    const CooAddress = await deployCoo()
    console.log('CoO deployed: ' + CooAddress)
    const assetConsumingLogicAddress = await deployContract(CooAddress, AssetConsumingLogicTruffleBuild)
    console.log('AssetConsumingLogic deployed: ' + assetConsumingLogicAddress)
    const assetConsumingDBAddress = await deployContract(assetConsumingLogicAddress, AssetConsumingDBTruffleBuild)
    console.log('AssetConsumingDB deployed: ' + assetConsumingDBAddress)
    const assetProducingLogicAddress = await deployContract(CooAddress, AssetProducingLogicTruffleBuild)
    console.log('AssetProducingLogic deployed: ' + assetProducingLogicAddress)
    const assetProducingDBAddress = await deployContract(assetProducingLogicAddress, AssetProducingDBTruffleBuild)
    console.log('AssetProducingDB deployed: ' + assetProducingDBAddress)
    const certificateLogicAddress = await deployContract(CooAddress, CertificateLogicTruffleBuild)
    console.log('CertificateLogic deployed: ' + certificateLogicAddress)
    const certificateDBAddress = await deployContract(certificateLogicAddress, CertificateDBTruffleBuild)
    console.log('CertificateDB deployed: ' + certificateLogicAddress)
    const demandLogicAddress = await deployContract(CooAddress, DemandLogicTruffleBuild)
    console.log('DemandLogic deployed: ' + demandLogicAddress)
    const demandDbAddress = await deployContract(demandLogicAddress, DemandDBTruffleBuild)
    console.log('DemandDB deployed: ' + demandDbAddress)
    const userLogicAddress = await deployContract(CooAddress, UserLogicTruffleBuild)
    console.log('UserLogic deployed: ' + userLogicAddress)
    const userDbAddress = await deployContract(userLogicAddress, UserDBTruffleBuild)
    console.log('UserDB deployed: ' + userDbAddress)

    console.log('init assetConsuming')
    await logicInit(assetConsumingLogicAddress, assetConsumingDBAddress)
    console.log('init assetProducing')
    await logicInit(assetProducingLogicAddress, assetProducingDBAddress)
    console.log('init certificate')
    await logicInit(certificateLogicAddress, certificateDBAddress)
    console.log('init demand')
    await logicInit(demandLogicAddress, demandDbAddress)
    console.log('init userlogic')
    await logicInit(userLogicAddress, userDbAddress)
    console.log('init coo')
    await initCoo(CooAddress, userLogicAddress, assetProducingLogicAddress, certificateLogicAddress, demandLogicAddress, assetConsumingLogicAddress)

    resultMapping.Coo = CooAddress
    resultMapping.UserLogic = userLogicAddress
    resultMapping.AssetProducingLogic = assetProducingLogicAddress
    resultMapping.CertificateLogic = certificateLogicAddress
    resultMapping.DemandLogic = demandLogicAddress
    resultMapping.AssetConsumingLogic = assetConsumingLogicAddress

    const writeJsonFile = require('write-json-file')
    await writeJsonFile('contractConfig.json', resultMapping)

    return resultMapping

}

//deployEmptyContracts()
