"use client";

import { type Config } from "@coinbase/cdp-hooks";
import { CDPReactProvider, type AppConfig } from "@coinbase/cdp-react/components/CDPReactProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";

import { theme } from "@/components/theme";

interface ProvidersProps {
  children: React.ReactNode;
}

const CDP_CONFIG: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "",
  // Add debug logging to troubleshoot refresh token issues
  // @ts-expect-error staeo
  debug: process.env.NODE_ENV === 'development',
};

const APP_CONFIG: AppConfig = {
  name: "Pika Vault",
  logoUrl: "/logo.svg", // Use relative path instead of localhost
  authMethods: ["email", "sms"],
};

/**
 * Providers component that wraps the application in all requisite providers
 *
 * @param props - { object } - The props for the Providers component
 * @param props.children - { React.ReactNode } - The children to wrap
 * @returns The wrapped children
 */
export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 10000, // 10 seconds
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  useEffect(() => {
    // Log CDP configuration for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('CDP Configuration:', {
        projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ? '✓ Set' : '✗ Missing',
        projectIdLength: process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.length,
      });
    }

    // Add global error handler for CDP errors
    const handleCDPError = (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error &&
          typeof error.response === 'object' && error.response &&
          'status' in error.response && error.response.status === 400) {
        console.error('CDP 400 Error - This may be related to refresh tokens:', error);

        // Clear any stored tokens that might be stale
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cdp-wallet-data');
          localStorage.removeItem('cdp-auth-token');
          console.log('Cleared potential stale CDP tokens from localStorage');
        }
      }
    };

    window.addEventListener('error', handleCDPError);
    return () => window.removeEventListener('error', handleCDPError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CDPReactProvider config={CDP_CONFIG} app={APP_CONFIG} theme={theme}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </CDPReactProvider>
    </QueryClientProvider>
  );
}
