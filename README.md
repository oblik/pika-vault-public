# Pika Vault — Omnichain RWA Yield Vault

An omnichain ERC‑4626 vault with sync deposits, async redemptions, native USDC bridging (CCTP v2), and cross‑chain NAV broadcasting (CCIP). Deposit anywhere, queue redemptions asynchronously, and receive native USDC on a destination chain while control/state (NAV) is propagated separately.

[![Watch the video](https://img.youtube.com/vi/5o7D5INkY30/maxresdefault.jpg)](https://www.youtube.com/watch?v=5o7D5INkY30)




```mermaid
flowchart TD
  %% Clusters
  subgraph Spoke_Chain
    FE["Frontend / User"]
    SpokeOApp["SpokeRedeemOApp"]
    ShareOFT_S["Share OFT (spoke)"]
    AssetOFT_S["Asset OFT (spoke)"]
  end

  subgraph Hub_Chain
    AsyncComposer["AsyncComposerOApp (hub)"]
    Vault["OVault4626AsyncRedeem (hub vault)"]
    ShareOFT_H["Share OFT Adapter (hub, lockbox)"]
    CCTPBridger["CctpBridger"]
    DepositReceiver["CctpDepositReceiver (hub)"]
  end

  subgraph Destination_Chain
    AssetOFT_D["Asset OFT (destination)"]
    USDC_Treasury["USDC Receiver / Treasury"]
    CCIP_Recv["NavReceiver (CCIP)"]
  end

  subgraph CCIP
    CCIP_Push["NavPusher"]
  end

  %% Standard deposit (OFT)
  FE -->|"deposit (asset)"| AssetOFT_S
  AssetOFT_S -->|"LZ send + compose"| AsyncComposer
  AsyncComposer -->|"deposit"| Vault
  Vault -->|"mint shares"| ShareOFT_H
  ShareOFT_H -->|"send shares (OFT)"| AssetOFT_D

  %% USDC Fast deposit (CCTP v2)
  FE -->|"depositUsdcFast(...)"| SpokeOApp
  SpokeOApp -->|"OP_DEPOSIT_USDC_CCTP (LZ)"| AsyncComposer
  AsyncComposer --> CCTPBridger
  CCTPBridger -->|"depositForBurnWithHook (Fast)"| DepositReceiver
  DepositReceiver -->|"deposit USDC"| Vault
  DepositReceiver -->|"local transfer or send shares (OFT)"| AssetOFT_D

  %% Async redeem request
  FE -->|"requestRedeem(shares)"| SpokeOApp
  SpokeOApp -->|"OP_REQUEST_REDEEM (LZ)"| AsyncComposer
  AsyncComposer -->|"requestRedeem"| Vault
  Vault -->|"managerMarkClaimable (keeper)"| Vault

  %% Claim: OFT delivery
  FE -->|"claimSendAssets(...)"| SpokeOApp
  SpokeOApp -->|"OP_CLAIM_SEND_ASSETS (LZ)"| AsyncComposer
  AsyncComposer -->|"claimRedeemToChain"| Vault
  Vault -->|"Asset OFT send"| AssetOFT_D

  %% Claim: USDC Fast delivery (CCTP v2)
  FE -->|"claimSendUsdcFast(...)"| SpokeOApp
  SpokeOApp -->|"OP_CLAIM_SEND_USDC_CCTP (LZ)"| AsyncComposer
  AsyncComposer -->|"claimRedeem to bridger"| CCTPBridger
  CCTPBridger -->|"depositForBurnWithHook (Fast)"| USDC_Treasury

  %% CCIP NAV (control plane)
  CCIP_Push -->|"ccipSend"| CCIP_Recv

  %% Styling
  classDef hub fill:#f2f6ff,stroke:#7aa2ff,stroke-width:1px;
  classDef spoke fill:#f6fff2,stroke:#7acb7a,stroke-width:1px;
  classDef dst fill:#fff6f2,stroke:#ff9a7a,stroke-width:1px;

  class AsyncComposer,Vault,ShareOFT_H,CCTPBridger,DepositReceiver hub;
  class FE,SpokeOApp,ShareOFT_S,AssetOFT_S spoke;
  class AssetOFT_D,USDC_Treasury,CCIP_Recv dst;
```

## Prize tracks we’re entering
- **LayerZero — Best Omnichain Interaction**: Async‑redeem via OApps (spoke → hub) with subsequent actions (claim + delivery), demonstrating non‑trivial state coordination beyond simple token transfer. References: [OApp](https://docs.layerzero.network/v2/developers/evm/oapp/overview), [Composer](https://docs.layerzero.network/v2/developers/evm/composer/overview), [OVault](https://docs.layerzero.network/v2/developers/evm/ovault/overview), [OFT](https://docs.layerzero.network/v2/developers/evm/oft/quickstart). Also see the official prize list: [ETHGlobal NYC Prizes](https://ethglobal.com/events/newyork2025/prizes).
- **LayerZero — Best Omnichain DeFi Primitive**: Omnichain ERC‑4626 with share lockbox and asset/share OFTs, enabling deposit anywhere → redeem anywhere. 
- **Chainlink CCIP**: Cross‑chain NAV broadcast (control plane) decoupled from value transfer. Starter/refs: [ccip-starter-kit-foundry](https://github.com/smartcontractkit/ccip-starter-kit-foundry).
- **Circle CCTP**: Native USDC movement (burn on source, mint on destination) for claim and deposit settlement (Fast supported).

## Demo flow (2–3 minutes)
1) **Sync deposit (any chain)**
- User deposits underlying and receives shares (locally or via OFT).

2) **Async redeem request (spoke)**
- User calls `SpokeRedeemOApp.requestRedeemOnSpoke(controller, shares)`.
- Spoke burns share OFT and sends LayerZero `REQUEST_REDEEM` to the hub.

3) **Hub enqueues**
- `AsyncComposerOApp` (hub) `lzReceive` → `vault.requestRedeem(...)`.
- Shares are locked at the vault; `pendingRedeem[controller]` increases.

4) **Manager marks claimable (hub)**
- Keeper frees liquidity, calls `vault.managerMarkClaimable(controller, shares)` → `claimableRedeem` increases.

5) **Claim and bridge delivery**
- Controller (or approved operator) triggers claim:
  - Vault burns locked shares and delivers underlying:
    - Asset OFT `send` to `dstEid` receiver, or
    - CCTP v2 burn+mint USDC to destination treasury/receiver.

6) **NAV broadcast**
- `NavPusher.pushNAV(...)` sends CCIP message. `NavReceiver` updates `lastNAV` on destination — UIs/guards can read it for limits.

## Architecture
- **Vault (hub)**: `contracts/OVault4626AsyncRedeem.sol`
  - ERC‑4626 accounting; async queues per controller; operator approvals (smart‑account friendly).
  - Claim path finalizes accounting; then either approves underlying to Asset OFT and `send`s cross‑chain, or triggers CCTP v2 via `bridge/CctpBridger.sol`.
- **LayerZero OApps (async)**
  - Spoke: `contracts/async/SpokeRedeemOApp.sol` — burns share OFT and sends `REQUEST_REDEEM` / optional `CLAIM_SEND_ASSETS`.
  - Hub: `contracts/async/AsyncComposerOApp.sol` — trusted receiver; on request calls `vault.requestRedeem(...)`; on claim calls `vault.claimRedeemToChain(...)`.
  - Codec: `contracts/async/AsyncCodec.sol` — typed encoders/decoders for the two message types.
- **Token mobility (OFTs)**
  - `contracts/MyAssetOFT.sol` (asset mobility).
  - `contracts/MyShareOFT.sol` (share mobility on spokes; hub uses lockbox adapter).
- **Control plane (CCIP)**: `contracts/ccip/NavPusher.sol`, `contracts/ccip/NavReceiver.sol`.
- **USDC bridging (CCTP v2)**: `contracts/bridge/CctpBridger.sol`.

## Key contracts & roles
- Hub: `OVault4626AsyncRedeem`, `AsyncComposerOApp`, Share OFT Adapter.
- Spokes: Share OFT, Asset OFT, `SpokeRedeemOApp`.
- CCIP: NAV push/receive.
- CCTP: optional delivery rail for native USDC.

## Setup
- Requirements: Node.js ≥ 18.18, pnpm ≥ 8, Foundry (`forge`, `anvil`).
- Install deps:
```bash
pnpm i
```
- Build:
```bash
forge build
# or
pnpm compile
```
- Test:
```bash
forge test --via-ir
```

## Environment
Create `.env` (example keys you’ll need for scripts):
```
# CCIP
CCIP_ROUTER_BASE_SEPOLIA=
CCIP_ROUTER_ARB_SEPOLIA=
CCIP_BASE_SEPOLIA_SELECTOR=

# CCTP v2
CCTP_TOKEN_MESSENGER_V2_ARB_SEPOLIA=
USDC_ARB_SEPOLIA=
CCTP_DEST_DOMAIN_BASE=   # e.g. 6 for Base
DEST_TREASURY_BASE=
CCTP_MAX_FEE=0
CCTP_MIN_FINALITY=2000   # 2000 standard, 1000 fast

# Demo values
NAV_PUSHER_ARB=
CCTP_BRIDGER_ARB=
NAV_RECEIVER_BASE=
AMOUNT_USDC_6DP=
TEST_NAV_E18=
DEPLOYER_PK=
```

## Deploy & run demo
- CCIP NAV
  - Deploy receiver (dest): `script/01_DeployBaseSepolia_NavReceiver.s.sol`
  - Deploy pusher (source): `script/02_DeployArbSepolia_Core.s.sol`
  - Push NAV + (optional) bridge USDC: `script/03_Run_ArbSepolia_BridgeAndPush.s.sol`

- LZ OApps (async redeem)
  - Deploy `AsyncComposerOApp` (hub) + `SpokeRedeemOApp` (spoke).
  - `setPeer`/`_setPeer`, configure EIDs, and whitelist operators.
  - Smoke test `REQUEST_REDEEM` and `CLAIM_SEND_ASSETS` with small amounts.

## Security & invariants
- Only trusted OApp peers trigger `_lzReceive` handlers.
- Only `controller` or its approved operator may claim.
- Invariants:
  - Burned shares at claim == shares removed from claimable.
  - Assets paid at claim ≤ available liquidity.
  - Queues: `pendingRedeem` + `claimableRedeem` track requested/claimable accurately.
- Failure modes:
  - LZ message fail → executor retry; handlers are idempotent.
  - CCTP fast transfer cannot finalize → fallback to standard path.
  - CCIP fee underfunded → quote `getFee()` and fund exactly.

## KPIs
- Time to claimable after request (SLA)
- Successful CCTP mints vs attempts
- CCIP finality latency
- TVL; per‑controller claimable

## References
- LayerZero: [OApp](https://docs.layerzero.network/v2/developers/evm/oapp/overview) · [OFT](https://docs.layerzero.network/v2/developers/evm/oft/quickstart) · [Composer](https://docs.layerzero.network/v2/developers/evm/composer/overview) · [OVault](https://docs.layerzero.network/v2/developers/evm/ovault/overview)
- Chainlink CCIP: [ccip-starter-kit-foundry](https://github.com/smartcontractkit/ccip-starter-kit-foundry)
- ETHGlobal NYC 2025: [Prizes](https://ethglobal.com/events/newyork2025/prizes)

## Frontend integration: choose your rail

### Deposits
- **Standard (OFT) — available now**
  - If source = hub: call `vault.deposit(assets, receiver)` directly.
  - If source ≠ hub: call the Asset OFT `send(...)` with a compose message targeting the hub composer (or use an SDK helper) so the hub deposits and mints shares. This is the default, simplest UX.
- **USDC Fast (CCTP) — available now**
  - Call `SpokeRedeemOApp.depositUsdcFast(amountAssets, destDomain, depositReceiver, maxFee>0, minFinality=1000, destCaller, hookData)`.
  - `depositReceiver` is `CctpDepositReceiver` on the hub, which mints USDC, deposits into the vault, and either transfers shares locally or OFT‑sends them cross‑chain.
  - `hookData` should encode `(receiver, shareDstEid, minShares, oftOptions)` for the receiver’s `finalizeDeposit`.

### Claims
- **Standard (OFT)**: The spoke calls `claimSendAssets(...)` on `SpokeRedeemOApp` → hub finalizes claim → Asset OFT `send` to destination `receiver`.
- **USDC Fast (CCTP)**: The spoke calls `claimSendUsdcFast(...)` on `SpokeRedeemOApp` → hub finalizes claim → `CctpBridger.bridgeUSDCV2` with `maxFee>0` and `minFinality=1000` (Fast).

### Runtime switching (suggested UX)
- If the underlying is not USDC → always use OFT rails.
- If the underlying is USDC → show a toggle:
  - OFF → Standard (OFT)
  - ON  → Fast (CCTP v2)

### Minimal params you’ll surface in UI (Fast mode)
- `destDomain` (CCTP domain, e.g., Base=6)
- `mintRecipient` / `depositReceiver` (hub CCTP receivers)
- `maxFee` (>0 to enable Fast)
- `minFinality` (`1000` for Fast, `2000` for Standard)
- Optional: `hookData`, `destCaller`

Notes
- CCIP is separate from value transfer; you can fetch/display `lastNAV` via the `NavReceiver` address on destination.
- For OFT sends, estimate fees with the OFT `quoteSend`; for CCIP, use `router.getFee`; for CCTP Fast, account for `maxFee` and finality.

## Deployed addresses (testnets)

- Base Sepolia (hub)
  - Vault (OVault4626AsyncRedeem): `0x81A7A4Ece4D161e720ec602Ad152a7026B82448b`
  - Share Adapter (MyShareOFTAdapter): `0x6Df71536c389d09E9175ea9585f7DCD1A95B29d3`
  - AsyncComposerOApp (hub): `0xCD771B830C1775308e8EE5B8F582f3956054041c`
  - CCTP Bridger (Base): `0x42Ffc8306c022Dd17f09daD0FF71f7313Df0A48D`
  - CctpDepositReceiver: `0x138108cB4Ae27856d292D52205BBC530A4A4E229`
  - NAV Receiver: `0x77e424Dab916412C04eBe6B8c0435B3202f4C81B`

- Arbitrum Sepolia (spoke)
  - Share OFT (MyShareOFT): `0x6Df71536c389d09E9175ea9585f7DCD1A95B29d3`
  - SpokeRedeemOApp: `0xC91A582E0FB8f2DbFe1309B3f578876564Bd7Ee0`
  - NAV Pusher: `0x77e424Dab916412C04eBe6B8c0435B3202f4C81B`
  - CCTP Bridger (Arb): `0x81A7A4Ece4D161e720ec602Ad152a7026B82448b`

- Ethereum Sepolia (spoke)
  - Share OFT (MyShareOFT): `0xACF7C2898bF9397AE1453aB98400763FeA2296A3`
  - SpokeRedeemOApp: `0xBb05C630486668cC0069Fd6b40fCad8015E13C1e`
