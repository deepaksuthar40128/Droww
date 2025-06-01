import { configureStore } from '@reduxjs/toolkit';
import { authApi } from "@/redux/slices/api.slice.ts";
import authSlice from "@/redux/slices/auth.slice.ts";

const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    authSlice
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
});

export default store;


export type RootState = ReturnType<typeof store.getState>;
