import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '@/redux/slices/api.slice.ts';
import { AuthActionsTypes, login } from '@/redux/slices/auth.slice.ts';
import Loader from "@/components/Loader/Loader.tsx";
import { toast } from 'sonner';

interface ValidationErrors {
    [key: string]: string[];
}

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirm: ''
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [registerMutation, { isLoading, error }] = useRegisterMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationErrors({});

        try {
            const result = await registerMutation(formData).unwrap();

            dispatch(login({
                type: AuthActionsTypes.Login,
                user: result.user,
            }));

            navigate('/', { replace: true });

        } catch (err: any) {
            toast.error('Registration failed');

            if (err?.data && typeof err.data === 'object') {
                setValidationErrors(err.data);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        if (validationErrors[name]) {
            setValidationErrors({
                ...validationErrors,
                [name]: []
            });
        }
    };

    const renderFieldError = (fieldName: string) => {
        if (validationErrors[fieldName] && validationErrors[fieldName].length > 0) {
            return (
                <div className="mt-1">
                    {validationErrors[fieldName].map((error, index) => (
                        <p key={index} className="text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const getInputClassName = (fieldName: string) => {
        const baseClass = "relative block w-full px-3 py-2 border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400";
        const errorClass = validationErrors[fieldName] && validationErrors[fieldName].length > 0
            ? "border-red-500 dark:border-red-400"
            : "border-gray-300 dark:border-gray-600";
        return `${baseClass} ${errorClass}`;
    };

    return (
        <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Create your account
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className={`${getInputClassName('name')} rounded-md`}
                                placeholder="Full name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                            {renderFieldError('name')}
                        </div>

                        <div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className={`${getInputClassName('email')} rounded-md`}
                                placeholder="Email address"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            {renderFieldError('email')}
                        </div>

                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className={`${getInputClassName('password')} rounded-md`}
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            {renderFieldError('password')}
                        </div>

                        <div>
                            <input
                                id="password_confirm"
                                name="password_confirm"
                                type="password"
                                required
                                className={`${getInputClassName('password_confirm')} rounded-md`}
                                placeholder="Confirm Password"
                                value={formData.password_confirm}
                                onChange={handleChange}
                            />
                            {renderFieldError('password_confirm')}
                        </div>
                    </div>

                    {error && !Object.keys(validationErrors).length && (
                        <div className="text-red-600 dark:text-red-400 text-sm text-center">
                            {('data' in error) ?
                                (error.data as any)?.message || 'Registration failed' :
                                'Network error occurred'
                            }
                        </div>
                    )}

                    {validationErrors.non_field_errors && (
                        <div className="text-red-600 dark:text-red-400 text-sm text-center">
                            {validationErrors.non_field_errors.map((error, index) => (
                                <p key={index}>{error}</p>
                            ))}
                        </div>
                    )}

                    <div>
                        {
                            isLoading && <Loader />
                        }
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-900 disabled:opacity-50"
                        >
                            {isLoading ? 'Creating account...' : 'Create account'}
                        </button>
                    </div>

                    <div className="text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Sign in
                            </button>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;