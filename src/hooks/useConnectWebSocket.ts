// import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
// import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef } from 'react';

import { mainActionType } from '../utils/mainActionType';

// 取得本機 IP domain
const { hostname } = window.location;

const port = import.meta.env.VITE_API_PORT;
const ws_protocol = import.meta.env.VITE_WS_PROTOCOL;
const WS_HOST = `${ws_protocol}://${hostname}:${port}`;

type ConnectWebSocketProps = {
  setProjectOutboundData: React.Dispatch<React.SetStateAction<ProjectOutboundDataType[]>>;
};

export default function useConnectWebSocket({ setProjectOutboundData }: ConnectWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 WebSocket 實例

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
      setProjectOutboundData(prevProjectOutboundData => {
        return prevProjectOutboundData.map((item) => {
          const findProject = message.find((project: ProjectOutboundWsMessage) => project.projectId === item.projectId);
          if (findProject) {
            // 更新專案狀態
            return {
              ...item,
              callStatus: mainActionType(findProject.action) === 'error' ? 3 : mainActionType(findProject.action) === 'pause' ? 4 : 1,
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
  }, [setProjectOutboundData]);

  useEffect(() => {
    wsRef.current = new WebSocket(`${WS_HOST}/ws/projectOutbound`); // 初始化 WebSocket
    connectWebSocket();

    return () => {
      wsRef.current?.close(); // 清理 WebSocket 連線
    };
  }, [connectWebSocket]);
}