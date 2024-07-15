import { vars, HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const SECRET_KEY_0 = vars.get("SECRET_KEY_0");
const SECRET_KEY_1 = vars.get("SECRET_KEY_1");
const SECRET_KEY_2 = vars.get("SECRET_KEY_2");
const SECRET_KEY_3 = vars.get("SECRET_KEY_3");
const SECRET_KEY_4 = vars.get("SECRET_KEY_4");
const SECRET_KEY_5 = vars.get('SECRET_KEY_5');

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
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43113,
      accounts: [
        SECRET_KEY_0,
        SECRET_KEY_1,
        SECRET_KEY_2,
        SECRET_KEY_3,
        SECRET_KEY_4,
        SECRET_KEY_5]
    },
  }
};

export default config;
