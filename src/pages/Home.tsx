// import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
// import { useNavigate } from 'react-router-dom'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  // Collapse,
  // Typography,
  Box,
  Switch,
  Button,
  LinearProgress,
  Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

import GlobalSnackbar, { GlobalSnackbarRef } from '../components/GlobalSnackbar';
import ProjectCustomersDialog from '../components/ProjectCustomersDialog';

import useProjectOutboundData from '../hooks/useProjectOutboundData';
import usePostOutbound from '../hooks/api/usePostOutbound';
import usePatchOutbound from '../hooks/api/usePatchOutbound';
import usePutOutbound from '../hooks/api/usePutOutbound';
import useUpdateProject from '../hooks/api/useUpdateProject';

import { mainActionType } from '../utils/mainActionType';

import useGetOneBonsaleAutoDial from '../hooks/api/useGetOneBonsaleAutoDial';

// 取得本機 IP domain
const { hostname } = window.location;

const port = import.meta.env.VITE_API_PORT;
const ws_protocol = import.meta.env.VITE_WS_PROTOCOL;
const WS_HOST = `${ws_protocol}://${hostname}:${port}`;

export default function Home() {
  // 引入 自定義 API Hook
  const { postOutbound } = usePostOutbound();
  const { patchOutbound } = usePatchOutbound();
  const { putOutbound } = usePutOutbound();
  const { updateProject } = useUpdateProject();

  const { getOneBonsaleAutoDial } = useGetOneBonsaleAutoDial();

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null); // 用於跟踪當前展開的專案 ID

  const handleExpandClick = (isOpen: boolean, projectId?: string) => {
    if (isOpen && projectId) {
      setExpandedProjectId(projectId);
    } else {
      setExpandedProjectId(null);
    }
  }

  const wsBonsaleWebHookRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 Bonsale WebHook WebSocket 實例
  const wsRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 WebSocket 實例

  const snackbarRef = useRef<GlobalSnackbarRef>(null);

  const { projectOutboundData, setProjectOutboundData } = useProjectOutboundData();

  // 開始撥打電話
  const startOutbound = async (projectId: string, callFlowId: string, appId: string, appSecret: string, action: 'active' | 'active' | 'start' | 'stop' | 'pause' | 'calling' | 'waiting' | 'recording') => {
    await postOutbound(projectId, callFlowId, appId, appSecret, action);
  };

  // 暫停撥打電話
  const pauseOutbound = async (projectId: string) => {
    await patchOutbound(projectId, 'pause');
  };

  // 停止撥打電話
  const stopOutbound = async (projectId: string) => {
    await patchOutbound(projectId, 'stop');
  };

  const handleStartOutbound = (project: ProjectOutboundDataType) => {
    if (project.callStatus === 0) {
      startOutbound(
        project.projectId,
        project.callFlowId,
        project.appId,
        project.appSecret,
        'active'
      );
    } else if (project.callStatus === 4) {
      patchOutbound(
        project.projectId,
        'start'
      );
    } else {
      throw new Error('handleStartOutbound - Invalid project call status');
    }
  };

  const handlePauseOutbound = (projectId: string) => {
    pauseOutbound(projectId);
  };

  const handleStopOutbound = (projectId: string) => {
    stopOutbound(projectId);
  };

  const handleAllProjectStartOutbound = async () => {
    setProjectOutboundData(prev =>
      prev.map(item =>
        item.isEnable ? { ...item, callStatus: 1 } : item
      )
    );
  }

  const handleToggleProject = async (project: ProjectOutboundDataType) => {
    const { projectId, isEnable } = project;
    await updateProject(projectId, JSON.stringify(!isEnable))
    setProjectOutboundData(prev => 
      prev.map(item => {
        if (item.projectId === projectId) {
          (async () => {
            try {
              setProjectOutboundData(prevInner =>
                prevInner.map(innerItem =>
                  innerItem.projectId === projectId
                    ? { ...innerItem, isEnable: !isEnable }
                    : innerItem
                )
              );
            } catch (error) {
              console.error('Error fetching project customers:', error);
            }
          })();
          return { ...item, isEnable: !isEnable }; // 先切換 isEnable，projectCustomersDesc 由上面 async 處理
        }
        return item;
      })
    );
  };

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
}, [getOneBonsaleAutoDial, setProjectOutboundData]);

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

    wsBonsaleWebHookRef.current = new WebSocket(`${WS_HOST}/ws/bonsaleWebHook`); // 初始化 Bonsale WebHook WebSocket
    connectBonsaleWebHookWebSocket();

    return () => {
      wsRef.current?.close(); // 清理 WebSocket 連線
      wsBonsaleWebHookRef.current?.close(); // 清理 Bonsale WebHook WebSocket 連線
    };
  }, [connectBonsaleWebHookWebSocket, connectWebSocket]);

  // 為了避免用戶重新整理導致撥號中斷而設置的警告
  useEffect(() => {
    const unloadCallback = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // Chrome requires this to show the confirmation dialog
      return ""; // For other browsers
    };

    window.addEventListener("beforeunload", unloadCallback);
    return () => window.removeEventListener("beforeunload", unloadCallback);
  }, []);
    
  return (
    <>
      <GlobalSnackbar ref={snackbarRef} />
      <Stack 
        direction='row'
        spacing={2}
        alignItems='center'
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingY: 2,
          borderBottom: '1px solid #eee',
        }}
      >
        <Button 
          variant="contained" 
          onClick={handleAllProjectStartOutbound}
          sx={{
            margin: '12px 0',
            minWidth: '100px',
            bgcolor: (theme) => theme.palette.secondary.main, 
          }}
        >
          全部執行
        </Button> 
        <Alert severity="warning">
          自動外撥專案執行期間暫停動作時，會同步掛斷當前通話，請警慎使用。
        </Alert>
      </Stack>
      <Box sx={{ height: '100%', maxHeight:'100%', overflowY: 'scroll' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell align='center' sx={{ width: '20px' }}>
                啟用專案
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                專案名稱
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                狀態
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                分機
              </TableCell>
              <TableCell align='center' sx={{ width: '30px' }}>
                <Stack direction='row' alignItems='center' justifyContent='center'>
                  動作 
                </Stack>
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                撥打狀況
              </TableCell>
                <TableCell align='center' sx={{ width: '250px' }}>
                撥打詳細描述
                </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{  backgroundColor: 'white' }}>
            {
              projectOutboundData.length === 0 && 
                <TableRow>
                  <TableCell colSpan={8} sx={{ padding: 0 }}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
            }
            {projectOutboundData.map((item, index) => {

              return (
                <Fragment key={item.projectId + index}>
                  <TableRow 
                    key={item.projectId}
                    sx={{
                      backgroundColor: item.callStatus === 4 ? '#f5f5f5' : 'inherit',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    <TableCell>
                      <Switch 
                        checked={item.isEnable}
                        onChange={() => handleToggleProject(item)}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      {item.projectName}
                    </TableCell>
                    <TableCell align='center'>
                      <Chip label={
                        item.callStatus === 0 ? '未執行' :
                        item.callStatus === 1 ? '執行中' :
                        item.callStatus === 2 ? '執行完成' :
                        item.callStatus === 3 ? '執行失敗' :
                        item.callStatus === 4 ? '暫停執行' :
                        '未知狀態'
                      } sx={{ 
                        marginBottom: '4px',
                        color: () => 
                          item.callStatus === 1  || 
                          item.callStatus === 2 
                          ? 'white' : 'black',
                        bgcolor: (theme) => 
                          item.callStatus === 0 ? theme.palette.primary.color50 :
                          item.callStatus === 1 ? theme.palette.primary.main :
                          item.callStatus === 2 ? theme.palette.primary.dark :
                          item.callStatus === 3 ? theme.palette.error.main :
                          item.callStatus === 4 ? theme.palette.warning.main :
                          theme.palette.warning.light
                      }} />
                    </TableCell>
                    <TableCell align='center'>
                      {item.extension}
                    </TableCell>
                    <TableCell align='center'>
                      {item.isEnable ? 
                        <Stack direction='row'>
                          {item.callStatus === 0 || item.callStatus === 4 ? 
                            <IconButton 
                              onClick={() => handleStartOutbound(item)}
                            >
                              <PlayArrowIcon />
                            </IconButton> : 
                            item.callStatus === 3 ? 
                              <IconButton 
                                onClick={() => handleStartOutbound(item)}
                              >
                                <RestartAltIcon />
                              </IconButton> : 
                              <IconButton 
                                onClick={() => handlePauseOutbound(item.projectId) }
                                // disabled={item.projectCallData?.activeCall?.Status === 'Talking'} // 目前暫停同時也會發送掛斷電話請求, 3cx 會因為 的狀態為 agents 而限制掛斷功能 ( 回傳 403 ) 
                                sx={{display: item.callStatus === 2 ? 'none' : 'block'}}
                              >
                                <PauseIcon /> 
                              </IconButton> 
                          }
                          <IconButton 
                            onClick={() => handleStopOutbound(item.projectId)}
                            disabled={item.callStatus === 0}
                          >
                            <StopIcon /> 
                          </IconButton> 
                          <IconButton 
                            onClick={() => handleExpandClick(true, item.projectId)}
                          >
                            <InfoOutlineIcon /> 
                          </IconButton> 
                        </Stack>
                      : null}
                    </TableCell>
                    <TableCell align='left'>
                      <Stack>
                        <Chip
                          label={`狀態: ${
                            mainActionType(item.projectCallState) === 'init' ? '準備撥打' :
                            mainActionType(item.projectCallState) === 'active' ? '準備撥打' : 
                            mainActionType(item.projectCallState) === 'start' ? '開始撥號' :
                            mainActionType(item.projectCallState) === 'pause' ? '暫停撥打' :
                            mainActionType(item.projectCallState) === 'stop' ? '停止撥打' :
                            mainActionType(item.projectCallState) === 'waiting' ? '等待撥打' : 
                            mainActionType(item.projectCallState) === 'error' ? '撥打錯誤' :
                            mainActionType(item.projectCallState) === 'recording' ? '撥打記錄' :
                            mainActionType(item.projectCallState) === 'calling' ? '撥打中' : 
                            mainActionType(item.projectCallState) === 'finish' ? '撥打完成' : 
                            mainActionType(item.projectCallState)
                          }`}
                          size="small"
                          sx={{ 
                            marginBottom: '4px',
                            color: () => 
                              mainActionType(item.projectCallState) === 'calling' || 
                              mainActionType(item.projectCallState) === 'finish' 
                              ? 'white' : 'black',
                            bgcolor: (theme) => 
                              mainActionType(item.projectCallState) === 'active' ? theme.palette.warning.color50 :
                              mainActionType(item.projectCallState) === 'calling' ? theme.palette.warning.main :
                              mainActionType(item.projectCallState) === 'waiting' ? theme.palette.warning.color300 :
                              mainActionType(item.projectCallState) === 'error' ? theme.palette.error.main :
                              mainActionType(item.projectCallState) === 'recording' ? theme.palette.success.color300 :
                              mainActionType(item.projectCallState) === 'finish' ? theme.palette.success.color700 :
                              'default'
                          }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align='left'>
                      {item.projectCallData ? (
                        <Stack>
                          <Chip
                            label={`Phone: ${item.projectCallData.phone || '-'}`}
                            variant="outlined"
                            size="small"
                            sx={{ marginBottom: '4px' }}
                          />
                          {item.projectCallData.activeCall && (
                            <Stack sx={{ marginTop: '8px', width: '100%' }}>
                              <Chip
                                label={`Caller: ${item.projectCallData.activeCall.Caller || '-'}`}
                                variant="filled"
                                size="small"
                                sx={{ 
                                  marginBottom: '4px',
                                  bgcolor: (theme) => theme.palette.primary.color100,
                                }}
                              />
                              <Chip
                                label={`Callee: ${item.projectCallData.activeCall.Callee || '-'}`}
                                variant="filled"
                                size="small"
                                sx={{ 
                                  marginBottom: '4px',
                                  bgcolor: (theme) => theme.palette.primary.color50,
                                }}
                              />
                              <Chip
                                label={`Status: ${item.projectCallData.activeCall.Status || '-'}`}
                                color={item.projectCallData.activeCall.Status === 'Routing' ? 'primary' : 'default'}
                                size="small"
                                sx={{ 
                                  marginBottom: '4px',
                                  bgcolor: (theme) => 
                                    item.projectCallData?.activeCall?.Status === 'Routing' ? theme.palette.warning.main :
                                    item.projectCallData?.activeCall?.Status === 'Talking' ? theme.palette.success.color700 :
                                    theme.palette.primary.color50
                                }}
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
                </Fragment>
              );
            })}
          </TableBody>
        </Table> 
      </Box>
      <ProjectCustomersDialog onOpen={Boolean(expandedProjectId)} onClose={()=>{handleExpandClick(false)}} projectId={expandedProjectId}/>
    </>
  );
};