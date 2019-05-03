## To run the pilot you will need:

* Backend pilot repository (this repository)
* [Frontend pilot repository](https://github.com/energywebfoundation/pgne-bmw-demo-origin-ui)
* [Npm](https://www.npmjs.com) installed
* [MetaMask](https://metamask.io) installed


# Run the simulation
To run the simulation locally on your computer you need to:

1. Download and build front and backend repository
2. Start the blockchain 
3. Start the backend 
4. Run the test script
5. Run the UI
6. Open UI in the browser

## Download and build backend repository
1. Download the backend repository from the GitHub. (run git clone in your terminal or directly download the zip file from the Github.) 
In your current directory, you should have a folder named `pgne-bmw-demo-origin-lib`, which is your backend repository.
2. In your terminal, navigate to the folder.  
3. Then, run the `npm install` command in the terminal. If the installation succeeded, you should have `node_modules` directories in your folder.

## Start the blockchain 

1. Open `pgne-bmw-demo-origin-lib` folder in your terminal.
2. Run `npm run start-ganache`
3. If you were connected to the chain, then you should see accounts and keys showing in your terminal.
4. Keep the terminal open and running, and proceed with the following steps. 

## Deploy contracts from backend to blockchain 

1. Open `pgne-bmw-demo-origin-lib` folder in another terminal.
2. Run `npm run deploy` to deploy the contracts on the chain.
3. In order to run the deployment, you need to connect to a chain first. If you were not, please go to the section "Start the blockchain".

## Run

1. Open `pgne-bmw-demo-origin-lib` folder in your terminal.
2. Run `npm run start-runner` to start the simulation.
3. If it succeeded, your terminal will show the fetched data and calculated carbon credits.

**DISCLAIMER**: This procedure uses test private keys in [vehicleId.json](vehicleId.json). These private keys should ONLY be used for TEST PURPOSES. **Do NOT use these private keys in production**. We are not responsible to any loss of funds in you use these private keys in production.

## Using as dependency

If you run `lib` as dependency to other project - such as `ui`, after installing dependenies of `ui` run `npx pgne-bmw-demo-origin-deploy-contracts` after starting Ganache, so the contracts will be automatically deployed to the local network and TypeScript build recompiled.