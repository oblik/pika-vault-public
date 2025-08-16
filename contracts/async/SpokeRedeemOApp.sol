// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OAppSender, OAppCore} from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import { MessagingFee } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {AsyncOps, AsyncCodec} from "./AsyncCodec.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IShareOFT is IERC20 { function burnFrom(address from, uint256 value) external; }

contract SpokeRedeemOApp is OAppSender {
	IShareOFT public immutable shareOFT;
	uint32 public hubEid;           // set this to hub chain endpoint id
	bytes32 public hubComposerB32;  // set peer OApp

	constructor(address endpoint, address _shareOFT) 
		OAppCore(endpoint, msg.sender) 
		Ownable(msg.sender)
	{
		shareOFT = IShareOFT(_shareOFT);
	}

	function setHub(uint32 _hubEid, address hubComposer) external onlyOwner {
		hubEid = _hubEid;
		hubComposerB32 = bytes32(uint256(uint160(hubComposer)));
		_setPeer(_hubEid, hubComposerB32);
	}

	// USER FLOW: request async redeem on the spoke
	function requestRedeemOnSpoke(address controller, uint256 shares) external payable {
		// burn user's spoke shares
		shareOFT.burnFrom(msg.sender, shares);

		bytes memory data = abi.encodePacked(
			bytes1(AsyncOps.OP_REQUEST_REDEEM),
			AsyncCodec.encRequest(controller, msg.sender, shares)
		);

		_lzSend(
			hubEid,
			data,
			_emptyOptions(), // or pass your executor options
			MessagingFee(msg.value, 0),
			payable(msg.sender)
		);
	}

	// optional: ask hub to claim and bridge underlying out to a dst chain+receiver
	function claimSendAssets(address controller, address receiver, uint256 shares, uint32 dstEid, uint256 minAssets, bytes calldata options)
		external payable
	{
		bytes memory data = abi.encodePacked(
			bytes1(AsyncOps.OP_CLAIM_SEND_ASSETS),
			AsyncCodec.encClaim(controller, receiver, shares, dstEid, minAssets, options)
		);
		_lzSend(hubEid, data, _emptyOptions(), MessagingFee(msg.value, 0), payable(msg.sender));
	}

	function _emptyOptions() internal pure returns (bytes memory) { return hex""; }
}