"use client";

import { type Config } from "@coinbase/cdp-hooks";
import { CDPReactProvider, type AppConfig } from "@coinbase/cdp-react/components/CDPReactProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { theme } from "@/components/theme";

interface ProvidersProps {
  children: React.ReactNode;
}

const CDP_CONFIG: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "",
};

const APP_CONFIG: AppConfig = {
  name: "Pika Vault",
  logoUrl: "http://localhost:3000/logo.svg",
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

  return (
    <QueryClientProvider client={queryClient}>
      <CDPReactProvider config={CDP_CONFIG} app={APP_CONFIG} theme={theme}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </CDPReactProvider>
    </QueryClientProvider>
  );
}
