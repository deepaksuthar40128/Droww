import React, {useState} from 'react';
import {useDispatch} from 'react-redux';
import {useLocation, useNavigate} from 'react-router-dom';
import {useLoginMutation} from '@/redux/slices/api.slice.ts';
import {AuthActionsTypes, login} from '@/redux/slices/auth.slice.ts';
import Loader from "@/components/Loader/Loader.tsx";

const Login: React.FC = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const [loginMutation, {isLoading, error}] = useLoginMutation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const result = await loginMutation(formData).unwrap();

            dispatch(login({
                type: AuthActionsTypes.Login,
                user: result.user,
            }));

            navigate(from, {replace: true});

        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Sign in to your account
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm text-center">
                            {('data' in error) ?
                                (error.data as any)?.message || 'Login failed' :
                                'Network error occurred'
                            }
                        </div>
                    )}

                    <div>
                        {
                            isLoading && <Loader/>
                        }
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-900 disabled:opacity-50"
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>

                    <div className="text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            Don't have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Sign up
                            </button>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;