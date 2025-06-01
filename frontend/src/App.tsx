import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/Error/Boundary";
import Header from "./components/header.tsx";
import NotFound from "./pages/NotFound";
import Loader from "./components/Loader/Loader";
import { ThemeProvider } from "./components/theme-provider";
import { useAuthGuard } from "./hooks/useAuthGuard";
import { PublicRoute } from "@/guards/publicRoutes.tsx";
import { ProtectedRoute } from "@/guards/protectedRoutes.tsx";
import Register from "@/pages/auth/register.tsx";

const Home = React.lazy(() => import("./pages/home/home.tsx"));
const Login = React.lazy(() => import("./pages/auth/login"));

function App() {
    useAuthGuard();
    return (
        <ThemeProvider defaultTheme="system">
            <Header />
            <Suspense fallback={<Loader />}>
                <ErrorBoundary>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Home />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <PublicRoute>
                                    <Register />
                                </PublicRoute>
                            }
                        />
                        <Route path="/admin/*" element={
                            <ProtectedRoute>
                                <Routes>
                                    <Route path="users" element={<div>Admin Users</div>} />
                                    <Route path="settings" element={<div>Admin Settings</div>} />
                                </Routes>
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </ErrorBoundary>
            </Suspense>
        </ThemeProvider>
    );
}

export default App;