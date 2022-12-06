import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import "hardhat-deploy";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
   version: "0.7.6",
   settings: {
    optimizer: {
      runs: 200,
      enabled: true,
    },
  },
  },
  networks:{
    hardhat: {
      allowUnlimitedContractSize: false,
      chainId: 1,
     blockGasLimit:8e6,
     forking: {
       url: process.env.FORK_URL || '',
       blockNumber: 15011602,      
     },
    },
  }  
};

export default config;
