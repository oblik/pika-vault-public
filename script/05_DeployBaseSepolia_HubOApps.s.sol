// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AsyncComposerOApp} from "../contracts/async/AsyncComposerOApp.sol";
import {CctpBridger} from "../contracts/bridge/CctpBridger.sol";
import {CctpDepositReceiver} from "../contracts/cctp/CctpDepositReceiver.sol";

contract DeployBaseSepolia_HubOApps is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");

        address lzEndpointBase   = vm.envAddress("LZ_ENDPOINT_BASE_SEPOLIA");
        address vault            = vm.envAddress("VAULT_BASE");
        address shareAdapter     = vm.envAddress("SHARE_ADAPTER_BASE");

        // CCTP (Base)
        address tokenMessenger   = vm.envAddress("CCTP_TOKEN_MESSENGER_V2_BASE");
        address usdcBase         = vm.envAddress("USDC_BASE");

        vm.startBroadcast(pk);

        // (1) Base CCTP bridger
        CctpBridger bridger = new CctpBridger(tokenMessenger, usdcBase);

        // (2) Async hub composer (assetOFT not used for USDC on hub; pass zero)
        AsyncComposerOApp composer = new AsyncComposerOApp(
            lzEndpointBase,
            vault,
            address(0),
            address(bridger)
        );

        // (3) Deposit receiver for USDC Fast deposits
        CctpDepositReceiver receiver = new CctpDepositReceiver(
            vault,
            shareAdapter,
            msg.sender
        );

        vm.stopBroadcast();

        console2.log("Base CCTP Bridger:", address(bridger));
        console2.log("AsyncComposerOApp (hub):", address(composer));
        console2.log("CctpDepositReceiver:", address(receiver));
    }
}


