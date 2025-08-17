"use client";

import { useState, useCallback, useMemo } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { parseUnits, encodeFunctionData } from "viem";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import ERC4626Abi from "@/abis/erc4626.json";
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

  const [currentStep, setCurrentStep] = useState<'approve' | 'deposit' | 'idle'>('idle');
  const [approveHash, setApproveHash] = useState<string>("");
  const [depositHash, setDepositHash] = useState<string>("");
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

  // Check if cross-chain deposit
  const isCrossChain = selectedChain ? parseInt(selectedChain) !== HUB_CHAIN_ID : false;

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
        label: `View on ${explorerName}`,
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
        label: `View on ${explorerName}`,
        onClick: () => window.open(explorerUrl, '_blank')
      } : undefined,
      duration: Infinity,
      // Add LayerZero scan link for cross-chain deposits
      ...(isCrossChain && {
        cancel: {
          label: (
            <div className="flex items-center gap-1">
              <span className="text-xs bg-black text-white rounded px-1">0</span>
              LayerZero
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
    setError("");
    toast.dismiss(); // Dismiss any existing toasts
  };

  const handleRedeem = async () => {
    if (!evmAddress || !redeemShares || !selectedChain) return;
    
    try {
      console.log('Redeem params:', {
        shares: redeemShares,
        chainId: selectedChain,
        vault: vault.id
      });

      // TODO: Implement redeem logic
      console.log('Calling redeem...');
      
      // Reset form
      setRedeemShares("");
    } catch (error) {
      console.error('Redeem failed:', error);
    }
  };

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
                    Cross-chain deposits use CCTP Fast for instant USDC bridging to Base. You'll receive vault shares after LayerZero message confirmation (~5-15 minutes).
                  </AlertDescription>
                </Alert>
              )}

              {evmAddress && depositAmount && selectedChain ? (
                <div className="space-y-2">
                  {currentStep === 'idle' && (
                    <SendTransactionButton
                      account={evmAddress}
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

              <Alert>
                <AlertDescription>
                  Redemptions are processed in two steps: Request → Claim
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleRedeem}
                  variant="destructive"
                  disabled={!redeemShares || !selectedChain}
                >
                  Request Redeem
                </Button>
                <Button variant="outline" disabled>
                  Claim
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}