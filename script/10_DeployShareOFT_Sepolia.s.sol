// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {MyShareOFT} from "../contracts/MyShareOFT.sol";

contract DeployShareOFT_Sepolia is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        address lzEndpoint = vm.envAddress("LZ_ENDPOINT_SEPOLIA");
        address delegate   = vm.envAddress("DEPLOYER_ADDRESS");

        string memory name   = vm.envOr("SHARE_OFT_NAME", string("Vault Share"));
        string memory symbol = vm.envOr("SHARE_OFT_SYMBOL", string("vSHARE"));

        vm.startBroadcast(pk);
        MyShareOFT share = new MyShareOFT(name, symbol, lzEndpoint, delegate);
        vm.stopBroadcast();

        console2.log("MyShareOFT (Sepolia):", address(share));
    }
}


