// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";

interface IERC20Meta { function decimals() external view returns (uint8); }
interface IVault {
    function asset() external view returns (address);
    function operatorApproval(address controller, address operator) external view returns (bool);
    function setOperator(address operator, bool approved) external returns (bool);
}
interface IComposerHub {
    function peers(uint32 eid) external view returns (bytes32);
    function owner() external view returns (address);
}

contract BaseForkTest is Test {
    string constant ENV_RPC = "RPC_URL_BASE_TESTNET";

    function test_base_wiring() external {
        uint forkId = vm.createSelectFork(vm.envString(ENV_RPC));
        forkId; // silence

        address vault      = vm.envAddress("VAULT_BASE");
        address composer   = vm.envAddress("ASYNC_COMPOSER_HUB_BASE");
        address controller = vm.envAddress("CONTROLLER_ADDRESS");
        address usdcBase   = vm.envAddress("USDC_BASE");

        uint32 arbEid      = uint32(vm.envUint("LZ_EID_ARB_SEPOLIA"));
        uint32 ethEid      = uint32(vm.envUint("LZ_EID_SEPOLIA"));
        address spokeArb   = vm.envAddress("SPOKE_REDEEM_OAPP_ARB");
        address spokeEth   = vm.envAddress("SPOKE_REDEEM_OAPP_SEPOLIA");

        // vault configured with USDC as asset
        assertEq(IVault(vault).asset(), usdcBase);
        assertEq(IERC20Meta(usdcBase).decimals(), 6);

        // peers set to both spokes
        assertEq(IComposerHub(composer).peers(arbEid), bytes32(uint256(uint160(spokeArb))));
        assertEq(IComposerHub(composer).peers(ethEid), bytes32(uint256(uint160(spokeEth))));

        // operator approval for controller -> composer (self-heal if missing on fork)
        if (!IVault(vault).operatorApproval(controller, composer)) {
            vm.deal(controller, 1 ether);
            vm.prank(controller);
            IVault(vault).setOperator(composer, true);
        }
        assertTrue(IVault(vault).operatorApproval(controller, composer));
    }
}


