// index.js
import "dotenv/config";
import { createPublicClient, http, getContract, encodePacked } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createBundlerClient } from "viem/account-abstraction";
import { erc20Abi } from "viem";
import { signPermit } from "./permit.js";

const chain = arbitrumSepolia;
const usdcAddress = process.env.USDC_ADDRESS;          // from docs (ex: 0x75fa...46AA4d on Arb Sepolia)
const paymasterAddress = process.env.PAYMASTER_V08_ADDRESS; // also given in docs

const client = createPublicClient({ chain, transport: http() });
const owner = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY);
const account = /* your 4337/7702 smart account init */;

// Build Paymaster data (USDC permit so it can pull fees)
const paymaster = {
  async getPaymasterData() {
    const permitAmount = 10n ** 7n; // 10 USDC (6 decimals)
    const permitSig = await signPermit({
      tokenAddress: usdcAddress,
      account,
      client,
      spenderAddress: paymasterAddress,
      permitAmount,
    });
    const paymasterData = encodePacked(
      ["uint8","address","uint256","bytes"],
      [0, usdcAddress, permitAmount, permitSig]
    );
    return {
      paymaster: paymasterAddress,
      paymasterData,
      paymasterVerificationGasLimit: 200000n,
      paymasterPostOpGasLimit: 15000n,
      isFinal: true,
    };
  },
};

// Then create bundlerClient(...) and send userOperation as in the quickstart.
