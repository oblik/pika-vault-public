// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {NavReceiver} from "../contracts/ccip/NavReceiver.sol";

contract DeployBaseSepolia_NavReceiver is Script {
    function run() external {
        address router = vm.envAddress("CCIP_ROUTER_BASE_SEPOLIA"); // CCIP router on Base Sepolia
        uint256 pk = vm.envUint("DEPLOYER_PK");

        vm.startBroadcast(pk);
        NavReceiver recv = new NavReceiver(router);
        vm.stopBroadcast();

        console2.log("NavReceiver (Base Sepolia):", address(recv));
    }
}
