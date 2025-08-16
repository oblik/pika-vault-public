# Architecture — Omnichain RWA Vault (Sync Deposits + Async Redeems)

**One-liner:** An omnichain ERC-4626 vault using LayerZero OVault patterns for cross-chain deposits, **asynchronous redemptions** (ERC-7540-style), native **USDC bridging via Circle CCTP v2**, and **Chainlink CCIP** for cross-chain control/NAV messaging. Users sign with an embedded smart account and can pay gas in USDC via Circle Paymaster.

---

## Components

### On-Chain (Hub: Base Sepolia)
- **OVault4626AsyncRedeem.sol** — Core ERC-4626 vault with async redeem:
  - Sync **deposit/mint** as usual.
  - **requestRedeem** locks shares to `pendingRedeem[controller]`.
  - **managerMarkClaimable** moves shares to `claimableRedeem[controller]`.
  - **claimRedeem / claimRedeemToChain** burns locked shares and pays assets (local or bridged via Asset OFT/CCTP).
- **AsyncComposerOApp.sol** — LayerZero OApp receiver on hub; handles:
  - `REQUEST_REDEEM` → `vault.requestRedeem(...)`
  - `CLAIM_SEND_ASSETS` → `vault.claimRedeemToChain(...)`
- **Asset OFT (from OVault)** — Bridges underlying (if using OFT path).
- **NavReceiver.sol** — CCIP receiver that updates `lastNAV` from remote admin.

### On-Chain (Spoke: Arbitrum Sepolia)
- **Share OFT** — User holds cross-chain vault shares on the spoke.
- **SpokeRedeemOApp.sol** — Burns share OFT and LZ-sends `REQUEST_REDEEM`. Optional: sends `CLAIM_SEND_ASSETS`.

### Cross-Chain Rails
- **LayerZero (OApps/OFTs)** — Reliable messaging for async-redeem ops and (optionally) asset delivery via OFT.
- **Circle CCTP v2** — Burns USDC on source chain, mints native USDC on destination; supports **Standard** and **Fast** transfers (with fees). We use it to move USDC treasury between chains.
- **Chainlink CCIP** — Sends control or informational messages (e.g., NAV snapshots) between chains.

### Off-Chain / App
- **Circle Paymaster (ERC-4337)** — Users pay gas in USDC via sponsored user ops.
- **Subgraph (The Graph)** — Indexes deposits, async requests, claimable flips, claims, NAV events.
- **Embedded Wallet / AA** — Smart account with sponsored ops for seamless UX (Dynamic/Privy/Gemini optional).
- **ENS (optional)** — Set L2 Primary Name for user accounts.
- **Uniswap v4 Hook on Unichain (optional)** — Fee/guard logic for yToken liquidity (prize track).

---

## Key Flows

### A) Sync Deposit (any chain → hub)
1. User deposits on a spoke (OVault deposit path).
2. OVault routes assets/shares via OFT to hub and mints shares (sync).
3. UI shows new share balance on the user’s spoke.

### B) Async Redeem (spoke request → hub claim → optional cross-chain delivery)
1. **Request:** User calls `SpokeRedeemOApp.requestRedeemOnSpoke(controller, shares)`.
   - Burns spoke shares.
   - Sends LZ `REQUEST_REDEEM(controller, owner, shares)` to hub.
2. **Enqueue on Hub:** `AsyncComposerOApp` calls `vault.requestRedeem(...)`.
   - `pendingRedeem[controller] += shares`.
3. **Mark Claimable:** Operator/keeper calls `vault.managerMarkClaimable(controller, X)`.
   - Moves `pending → claimable`.
4. **Claim:** User/AA triggers `CLAIM_SEND_ASSETS`.
   - Hub `claimRedeemToChain(...)` burns locked shares, converts to assets.
   - **Delivery:** either OFT send or **CCTP v2** to mint USDC to destination treasury/receiver.

### C) Treasury Rebalance (Arbitrum → Base using CCTP v2)
1. Call `CctpBridger.bridgeUSDCV2(amount, BaseDomain, destTreasury, ...)`.
2. USDC burns on Arbitrum, mints native USDC to `destTreasury` on Base.

### D) NAV Update (Arbitrum → Base using CCIP)
1. Call `NavPusher.pushNAV(BaseSelector, NavReceiver, navE18, feeToken)`.
2. `NavReceiver` updates `lastNAV` on Base and emits `NAVUpdated`.

---

## State Model (Async Redeem)
- **Inputs:** `(controller, owner, shares)`
- **States:**
  - `PENDING` — after `requestRedeem()`, shares locked in vault.
  - `CLAIMABLE` — after manager marks claimable.
  - `CLAIMED` — after `claimRedeem()` burns shares and transfers assets.
- **Previews:** `previewRedeem/previewWithdraw` **revert** (ERC-7540 async rule).

---

## Security / Safety

- **Message auth:** OApps enforce **peer allowlists** and **endpoint checks** (LayerZero).
- **Reentrancy:** Vault claim paths are guarded (ReentrancyGuard).
- **Share handling:** Shares are locked (or burned) at request time to prevent double-spend.
- **CCTP modes:** Start with **Standard finality** (`minFinality=2000`, `maxFee=0`), then test **Fast** (`1000` + fee).
- **Operator model:** The composer (or AA) must be set as an **operator** for the controller to execute claims.
- **Key management:** Scripts use a test deployer; never reuse on mainnet.

---

## Submission / Prize Mapping (quick view)

- **LayerZero:** OVault + OApps + cross-chain deposit/async-redeem demo.
- **Circle:** CCTP v2 treasury rebalance + Paymaster (USDC gas) demo.
- **Chainlink:** CCIP “state change” (NAV update) on destination chain.
- **The Graph:** Subgraph with requests/claims/NAV.
- **Uniswap v4 (Unichain):** Optional hook demo.
- **ENS / Ledger:** Optional UX polish (L2 Primary Name, ERC-7730 clear-sign JSONs).

---

## Runbook (Dev)

1. Deploy `NavReceiver` on **Base Sepolia** (`01_Deploy...`).
2. Deploy `NavPusher` + `CctpBridger` on **Arbitrum Sepolia** (`02_Deploy...`).
3. Execute **CCTP USDC → Base** and **CCIP NAV → Base** from Arbitrum (`03_Run...`).
4. Wire OApps (set peers & endpoints), then test **async-redeem** end-to-end on a local fork or testnets.

---

## Config Cheat-Sheet

- **CCIP:** `CCIP_ROUTER_*`, `CCIP_*_SELECTOR`
- **CCTP:** `CCTP_TOKEN_MESSENGER_V2_*`, `USDC_*`, `CCTP_DEST_DOMAIN_*`, `CCTP_MIN_FINALITY`, `CCTP_MAX_FEE`
- **LZ:** `LZ_ENDPOINT_*`, `LZ_EID_*`, OApp addresses
- **Scripts:** `NAV_RECEIVER_BASE`, `NAV_PUSHER_ARB`, `CCTP_BRIDGER_ARB`, `DEST_TREASURY_BASE`
- **Demo amounts:** `AMOUNT_USDC_6DP`, `TEST_NAV_E18`

