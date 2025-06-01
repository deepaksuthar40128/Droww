import { ReduxSlices, User } from "@/lib/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const loadUserFromStorage = (): User | undefined => {
    if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('userInfo');
        return userData ? JSON.parse(userData) : undefined;
    }
    return undefined;
};

const saveUserToStorage = (user: User | undefined) => {
    if (typeof window !== 'undefined') {
        if (user) {
            localStorage.setItem('userInfo', JSON.stringify(user));
        } else {
            localStorage.removeItem('userInfo');
        }
    }
};

const initialState: Auth = {
    isAuthenticated: !!loadUserFromStorage(),
    user: loadUserFromStorage()
};

const authSlice = createSlice({
    name: ReduxSlices.Auth,
    initialState: initialState,
    reducers: {
        login: (state, action: PayloadAction<LoginAction>) => {
            state.user = action.payload.user;
            state.isAuthenticated = true;
            saveUserToStorage(action.payload.user);
        },
        logout: (state) => {
            state.user = undefined;
            state.isAuthenticated = false;
            saveUserToStorage(undefined);
        },
    }
});

export default authSlice.reducer;
export const { login, logout } = authSlice.actions;

// Shared Types
export interface Auth {
    user?: User,
    isAuthenticated: boolean
}

export interface LoginAction {
    type: AuthActionsTypes.Login,
    user: User,
}

export enum AuthActionsTypes {
    Login = "login",
    Logout = "logout",
    Initialize = "initialize"
}