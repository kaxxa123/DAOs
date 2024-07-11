import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const USDTokenModule = buildModule("USDTokenModule", (m) => {
    const account0 = m.getAccount(0);

    const token = m.contract("USDToken", [account0]);
    return { token };
});

export default USDTokenModule;
