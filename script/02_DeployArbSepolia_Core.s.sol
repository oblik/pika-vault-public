// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {NavPusher} from "../contracts/ccip/NavPusher.sol";
import {CctpBridger} from "../contracts/bridge/CctpBridger.sol";

contract DeployArbSepolia_Core is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        address ccipRouterArb  = vm.envAddress("CCIP_ROUTER_ARB_SEPOLIA");
        address tokenMessenger = vm.envAddress("CCTP_TOKEN_MESSENGER_V2_ARB_SEPOLIA");
        address usdcArb        = vm.envAddress("USDC_ARB_SEPOLIA");

        vm.startBroadcast(pk);
        NavPusher pusher = new NavPusher(ccipRouterArb);
        CctpBridger bridger = new CctpBridger(tokenMessenger, usdcArb);
        vm.stopBroadcast();

        console2.log("NavPusher (Arb Sepolia):", address(pusher));
        console2.log("CctpBridger (Arb Sepolia):", address(bridger));
    }
}
