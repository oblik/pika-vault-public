import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';
import { CONTRACTS } from '@/config/contracts';

const VAULT_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "assets", "type": "uint256"},
      {"internalType": "address", "name": "receiver", "type": "address"}
    ],
    "name": "deposit",
    "outputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const ASSET_OFT_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint32", "name": "dstEid", "type": "uint32"},
          {"internalType": "bytes32", "name": "to", "type": "bytes32"},
          {"internalType": "uint256", "name": "amountLD", "type": "uint256"},
          {"internalType": "uint256", "name": "minAmountLD", "type": "uint256"},
          {"internalType": "bytes", "name": "extraOptions", "type": "bytes"},
          {"internalType": "bytes", "name": "composeMsg", "type": "bytes"},
          {"internalType": "bytes", "name": "oftCmd", "type": "bytes"}
        ],
        "internalType": "struct SendParam",
        "name": "_sendParam",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
          {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
        ],
        "internalType": "struct MessagingFee",
        "name": "_fee",
        "type": "tuple"
      },
      {"internalType": "address", "name": "_refundTo", "type": "address"}
    ],
    "name": "send",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes32", "name": "guid", "type": "bytes32"},
          {"internalType": "uint64", "name": "nonce", "type": "uint64"},
          {
            "components": [
              {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
              {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
            ],
            "internalType": "struct MessagingFee",
            "name": "fee",
            "type": "tuple"
          }
        ],
        "internalType": "struct MessagingReceipt",
        "name": "msgReceipt",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "uint256", "name": "amountSentLD", "type": "uint256"},
          {"internalType": "uint256", "name": "amountReceivedLD", "type": "uint256"}
        ],
        "internalType": "struct OFTReceipt",
        "name": "oftReceipt",
        "type": "tuple"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

/**
 * POST /api/vault/[vaultId]/deposit
 * 
 * Handles vault deposits - either direct on hub or cross-chain via Asset OFT
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string }> }
) {
  try {
    const { vaultId } = await params;
    const body = await request.json();
    const { amount, chainId, address, mode = 'standard' } = body;

    if (!amount || !chainId || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: amount, chainId, address' },
        { status: 400 }
      );
    }

    if (vaultId !== 'usdc-multichain') {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals
    const isHub = chainId === 84532; // Base Sepolia

    if (isHub) {
      // Direct deposit on hub
      const depositParams = {
        vaultAddress: CONTRACTS.hub.vault,
        usdcAddress: CONTRACTS.cctp.baseSepolia.usdc,
        amount: amountWei.toString(),
        receiver: address,
        steps: [
          {
            type: 'approve',
            description: 'Approve USDC for vault',
            contract: CONTRACTS.cctp.baseSepolia.usdc,
            function: 'approve',
            args: [CONTRACTS.hub.vault, amountWei.toString()]
          },
          {
            type: 'deposit',
            description: 'Deposit USDC to vault',
            contract: CONTRACTS.hub.vault,
            function: 'deposit',
            args: [amountWei.toString(), address]
          }
        ]
      };

      return NextResponse.json({
        type: 'direct-deposit',
        chainId,
        params: depositParams,
        estimatedGas: '150000', // Rough estimate
        message: 'Ready for direct vault deposit'
      });
    } else {
      // Cross-chain deposit via Asset OFT
      let assetOFTAddress: string;
      let usdcAddress: string;
      let dstEid: number;

      switch (chainId) {
        case 421614: // Arbitrum Sepolia
          assetOFTAddress = CONTRACTS.spokes.arbSepolia.shareOFT; // Using Share OFT for now
          usdcAddress = CONTRACTS.cctp.arbSepolia.usdc;
          dstEid = 40245; // Base Sepolia LayerZero endpoint ID
          break;
        case 11155111: // Ethereum Sepolia
          assetOFTAddress = CONTRACTS.spokes.ethSepolia.shareOFT;
          usdcAddress = CONTRACTS.cctp.ethSepolia.usdc;
          dstEid = 40245; // Base Sepolia LayerZero endpoint ID
          break;
        default:
          return NextResponse.json(
            { error: 'Unsupported chain for cross-chain deposit' },
            { status: 400 }
          );
      }

      // Prepare LayerZero send parameters
      const sendParam = {
        dstEid,
        to: `0x${address.slice(2).padStart(64, '0')}`, // Convert address to bytes32
        amountLD: amountWei.toString(),
        minAmountLD: amountWei.toString(),
        extraOptions: '0x', // Default options
        composeMsg: `0x${CONTRACTS.hub.composer.slice(2)}`, // Target hub composer
        oftCmd: '0x' // Empty for now
      };

      const crossChainParams = {
        assetOFTAddress,
        usdcAddress,
        amount: amountWei.toString(),
        sendParam,
        steps: [
          {
            type: 'approve',
            description: 'Approve USDC for Asset OFT',
            contract: usdcAddress,
            function: 'approve',
            args: [assetOFTAddress, amountWei.toString()]
          },
          {
            type: 'send',
            description: 'Send USDC cross-chain to vault',
            contract: assetOFTAddress,
            function: 'send',
            args: [sendParam, { nativeFee: '0', lzTokenFee: '0' }, address]
          }
        ]
      };

      return NextResponse.json({
        type: 'cross-chain-deposit',
        chainId,
        mode,
        params: crossChainParams,
        estimatedGas: '300000', // Higher for cross-chain
        message: 'Ready for cross-chain deposit via LayerZero'
      });
    }

  } catch (error) {
    console.error('Error preparing deposit:', error);
    return NextResponse.json(
      { error: 'Failed to prepare deposit transaction' },
      { status: 500 }
    );
  }
}