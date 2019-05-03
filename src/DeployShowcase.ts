import deployment from './Deployment'
import { ProducingAssetProperties, Compliance, ProducingAsset } from '.';
import { DemandLogicTruffleBuild, AssetProducingLogicTruffleBuild, AssetConsumingLogicTruffleBuild, CertificateLogicTruffleBuild, CoOTruffleBuild, UserLogicTruffleBuild } from '.'


import * as fs from 'fs';
const Web3 = require('web3')
const web3 = new Web3('https://tobalaba-rpc.slock.it')
//const web3 = new Web3('http://127.0.0.1:8545')

let blockchainProperties

let topAdminAccount
let smartMeterAccount
let assetOwnerAccount

const topAdminAccountPrivateKey = '0xd9066ff9f753a1898709b568119055660a77d9aae4d7a4ad677b8fb3d2a571e5'
const smartMeterPrivateKey = '0x09f08bc14bfdaf427fdd0eb676db21a86fa908a25870158345e4f847b5ada35e'
const assetOwnerPrivateKey = '0x50764e302e4ed8ce624003deca642c03ce06934fe77585175c5576723f084d4c'




const deployShowcase = async () => {

    const cooAddress =  await deployment()

    topAdminAccount = await web3.eth.accounts.wallet.add(topAdminAccountPrivateKey)
    console.log('Admin: ' + topAdminAccount.address)

    smartMeterAccount = await web3.eth.accounts.wallet.add(smartMeterPrivateKey)
    console.log('Smart Meter: ' + smartMeterAccount.address)

    assetOwnerAccount = await web3.eth.accounts.wallet.add(assetOwnerPrivateKey)
    console.log('Asset Owner: ' + assetOwnerAccount.address)


    await init(cooAddress)
    await createUsers()
    await deployAssets()

}

const init = async (cooAddress: string) => {

    const CoOTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/CoO.json', 'utf-8').toString());
    const AssetProducingLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/AssetProducingRegistryLogic.json', 'utf-8').toString());
    const AssetConsumingLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/AssetConsumingRegistryLogic.json', 'utf-8').toString());
    const UserLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/UserLogic.json', 'utf-8').toString());
    const DemandTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/DemandLogic.json', 'utf-8').toString());
    const CertificateLogicTruffleBuild = JSON.parse(fs.readFileSync('build/contracts/CertificateLogic.json', 'utf-8').toString());
    
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
        privateKey: topAdminAccountPrivateKey.slice(2)
    
    }
}

const createUsers = async () => {

    const user = [
        web3.utils.utf8ToHex('John'),
        web3.utils.utf8ToHex('Miller'),
        web3.utils.utf8ToHex('EV Corp.'),
        web3.utils.utf8ToHex('Main St'),
        web3.utils.utf8ToHex('123'),
        web3.utils.utf8ToHex('01234'),
        web3.utils.utf8ToHex('Anytown'),
        web3.utils.utf8ToHex('USA'),
        web3.utils.utf8ToHex('AnyState')
    ]

    const gas = await blockchainProperties.userLogicInstance.methods.setUser(
            assetOwnerAccount.address,
            ...user
        ).estimateGas({from: topAdminAccount.address, })

    await blockchainProperties.userLogicInstance.methods.setUser(
        assetOwnerAccount.address,
        ...user
        ).send({ gasPrice: 0, gas: Math.round(gas * 1.1), from: topAdminAccount.address })


    console.log('User created')

    const gas2 =  await blockchainProperties.userLogicInstance.methods.setRoles(
        assetOwnerAccount.address,
        2,
    ).estimateGas({ gasPrice: 0, from: topAdminAccount.address })

    await blockchainProperties.userLogicInstance.methods.setRoles(
            assetOwnerAccount.address,
            127,
        ).send({  gasPrice: 0, gas: Math.round(gas2 * 1.1), from: topAdminAccount.address })

    console.log('Set Roles')
    

    
}

const sleep = async (ms)  => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const deployAssets = async () => {
    const testAsset: ProducingAssetProperties = {
        smartMeter: assetOwnerAccount.address,
        owner: assetOwnerAccount.address,
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


    await sleep(10)
    await ProducingAsset.CREATE_ASSET_RAW(testAsset, blockchainProperties)
    console.log('assets created')
}

deployShowcase()