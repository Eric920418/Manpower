"use client";

import { SessionProvider } from "next-auth/react";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/utils/apolloClient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <SessionProvider>{children}</SessionProvider>
    </ApolloProvider>
  );
}
