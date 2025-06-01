import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface RouteGuardProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    redirectTo?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
    children,
    requireAuth = false,
    redirectTo = '/login'
}) => {
    const location = useLocation();
    const { isAuthenticated } = useSelector((state: RootState) => state.authSlice);

    if (requireAuth && !isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};