// import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
// import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef } from 'react';
import usePutOutbound from '../hooks/api/usePutOutbound';

import useGetOneBonsaleAutoDial from '../hooks/api/useGetOneBonsaleAutoDial';

// 取得本機 IP domain
const { hostname } = window.location;

const port = import.meta.env.VITE_API_PORT;
const ws_protocol = import.meta.env.VITE_WS_PROTOCOL;
const WS_HOST = `${ws_protocol}://${hostname}:${port}`;

type ConnectBonsaleWebHookWebSocketProps = {
  setProjectOutboundData: React.Dispatch<React.SetStateAction<ProjectOutboundDataType[]>>;
};

export default function useConnectBonsaleWebHookWebSocket({ setProjectOutboundData }: ConnectBonsaleWebHookWebSocketProps) {
  // 引入 自定義 API Hook
  const { putOutbound } = usePutOutbound();

  const { getOneBonsaleAutoDial } = useGetOneBonsaleAutoDial();

  const wsBonsaleWebHookRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 Bonsale WebHook WebSocket 實例

  // 建立 WebSocket 連線 Bonsale WebHook
const connectBonsaleWebHookWebSocket = useCallback(() => {
  if (!wsBonsaleWebHookRef.current) {
    return console.error('Bonsale WebHook WebSocket is not initialized');
  }

  wsBonsaleWebHookRef.current.onopen = () => {
    console.log('Bonsale WebHook WebSocket connection established');
  };

  wsBonsaleWebHookRef.current.onmessage = async (event) => {
    const message: BonsaleWebHook = JSON.parse(event.data);

    switch (message.type) {
      case 'auto-dial.created': {
        console.log('%c Received auto-dial.created message', 'font-size:16px; font-weight:bold', message);
        const { projectId, callFlowId } = message.body;

        // 取得單一專案外撥資料並新增
        const newBonsaleAutoDial = await getOneBonsaleAutoDial(projectId, callFlowId);

        console.log('newBonsaleAutoDial:', newBonsaleAutoDial);
        setProjectOutboundData(prevProjectOutboundData => {
          return [
            {
              appId: newBonsaleAutoDial.appId,
              appSecret: newBonsaleAutoDial.appSecret,
              callFlowId: newBonsaleAutoDial.callFlowId,
              projectId: newBonsaleAutoDial.projectId,
              projectName: newBonsaleAutoDial.projectInfo.projectName,
              startDate: newBonsaleAutoDial.projectInfo.startDate,
              endDate: newBonsaleAutoDial.projectInfo.endDate,
              callStatus: 0,
              extension: newBonsaleAutoDial.callFlow.phone,
              projectCallState: 'init',
              projectCallData: null, // 保持原有的撥打資料,
              isEnable: newBonsaleAutoDial.projectInfo.isEnable,
            } as ProjectOutboundDataType,
            ...prevProjectOutboundData
          ]
        });
        break;
      }
      case 'auto-dial.updated': {
        console.log('%c Received auto-dial.updated message', 'font-size:16px; font-weight:bold', message);

        const { projectId, callFlowId } = message.body;

        // 取得單一專案外撥資料並更新
        const oneBonsaleAutoDial = await getOneBonsaleAutoDial(projectId, callFlowId);

        setProjectOutboundData(prevProjectOutboundData => {
          return prevProjectOutboundData.map((item) => {
            // 需要同步更新後端那邊正在進行自動外播的專案資料
            if (item.callStatus !== 0) {
              (async () => {
                await putOutbound(
                  'client_credentials',
                  oneBonsaleAutoDial.appId,
                  oneBonsaleAutoDial.appSecret,
                  oneBonsaleAutoDial.callFlowId,
                  oneBonsaleAutoDial.projectId
                )
              })();
            }

            if (item.projectId === projectId) {
              // 更新專案狀態，補上 toCall 屬性
              return {
                appId: oneBonsaleAutoDial.appId,
                appSecret: oneBonsaleAutoDial.appSecret,
                callFlowId: oneBonsaleAutoDial.callFlowId,
                projectId: oneBonsaleAutoDial.projectId,
                projectName: oneBonsaleAutoDial.projectInfo.projectName,
                startDate: oneBonsaleAutoDial.projectInfo.startDate,
                endDate: oneBonsaleAutoDial.projectInfo.endDate,
                callStatus: item.callStatus, // 保持原有的 callStatus
                extension: oneBonsaleAutoDial.callFlow.phone,
                projectCallState: item.projectCallState, // 保持原有的撥打狀態
                projectCallData: item.projectCallData, // 保持原有的撥打資料,
                isEnable: oneBonsaleAutoDial.projectInfo.isEnable,
              };
            }
            return item;
          });
        });

        break;
      }
      case 'project.updated': {
        console.log('%c Received project.updated message', 'font-size:16px; font-weight:bold', message);
        const { Id: projectId, isEnable } = message.body;

        setProjectOutboundData(prevProjectOutboundData => {
          return prevProjectOutboundData.map((item) => {
            if (item.projectId === projectId) {
              // 更新專案狀態
              return {
                ...item,
                isEnable: isEnable
              };
            }
            return item;
          });
        });
        
        break;
      }
      default: {
        console.warn('Unknown message type:', message);
        return;
      }
    }
  };

  wsBonsaleWebHookRef.current.onerror = (error) => {
    console.error('Bonsale WebHook WebSocket error:', error);
  };

  wsBonsaleWebHookRef.current.onclose = () => {
    console.log('Bonsale WebHook WebSocket connection closed');
  };
}, [getOneBonsaleAutoDial, putOutbound, setProjectOutboundData]);

  useEffect(() => {
    wsBonsaleWebHookRef.current = new WebSocket(`${WS_HOST}/ws/bonsaleWebHook`); // 初始化 Bonsale WebHook WebSocket
    connectBonsaleWebHookWebSocket();

    return () => {
      wsBonsaleWebHookRef.current?.close(); // 清理 Bonsale WebHook WebSocket 連線
    };
  }, [connectBonsaleWebHookWebSocket]);
    
};