import { RootState } from "@/redux/store.ts";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useSelector(
    (state: RootState) => state.authSlice
  );

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
