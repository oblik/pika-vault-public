// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {NavPusher} from "../contracts/ccip/NavPusher.sol";
import {CctpBridger} from "../contracts/bridge/CctpBridger.sol";

interface IERC20 { function transferFrom(address,address,uint256) external returns (bool); function balanceOf(address) external view returns (uint256); }

contract Run_ArbSepolia_BridgeAndPush is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address fromEOA = vm.addr(pk);

        // contracts
        address navPusher      = vm.envAddress("NAV_PUSHER_ARB");
        address cctpBridger    = vm.envAddress("CCTP_BRIDGER_ARB");

        // USDC & amounts
        address usdcArb        = vm.envAddress("USDC_ARB_SEPOLIA");
        uint256 amountUSDC     = vm.envUint("AMOUNT_USDC_6DP"); // e.g., 10000000 for 10 USDC

        // CCTP v2 params
        uint32  destDomain     = uint32(vm.envUint("CCTP_DEST_DOMAIN_BASE"));      // e.g., 6 for Base
        address destTreasury   = vm.envAddress("DEST_TREASURY_BASE");
        address destCaller     = address(0); // no hook executor for now
        uint256 maxFee         = vm.envUint("CCTP_MAX_FEE");           // 0 for standard
        uint32  minFinality    = uint32(vm.envUint("CCTP_MIN_FINALITY")); // 2000 standard, 1000 fast
        bytes memory hookData  = hex"";

        // CCIP params
        uint64  baseSelector   = uint64(vm.envUint("CCIP_BASE_SEPOLIA_SELECTOR")); // e.g., 1034497...
        address navReceiver    = vm.envAddress("NAV_RECEIVER_BASE");
        uint256 navE18         = vm.envUint("TEST_NAV_E18"); // e.g., 1005000000000000000 (1.005e18)
        address feeToken       = address(0); // pay CCIP in native

        vm.startBroadcast(pk);

        // (1) CCTP v2: bridge USDC from Arb → Base
        CctpBridger(cctpBridger).bridgeUSDCV2(
            amountUSDC,
            destDomain,
            destTreasury,
            destCaller,
            maxFee,
            minFinality,
            hookData
        );

        // (2) CCIP: push NAV to Base NavReceiver
        NavPusher(navPusher).pushNAV{value: address(this).balance}( // send all msg.value to cover fee
            baseSelector,
            navReceiver,
            navE18,
            feeToken
        );

        vm.stopBroadcast();

        // logs
        console2.log("Bridged (USDC, 6dp):", amountUSDC);
        console2.log("Pushed NAV (1e18):", navE18);
    }
}
