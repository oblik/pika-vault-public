"use client";

/**
 * Simple footer component
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>© 2024 Pika Vault</span>
            <span className="px-2 py-1 bg-muted rounded text-xs">Testnet Only</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Powered by LayerZero • Circle CCTP • Coinbase CDP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}