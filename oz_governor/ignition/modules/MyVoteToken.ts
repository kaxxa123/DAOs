import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyVoteTokenModule = buildModule("MyVoteTokenModule", (m) => {
  const account0 = m.getAccount(0);

  const token = m.contract("MyVoteToken", [account0]);
  return { token };
});

export default MyVoteTokenModule;
