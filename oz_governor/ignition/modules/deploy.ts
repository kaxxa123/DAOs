import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import USDToken from "./USDToken";
import MyGovernor from "./MyGovernor";

const DeployModule = buildModule("DeployModule", (m) => {

    const { vote, gov } = m.useModule(MyGovernor)
    const { usd } = m.useModule(USDToken)

    return { vote, gov, usd };
});

export default DeployModule;
