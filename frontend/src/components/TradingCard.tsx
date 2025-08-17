"use client";

import { useState, useCallback, useMemo } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { parseUnits, encodeFunctionData } from "viem";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import ERC4626Abi from "@/abis/Erc4626.json";
import OVault4626AsyncRedeemAbi from "@/abis/OVault4626AsyncRedeem.json";
import { SendTransactionButton, type SendTransactionButtonProps } from "@coinbase/cdp-react/components/SendTransactionButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Vault } from "@/config/vaults";
import { NETWORKS } from "@/config/networks";
import { getCCTPContracts, CONTRACTS, getSpokeContracts } from "@/config/contracts";
import { HUB_CHAIN_ID } from "@/config/chains";
import { getLayerZeroEndpoint, getLayerZeroEID, getCCTPDomain } from "@/config/layerzero";
import { getExplorerUrl, getExplorerName } from "@/config/explorers";
import { Balance } from "@/types";
import SpokeRedeemOAppAbi from "@/abis/SpokeRedeemOApp.json";

// Contract ABIs
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

const VAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' }
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;

interface TradingCardProps {
  vault: Vault;
}

/**
 * Trading card component for buy/sell operations
 */
export default function TradingCard({ vault }: TradingCardProps) {
  const { evmAddress } = useEvmAddress();
  const [depositAmount, setDepositAmount] = useState("");
  const [redeemShares, setRedeemShares] = useState("");
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [depositMode, setDepositMode] = useState<"standard" | "fast">("standard");

  const supportedNetworks = vault.supportedChains.map(
    (chainId) => Object.values(NETWORKS).find(network => network.chainId === chainId)
  ).filter(Boolean);

  // Fetch USDC balance using the existing balance API
  const { data: usdcBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['usdc-balance', evmAddress, selectedChain],
    queryFn: async () => {
      if (!evmAddress || !selectedChain) return null;

      const usdcContract = getCCTPContracts(parseInt(selectedChain))?.usdc;
      if (!usdcContract) return null;

      try {
        const response = await fetch(
          `/api/cdp/balances?address=${evmAddress}&chains=${selectedChain}`
        );

        if (!response.ok) throw new Error('Failed to fetch balance');

        const balances: Record<string, Balance[]> = await response.json();
        const chainBalances = balances[selectedChain] || [];
        const usdcBalance = chainBalances.find((b: Balance) =>
          b.contract.toLowerCase() === usdcContract.toLowerCase()
        );

        if (!usdcBalance) return { balance: "0", formatted: "0.00" };

        const amount = parseInt(usdcBalance.amount) / Math.pow(10, usdcBalance.decimals);
        const formatted = amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        });

        return {
          balance: amount.toString(),
          formatted
        };
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
        return null;
      }
    },
    enabled: !!evmAddress && !!selectedChain && vault.baseAsset.isUSDC,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Fetch share balance for redemption
  const { data: shareBalance, isLoading: shareBalanceLoading } = useQuery({
    queryKey: ['share-balance', evmAddress, selectedChain],
    queryFn: async () => {
      if (!evmAddress || !selectedChain) return null;

      const chainId = parseInt(selectedChain);

      try {
        const response = await fetch(
          `/api/vault/${vault.id}/shares?address=${evmAddress}`
        );

        if (!response.ok) throw new Error('Failed to fetch share balance');

        const data = await response.json();
        const chainShare = data.shares?.find((share: { chainId: number }) => share.chainId === chainId);

        if (!chainShare) return { balance: "0", formatted: "0.00" };

        const amount = parseFloat(chainShare.formatted.replace(/,/g, ''));
        return {
          balance: amount.toString(),
          formatted: chainShare.formatted
        };
      } catch (error) {
        console.error('Error fetching share balance:', error);
        return null;
      }
    },
    enabled: !!evmAddress && !!selectedChain,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const [currentStep, setCurrentStep] = useState<'approve' | 'deposit' | 'redeem-approve' | 'redeem-request' | 'idle'>('idle');
  const [approveHash, setApproveHash] = useState<string>("");
  const [depositHash, setDepositHash] = useState<string>("");
  const [redeemHash, setRedeemHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Helper function to get network name for CDP SendTransactionButton
  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 84532: return "base-sepolia";
      case 421614: return "arbitrum-sepolia";
      case 11155111: return "ethereum-sepolia";
      default: return "base-sepolia";
    }
  };

  // Check if cross-chain deposit/redeem
  const isCrossChain = selectedChain ? parseInt(selectedChain) !== HUB_CHAIN_ID : false;
  const isRedeemOnSpoke = selectedChain ? parseInt(selectedChain) !== HUB_CHAIN_ID : false;

  // Helper function to get chain name
  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 84532: return 'Base Sepolia';
      case 421614: return 'Arbitrum Sepolia';
      case 11155111: return 'Ethereum Sepolia';
      default: return `Chain ${chainId}`;
    }
  };

  // Prepare approve transaction (direct deposit on Hub or cross-chain)
  const approveTransaction = useMemo<SendTransactionButtonProps["transaction"] | null>(() => {
    if (!evmAddress || !depositAmount || !selectedChain) return null;

    const chainId = parseInt(selectedChain);
    const amount = parseUnits(depositAmount, 6);
    const usdcContract = getCCTPContracts(chainId);
    if (!usdcContract?.usdc) return null;

    // For hub chain, approve vault directly
    if (chainId === HUB_CHAIN_ID) {
      return {
        to: usdcContract.usdc as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.hub.vault as `0x${string}`, amount]
        }),
        chainId: HUB_CHAIN_ID,
        type: "eip1559",
      };
    }

    // For spoke chains, approve the SpokeRedeemOApp
    const spokeContracts = getSpokeContracts(chainId);
    if (!spokeContracts?.spokeRedeemOApp) return null;

    return {
      to: usdcContract.usdc as `0x${string}`,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spokeContracts.spokeRedeemOApp as `0x${string}`, amount]
      }),
      chainId,
      type: "eip1559",
    };
  }, [evmAddress, depositAmount, selectedChain]);

  // Prepare deposit transaction (direct or cross-chain)
  const depositTransaction = useMemo<SendTransactionButtonProps["transaction"] | null>(() => {
    if (!evmAddress || !depositAmount || !selectedChain || !approveHash) return null;

    const chainId = parseInt(selectedChain);
    const amount = parseUnits(depositAmount, 6);

    // Direct deposit on Hub chain
    if (chainId === HUB_CHAIN_ID) {
      return {
        to: CONTRACTS.hub.vault as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC4626Abi.abi,
          functionName: 'deposit',
          args: [amount, evmAddress as `0x${string}`]
        }),
        chainId: HUB_CHAIN_ID,
        type: "eip1559",
      };
    }

    // Cross-chain deposit via SpokeRedeemOApp
    const spokeContracts = getSpokeContracts(chainId);
    const cctpDomain = getCCTPDomain(HUB_CHAIN_ID); // Destination is Hub

    if (!spokeContracts?.spokeRedeemOApp || cctpDomain === null) return null;

    return {
      to: spokeContracts.spokeRedeemOApp as `0x${string}`,
      data: encodeFunctionData({
        abi: SpokeRedeemOAppAbi.abi,
        functionName: 'depositUsdcFast',
        args: [
          amount,                                    // amountAssets
          cctpDomain,                               // destDomain (Base Sepolia)
          CONTRACTS.hub.cctpDepositReceiver,        // depositReceiver
          parseUnits("0.1", 6),                     // maxFee (0.1 USDC)
          12,                                       // minFinality (12 blocks)
          "0x0000000000000000000000000000000000000000" as `0x${string}`, // destCaller (none)
          "0x" as `0x${string}`                     // hookData (empty)
        ]
      }),
      chainId,
      type: "eip1559",
      // NOTE: This needs ETH for LayerZero gas fees - we'll need to estimate this
      value: parseUnits("0.01", 18) // 0.01 ETH buffer for LZ fees
    };
  }, [evmAddress, depositAmount, selectedChain, approveHash]);

  // Prepare share approval transaction for redeem
  const redeemApproveTransaction = useMemo<SendTransactionButtonProps["transaction"] | null>(() => {
    if (!evmAddress || !redeemShares || !selectedChain) return null;

    const chainId = parseInt(selectedChain);
    const shares = parseUnits(redeemShares, 18); // ERC4626 vault shares typically use 18 decimals

    // For redeem on spoke chains, approve shareOFT to spokeRedeemOApp
    if (isRedeemOnSpoke) {
      const spokeContracts = getSpokeContracts(chainId);
      if (!spokeContracts?.shareOFT || !spokeContracts?.spokeRedeemOApp) return null;

      return {
        to: spokeContracts.shareOFT as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spokeContracts.spokeRedeemOApp as `0x${string}`, shares]
        }),
        chainId,
        type: "eip1559",
      };
    }

    // For hub chain redemptions - approve vault shares to vault contract
    if (chainId === HUB_CHAIN_ID) {
      return {
        to: CONTRACTS.hub.vault as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.hub.vault as `0x${string}`, shares]
        }),
        chainId,
        type: "eip1559",
      };
    }

    return null;
  }, [evmAddress, redeemShares, selectedChain, isRedeemOnSpoke]);

  // Prepare redeem request transaction
  const redeemRequestTransaction = useMemo<SendTransactionButtonProps["transaction"] | null>(() => {
    if (!evmAddress || !redeemShares || !selectedChain || !approveHash) return null;

    const chainId = parseInt(selectedChain);
    const shares = parseUnits(redeemShares, 18); // ERC4626 vault shares typically use 18 decimals

    // For redeem on spoke chains via SpokeRedeemOApp
    if (isRedeemOnSpoke) {
      const spokeContracts = getSpokeContracts(chainId);
      if (!spokeContracts?.spokeRedeemOApp) return null;

      return {
        to: spokeContracts.spokeRedeemOApp as `0x${string}`,
        data: encodeFunctionData({
          abi: SpokeRedeemOAppAbi.abi,
          functionName: 'requestRedeemOnSpoke',
          args: [
            evmAddress as `0x${string}`,  // controller (recipient)
            shares                         // shares to redeem
          ]
        }),
        chainId,
        type: "eip1559",
        // LayerZero gas fees
        value: parseUnits("0.01", 18) // 0.01 ETH buffer for LZ fees
      };
    }

    // For hub chain redemptions - request async redeem from vault
    if (chainId === HUB_CHAIN_ID) {
      return {
        to: CONTRACTS.hub.vault as `0x${string}`,
        data: encodeFunctionData({
          abi: OVault4626AsyncRedeemAbi.abi,
          functionName: 'requestRedeem',
          args: [
            shares,                           // shares to redeem
            evmAddress as `0x${string}`,     // controller (who can claim)
            evmAddress as `0x${string}`      // owner (who owns the shares)
          ]
        }),
        chainId,
        type: "eip1559",
      };
    }

    return null;
  }, [evmAddress, redeemShares, selectedChain, approveHash, isRedeemOnSpoke]);

  const handleApproveSuccess: SendTransactionButtonProps["onSuccess"] = (hash) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());
    const explorerUrl = getExplorerUrl(chainId, hash);
    const explorerName = getExplorerName(chainId);

    setApproveHash(hash);
    setCurrentStep('deposit');
    setError("");

    toast.success("USDC Approval Successful!", {
      description: `Transaction confirmed on ${getChainName(chainId)}. You can now deposit to the vault.`,
      action: explorerUrl ? {
        label: `View`,
        onClick: () => window.open(explorerUrl, '_blank')
      } : undefined,
      duration: Infinity, // Don't auto-dismiss
    });

    console.log('Approve successful:', hash, 'Chain:', chainId);
  };

  const handleApproveError: SendTransactionButtonProps["onError"] = (error) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());

    setError(`Approve failed: ${error.message}`);
    setCurrentStep('idle');

    toast.error("USDC Approval Failed", {
      description: `Transaction failed on ${getChainName(chainId)}: ${error.message}`,
      action: {
        label: "Retry",
        onClick: () => handleReset()
      },
      duration: Infinity,
    });

    console.error('Approve failed:', error, 'Chain:', chainId);
  };

  const handleDepositSuccess: SendTransactionButtonProps["onSuccess"] = (hash) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());
    const explorerUrl = getExplorerUrl(chainId, hash);
    const explorerName = getExplorerName(chainId);
    const layerZeroUrl = `https://testnet.layerzeroscan.com/tx/${hash}`;

    setDepositHash(hash);
    setCurrentStep('idle');
    setError("");

    const depositType = isCrossChain ? "Cross-chain Deposit" : "Vault Deposit";
    const description = isCrossChain
      ? `Deposit initiated on ${getChainName(chainId)}. Shares will arrive on Base in ~5-15 min.`
      : `Deposited ${depositAmount} USDC. Your shares have been minted!`;

    toast.success(`${depositType} Successful!`, {
      description,
      action: explorerUrl ? {
        label: `View`,
        onClick: () => window.open(explorerUrl, '_blank')
      } : undefined,
      duration: Infinity,
      // Add LayerZero scan link for cross-chain deposits
      ...(isCrossChain && {
        cancel: {
          label: (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono bg-primary text-primary-foreground rounded border px-1.5 py-0.5">0</span>
              <span className="text-sm font-medium">0</span>
            </div>
          ),
          onClick: () => window.open(layerZeroUrl, '_blank')
        }
      })
    });

    // Reset form
    setDepositAmount("");
    setSelectedChain("");
    setApproveHash("");

    console.log('Deposit successful:', hash, 'Chain:', chainId);
  };

  const handleDepositError: SendTransactionButtonProps["onError"] = (error) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());

    setError(`Deposit failed: ${error.message}`);
    setCurrentStep('idle');

    const depositType = isCrossChain ? "Cross-chain Deposit" : "Vault Deposit";

    toast.error(`${depositType} Failed`, {
      description: `Transaction failed on ${getChainName(chainId)}: ${error.message}`,
      action: {
        label: "Retry",
        onClick: () => handleReset()
      },
      duration: Infinity,
    });

    console.error('Deposit failed:', error);
  };

  const handleReset = () => {
    setCurrentStep('idle');
    setApproveHash("");
    setDepositHash("");
    setRedeemHash("");
    setError("");
    toast.dismiss(); // Dismiss any existing toasts
  };

  // Handle redeem approve success
  const handleRedeemApproveSuccess: SendTransactionButtonProps["onSuccess"] = (hash) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());
    const explorerUrl = getExplorerUrl(chainId, hash);

    setApproveHash(hash);
    setCurrentStep('redeem-request');
    setError("");

    toast.success("Share Approval Successful!", {
      description: `Shares approved on ${getChainName(chainId)}. You can now request redemption.`,
      action: explorerUrl ? {
        label: `View`,
        onClick: () => window.open(explorerUrl, '_blank')
      } : undefined,
      duration: Infinity,
    });

    console.log('Redeem approve successful:', hash, 'Chain:', chainId);
  };

  const handleRedeemApproveError: SendTransactionButtonProps["onError"] = (error) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());

    setError(`Share approval failed: ${error.message}`);
    setCurrentStep('idle');

    toast.error("Share Approval Failed", {
      description: `Transaction failed on ${getChainName(chainId)}: ${error.message}`,
      action: {
        label: "Retry",
        onClick: () => handleReset()
      },
      duration: Infinity,
    });

    console.error('Redeem approve failed:', error, 'Chain:', chainId);
  };

  // Handle redeem request success
  const handleRedeemRequestSuccess: SendTransactionButtonProps["onSuccess"] = (hash) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());
    const explorerUrl = getExplorerUrl(chainId, hash);
    const layerZeroUrl = `https://testnet.layerzeroscan.com/tx/${hash}`;

    setRedeemHash(hash);
    setCurrentStep('idle');
    setError("");

    const redeemType = isRedeemOnSpoke ? "Cross-chain Redeem Request" : "Hub Redeem Request";
    const description = isRedeemOnSpoke
      ? `Redeem request initiated on ${getChainName(chainId)}. Your USDC will be claimable on Base after processing (~5-15 min).`
      : `Redeem request submitted on Base. Your USDC will be claimable after vault manager processing.`;

    toast.success(`${redeemType} Successful!`, {
      description,
      action: explorerUrl ? {
        label: `View`,
        onClick: () => window.open(explorerUrl, '_blank')
      } : undefined,
      duration: Infinity,
      // Add LayerZero scan link for cross-chain redemptions
      ...(isRedeemOnSpoke && {
        cancel: {
          label: (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono bg-primary text-primary-foreground rounded border px-1.5 py-0.5">0</span>
              <span className="text-sm font-medium">0</span>
            </div>
          ),
          onClick: () => window.open(layerZeroUrl, '_blank')
        }
      })
    });

    // Reset form
    setRedeemShares("");
    setSelectedChain("");
    setApproveHash("");

    console.log('Redeem request successful:', hash, 'Chain:', chainId);
  };

  const handleRedeemRequestError: SendTransactionButtonProps["onError"] = (error) => {
    const chainId = parseInt(selectedChain || HUB_CHAIN_ID.toString());

    setError(`Redeem request failed: ${error.message}`);
    setCurrentStep('idle');

    const redeemType = isRedeemOnSpoke ? "Cross-chain Redeem Request" : "Hub Redeem Request";

    toast.error(`${redeemType} Failed`, {
      description: `Transaction failed on ${getChainName(chainId)}: ${error.message}`,
      action: {
        label: "Retry",
        onClick: () => handleReset()
      },
      duration: Infinity,
    });

    console.error('Redeem request failed:', error);
  };

  // Legacy handleRedeem is replaced by the new async flow
  // The UI now handles approve -> request redeem in two steps

  if (!evmAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading</CardTitle>
          <CardDescription>Connect wallet to start trading</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading</CardTitle>
        <CardDescription>Buy or sell vault shares</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buy" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount">Amount ({vault.baseAsset.symbol})</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                {vault.baseAsset.isUSDC && usdcBalance && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Balance: {usdcBalance.formatted} USDC
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-2 text-xs"
                      onClick={() => setDepositAmount(usdcBalance.balance)}
                    >
                      Max
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="origin-chain">Origin Chain</Label>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedNetworks.map((network) => (
                      <SelectItem key={network?.chainId} value={network?.chainId?.toString() || ""}>
                        <div className="flex items-center gap-2">
                          <span>{network?.name}</span>
                          {network?.chainId === HUB_CHAIN_ID && (
                            <Badge variant="secondary" className="text-xs">Hub</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {vault.baseAsset.isUSDC && (
                <div>
                  <Label htmlFor="deposit-mode">Mode</Label>
                  <Select value={depositMode} onValueChange={(value: "standard" | "fast") => setDepositMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (OFT)</SelectItem>
                      <SelectItem value="fast">Fast (CCTP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isCrossChain && (
                <Alert>
                  <AlertDescription>
                    Cross-chain deposits use CCTP Fast for instant USDC bridging to Base. You&apos;ll receive vault shares after LayerZero message confirmation (~5-15 minutes).
                  </AlertDescription>
                </Alert>
              )}

              {evmAddress && depositAmount && selectedChain ? (
                <div className="space-y-2">
                  {currentStep === 'idle' && (
                    <SendTransactionButton
                      account={evmAddress}
                      // @ts-expect-error network
                      network={getNetworkName(parseInt(selectedChain))}
                      transaction={approveTransaction!}
                      onSuccess={handleApproveSuccess}
                      onError={handleApproveError}
                      onPending={() => {
                        toast.loading("Approving USDC...", {
                          description: "Please confirm the transaction in your wallet",
                          duration: Infinity,
                        });
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                    >
                      1. Approve USDC {isCrossChain ? '(Cross-chain)' : ''}
                    </SendTransactionButton>
                  )}

                  {currentStep === 'deposit' && depositTransaction && (
                    <SendTransactionButton
                      account={evmAddress}
                      // @ts-expect-error network
                      network={getNetworkName(parseInt(selectedChain))}
                      transaction={depositTransaction}
                      onSuccess={handleDepositSuccess}
                      onError={handleDepositError}
                      onPending={() => {
                        toast.loading(isCrossChain ? "Processing Cross-chain Deposit..." : "Processing Deposit...", {
                          description: `Please confirm the ${isCrossChain ? 'cross-chain deposit via CCTP' : 'vault deposit'} transaction in your wallet`,
                          duration: Infinity,
                        });
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
                    >
                      2. {isCrossChain ? 'Deposit via CCTP Fast' : 'Deposit to Vault'}
                    </SendTransactionButton>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={true}
                >
                  Enter amount and select chain to continue
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="redeem-shares">Shares to Redeem</Label>
                <Input
                  id="redeem-shares"
                  type="number"
                  placeholder="0.00"
                  value={redeemShares}
                  onChange={(e) => setRedeemShares(e.target.value)}
                />
                {shareBalance && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Balance: {shareBalance.formatted} Shares
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-2 text-xs"
                      onClick={() => setRedeemShares(shareBalance.balance)}
                    >
                      Max
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="dest-chain">Destination Chain</Label>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedNetworks.map((network) => (
                      <SelectItem key={network?.chainId} value={network?.chainId?.toString() || ""}>
                        <div className="flex items-center gap-2">
                          <span>{network?.name}</span>
                          {network?.chainId === HUB_CHAIN_ID && (
                            <Badge variant="secondary" className="text-xs">Hub</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedChain && (
                <Alert>
                  <AlertDescription>
                    {isRedeemOnSpoke
                      ? `Cross-chain redemptions use async processing: Your shares will be burned on ${getChainName(parseInt(selectedChain))} and USDC will be claimable on Base after LayerZero message confirmation (~5-15 minutes).`
                      : `Hub redemptions use async processing: Your redemption will be queued and USDC will be claimable after processing by the vault manager.`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {evmAddress && redeemShares && selectedChain ? (
                <div className="space-y-2">
                  {currentStep === 'idle' && (
                    <SendTransactionButton
                      account={evmAddress}
                      // @ts-expect-error network
                      network={getNetworkName(parseInt(selectedChain))}
                      transaction={redeemApproveTransaction!}
                      onSuccess={handleRedeemApproveSuccess}
                      onError={handleRedeemApproveError}
                      onPending={() => {
                        toast.loading("Approving Shares...", {
                          description: "Please confirm the transaction in your wallet",
                          duration: Infinity,
                        });
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg"
                    >
                      1. Approve Shares {isRedeemOnSpoke ? '(Cross-chain)' : '(Hub)'}
                    </SendTransactionButton>
                  )}

                  {currentStep === 'redeem-request' && redeemRequestTransaction && (
                    <SendTransactionButton
                      account={evmAddress}
                      // @ts-expect-error network
                      network={getNetworkName(parseInt(selectedChain))}
                      transaction={redeemRequestTransaction}
                      onSuccess={handleRedeemRequestSuccess}
                      onError={handleRedeemRequestError}
                      onPending={() => {
                        toast.loading(isRedeemOnSpoke ? "Processing Async Redeem Request..." : "Processing Redeem...", {
                          description: `Please confirm the ${isRedeemOnSpoke ? 'cross-chain redeem request via LayerZero' : 'vault redeem'} transaction in your wallet`,
                          duration: Infinity,
                        });
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
                    >
                      2. {isRedeemOnSpoke ? 'Request Cross-chain Redeem' : 'Request Hub Redeem'}
                    </SendTransactionButton>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full bg-red-500 hover:bg-red-600"
                  disabled={true}
                >
                  Enter shares amount and select chain to continue
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
