export interface Balance {
  contract: string;
  symbol: string;
  decimals: number;
  amount: string;
  value?: string; // USD value if available
}

export interface Position {
  vaultId: string;
  chainId: number;
  shares: string;
  value?: string; // Estimated value
}

export interface PendingRequest {
  requestId: string;
  type: 'DEPOSIT' | 'REDEEM';
  originChainId: number;
  destChainId: number;
  status: 'PENDING' | 'IN_FLIGHT' | 'CLAIMABLE' | 'CLAIMED' | 'FAILED';
  amount?: string;
  asset?: string;
  events: RequestEvent[];
  createdAt: number;
}

export interface RequestEvent {
  timestamp: number;
  label: string;
  txUrl?: string;
  lzTxUrl?: string;
  cctpUrl?: string;
}

export interface DepositMode {
  id: 'standard' | 'fast';
  name: string;
  description: string;
  isAvailable: boolean;
}

export interface TradeFormData {
  amount: string;
  originChainId?: number;
  destChainId?: number;
  mode?: DepositMode['id'];
}

export interface OnrampSession {
  token: string;
  expiresAt: number;
}