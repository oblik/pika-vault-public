"use client";

import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Sign in screen
 */
export default function SignInScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">P</span>
          </div>
          <CardTitle className="text-2xl">Welcome to Pika Vault</CardTitle>
          <CardDescription>
            Connect your wallet to access omnichain ETF vaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthButton />
        </CardContent>
      </Card>
    </div>
  );
}
