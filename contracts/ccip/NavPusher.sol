// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract NavPusher {
    IRouterClient public immutable router;
    constructor(address _router) { router = IRouterClient(_router); }

    function pushNAV(
        uint64 destSelector,
        address destReceiver,
        uint256 nav,
        address feeToken // address(0) for native; LINK addr otherwise
    ) external payable returns (bytes32 msgId) {
        Client.EVM2AnyMessage memory m = Client.EVM2AnyMessage({
            receiver: abi.encode(destReceiver),
            data: abi.encode(nav),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 200_000})),
            feeToken: feeToken
        });
        uint256 fee = router.getFee(destSelector, m);
        if (feeToken == address(0)) {
            require(msg.value >= fee, "CCIP: insufficient native fee");
            msgId = router.ccipSend{value: fee}(destSelector, m);
        } else {
            // remember to approve LINK to router beforehand
            msgId = router.ccipSend(destSelector, m);
        }
    }
}
