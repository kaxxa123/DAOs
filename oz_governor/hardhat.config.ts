import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 1000,
      },
    },
    reth: {
      url: "http://localhost:8545",
      gasPrice: 225000000000,
      accounts: { mnemonic: "test test test test test test test test test test test junk" }
    }
  }
};

export default config;
