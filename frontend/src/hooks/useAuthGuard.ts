import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AuthActionsTypes, login, logout } from '@/redux/slices/auth.slice';
import { useCheckSessionQuery } from "@/redux/slices/api.slice.ts";
import { RootState } from "@/redux/store.ts";
import { useNavigate } from "react-router-dom";

export const useAuthGuard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state: RootState) => state.authSlice);
    const { isLoading: isCheckingSession, data: sessionData, error: sessionError } = useCheckSessionQuery();

    useEffect(() => {
        if (!isCheckingSession && sessionData && sessionData.user && sessionData.isValid) {
            if (isAuthenticated) {
                return;
            }
            else {
                dispatch(login({
                    type: AuthActionsTypes.Login,
                    user: sessionData.user,
                }));
                navigate('/');
            }
        }
        else {
            if (isAuthenticated && !isCheckingSession && (sessionError || !(sessionData?.isValid))) {
                dispatch(logout());
                navigate('/login');
            }
        }
    }, [isCheckingSession]);
};
