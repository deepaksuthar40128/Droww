import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Account, User } from '@/lib/types';

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:8000/api/',
        credentials: "include",
    }),
    endpoints: (builder) => ({
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: (credentials) => ({
                url: ApiRoutes.Login,
                method: 'POST',
                body: credentials,
            }),
        }),
        register: builder.mutation<RegisterResponse, RegisterRequest>({
            query: (userData) => ({
                url: ApiRoutes.Register,
                method: 'POST',
                body: userData,
            }),
        }),

        logout: builder.mutation<void, void>({
            query: () => ({
                url: ApiRoutes.Logout,
                method: 'POST',
            }),
        }),

        addBalance: builder.mutation<void, { amount: number }>({
            query: (amount) => ({
                url: ApiRoutes.AddBalance,
                method: 'POST',
                body: amount,
            }),
        }),

        getAccountDetails: builder.query<Account, void>({
            query: () => ApiRoutes.GetAccountDetails,
        }),

        getProfile: builder.query<User, void>({
            query: () => ApiRoutes.Profile,
        }),

        checkSession: builder.query<SessionCheckResponse, void>({
            query: () => ApiRoutes.CheckSession,
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useLogoutMutation,
    useAddBalanceMutation,
    useLazyGetProfileQuery,
    useGetAccountDetailsQuery,
    useCheckSessionQuery,
} = authApi;


export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: User;
}

export type RegisterResponse = LoginResponse;

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface SessionCheckResponse {
    isValid: boolean;
    user?: User;
}

enum ApiRoutes {
    Login = '/auth/login/',
    Register = '/auth/register/',
    CheckSession = '/auth/check-session/',
    Logout = '/auth/logout/',
    Profile = '/profile/',
    AddBalance = '/account/add-balance/',
    GetAccountDetails = '/account/details/',
}