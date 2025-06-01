import { RouteGuard } from "@/guards/routeGuard.tsx";
import React from "react";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <RouteGuard requireAuth={true} redirectTo="/login">
      {children}
    </RouteGuard>
  );
};
