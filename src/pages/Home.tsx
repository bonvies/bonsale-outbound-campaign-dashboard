import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { useNavigate } from 'react-router-dom'
import Project from './Project';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST || 'http://localhost:3020';
const WS_HOST = import.meta.env.VITE_WS_PORT_OUTBOUND_CAMPAIGM_V2 ||  'ws://localhost:3022';

type ProjectOutboundDataType = {
  appId: string
  appSecret: string
  projectId: string
  projectName: string
  callStatus: number
  extension: string
  projectCustomers: []
  phoneNumbers: [] // 專案中客戶的電話號碼
  currentCallIndex: number // 當前撥打的電話號碼索引
  projectCallState: string // 撥打狀態
  projectCallData: any // 撥打狀態
  
}

function Home() {
  const navigate = useNavigate();
  const ws = new WebSocket(WS_HOST);

  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  const getProjectOutboundData = useCallback(async () => {
    const queryString = new URLSearchParams({
      isEnable: '1',
      limit: '-1',
    });

    try {
      const response = await axios.get(`${HTTP_HOST}/bonsale/auto-dial?${queryString}`);
      const dataList = response.data.list;
      console.log('Project Auto Dial Data:', dataList);

      // 將資料轉換為符合專案撥打狀態的格式
      setProjectOutboundData(
        dataList.map(item => (
          {
            appId: item.appId,
            appSecret: item.appSecret,
            projectId: item.projectId,
            projectName: item.projectInfo.projectName,
            callStatus: 0,
            extension: item.callFlow.phone,
            projectCustomers: item.projectCustomers,
            phoneNumbers: [], // 初始化為空
            currentCallIndex: 0, 
            projectCallState: 'init', // 撥打狀態
            projectCallData: {}, // 初始化提示字 這邊一定初始狀態提示字 因為動態抓取變化時要有這邊的舊值做判斷依據
          }
        ))
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
  },[]);

  const getCallStatusInfo = (callStatus: number): { state: string; color: 'default' | 'warning' | 'success' | 'error' } => {
    switch (callStatus) {
      case 0:
        return { state: '未執行', color: 'default' };
      case 1:
        return { state: '執行中', color: 'warning' };
      case 2:
        return { state: '執行完成', color: 'success' };
      case 3:
        return { state: '執行失敗', color: 'error' };
      default:
        return { state: '未知狀態', color: 'default' };
    }
  };

  const starOutbound = async (projectId: string, phone: string, appId: string, appSecret: string): Promise<void> => {
    try {
      // 撥打電話
      const result = await axios.post(`${HTTP_HOST}/projectOutbound`, {
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
        phone: phone,
        projectId
      })
      return result.data;
    } catch (error) {
      console.error('Error starting outbound:', error);
    };
  };

  const handleStarOutbound = async (projectId: string, appId: string, appSecret: string) => {
    try {
      // 取得要撥打的電話號碼清單
      const customers = await axios.get(`${HTTP_HOST}/bonsale/project?projectIds=${projectId}`);
      const phoneNumbers = customers.data.list.map((customer) => customer.customer.phone);
      console.log('PhoneNumbers:', phoneNumbers);

      const toCall = await starOutbound(projectId, phoneNumbers[0], appId, appSecret);
      console.log('toCall:', toCall);

      // 撥打電話的時候 會回傳 一個 callid 我們可以利用這個 callid 來查詢當前的撥打狀態
      const { callid } = toCall?.currentCall?.result;
      console.log('callid:', callid);

      // 更新專案狀態為執行中
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === projectId ? { ...item, callStatus: 1, phoneNumbers, currentCallIndex: 0, currentCallId: callid } : item
        )
      );
    } catch (error) {
      console.error('Error in batch outbound:', error);
      // 更新專案狀態為執行失敗並清空 currentPhone
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === projectId ? { ...item, callStatus: 3 } : item
        )
      );
    }
  };

  const connectWebSocket = useCallback(() => {
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      // websocket 會回傳一個陣列，裡面是我送出專案撥打電話的請求 每隔 3 秒 回傳他撥打活躍的狀態
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      projectOutboundData.forEach((item) => {
        if (item.callStatus !== 1 ) return; // 如果專案狀態不是執行中，則不處理
        // 尋找當前專案的撥打資料
        const projectCallData = message.find((call: any) => {
          return call.projectId === item.projectId;
        });
        console.log('projectCallData:', projectCallData);

        // 更新專案狀態
        setProjectOutboundData(prev =>
          prev.map(prevItem =>
            prevItem.projectId === item.projectId ? 
            { 
              ...prevItem,
              projectCallState: projectCallData ? 'calling' :'waiting',
              projectCallData
            } : prevItem
          )
        );

        // 這邊是 item 的舊值，用於比較和更新專案的撥打狀態
        if (item.projectCallState === 'waiting') {
          setProjectOutboundData(prev => 
            prev.map(prevItem => {
              const nextCallIndex = prevItem.currentCallIndex + 1;
              if (prevItem.projectCallState === 'waiting') {
                if (prevItem.phoneNumbers.length < nextCallIndex) {
                  console.log('撥打電話號碼已經撥打完畢');
                  return {
                    ...prevItem,
                    callStatus: 2, // 更新專案狀態為執行完成
                    projectCallState: 'finish' // 更新撥打狀態
                  }
                }

                if(prevItem.phoneNumbers[nextCallIndex]) {
                  starOutbound(prevItem.projectId, prevItem.phoneNumbers[nextCallIndex], prevItem.appId, prevItem.appSecret);
                  console.log('撥打電話號碼:', prevItem.phoneNumbers[nextCallIndex]);
                }

                return {
                  ...prevItem,
                  currentCallIndex: nextCallIndex, // 將 currentCallIndex 增加
                  projectCallState: 'calling' 
                }
              }

              return prevItem.projectId === item.projectId
                ? { 
                    ...prevItem,
                    currentCallIndex: nextCallIndex, // 將 currentCallIndex 增加
                    projectCallState: 'waiting...' 
                  }
                : prevItem
              } 
            )
          );
        }
      })
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }, [projectOutboundData, ws]);

  useEffect(() => {
    getProjectOutboundData();
  }, [getProjectOutboundData]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      ws.close();
    }
  }, [connectWebSocket, ws]);
  
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell align='center' sx={{ width: '20px' }}>
            專案名稱
          </TableCell>
          <TableCell align='center' sx={{ width: '20px' }}>
            狀態
          </TableCell>
          <TableCell align='center' sx={{ width: '20px' }}>
            分機
          </TableCell>
          <TableCell align='center' sx={{ width: '20px' }}>
            動作
          </TableCell>
          <TableCell align='center' sx={{ width: '20px' }}>
            撥打狀況
          </TableCell>
          <TableCell align='center' sx={{ width: '20px' }}>
            詳細描述
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {projectOutboundData.map((item, index) => {
          const { state, color } = getCallStatusInfo(item.callStatus);
          return (
            <TableRow key={index}>
              <TableCell align='center'>
                {item.projectName}
              </TableCell>
              <TableCell align='center'>
                <Chip label={state} color={color} />
              </TableCell>
              <TableCell align='center'>
                {item.extension}
              </TableCell>
              <TableCell align='center'>
                {item.callStatus === 0 ? 
                  <IconButton onClick={() => handleStarOutbound(item.projectId, item.appId, item.appSecret) }>
                    <PlayArrowIcon />
                  </IconButton> : 
                  <IconButton>
                    {/* <PauseIcon />  */}
                  </IconButton> 
                }
                <IconButton onClick={() => navigate(`/project/${item.projectId}`)}>
                  <InfoOutlineIcon />
                </IconButton>
              </TableCell>
              <TableCell align='center'>
                索引: {item.currentCallIndex}  {/* 顯示當前撥打的電話號碼索引 */}
                狀態: {item.projectCallState} {/* 顯示當前撥打的狀態 */}
                撥打: {item.projectCallData?.phone || '-'} {/* 顯示當前撥打的電話號碼 */}
                {/* {item.phoneNumbers} */}
              </TableCell>
              <TableCell align='center'>
                {JSON.stringify(item.projectCallData)}
              </TableCell>
              
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default Home;