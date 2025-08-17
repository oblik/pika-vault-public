"use client";

import { useState, useCallback, useMemo } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { parseUnits, encodeFunctionData } from "viem";
import { toast } from "sonner";
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
import { getCCTPContracts, CONTRACTS } from "@/config/contracts";
import { HUB_CHAIN_ID } from "@/config/chains";
import { Balance } from "@/types";

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

  // Prepare approve transaction
  const approveTransaction = useMemo<SendTransactionButtonProps["transaction"] | null>(() => {
    if (!evmAddress || !depositAmount || !selectedChain || parseInt(selectedChain) !== HUB_CHAIN_ID) return null;
    
    const amount = parseUnits(depositAmount, 6);
    const usdcContract = getCCTPContracts(HUB_CHAIN_ID);
    if (!usdcContract?.usdc) return null;

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
  }, [evmAddress, depositAmount, selectedChain]);

  // Prepare deposit transaction  
  const depositTransaction = useMemo<SendTransactionButtonProps["transaction"] | null>(() => {
    if (!evmAddress || !depositAmount || !selectedChain || parseInt(selectedChain) !== HUB_CHAIN_ID || !approveHash) return null;
    
    const amount = parseUnits(depositAmount, 6);

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
  }, [evmAddress, depositAmount, selectedChain, approveHash]);

  const handleApproveSuccess: SendTransactionButtonProps["onSuccess"] = (hash) => {
    setApproveHash(hash);
    setCurrentStep('deposit');
    setError("");
    
    toast.success("USDC Approval Successful!", {
      description: `Transaction confirmed. You can now deposit to the vault.`,
      action: {
        label: "View Transaction",
        onClick: () => window.open(`https://sepolia.basescan.org/tx/${hash}`, '_blank')
      },
      duration: Infinity, // Don't auto-dismiss
    });
    
    console.log('Approve successful:', hash);
  };

  const handleApproveError: SendTransactionButtonProps["onError"] = (error) => {
    setError(`Approve failed: ${error.message}`);
    setCurrentStep('idle');
    
    toast.error("USDC Approval Failed", {
      description: error.message,
      action: {
        label: "Retry",
        onClick: () => handleReset()
      },
      duration: Infinity,
    });
    
    console.error('Approve failed:', error);
  };

  const handleDepositSuccess: SendTransactionButtonProps["onSuccess"] = (hash) => {
    setDepositHash(hash);
    setCurrentStep('idle');
    setError("");
    
    toast.success("Vault Deposit Successful!", {
      description: `Successfully deposited ${depositAmount} USDC to Pika Vault. Your shares have been minted!`,
      action: {
        label: "View Transaction", 
        onClick: () => window.open(`https://sepolia.basescan.org/tx/${hash}`, '_blank')
      },
      duration: Infinity,
    });
    
    // Reset form
    setDepositAmount("");
    setSelectedChain("");
    setApproveHash("");
    
    console.log('Deposit successful:', hash);
  };

  const handleDepositError: SendTransactionButtonProps["onError"] = (error) => {
    setError(`Deposit failed: ${error.message}`);
    setCurrentStep('idle');
    
    toast.error("Vault Deposit Failed", {
      description: error.message,
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

              <Alert>
                <AlertDescription>
                  Cross-chain deposits are processed asynchronously. You'll receive shares after confirmation.
                </AlertDescription>
              </Alert>

              {evmAddress && depositAmount && parseInt(selectedChain) === HUB_CHAIN_ID ? (
                <div className="space-y-2">
                  {currentStep === 'idle' && (
                    <SendTransactionButton
                      account={evmAddress}
                      network="base-sepolia"
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
                      1. Approve USDC
                    </SendTransactionButton>
                  )}
                  
                  {currentStep === 'deposit' && depositTransaction && (
                    <SendTransactionButton
                      account={evmAddress}
                      network="base-sepolia"
                      transaction={depositTransaction}
                      onSuccess={handleDepositSuccess}
                      onError={handleDepositError}
                      onPending={() => {
                        toast.loading("Processing Deposit...", {
                          description: "Please confirm the vault deposit transaction in your wallet",
                          duration: Infinity,
                        });
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
                    >
                      2. Deposit to Vault
                    </SendTransactionButton>
                  )}
                </div>
              ) : (
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={true}
                >
                  {selectedChain && parseInt(selectedChain) !== HUB_CHAIN_ID 
                    ? 'Cross-chain deposits coming soon' 
                    : 'Enter amount and select Base Sepolia'
                  }
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