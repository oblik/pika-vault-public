// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AsyncComposerOApp} from "../async/AsyncComposerOApp.sol";
import {AsyncOps, AsyncCodec} from "../async/AsyncCodec.sol";

contract AsyncComposerHarness is AsyncComposerOApp {
    constructor(address endpoint, address vault, address assetOFT, address cctpBridger)
        AsyncComposerOApp(endpoint, vault, assetOFT, cctpBridger)
    {}

    // Directly exercise the same logic used in _lzReceive for tests
    function handle(bytes calldata payload) external payable {
        uint8 op = uint8(payload[0]);
        bytes memory data = payload[1:];

        if (op == AsyncOps.OP_REQUEST_REDEEM) {
            (address controller, address owner, uint256 shares) = AsyncCodec.decRequest(data);
            vault.requestRedeem(shares, controller, owner);
        } else if (op == AsyncOps.OP_CLAIM_SEND_ASSETS) {
            (address controller, address receiver, uint256 shares, uint32 dstEid, uint256 minAssets, bytes memory options)
                = AsyncCodec.decClaim(data);
            vault.claimRedeemToChain{value: msg.value}(shares, receiver, controller, dstEid, minAssets, options, assetOFT);
        } else if (op == AsyncOps.OP_CLAIM_SEND_USDC_CCTP) {
            (
                address controller,
                address mintRecipient,
                uint256 shares,
                uint32  destDomain,
                uint256 maxFee,
                uint32  minFinality,
                address destCaller,
                bytes memory hookData,
                uint256 minAssets
            ) = AsyncCodec.decClaimCCTP(data);
            uint256 assets = vault.claimRedeem(shares, address(cctpBridger), controller);
            require(assets >= minAssets, "minAssets");
            cctpBridger.bridgeUSDCV2(assets, destDomain, mintRecipient, destCaller, maxFee, minFinality, hookData);
        } else {
            revert("bad op");
        }
    }
}
