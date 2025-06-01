import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketOptions<ReceiveType = unknown> {
    onMessage?: (data: ReceiveType) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (event: Event) => void;
    shouldReconnect?: boolean;
    reconnectIntervalMs?: number;
}

export function useWebSocket<SendType = unknown, ReceiveType = unknown>(
    url: string,
    options: WebSocketOptions<ReceiveType> = {}
) {
    const {
        onMessage,
        onOpen,
        onClose,
        onError,
        shouldReconnect = true,
        reconnectIntervalMs = 2000,
    } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [connected, setConnected] = useState(false);
    const messageQueue = useRef<string[]>([]);

    const onMessageRef = useRef(onMessage);
    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onMessageRef.current = onMessage;
        onOpenRef.current = onOpen;
        onCloseRef.current = onClose;
        onErrorRef.current = onError;
    }, [onMessage, onOpen, onClose, onError]);

    const sendMessage = useCallback((data: SendType) => {
        const json = JSON.stringify(data);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(json);
        } else {
            messageQueue.current.push(json);
        }
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            onOpenRef.current?.();
            while (messageQueue.current.length > 0) {
                ws.send(messageQueue.current.shift()!);
            }
        };

        ws.onmessage = (event) => {
            try {
                const parsed: ReceiveType = JSON.parse(event.data);
                onMessageRef.current?.(parsed);
            } catch (e) {
                console.warn('Invalid JSON:', event.data);
            }
        };

        ws.onerror = (event) => {
            onErrorRef.current?.(event);
        };

        ws.onclose = () => {
            setConnected(false);
            onCloseRef.current?.();
            if (shouldReconnect) {
                reconnectTimeoutRef.current = setTimeout(connect, reconnectIntervalMs);
            }
        };
    }, [url, shouldReconnect, reconnectIntervalMs]);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    return {
        sendMessage,
        connected,
        connection: wsRef.current,
    };
}
