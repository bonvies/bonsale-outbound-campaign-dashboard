import axios from 'axios';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, Stack, Collapse, Typography, Box } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { useNavigate } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST || 'http://localhost:3020';
const WS_HOST = import.meta.env.VITE_WS_PORT_OUTBOUND_CAMPAIGM_V2 ||  'ws://localhost:3022';

function CustomerDetailsTable({ projectCustomersDesc }: { projectCustomersDesc: ProjectCustomersDesc[] }) {
  return (
    <Table size="small" sx={{ marginTop: '16px' }}>
      <TableHead>
        <TableRow>
          <TableCell>客戶姓名</TableCell>
          <TableCell>電話</TableCell>
          <TableCell>撥打狀態</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {projectCustomersDesc.map((desc, index) => (
          <TableRow key={index}>
            <TableCell>{desc.customer?.memberName || '未知'}</TableCell>
            <TableCell>{desc.customer?.phone || '無電話'}</TableCell>
            <TableCell>
            <Chip
              label={
                desc.callStatus === 0 ? '初始值' : 
                desc.callStatus === 1 ? '成功接通' :
                desc.callStatus === 2 ? '不成功接通' : 
                '未知的狀態'
              }
              color={
                desc.callStatus === 0 ? 'default' : 
                desc.callStatus === 1 ? 'success' :
                desc.callStatus === 2 ? 'error' : 
                'default'
              }
              size="small"
              sx={{ marginBottom: '4px' }}
            />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 WebSocket 實例

  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  const callStatusInfo = (callStatus: number): { state: string; color: 'default' | 'warning' | 'success' | 'error' } => {
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

  const currentCallShow = ( projectCustomers: ProjectCustomersDesc[], customerId: string) => {
    return (projectCustomers.find(item => item.customerId === customerId))?.customer?.memberName ?? '-';
  }

  const getProjectOutboundData = useCallback(async () => {
    try {
      const queryString = new URLSearchParams({
        isEnable: '1',
        limit: '-1',
      });
      const response = await axios.get(`${HTTP_HOST}/bonsale/auto-dial?${queryString}`);
      const dataList = response.data.list;
      // console.log('Project Auto Dial Data:', dataList);

      // 將資料轉換為符合專案撥打狀態的格式
      const updatedData = await Promise.all(
        dataList.map(async (item: Project) => {
          // 將專案中的客戶電話號碼提取出來
          const customers = await axios.get(`${HTTP_HOST}/bonsale/project?projectIds=${item.projectId}`);
          const projectCustomersDesc = customers.data.list.map((customer: Project) => customer);

          return {
            appId: item.appId,
            appSecret: item.appSecret,
            callFlowId: item.callFlowId,
            projectId: item.projectId,
            projectName: item.projectInfo.projectName,
            callStatus: 0,
            extension: item.callFlow.phone,
            projectCustomersDesc,
            currentCallIndex: 0, 
            projectCallState: 'init', // 撥打狀態
            projectCallData: null // 撥打資料,
          };
        })
      );
      setProjectOutboundData(updatedData);
      return response.data;
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
  },[]);

  const updateCallStatus = async (projectId: string, customerId: string, callStatus: number) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/bonsale/project/${projectId}/customer/${customerId}/callStatus`, { callStatus });
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  const updateDialUpdate = async (projectId: string, customerId: string) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/bonsale/project/${projectId}/customer/${customerId}/dialUpdate`, {});
      return response.data;
    } catch (error) {
      console.error('Error updating dial update:', error);
      throw error;
    }
  };

  const updateVisitRecord = async (
    projectId: string,
    customerId: string,
    visitType: 'intro' | 'quotation'| 'negotiation' | 'contract' | 'close',
    visitedUsername: string,
    visitedAt: string, 
    description: string,
    visitedResult: string,
    task?: {
      topic: string;
      description: string;
      remindAt: string;
    }
  ) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/bonsale/project/customer/visit`, {
        projectId, customerId, visitType, visitedUsername, visitedAt, description, visitedResult, task
      });
      return response.data;
    } catch (error) {
      console.error('Error updating interview record:', error);
      throw error;
    }
  };

  const starOutbound = async (projectId: string, customerId: string, phone: string, appId: string, appSecret: string): Promise<ToCallResponse> => {
    try {
      // 撥打電話
      const result = await axios.post(`${HTTP_HOST}/projectOutbound`, {
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
        phone: phone,
        projectId,
        customerId
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

  const handleStarOutbound = useCallback(async (project: ProjectOutboundDataType, appId: string, appSecret: string) => {
    // 如果是暫停的話 改變狀態就好 
    if (project?.callStatus === 4) {
      // 更新專案狀態為執行中
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === project.projectId ? { ...item, callStatus: 1 } : item
        )
      );
    }

    // 如果該專案是 未執行
    if (project?.callStatus === 0 || project?.callStatus === 1) {
      try {
        // 取得要撥打的資料
        const { projectId, callFlowId } = project;
        console.log('projectId:', projectId);
        console.log('callFlowId:', callFlowId);
 
        // 先取得 callStatus: 0 的資料
        const firstOutboundQueryString = new URLSearchParams({
          callFlowIdOutbound: callFlowId,
          projectIdOutbound: projectId,
          limit: '1',
          callStatus: '0',
        });
        const firstOutboundResult = await axios.get(`${HTTP_HOST}/bonsale/outbound?${firstOutboundQueryString}`);
        const firstOutboundData = firstOutboundResult.data.list ?? [];
 
        console.log(`%c firstOutboundData:${firstOutboundData}`,'color: red')

        if (firstOutboundData.length > 0) {
          // 如果有資料 就撥打電話
          const { phone } = firstOutboundData[0].customer; 
          const { projectId, customerId } = firstOutboundData[0]; 
          console.log('phone:', phone);
          console.log('projectId:', projectId);
          console.log('customerId:', customerId);
          const toCall: ToCallResponse = await starOutbound(projectId, customerId, phone, appId, appSecret);
  
          // 撥打電話的時候 會回傳 一個 callid 我們可以利用這個 callid 來查詢當前的撥打狀態
          const { callid } = toCall.currentCall?.result ?? {};
    
          // 更新專案狀態為執行中
          setProjectOutboundData(prev =>
            prev.map(item =>
              item.projectId === project.projectId ? { ...item, callStatus: 1, currentCallIndex: 0, currentCallId: callid } : item
            )
          );
  
        } else {
          // 如果沒有資料 就取得 callStatus: 2 的資料
          const secondOutboundQueryString = new URLSearchParams({
            callFlowIdOutbound: callFlowId,
            projectIdOutbound: projectId,
            limit: '1',
            callStatus: '2',
          });
          const secondOutboundResult = await axios.get(`${HTTP_HOST}/bonsale/outbound?${secondOutboundQueryString}`);
          const secondOutboundData = secondOutboundResult.data.list
          console.log(`%c secondOutboundData:${secondOutboundData}`,'color: blue')

          if (secondOutboundData.length > 0) {
            // 如果有資料 就撥打電話
            const { phone } = secondOutboundData[0].customer; 
            const { projectId, customerId } = secondOutboundData[0]; 
            const toCall: ToCallResponse = await starOutbound(projectId, customerId, phone, appId, appSecret);
    
            // 撥打電話的時候 會回傳 一個 callid 我們可以利用這個 callid 來查詢當前的撥打狀態
            const { callid } = toCall.currentCall?.result ?? {};
      
            // 更新專案狀態為執行中
            setProjectOutboundData(prev =>
              prev.map(item =>
                item.projectId === project.projectId ? { ...item, callStatus: 1, currentCallId: callid } : item
              )
            );
          }
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
    }
  },[]);

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

      setProjectOutboundData(prevProjectOutboundData => {
        return prevProjectOutboundData
          .map((item) => {
            if (item.callStatus !== 1) return item; // 如果專案狀態不是執行中，則不處理

            // 尋找當前專案的撥打資料
            const projectCallData = message.find((call: Call) => {
              return call.projectId === item.projectId;
            });
            // console.log('當前專案的撥打資料:', projectCallData);

            // 更新專案狀態
            if (projectCallData) {
              console.log('有撥打資料:', projectCallData);
              // 如果有撥打資料 則更新專案狀態為撥打中
              return {
                ...item,
                projectCallState: 'calling',
                projectCallData,
              }; 
            } else {
              console.log('沒有撥打資料');
              // 如果沒有撥打資料 代表之前的撥打通話已經結束了 要把先前記錄的 projectCallData 狀態寫回 bonsale 
              // 並且更新專案狀態為等待撥打

              // 將先前的撥打狀態記錄到 projectCustomersDesc 中
              const updatedCustomersDesc = [...item.projectCustomersDesc];
              // 找到之前記錄在專案的撥打資料 
              if (!item.projectCallData) {
                console.log('%c 找不到之前的撥打資料','color: blue');
                // 找不到之前的撥打資料 代表說 有可能進入到 secondOutbound 去播撥打失敗的人
                // 但是又因為有撥打失敗等待時間 所以 在這邊 我需要 secondOutboundResult
                // 取得 callStatus: 2 的資料
                const { projectId, callFlowId } = item;
                const secondOutboundQueryString = new URLSearchParams({
                  callFlowIdOutbound: callFlowId,
                  projectIdOutbound: projectId,
                  limit: '1',
                  callStatus: '2',
                });
                axios.get(`${HTTP_HOST}/bonsale/outbound?${secondOutboundQueryString}`)
                  .then((secondOutboundResult) => {
                    const secondOutboundData = secondOutboundResult.data.list
                    console.log(`%c secondOutboundData:${secondOutboundData}`,'color: blue')
          
                    if (secondOutboundData.length > 0) {
                      // 如果有資料 就撥打電話
                      handleStarOutbound(item, item.appId, item.appSecret);
                    }
                  })
                  .catch((error) => {
                    console.error('Error fetching second outbound data:', error);
                  });
                // 如果沒有資料 就不做任何事
                return item;
              }

              const prevCustomersDesc = updatedCustomersDesc.find(customersDesc => {
                return item.projectCallData && customersDesc.customerId === item.projectCallData.customerId;
              }) 
              console.log('之前的撥打資料:', prevCustomersDesc);
              if (!prevCustomersDesc) return item;
              
              // 發送 API 請求到後端，更新撥打狀態...
              const updatePromises = [
                updateCallStatus(
                  prevCustomersDesc.projectId,
                  prevCustomersDesc.customerId,
                  item.projectCallData?.activeCall?.Status === 'Talking' ? 1 : 2, // 更新撥打狀態為初始值
                )
              ];

              if (prevCustomersDesc.callStatus === 2) {
                console.log('撥打狀態為不成功接通', prevCustomersDesc);
                // 如果撥打狀態為不成功接通 要發送 API 更新 dialUpdate
                updatePromises.push(
                  updateDialUpdate(
                    prevCustomersDesc.projectId,
                    prevCustomersDesc.customerId
                  )
                );
              } else if (prevCustomersDesc.callStatus === 1) {
                console.log('撥打狀態為成功接通', prevCustomersDesc);
                // 如果撥打狀態為成功接通 要發送 API 更新 訪談紀錄
                if (!item.projectCallData?.activeCall?.LastChangeStatus) throw new Error('LastChangeStatus is undefined'); 
                updatePromises.push(
                  updateVisitRecord(
                    prevCustomersDesc.projectId,
                    prevCustomersDesc.customerId,
                    'intro',
                    'admin',
                    item.projectCallData?.activeCall?.LastChangeStatus,
                    '撥打成功',
                    '撥打成功'
                  )
                );
              }

              // 等待所有的 API 請求完成
              Promise.all(updatePromises)
                .then(() => {
                  // 當所有的 API 請求完成後，再次撥打電話
                  console.log('所有的 API 請求完成, 再次撥打電話');
                  handleStarOutbound(item, item.appId, item.appSecret); 
                })
                .catch(error => {
                  console.error('Error in updating records:', error);
                });

              // 將先前的撥打狀態記錄到 projectCustomersDesc 中
              const updatedCustomersDescFindIdex = updatedCustomersDesc.findIndex(customersDesc => {
                return item.projectCallData && customersDesc.customerId === item.projectCallData.customerId;
              })
              updatedCustomersDesc[updatedCustomersDescFindIdex] = {
                ...prevCustomersDesc,
                callStatus: item.projectCallData?.activeCall?.Status === 'Talking' ? 1 : 2, // 更新撥打狀態為初始值
              };
              return {
                ...item,
                projectCallState: 'waiting',
                projectCallData,
                projectCustomersDesc: updatedCustomersDesc,
              };
            }
          });
      });
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }, [handleStarOutbound]);

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({}); // 用於跟踪每行的展開狀態

  const toggleRow = (projectId: string) => {
    setOpenRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // 打印出來看資料格式
  // useEffect(() => {
  //   console.log('projectOutboundData:', projectOutboundData);
  // }, [projectOutboundData]);

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
        {projectOutboundData.map((item) => {
          const { state, color } = callStatusInfo(item.callStatus);
          const isOpen = openRows[item.projectId] || false;

          return (
            <Fragment key={item.projectId}>
              <TableRow key={item.projectId}>
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
                      label={`狀態: ${
                        item.projectCallState === 'init' ? '準備撥打' : 
                        item.projectCallState === 'waiting' ? '等待撥打' : 
                        item.projectCallState === 'calling' ? '撥打中' : 
                        item.projectCallState === 'finish' ? '撥打完成' : 
                        item.projectCallState
                      }`}
                      color={item.projectCallState === 'calling' ? 'primary' : 'default'}
                      size="small"
                      sx={{ marginBottom: '4px' }}
                      />
                    <Chip
                      label={`撥打給: ${currentCallShow(item.projectCustomersDesc, item.projectCallData?.customerId || '-')} | ${item.projectCallData?.phone || '-'}`}
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
                      <Chip
                        label={`Customer ID: ${item.projectCallData.customerId || '-'}`}
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
                <TableCell colSpan={7} sx={{ paddingBottom: 0, paddingTop: 0 }}>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '16px' }}>
                      <Typography variant="h6" gutterBottom>
                        詳細資訊
                      </Typography>
                      <CustomerDetailsTable projectCustomersDesc={item.projectCustomersDesc} />
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};