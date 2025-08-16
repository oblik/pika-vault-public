// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library AsyncOps {
    uint8 constant OP_REQUEST_REDEEM    = 0xA1;
    uint8 constant OP_CLAIM_SEND_ASSETS = 0xA2;
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
}
