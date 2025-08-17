"use client";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Droplets, Loader2 } from "lucide-react";

import { IconCheck, IconCopy } from "@/components/Icons";
import { useFaucet } from "@/hooks/useFaucet";
import { Button } from "@/components/ui/button";

/**
 * Modern Header component with glassmorphism and Pika Vault branding
 */
export default function Header() {
  const { evmAddress } = useEvmAddress();
  const [isCopied, setIsCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isLoading: faucetLoading, requestFaucetFunds } = useFaucet();

  const copyAddress = async () => {
    if (!evmAddress) return;
    try {
      await navigator.clipboard.writeText(evmAddress);
      setIsCopied(true);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isCopied) return;
    const timeout = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  const handleFaucetRequest = async () => {
    if (!evmAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      const result = await requestFaucetFunds();
      
      if (result) {
        const { successCount, totalRequests } = result.summary;
        
        if (successCount > 0) {
          toast.success(`Faucet Success! ๐Ÿ'ง`, {
            description: `${successCount}/${totalRequests} requests successful. Check your wallet!`,
            duration: 5000,
          });
        } else {
          toast.error("All faucet requests failed", {
            description: "Please try again later or check rate limits",
            duration: 5000,
          });
        }
      }
    } catch (error) {
      toast.error("Faucet request failed", {
        description: error instanceof Error ? error.message : "Please try again",
        duration: 5000,
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-pika-bg-primary/80 border-b border-pika-border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-3 group"
          >
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-pika-glow">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="absolute inset-0 bg-gradient-primary rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-pika-text-primary font-semibold text-lg tracking-tight">
                Pika Vault
              </span>
              <span className="text-pika-text-tertiary text-xs -mt-1">
                Omnichain ETF
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/vaults">Vaults</NavLink>
            <NavLink href="/onramp">Onramp</NavLink>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Wallet Address */}
            {evmAddress && (
              <button
                onClick={copyAddress}
                className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-pika-bg-card hover:bg-pika-bg-card-hover border border-pika-border-primary rounded-lg transition-all duration-200 hover:border-pika-border-accent group"
              >
                <div className="w-4 h-4 text-pika-text-secondary group-hover:text-pika-text-accent transition-colors">
                  {isCopied ? (
                    <IconCheck className="w-4 h-4" />
                  ) : (
                    <IconCopy className="w-4 h-4" />
                  )}
                </div>
                <span className="text-sm font-mono text-pika-text-secondary group-hover:text-pika-text-primary transition-colors">
                  {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                </span>
              </button>
            )}

            {/* Faucet Button */}
            {evmAddress && (
              <Button
                onClick={handleFaucetRequest}
                disabled={faucetLoading}
                size="sm"
                variant="outline"
                className="hidden sm:flex items-center space-x-2 bg-pika-bg-card hover:bg-pika-bg-card-hover border-pika-border-primary hover:border-pika-border-accent transition-all duration-200"
              >
                {faucetLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Droplets className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {faucetLoading ? "Getting..." : "Faucet"}
                </span>
              </Button>
            )}

            {/* Auth Button */}
            <div className="auth-button-wrapper">
              <AuthButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-pika-bg-card hover:bg-pika-bg-card-hover border border-pika-border-primary transition-colors"
            >
              <div className="w-5 h-5 text-pika-text-primary">
                {isMobileMenuOpen ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-pika-border-primary animate-fade-in">
            <nav className="flex flex-col space-y-2">
              <MobileNavLink href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/vaults" onClick={() => setIsMobileMenuOpen(false)}>
                Vaults
              </MobileNavLink>
              <MobileNavLink href="/onramp" onClick={() => setIsMobileMenuOpen(false)}>
                Onramp
              </MobileNavLink>
              
              {/* Mobile Faucet Button */}
              {evmAddress && (
                <Button
                  onClick={() => {
                    handleFaucetRequest();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={faucetLoading}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-2 w-full bg-pika-bg-card hover:bg-pika-bg-card-hover border-pika-border-primary hover:border-pika-border-accent transition-all duration-200 mt-4"
                >
                  {faucetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Droplets className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {faucetLoading ? "Getting Tokens..." : "Get Test Tokens"}
                  </span>
                </Button>
              )}

              {/* Mobile Wallet Address */}
              {evmAddress && (
                <button
                  onClick={() => {
                    copyAddress();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 bg-pika-bg-card hover:bg-pika-bg-card-hover border border-pika-border-primary rounded-lg transition-all duration-200 mt-2"
                >
                  <div className="w-4 h-4 text-pika-text-secondary">
                    {isCopied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-mono text-pika-text-secondary">
                    {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                  </span>
                  <span className="text-xs text-pika-text-tertiary ml-auto">
                    {isCopied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  
  return (
    <Link
      href={href}
      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'text-pika-text-primary bg-pika-bg-card border border-pika-border-accent'
          : 'text-pika-text-secondary hover:text-pika-text-primary hover:bg-pika-bg-card/50'
      }`}
    >
      {children}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-lg pointer-events-none"></div>
      )}
    </Link>
  );
}

function MobileNavLink({ 
  href, 
  children, 
  onClick 
}: { 
  href: string; 
  children: React.ReactNode; 
  onClick: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'text-pika-text-primary bg-pika-bg-card border border-pika-border-accent'
          : 'text-pika-text-secondary hover:text-pika-text-primary hover:bg-pika-bg-card/50'
      }`}
    >
      {children}
    </Link>
  );
}
