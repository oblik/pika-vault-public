// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";
import {ISwapRouterV3} from "./interfaces/ISwapRouterV3.sol";

interface IERC7540AsyncMinimal is IERC165 {
    // Operator approvals so a smart account or relayer can act for the controller
    function setOperator(address operator, bool approved) external returns (bool);
    function isOperator(address controller, address operator) external view returns (bool);
    // Async redeem request (requestId aggregated as 0 for simplicity)
    event RedeemRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 shares);
}

interface IAssetOFT {
    function send(uint32 dstEid, bytes32 to, uint256 amount, bytes calldata options)
        external payable returns (uint64, bytes32);
}

contract OVault4626AsyncRedeem is ERC4626, ReentrancyGuard, IERC7540AsyncMinimal, Ownable {
    // controller => {pending, claimable}
    mapping(address => uint256) public pendingRedeem;
    mapping(address => uint256) public claimableRedeem;
    mapping(address => mapping(address => bool)) public operatorApproval;

    // Manager + trading
    address public manager;
    mapping(address => bool) public allowedRouters;
    uint256 public externalAssetValueUsdc;

    event ManagerUpdated(address indexed newManager);
    event RouterAllowed(address indexed router, bool allowed);
    event ExternalNavUpdated(uint256 valueUsdc);
    event SwapExecuted(address indexed router, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event ExternalRouterCall(address indexed router, uint256 value, bytes4 selector);

    error AsyncPreview();       // 7540 previews must revert for async paths
    error NotController();
    error Insufficient();

    constructor(IERC20 asset_, string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        ERC4626(asset_)
        Ownable(msg.sender)
    {}

    // ----- ERC-165 -----
    function supportsInterface(bytes4 id) external pure returns (bool) {
        // not an official id—serve as feature flag; add your own IID if you formalize
        return id == type(IERC7540AsyncMinimal).interfaceId;
    }

    // ----- Operators (for cross-chain smart accounts) -----
    function setOperator(address operator, bool approved) external returns (bool) {
        operatorApproval[msg.sender][operator] = approved;
        return true;
    }
    function isOperator(address controller, address operator) external view returns (bool) {
        return operatorApproval[controller][operator];
    }
    modifier onlyController(address controller) {
        if (msg.sender != controller && !operatorApproval[controller][msg.sender]) revert NotController();
        _;
    }

    // ----- Async redeem (request side) -----
    // Called by ComposerAsync on hub OR directly when single-chain testing.
    // Requires the owner to have approved the vault to pull 'shares'.
    function requestRedeem(uint256 shares, address controller, address owner) external nonReentrant returns (uint256) {
        if (shares == 0) revert Insufficient();
        _spendAllowance(owner, msg.sender, shares);   // allow Composer or caller to pull shares
        _transfer(owner, address(this), shares);      // lock shares inside the vault
        pendingRedeem[controller] += shares;
        emit RedeemRequest(controller, owner, 0, msg.sender, shares);
        return 0; // aggregated requestId
    }

    // Manager/keeper frees liquidity then marks claimable for a controller bucket.
    function managerMarkClaimable(address controller, uint256 shares) external nonReentrant {
        uint256 p = pendingRedeem[controller];
        if (shares == 0 || p < shares) revert Insufficient();
        pendingRedeem[controller] = p - shares;
        claimableRedeem[controller] += shares;
    }

    // ----- Claim (local) -----
    // Consumes claimable shares at CURRENT exchange rate, burns the locked shares, and transfers assets.
    function claimRedeem(uint256 shares, address receiver, address controller)
        public nonReentrant onlyController(controller)
        returns (uint256 assets)
    {
        assets = _finalizeClaim(shares, controller);
        // Transfer underlying assets out to receiver
        require(IERC20(asset()).transfer(receiver, assets), "ASSET_TRANSFER_FAIL");
    }

    // ----- Claim (x-chain) -----
    function claimRedeemToChain(
        uint256 shares,
        address receiver,
        address controller,
        uint32  dstEid,
        uint256 minAssets,
        bytes calldata options,
        IAssetOFT assetOFT
    ) external payable nonReentrant onlyController(controller) returns (uint256 assets) {
        assets = _finalizeClaim(shares, controller);
        if (assets < minAssets) revert Insufficient();
        // Approve underlying to be pulled by the asset OFT
        IERC20(asset()).approve(address(assetOFT), assets);
        // Bridge underlying via OFT; receiver packed as bytes32
        assetOFT.send{value: msg.value}(dstEid, bytes32(uint256(uint160(receiver))), assets, options);
    }

    // Internal implementation shared by both claim functions to avoid nested nonReentrant
    // Burns locked shares and computes assets owed without moving underlying; callers decide delivery
    function _finalizeClaim(uint256 shares, address controller)
        internal
        returns (uint256 assets)
    {
        uint256 c = claimableRedeem[controller];
        if (shares == 0 || shares > c) revert Insufficient();
        claimableRedeem[controller] = c - shares;

        // Compute assets owed at current exchange rate
        assets = convertToAssets(shares);

        // Burn the locked shares (held by the vault)
        _burn(address(this), shares);
    }

    // ----- 7540: previews MUST revert for async redeem vaults -----
    function previewRedeem(uint256) public pure override returns (uint256) { revert AsyncPreview(); }
    function previewWithdraw(uint256) public pure override returns (uint256) { revert AsyncPreview(); }

    // ----- Manager & Router config -----
    function setManager(address newManager) external onlyOwner {
        manager = newManager;
        emit ManagerUpdated(newManager);
    }

    function setRouterAllowed(address router, bool allowed) external onlyOwner {
        allowedRouters[router] = allowed;
        emit RouterAllowed(router, allowed);
    }

    modifier onlyManager() {
        require(msg.sender == manager, "NOT_MANAGER");
        _;
    }

    // ----- NAV hook for non-USDC positions -----
    function setExternalAssetValueUsdc(uint256 value) external onlyManager {
        externalAssetValueUsdc = value;
        emit ExternalNavUpdated(value);
    }

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + externalAssetValueUsdc;
    }

    // ----- Approvals -----
    function approveUnderlying(address spender, uint256 amount) external onlyManager {
        IERC20(asset()).approve(spender, 0);
        IERC20(asset()).approve(spender, amount);
    }

    function approveToken(address token, address spender, uint256 amount) external onlyManager {
        IERC20(token).approve(spender, 0);
        IERC20(token).approve(spender, amount);
    }

    // ----- Generic external call (router/aggregator) -----
    // For advanced integrations: manager can call an allowed router with arbitrary calldata and optional msg.value.
    // Must manage approvals separately via approveUnderlying/approveToken.
    function externalRouterCall(address router, uint256 value, bytes calldata data)
        external
        onlyManager
        nonReentrant
        returns (bytes memory result)
    {
        require(allowedRouters[router], "ROUTER");
        (bool ok, bytes memory res) = router.call{value: value}(data);
        require(ok, "ROUTER_CALL_FAIL");
        emit ExternalRouterCall(router, value, bytes4(data.length >= 4 ? bytes32(data[:4]) : bytes32(0)));
        return res;
    }

}
