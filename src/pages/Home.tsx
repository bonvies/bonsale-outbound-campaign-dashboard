import axios from 'axios';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, Stack, Collapse } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { useNavigate } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST || 'http://localhost:3020';
const WS_HOST = import.meta.env.VITE_WS_PORT_OUTBOUND_CAMPAIGM_V2 ||  'ws://localhost:3022';

function Home() {
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 WebSocket 實例

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
        dataList.map((item: Project) => (
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
            projectCallData: null // 撥打資料,
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
      case 4:
        return { state: '暫停執行', color: 'warning' };
      default:
        return { state: '未知狀態', color: 'default' };
    }
  };

  const starOutbound = async (projectId: string, phone: string, appId: string, appSecret: string): Promise<ToCallResponse> => {
    try {
      // 撥打電話
      const result = await axios.post(`${HTTP_HOST}/projectOutbound`, {
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
        phone: phone,
        projectId
      })
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error starting outbound:', error);
      throw error;
    };
  };

  const pauseOutbound = (projectId: string) => {
    const project = projectOutboundData.find(item => item.projectId === projectId);
    if (project) {
      // 更新專案狀態為暫停
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === projectId ? { ...item, callStatus: 4 } : item
        )
      );
    }
  };

  const handleStarOutbound = async (project: ProjectOutboundDataType, appId: string, appSecret: string) => {
    try {
      // 這邊是從未執行開始的行為
      // 取得要撥打的電話號碼清單
      const customers = await axios.get(`${HTTP_HOST}/bonsale/project?projectIds=${project.projectId}`);
      const phoneNumbers = customers.data.list.map((customer: Project) => customer.customer.phone);
      console.log('PhoneNumbers:', phoneNumbers);

      // 找到該專案

      if (project?.callStatus === 0) {
        try {
          const toCall: ToCallResponse = await starOutbound(project.projectId, phoneNumbers[0], appId, appSecret);

          // 撥打電話的時候 會回傳 一個 callid 我們可以利用這個 callid 來查詢當前的撥打狀態
          const { callid } = toCall.currentCall?.result ?? {};
    
          // 更新專案狀態為執行中
          setProjectOutboundData(prev =>
            prev.map(item =>
              item.projectId === project.projectId ? { ...item, callStatus: 1, phoneNumbers, currentCallIndex: 0, currentCallId: callid } : item
            )
          );
          return;
        } catch (error) {
          console.error('Error fetching project customers:', error);
          // 更新專案狀態為執行失敗並清空 currentPhone
          setProjectOutboundData(prev =>
            prev.map(item =>
              item.projectId === project.projectId ? { ...item, callStatus: 3 } : item
            )
          );
          return;
        }
      } else {
        // 這邊是從暫停開始的行為
        setProjectOutboundData(prev =>
          prev.map(item =>
            item.projectId === project.projectId ? { ...item, callStatus: 1, phoneNumbers } : item
          )
        );
      }

    } catch (error) {
      console.error('Error in batch outbound:', error);
      // 更新專案狀態為執行失敗並清空 currentPhone
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === project.projectId ? { ...item, callStatus: 3 } : item
        )
      );
    }
  };

  const handlePauseOutbound = (projectId: string) => {
    pauseOutbound(projectId);
  }

  const connectWebSocket = useCallback(() => {
    if (!wsRef.current) {
      console.error('WebSocket is not initialized');
      return;
    }

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
    };

    wsRef.current.onmessage = (event) => {
      // websocket 會回傳一個陣列，裡面是我送出專案撥打電話的請求 每隔 3 秒 回傳他撥打活躍的狀態
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      projectOutboundData.forEach((item) => {
        if (item.callStatus !== 1 ) return; // 如果專案狀態不是執行中，則不處理
        // 尋找當前專案的撥打資料
        const projectCallData = message.find((call: Call) => {
          console.log('call:', call);
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

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }, [projectOutboundData]);

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({}); // 用於跟踪每行的展開狀態

  const toggleRow = (projectId: string) => {
    setOpenRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  useEffect(() => {
    getProjectOutboundData();
  }, [getProjectOutboundData]);

  useEffect(() => {
    wsRef.current = new WebSocket(WS_HOST); // 初始化 WebSocket
    connectWebSocket();

    return () => {
      wsRef.current?.close(); // 清理 WebSocket 連線
    };
  }, [connectWebSocket]);
  
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={{ width: '20px' }} />
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
            <TableCell align='center' sx={{ width: '400px' }}>
            撥打詳細描述
            </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {projectOutboundData.map((item, index) => {
          const { state, color } = getCallStatusInfo(item.callStatus);
          const isOpen = openRows[item.projectId] || false;

          return (
            <Fragment key={index}>
              <TableRow key={index}>
                <TableCell align="center">
                  <IconButton onClick={() => toggleRow(item.projectId)}>
                    {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                </TableCell>
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
                  <Stack direction='row'>
                    {item.callStatus === 0 || item.callStatus === 4 ? 
                      <IconButton 
                        onClick={() => handleStarOutbound(item, item.appId, item.appSecret)}
                      >
                        <PlayArrowIcon />
                      </IconButton> : 
                      <IconButton 
                        onClick={() => handlePauseOutbound(item.projectId) }
                        disabled={item.projectCallState !== 'calling' || !item.projectCallData?.activeCall}
                        sx={{display: item.callStatus === 2 ? 'none' : 'block'}}
                      >
                        <PauseIcon /> 
                      </IconButton> 
                    }
                    <IconButton onClick={() => navigate(`/project/${item.projectId}`)}>
                      <InfoOutlineIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
                <TableCell align='left'>
                  <Stack>
                    <Chip
                      label={
                        item.phoneNumbers?.length < item.currentCallIndex + 1 ? '門號序列' :  
                        `第 ${item.currentCallIndex + 1} 隻門號`
                      }
                      variant="outlined"
                      size="small"
                      sx={{ marginBottom: '4px' }}
                    />
                    <Chip
                      label={`狀態: ${
                        item.projectCallState === 'init' ? '準備撥打' : 
                        item.projectCallState === 'waiting' ? '等待撥打' : 
                        item.projectCallState === 'waiting...' ? '等待撥打...' :
                        item.projectCallState === 'calling' ? '撥打中' : 
                        item.projectCallState === 'finish' ? '撥打完成' : 
                        item.projectCallState
                      }`}
                      color={item.projectCallState === 'calling' ? 'primary' : 'default'}
                      size="small"
                      sx={{ marginBottom: '4px' }}
                      />
                    <Chip
                      label={`撥打給: ${item.projectCallData?.phone || '-'}`}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </TableCell>
                <TableCell align='left'>
                  {item.projectCallData ? (
                    <Stack>
                      <Chip
                        label={`Request ID: ${item.projectCallData.requestId || '-'}`}
                        variant="outlined"
                        size="small"
                        sx={{ marginBottom: '4px' }}
                      />
                      <Chip
                        label={`Phone: ${item.projectCallData.phone || '-'}`}
                        variant="outlined"
                        size="small"
                        sx={{ marginBottom: '4px' }}
                      />
                      <Chip
                        label={`Project ID: ${item.projectCallData.projectId || '-'}`}
                        variant="outlined"
                        size="small"
                        sx={{ marginBottom: '4px' }}
                      />
                      {item.projectCallData.activeCall && (
                        <Stack sx={{ marginTop: '8px', width: '100%' }}>
                          <Chip
                            label={`Caller: ${item.projectCallData.activeCall.Caller || '-'}`}
                            variant="outlined"
                            size="small"
                            sx={{ marginBottom: '4px' }}
                          />
                          <Chip
                            label={`Callee: ${item.projectCallData.activeCall.Callee || '-'}`}
                            variant="outlined"
                            size="small"
                            sx={{ marginBottom: '4px' }}
                          />
                          <Chip
                            label={`Status: ${item.projectCallData.activeCall.Status || '-'}`}
                            color={item.projectCallData.activeCall.Status === 'Routing' ? 'primary' : 'default'}
                            size="small"
                            sx={{ marginBottom: '4px' }}
                          />
                          <Chip
                            label={`Last Change: ${new Date(item.projectCallData.activeCall.LastChangeStatus).toLocaleString() || '-'}`}
                            variant="outlined"
                            size="small"
                            sx={{ marginBottom: '4px' }}
                          />
                          <Chip
                            label={`Established At: ${new Date(item.projectCallData.activeCall.EstablishedAt).toLocaleString() || '-'}`}
                            variant="outlined"
                            size="small"
                            sx={{ marginBottom: '4px' }}
                          />
                          <Chip
                            label={`Server Time: ${new Date(item.projectCallData.activeCall.ServerNow).toLocaleString() || '-'}`}
                            variant="outlined"
                            size="small"
                          />
                        </Stack>
                      )}
                    </Stack>
                  ) : (
                    <Chip label="No Data" variant="outlined" size="small" />
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={7} style={{ paddingBottom: 0, paddingTop: 0 }}>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <div style={{ margin: '16px' }}>
                      <strong>詳細資訊:</strong>
                      <pre>{JSON.stringify(item, null, 2)}</pre>
                    </div>
                  </Collapse>
                </TableCell>
              </TableRow>      
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default Home;