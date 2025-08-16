// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./OVault4626AsyncRedeem.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library LZAddr {
    function toB32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }
}

contract ComposerAsync {
    OVault4626AsyncRedeem public immutable vault;
    IAssetOFT public immutable assetOFT; // hub-side OFT for underlying

    constructor(OVault4626AsyncRedeem _vault, IAssetOFT _assetOFT) {
        vault = _vault;
        assetOFT = _assetOFT;
    }

    // === Simulated LZ receiver ===
    function handleRequestRedeem(bytes calldata payload) external {
        (address controller, address owner, uint256 shares) = abi.decode(payload, (address,address,uint256));
        // Pull 'owner' shares to the vault and enqueue
        vault.requestRedeem(shares, controller, owner);
    }

    function handleClaimSendAssets(bytes calldata payload) external payable {
        (address controller, address receiver, uint256 shares, uint32 dstEid, uint256 minAssets, bytes memory options)
            = abi.decode(payload, (address,address,uint256,uint32,uint256,bytes));
        // Controller must have operator approval for this contract or call via controller
        // We assume controller == msg.sender or approved operator. For demo, we set approval in tests.
        vault.claimRedeemToChain{value: msg.value}(shares, receiver, controller, dstEid, minAssets, options, assetOFT);
    }
}

contract SpokeRedeemRouter {
    address public immutable hubComposer;  // ComposerAsync on hub
    IERC20  public immutable shareToken;   // OFT share on spoke (or the hub share in single-chain tests)

    constructor(address _hubComposer, IERC20 _shareToken) {
        hubComposer = _hubComposer;
        shareToken  = _shareToken;
    }

    // In this test-friendly version we simulate the LZ payload to hub without pre-moving shares.
    // The hub-side composer will pull shares from the owner (requires allowance to composer).
    function requestRedeemOnSpoke(address controller, address owner, uint256 shares) external {
        // LZ send → for demo we call hub directly:
        ComposerAsync(hubComposer).handleRequestRedeem(abi.encode(controller, owner, shares));
    }

    // In production, you’d construct OP_CLAIM_SEND_ASSETS and LZ-send to hub.
}
