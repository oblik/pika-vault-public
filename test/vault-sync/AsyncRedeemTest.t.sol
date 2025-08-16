// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {OVault4626AsyncRedeem, IAssetOFT} from "../../contracts/OVault4626AsyncRedeem.sol";
import {ComposerAsync, SpokeRedeemRouter} from "../../contracts/mocks/ComposerAsync.sol";

contract MockUSDC is ERC20("MockUSDC","mUSDC") {
    constructor() {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract MockOFT is IAssetOFT {
    IERC20 public immutable underlying;
    // dstEid => receiver => credited amount
    mapping(uint32 => mapping(address => uint256)) public credit;
    event Sent(uint32 dstEid, address to, uint256 amount);

    constructor(IERC20 u) { underlying = u; }

    function send(uint32 dstEid, bytes32 to, uint256 amount, bytes calldata)
        external payable returns (uint64, bytes32)
    {
        // simulate OFT locking underlying from caller (vault)
        require(underlying.transferFrom(msg.sender, address(this), amount), "lock fail");
        address recv = address(uint160(uint256(to)));
        credit[dstEid][recv] += amount;
        emit Sent(dstEid, recv, amount);
        return (0, bytes32(0));
    }
}

contract AsyncRedeemTest is Test {
    address user      = address(0xA11CE);
    address controller= address(0xC0FEEE); // user’s AA/smart account
    address receiver  = address(0xBEEF);
    uint32  dstEid    = 40221; // arbitrary test id

    MockUSDC asset;
    OVault4626AsyncRedeem vault;
    MockOFT oft;
    ComposerAsync composer;
    SpokeRedeemRouter spoke;

    function setUp() public {
        asset = new MockUSDC();
        vault = new OVault4626AsyncRedeem(asset, "Vault Share", "vSHARE");
        oft   = new MockOFT(asset);
        composer = new ComposerAsync(vault, oft);
        spoke     = new SpokeRedeemRouter(address(composer), IERC20(address(vault)));

        // fund user
        asset.mint(user, 1_000_000e6);
        vm.startPrank(user);
        asset.approve(address(vault), type(uint256).max);
        vault.deposit(500_000e6, user);                   // sync deposit
        // allow router/composer to pull user's shares (single-chain test uses hub share as shareToken)
        vault.approve(address(spoke), type(uint256).max);
        vault.approve(address(composer), type(uint256).max);
        vm.stopPrank();

        // Let composer act as operator for controller to make claim calls
        vm.prank(controller);
        vault.setOperator(address(composer), true);
    }

    function test_SyncDeposit_AsyncRequestAndClaimToChain() public {
        uint256 userShares = vault.balanceOf(user);
        assertGt(userShares, 0);

        // User requests async redeem of half their shares on a spoke
        uint256 reqShares = userShares / 2;
        vm.prank(user);
        spoke.requestRedeemOnSpoke(controller, user, reqShares);

        // Shares locked in the vault (moved from user to vault)
        assertEq(vault.balanceOf(user), userShares - reqShares);
        assertEq(vault.balanceOf(address(vault)), reqShares);
        assertEq(vault.pendingRedeem(controller), reqShares);
        assertEq(vault.claimableRedeem(controller), 0);

        // Manager frees liquidity and marks claimable
        vault.managerMarkClaimable(controller, reqShares);
        assertEq(vault.pendingRedeem(controller), 0);
        assertEq(vault.claimableRedeem(controller), reqShares);

        // Now claim to another chain via ComposerAsync
        bytes memory payload = abi.encode(controller, receiver, reqShares, dstEid, 0, bytes(""));
        vm.prank(controller); // controller (or its operator) triggers the claim
        composer.handleClaimSendAssets(payload);

        // After claim: claimable reduced, vault burned locked shares
        assertEq(vault.claimableRedeem(controller), 0);
        assertEq(vault.balanceOf(address(vault)), 0);

        // Assets bridged to dst chain (credited in mock)
        uint256 credited = oft.credit(dstEid, receiver);
        assertGt(credited, 0);

        // Spot-check asset accounting: vault’s underlying reduced by 'credited'
        // With direct transfer + OFT lock, balance should be initial - credited
        assertEq(asset.balanceOf(address(vault)), 500_000e6 - credited);
    }
}
