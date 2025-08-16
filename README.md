# Pika Vault — Omnichain RWA Yield Vault

An omnichain ERC‑4626 vault with sync deposits, async redemptions, native USDC bridging (CCTP v2), and cross‑chain NAV broadcasting (CCIP). Deposit anywhere, queue redemptions asynchronously, and receive native USDC on a destination chain while control/state (NAV) is propagated separately.

## Prize tracks we’re entering
- **LayerZero — Best Omnichain Interaction**: Async‑redeem via OApps (spoke → hub) with subsequent actions (claim + delivery), demonstrating non‑trivial state coordination beyond simple token transfer. References: [OApp](https://docs.layerzero.network/v2/developers/evm/oapp/overview), [Composer](https://docs.layerzero.network/v2/developers/evm/composer/overview), [OVault](https://docs.layerzero.network/v2/developers/evm/ovault/overview), [OFT](https://docs.layerzero.network/v2/developers/evm/oft/quickstart). Also see the official prize list: [ETHGlobal NYC Prizes](https://ethglobal.com/events/newyork2025/prizes).
- **LayerZero — Best Omnichain DeFi Primitive**: Omnichain ERC‑4626 with share lockbox and asset/share OFTs, enabling deposit anywhere → redeem anywhere. 
- **Chainlink CCIP**: Cross‑chain NAV broadcast (control plane) decoupled from value transfer. Starter/refs: [ccip-starter-kit-foundry](https://github.com/smartcontractkit/ccip-starter-kit-foundry).
- **Circle CCTP**: Native USDC movement (burn on source, mint on destination) at claim settlement.

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
