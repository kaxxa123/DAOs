import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import USDToken from "./USDToken";
import MyGovernorTL from "./MyGovernorTL";

const DeployModule = buildModule("DeployModule", (m) => {

    const { vote, lock, gov } = m.useModule(MyGovernorTL)
    const { usd } = m.useModule(USDToken)

    return { vote, lock, gov, usd };
});

export default DeployModule;
