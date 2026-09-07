"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type Organization = {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
};

type CurrentOrganizationResponse = {
  organization: Organization;
  role: string;
};

export function useCurrentOrganization() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<CurrentOrganizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<CurrentOrganizationResponse>("/organizations/current", getToken);
      setData(result);
      setError(null);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadOrganization();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadOrganization]);

  return {
    organization: data?.organization ?? null,
    role: data?.role ?? null,
    loading,
    error,
  };
}
