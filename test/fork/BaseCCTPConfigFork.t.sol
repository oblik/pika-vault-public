// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";

interface IComposerHubCCTP {
    function owner() external view returns (address);
}

contract BaseCCTPConfigForkTest is Test {
    function test_base_cctp_addresses_exist() external {
        vm.createSelectFork(vm.envString("RPC_URL_BASE_TESTNET"));

        address bridger = vm.envAddress("CCTP_BRIDGER_BASE");
        address receiver = vm.envAddress("CCTP_DEPOSIT_RECEIVER_BASE");
        address composer = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");

        // just sanity check nonzero + composer has an owner set
        assertTrue(bridger != address(0));
        assertTrue(receiver != address(0));
        assertTrue(composer != address(0));
        assertTrue(IComposerHubCCTP(composer).owner() != address(0));
    }
}


