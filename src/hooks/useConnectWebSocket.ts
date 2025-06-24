// import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
// import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef } from 'react';

import { mainActionType } from '../utils/mainActionType';
import usePatchOutbound from './api/usePatchOutbound';

// 取得本機 IP domain
const { hostname } = window.location;
const ws_protocol = import.meta.env.VITE_WS_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = import.meta.env.VITE_DOMAIN;
const WS_HOST = domain === 'localhost'? `${ws_protocol}://${hostname}:${port}` :`${ws_protocol}://${domain}:${port}`;

type ConnectWebSocketProps = {
  setProjectOutboundData: React.Dispatch<React.SetStateAction<ProjectOutboundDataType[]>>;
  isAutoRestart?: boolean;  // 是否自動重新撥打
};

export default function useConnectWebSocket({ setProjectOutboundData, isAutoRestart = true }: ConnectWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 WebSocket 實例
  const { patchOutbound } = usePatchOutbound();

  const restartProjectOutbound = useCallback((messages: ProjectOutboundWsMessage[]) => {
    messages.forEach(async (message: ProjectOutboundWsMessage) => {
      if (mainActionType(message.action) === 'error') {
        // 如果收到的 Action 是 'error' 且外部設定 自動重新撥打，則重設狀態為 'start'
        console.log(`Project ${message.projectId} encountered an error, restarting...`);
        // 這裡可以添加重啟專案撥打的邏輯
        await patchOutbound(message.projectId, 'start')
      }
    });
  }, [patchOutbound]);

  // 建立 WebSocket 連線
  const connectWebSocket = useCallback(() => {
    if (!wsRef.current) {
      return console.error('WebSocket is not initialized');
    }

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
    };

    wsRef.current.onmessage = (event) => {
      // websocket 會回傳一個陣列，裡面是我送出專案撥打電話的請求 每隔 3 秒 回傳他撥打活躍的狀態
      const message = JSON.parse(event.data) as ProjectOutboundWsMessage[];
      console.log('WebSocket message received:', message);

      // 如果收到的 Action 是 'error' 且外部設定 自動重新撥打，則重設狀態為 'start'
      if (isAutoRestart) {
        restartProjectOutbound(message);
      }
      
      setProjectOutboundData(prevProjectOutboundData => {
        return prevProjectOutboundData.map((item) => {
          const findProject = message.find((project: ProjectOutboundWsMessage) => project.projectId === item.projectId);
          if (findProject) {
            // 更新專案狀態
            return {
              ...item,
              callStatus: mainActionType(findProject.action) === 'pause' ? 4 : 
              (mainActionType(findProject.action) === 'error' && !isAutoRestart) ? 3 : 1,
              projectCallState: findProject.action,
              projectCallData: findProject.projectCallData // 保持原有的撥打資料
            };
          }
          return {
            ...item,
            callStatus: 0, // 如果沒有找到對應的專案，則重置狀態
            projectCallState: 'init',
            projectCallData: null // 重置撥打資料
          };
        });
      });
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }, [isAutoRestart, setProjectOutboundData, restartProjectOutbound]);

  useEffect(() => {
    wsRef.current = new WebSocket(`${WS_HOST}/ws/projectOutbound`); // 初始化 WebSocket
    connectWebSocket();

    return () => {
      wsRef.current?.close(); // 清理 WebSocket 連線
    };
  }, [connectWebSocket]);
}