"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type RealtimeEvent = {
  organizationId: string;
  resource: "client" | "project" | "task" | "comment" | "member";
  action: "created" | "updated" | "deleted";
  projectId?: string;
  resourceId?: string;
};

export function useOrganizationRealtime(
  organizationId: string | undefined,
  onChanged: (event: RealtimeEvent) => void,
) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const callbackRef = useRef(onChanged);

  useEffect(() => {
    callbackRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!organizationId || !isLoaded || !isSignedIn) return;

    let socket: ReturnType<typeof io> | undefined;
    let cancelled = false;

    async function connect() {
      const token = await getToken();
      if (cancelled || !token) return;

      socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
      socket.on("connect", () => {
        socket?.emit("organization:subscribe", { organizationId });
      });
      socket.on("organization:changed", (event: RealtimeEvent) => {
        if (event.organizationId === organizationId) callbackRef.current(event);
      });
    }

    void connect();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [getToken, isLoaded, isSignedIn, organizationId]);
}
