// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library AsyncOps {
    uint8 constant OP_REQUEST_REDEEM    = 0xA1;
    uint8 constant OP_CLAIM_SEND_ASSETS = 0xA2;
    uint8 constant OP_CLAIM_SEND_USDC_CCTP = 0xA3;
    // Optional: deposit via CCTP fast path
    uint8 constant OP_DEPOSIT_USDC_CCTP = 0xB1;
}

library AsyncCodec {
    function encRequest(address controller, address owner, uint256 shares)
        internal pure returns (bytes memory)
    { return abi.encode(controller, owner, shares); }

    function decRequest(bytes memory p)
        internal pure returns (address controller, address owner, uint256 shares)
    { return abi.decode(p, (address,address,uint256)); }

    function encClaim(address controller, address receiver, uint256 shares, uint32 dstEid, uint256 minAssets, bytes memory options)
        internal pure returns (bytes memory)
    { return abi.encode(controller, receiver, shares, dstEid, minAssets, options); }

    function decClaim(bytes memory p)
        internal pure returns (address controller, address receiver, uint256 shares, uint32 dstEid, uint256 minAssets, bytes memory options)
    { return abi.decode(p, (address,address,uint256,uint32,uint256,bytes)); }

    // CCTP (USDC Fast) claim payload encoding
    function encClaimCCTP(
        address controller,
        address mintRecipient,
        uint256 shares,
        uint32  destDomain,
        uint256 maxFee,
        uint32  minFinality,
        address destCaller,
        bytes memory hookData,
        uint256 minAssets
    ) internal pure returns (bytes memory) {
        return abi.encode(controller, mintRecipient, shares, destDomain, maxFee, minFinality, destCaller, hookData, minAssets);
    }

    function decClaimCCTP(bytes memory p)
        internal pure returns (
            address controller,
            address mintRecipient,
            uint256 shares,
            uint32  destDomain,
            uint256 maxFee,
            uint32  minFinality,
            address destCaller,
            bytes memory hookData,
            uint256 minAssets
        )
    { return abi.decode(p, (address,address,uint256,uint32,uint256,uint32,address,bytes,uint256)); }

    // Deposit CCTP (USDC Fast) payload encoding
    // Fields: sender (for attribution), amountAssets, destDomain, mintRecipient (this will be DepositReceiver), maxFee, minFinality, destCaller, hookData
    function encDepositCCTP(
        address sender,
        uint256 amountAssets,
        uint32  destDomain,
        address mintRecipient,
        uint256 maxFee,
        uint32  minFinality,
        address destCaller,
        bytes memory hookData
    ) internal pure returns (bytes memory) {
        return abi.encode(sender, amountAssets, destDomain, mintRecipient, maxFee, minFinality, destCaller, hookData);
    }

    function decDepositCCTP(bytes memory p)
        internal pure returns (
            address sender,
            uint256 amountAssets,
            uint32  destDomain,
            address mintRecipient,
            uint256 maxFee,
            uint32  minFinality,
            address destCaller,
            bytes memory hookData
        )
    { return abi.decode(p, (address,uint256,uint32,address,uint256,uint32,address,bytes)); }
}
