import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTheme} from "./theme-provider";
import {Button} from "./ui/button";
import {LogOut, Moon, Plus, Sun, Wallet} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {useDispatch, useSelector} from "react-redux";
import {logout as logoutAction} from "@/redux/slices/auth.slice.ts";
import {RootState} from "@/redux/store.ts";
import {useAddBalanceMutation, useGetAccountDetailsQuery, useLogoutMutation} from "@/redux/slices/api.slice.ts";
import Loader from "@/components/Loader/Loader.tsx";
import {Input} from "./ui/input";
import {toast} from "sonner";

export default function Header() {
    const [status, setStatus] = useState(true);
    const [showStatus, setShowStatus] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const {theme, setTheme} = useTheme();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {user} = useSelector((state: RootState) => state.authSlice);

    const [logout, logoutMutationState] = useLogoutMutation();
    const [addBalance, addBalanceMutationState] = useAddBalanceMutation();
    const {
        data: accountDetails,
        isLoading: isAccountLoading,
        refetch: refetchAccount,
        isFetching
    } = useGetAccountDetailsQuery();

    let timerId: NodeJS.Timeout;
    useEffect(() => {
        if (showStatus) {
            clearTimeout(timerId);
            timerId = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
        }
    }, [showStatus]);

    const onlineEvent = () => {
        setShowStatus(true);
        setStatus(true);
    };

    const offlineEvent = () => {
        setShowStatus(true);
        setStatus(false);
    };

    useEffect(() => {
        window.addEventListener('online', onlineEvent);
        window.addEventListener('offline', offlineEvent);
        return () => {
            window.removeEventListener('online', onlineEvent);
            window.removeEventListener('offline', offlineEvent);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(logoutAction());
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleAddBalance = async () => {
        const amount = parseFloat(addAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.warning('Please enter a valid amount');
            return;
        }

        try {
            await addBalance({amount}).unwrap();
            setAddAmount('');
            refetchAccount();
        } catch (error) {
            console.error('Add balance failed:', error);
        }
    };

    return (
        <div className="sticky top-0 z-10">
            <div
                className={`h-max ${status ? 'bg-green-700' : 'bg-red-700'} text-white w-dvw absolute text-center text-sm py-1 ${showStatus ? 'top-0' : '-top-8'} transition-all`}>
                {status ? 'Back Online' : 'Trying to reconnecting...'}
            </div>
            <nav
                className="w-full h-[60px] bg-gray-400 dark:bg-gray-900 text-white p-3 flex justify-between items-center">
                <Link to="/">
                    <h2 className="font-bold select-none text-gray-800 dark:text-white">Droww</h2>
                </Link>
                <div className="flex items-center gap-2">
                    {theme === 'light' ? (
                        <Button variant={"ghost"} onClick={() => setTheme('dark')}>
                            <Moon/>
                        </Button>
                    ) : (
                        <Button variant={"ghost"} onClick={() => setTheme('light')}>
                            <Sun/>
                        </Button>
                    )}
                    {user && (
                        <Popover onOpenChange={(open) => {
                            if (open) refetchAccount()
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant={"ghost"} className="flex items-center gap-2">
                                    <span
                                        className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 space-y-4">
                                {
                                    (isFetching || addBalanceMutationState.isLoading) && <Loader/>
                                }
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{user.name}</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Available
                                                Balance</p>
                                            <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                                {isAccountLoading ? (
                                                    <Loader/>
                                                ) : (
                                                    `₹${accountDetails?.balance?.toLocaleString() || '0'}`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <h5 className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                            <Plus className="w-4 h-4"/>
                                            Add Balance
                                        </h5>
                                        <div className="space-y-2">
                                            <Input
                                                type="number"
                                                placeholder="Enter amount"
                                                value={addAmount}
                                                onChange={(e) => setAddAmount(e.target.value)}
                                                min="0"
                                                step="0.01"
                                            />
                                            <Button
                                                onClick={handleAddBalance}
                                                disabled={addBalanceMutationState.isLoading || !addAmount}
                                                className="w-full"
                                            >
                                                {addBalanceMutationState.isLoading ? (
                                                    'Loading...'
                                                ) : (
                                                    'Add Balance'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    {logoutMutationState.isLoading && <Loader/>}
                                    <Button
                                        variant="outline"
                                        className="w-full flex items-center gap-2"
                                        onClick={handleLogout}
                                        disabled={logoutMutationState.isLoading}
                                    >
                                        <LogOut className="w-4 h-4"/>
                                        <span>Logout</span>
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </nav>
        </div>
    );
}