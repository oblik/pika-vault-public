// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {OVault4626AsyncRedeem, IAssetOFT} from "../../contracts/OVault4626AsyncRedeem.sol";
import {AsyncComposerHarness} from "../../contracts/mocks/AsyncComposerHarness.sol";
import {MockEndpointV2} from "../../contracts/mocks/MockEndpointV2.sol";
import {MockTokenMessengerV2} from "../../contracts/mocks/MockTokenMessengerV2.sol";
import {CctpBridger} from "../../contracts/bridge/CctpBridger.sol";
import {AsyncOps, AsyncCodec} from "../../contracts/async/AsyncCodec.sol";

contract MockUSDC is ERC20("MockUSDC","mUSDC") {
    constructor() {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract DummyOFT is IAssetOFT {
    function send(uint32, bytes32, uint256, bytes calldata) external payable returns (uint64, bytes32) {
        revert("OFT not used in CCTP path");
    }
}

contract AsyncRedeemCCTPTest is Test {
    address controller = address(0xC0FEEE);
    address user       = address(0xA11CE);

    MockUSDC usdc;
    OVault4626AsyncRedeem vault;
    DummyOFT oft;
    MockTokenMessengerV2 messenger;
    CctpBridger bridger;
    AsyncComposerHarness harness;
    MockEndpointV2 endpoint;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new OVault4626AsyncRedeem(usdc, "Vault Share", "vSHARE");
        oft = new DummyOFT();
        messenger = new MockTokenMessengerV2();
        bridger = new CctpBridger(address(messenger), address(usdc));
        endpoint = new MockEndpointV2();
        harness = new AsyncComposerHarness(address(endpoint), address(vault), address(oft), address(bridger));

        // fund & deposit
        usdc.mint(user, 1_000_000e6);
        vm.startPrank(user);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(500_000e6, user);
        // allow harness to pull shares from user in request
        vault.approve(address(harness), type(uint256).max);
        vm.stopPrank();

        // operator approval
        vm.prank(controller);
        vault.setOperator(address(harness), true);
    }

    function test_Claim_USDC_Fast_CallsCCTP() public {
        // simulate REQUEST_REDEEM
        bytes memory req = abi.encodePacked(bytes1(AsyncOps.OP_REQUEST_REDEEM), AsyncCodec.encRequest(controller, user, 250_000e6));
        harness.handle(req);
        vault.managerMarkClaimable(controller, 250_000e6);

        // build CCTP payload
        uint32 destDomain = 6; // Base
        address mintRecipient = address(0xBEEF);
        uint256 maxFee = 10_000; // arbitrary fast fee cap
        uint32  minFinality = 1000; // fast
        address destCaller = address(0);
        bytes memory hookData = hex"";
        uint256 minAssets = 0;

        bytes memory p = abi.encodePacked(
            bytes1(AsyncOps.OP_CLAIM_SEND_USDC_CCTP),
            AsyncCodec.encClaimCCTP(controller, mintRecipient, 250_000e6, destDomain, maxFee, minFinality, destCaller, hookData, minAssets)
        );

        // call harness
        harness.handle(p);

        // assertions
        (uint256 amount, uint32 dd, bytes32 mr, address burnToken, bytes32 dc, uint256 mf, uint32 mfT, bytes memory hd, address caller) = messenger.last();
        assertEq(amount, 250_000e6);
        assertEq(dd, destDomain);
        assertEq(address(uint160(uint256(mr))), mintRecipient);
        assertEq(burnToken, address(usdc));
        assertEq(mf, maxFee);
        assertEq(mfT, minFinality);
        assertEq(hd.length, 0);
        assertEq(caller, address(bridger));
    }
}
