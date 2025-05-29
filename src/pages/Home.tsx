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
  Collapse,
  Typography,
  Box,
  Switch,
  Button,
  LinearProgress,
  Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
// import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
// import { useNavigate } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import GlobalSnackbar, { GlobalSnackbarRef } from '../components/GlobalSnackbar';

import useProjectOutboundData from '../hooks/useProjectOutboundData';
import useUpdateCallStatus from '../hooks/api/useUpdateCallStatus';
import useUpdateDialUpdate from '../hooks/api/useUpdateDialUpdate';
import useUpdateVisitRecord from '../hooks/api/useUpdateVisitRecord';
import useActiveOutbound from '../hooks/api/useActiveOutbound';
import useFetchOutboundData from '../hooks/api/useFetchOutboundData';
import useUpdateProject from '../hooks/api/useUpdateProject';
import useUpdateBonsaleProjectAutoDialExecute from '../hooks/api/useUpdateBonsaleProjectAutoDialExecute';
import useGetBonsaleProject from '../hooks/api/useGetBonsaleProject';
import useGetOneBonsaleAutoDial from '../hooks/api/useGetOneBonsaleAutoDial';
import useHangup3cx from '../hooks/api/useHangup3cx';

import useThrottle from '../hooks/useThrottle';

const WS_HOST = import.meta.env.VITE_WS_HOST;

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
  // 引入 自定義 API Hook
  const { updateCallStatus } = useUpdateCallStatus();
  const { updateDialUpdate } = useUpdateDialUpdate();
  const { updateVisitRecord } = useUpdateVisitRecord();
  const { activeOutbound } = useActiveOutbound();
  const { fetchOutboundData } = useFetchOutboundData();
  const { updateProject } = useUpdateProject();
  const { updateBonsaleProjectAutoDialExecute } = useUpdateBonsaleProjectAutoDialExecute();
  const { getBonsaleProject } = useGetBonsaleProject();
  const { getOneBonsaleAutoDial } = useGetOneBonsaleAutoDial();
  const { Hangup3cx } = useHangup3cx();

  const wsBonsaleWebHookRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 Bonsale WebHook WebSocket 實例
  const wsRef = useRef<WebSocket | null>(null); // 使用 useRef 管理 WebSocket 實例

  const snackbarRef = useRef<GlobalSnackbarRef>(null);

  const { projectOutboundData, setProjectOutboundData } = useProjectOutboundData();

  const currentCallShow = ( projectCustomers: ProjectCustomersDesc[], customerId: string) => {
    return (projectCustomers.find(item => item.customerId === customerId))?.customer?.memberName ?? '-';
  }

  // 開始撥打電話
  const startOutbound = (projectId: string) => {
    const project = projectOutboundData.find(item => item.projectId === projectId);
    if (project) {
      // 更新專案狀態為執行中
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === projectId ? { ...item, callStatus: 1 } : item
        )
      );
    }
  };

  // 暫停撥打電話
  const pauseOutbound = async (projectId: string) => {
    const project = projectOutboundData.find(item => item.projectId === projectId);
    if (project) {
      // 掛斷當前電話
      const { toCall } = project;
      if (toCall) {
        const mackCallId = toCall.currentCall?.result?.id;
        const dnnumber = toCall.currentCall?.result?.dn;
        const token_3cx = toCall.token_3cx;
        if (!dnnumber || !mackCallId || !token_3cx) {
          console.error('dnnumber 或 mackCallId 或 token_3cx 為空值');
          return;
        }
        if (project.projectCallData?.activeCall?.Status !== 'Talking') { 
          // 目前暫停同時也會發送掛斷電話請求, 3cx 會因為 的狀態為 agents 而限制掛斷功能 ( 回傳 403 ) 
          await Hangup3cx(dnnumber, mackCallId, token_3cx);
          console.log('%c 掛斷電話','color: red');
          // 更新專案狀態為暫停
          setProjectOutboundData(prev =>
            prev.map(item =>
              item.projectId === projectId ? { ...item, callStatus: 4, projectCallState: 'hangup' } : item
            )
          );
        } else {
          // 調用 snackbar
          snackbarRef.current?.showSnackbar('因有通話進行 所以暫停無法掛斷電話', 'warning');
          console.log('%c 因有通話進行 所以暫停無法掛斷電話','color: red');
          // 更新專案狀態為暫停
          setProjectOutboundData(prev =>
            prev.map(item =>
              item.projectId === projectId ? { ...item, callStatus: 4 } : item
            )
          );
        }

        return;
      } 
      
      // 更新專案狀態為暫停
      setProjectOutboundData(prev =>
        prev.map(item =>
          item.projectId === projectId ? { ...item, callStatus: 4 } : item
        )
      );
    }
  };

  const autoOutbound = useCallback(async (project: ProjectOutboundDataType, appId: string, appSecret: string) => {
    // 如果是執行失敗的話 改變狀態就好 讓程序再次嘗試撥打 
    if ( project?.callStatus === 3 ) {
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

        // 使用 fetchOutboundData 取得 callStatus: 0 的資料
        const firstOutboundData = await fetchOutboundData({
          callFlowIdOutbound: callFlowId,
          projectIdOutbound: projectId,
          limit: '1',
          callStatus: '0',
        });
 
        console.log(`%c firstOutboundData:${firstOutboundData}`,'color: red')

        if (firstOutboundData.length > 0) {
          // 如果有資料 就撥打電話
          const { phone } = firstOutboundData[0].customer; 
          const { projectId, customerId } = firstOutboundData[0]; 
          console.log('phone:', phone);
          console.log('projectId:', projectId);
          console.log('customerId:', customerId);
          const toCall: ToCallResponse = await activeOutbound(projectId, customerId, phone, appId, appSecret);
  
          // 撥打電話的時候 會回傳 一個 callid 我們可以利用這個 callid 來查詢當前的撥打狀態
          const { callid } = toCall.currentCall?.result ?? {};
    
          // 更新專案狀態為執行中 且更新 currentCallId
          setProjectOutboundData(prev =>
            prev.map(item =>
              item.projectId === project.projectId ? { ...item, callStatus: 1, currentCallIndex: 0, currentCallId: callid, toCall } : item
            )
          );
  
        } else {
          // 如果沒有資料 就取得 callStatus: 2 的資料
          const secondOutboundData = await fetchOutboundData({
            callFlowIdOutbound: callFlowId,
            projectIdOutbound: projectId,
            limit: '1',
            callStatus: '2',
          });

          console.log(`%c secondOutboundData:${secondOutboundData}`,'color: blue')

          if (secondOutboundData.length > 0) {
            // 如果有資料 就撥打電話
            const { phone } = secondOutboundData[0].customer; 
            const { projectId, customerId } = secondOutboundData[0]; 
            const toCall: ToCallResponse = await activeOutbound(projectId, customerId, phone, appId, appSecret);
            console.log('currentCall:', toCall);
            // 撥打電話的時候 會回傳 一個 callid 我們可以利用這個 callid 來查詢當前的撥打狀態
            const { callid } = toCall.currentCall?.result ?? {};
      
            // 更新專案狀態為執行中 且更新 currentCallId
            setProjectOutboundData(prev =>
              prev.map(item =>
                item.projectId === project.projectId ? { ...item, callStatus: 1, currentCallId: callid, toCall } : item
              )
            );
          }
        } 
     } catch (error) {
       console.error('Error in batch outbound:', error);
       // 更新專案狀態為執行失敗並清空 currentPhone
       setProjectOutboundData(prev =>
         prev.map(item =>
           item.projectId === project.projectId ? { ...item, callStatus: 3, currentCallId: null, toCall: null } : item
         )
       );
     }
    }
  },[activeOutbound, fetchOutboundData, setProjectOutboundData]);

  const throttleAutoOutbound = useThrottle(autoOutbound, 500); // 使用 throttle 限制每 500 豪秒最多執行一次

  const handleStartOutbound = (projectId: string) => {
    startOutbound(projectId);
  };

  const handlePauseOutbound = (projectId: string) => {
    pauseOutbound(projectId);
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
          // 使用 async/await 處理 axios 請求
          (async () => {
            try {
              const customers = await getBonsaleProject(item.projectId);
              const projectCustomersDesc = customers.list.map((customer: Project) => customer);
              setProjectOutboundData(prevInner =>
                prevInner.map(innerItem =>
                  innerItem.projectId === projectId
                    ? { ...innerItem, isEnable: !isEnable, projectCustomersDesc }
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

         // 將專案中的客戶電話號碼提取出來
        const customers = await getBonsaleProject(projectId);
        const projectCustomersDesc = customers.list.map((customer: Project) => customer);
        console.log('newBonsaleAutoDial:', newBonsaleAutoDial);
        console.log('專案中的客戶電話號碼:', projectCustomersDesc);
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
              projectCustomersDesc,
              projectCallState: 'init',
              projectCallData: null, // 保持原有的撥打資料,
              isEnable: newBonsaleAutoDial.projectInfo.isEnable,
              toCall: null,
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

        // 將專案中的客戶電話號碼提取出來
        const customers = await getBonsaleProject(projectId);
        const projectCustomersDesc = customers.list.map((customer: Project) => customer);

        setProjectOutboundData(prevProjectOutboundData => {
          return prevProjectOutboundData.map((item) => {
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
                projectCustomersDesc,
                projectCallState: item.projectCallState, // 保持原有的撥打狀態
                projectCallData: item.projectCallData, // 保持原有的撥打資料,
                isEnable: oneBonsaleAutoDial.projectInfo.isEnable,
                toCall: item.toCall ?? null, // 保持原有的 toCall，或設為 null
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
}, [getBonsaleProject, getOneBonsaleAutoDial, setProjectOutboundData]);

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
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);

      setProjectOutboundData(prevProjectOutboundData => {
        return prevProjectOutboundData
          .map((item) => {
            if (item.callStatus === 3) {
              // 如果專案狀態是執行失敗 再讓他重回執行狀態 重新再試試看
              return {...item, callStatus: 1};
            }

            if (item.callStatus === 0) return item; // 如果專案狀態為未執行，則不處理

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
            } else if (item.projectCallData) { // 找到之前記錄在專案的撥打資料 
              // 將先前的撥打狀態記錄到 projectCustomersDesc 中
              const updatedCustomersDesc = [...item.projectCustomersDesc];
              const prevCustomersDesc = updatedCustomersDesc.find(customersDesc => {
                return item.projectCallData && customersDesc.customerId === item.projectCallData.customerId;
              }) 
              console.log('之前的撥打資料:', prevCustomersDesc);
              if (!prevCustomersDesc) return item;
              // 發送 API 請求到後端，更新撥打狀態...
              console.log('發送 API 請求到後端，更新撥打狀態... 檢查 ID:', prevCustomersDesc.projectId, item.callFlowId);
              const updatePromises = [
                updateCallStatus(
                  prevCustomersDesc.projectId,
                  prevCustomersDesc.customerId,
                  item.projectCallData?.activeCall?.Status === 'Talking' ? 1 : 2, // 更新撥打狀態為初始值
                ),
                updateBonsaleProjectAutoDialExecute(
                  prevCustomersDesc.projectId,
                  item.callFlowId,
                ),
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
                  // 所有的 通話記錄 API 請求完成
                  console.log('%c 所有的 通話記錄 API 請求完成','color: green');
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
                projectCallState: 'recorded',
                projectCallData,
                projectCustomersDesc: updatedCustomersDesc,
                toCall: null,
              };
            } else {
              console.log('%c 找不到之前的撥打資料','color: yellow');
              // 找不到之前的撥打資料 代表說 有可能進入到 secondOutbound 去播撥打失敗的人

              // 因為 throttleAutoOutbound 有節流器的關係 所以會導致只有最前面的幾個專案先撥打
              // 其他的專案會因節流器的關係 一直沒有撥打到
              // 所以這邊要加一個隨機延遲的時間 讓他們有機會平均分散撥打
              const randomDelayTime = Math.round(Math.random() * 200); // 隨機延遲時間 0~200 毫秒
              setTimeout(() => {

                throttleAutoOutbound(item, item.appId, item.appSecret);
              }, randomDelayTime);
              
              return {
                ...item,
                projectCallState: 'waiting',
                toCall: null,
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
  }, [setProjectOutboundData, updateCallStatus, updateBonsaleProjectAutoDialExecute, updateDialUpdate, updateVisitRecord, throttleAutoOutbound]);

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({}); // 用於跟踪每行的展開狀態

  const toggleRow = (projectId: string) => {
    setOpenRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

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
          執行自動外撥專案時，請勿關閉此頁面或重新整理頁面，
          <br />
          否則會導致撥打中斷。
        </Alert>
        <Alert severity="warning">
          自動外撥專案執行期間暫停動作時，會同步掛斷當前通話，
          <br />
          請警慎使用。
        </Alert>
      </Stack>
      <Box sx={{ height: '100%', maxHeight:'100%', overflowY: 'scroll' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: '20px' }} />
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
              const isOpen = openRows[item.projectId] || false;

              return (
                <Fragment key={item.projectId + index}>
                  <TableRow 
                    key={item.projectId}
                    sx={{
                      backgroundColor: item.callStatus === 4 ? '#f5f5f5' : 'inherit',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    <TableCell align="center">
                      <IconButton onClick={() => toggleRow(item.projectId)}>
                        {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
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
                              onClick={() => handleStartOutbound(item.projectId)}
                            >
                              <PlayArrowIcon />
                            </IconButton> : 
                            item.callStatus === 3 ? 
                              <IconButton 
                                onClick={() => handleStartOutbound(item.projectId)}
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
                        </Stack>
                      : null}
                    </TableCell>
                    <TableCell align='left'>
                      <Stack>
                        <Chip
                          label={`狀態: ${
                            item.projectCallState === 'init' ? '準備撥打' : 
                            item.projectCallState === 'waiting' ? '等待撥打' : 
                            item.projectCallState === 'recorded' ? '撥打已記錄' :
                            item.projectCallState === 'calling' ? '撥打中' : 
                            item.projectCallState === 'hangup' ? '撥打掛斷' :
                            item.projectCallState === 'finish' ? '撥打完成' : 
                            item.projectCallState
                          }`}
                          size="small"
                          sx={{ 
                            marginBottom: '4px',
                            color: () => 
                              item.projectCallState === 'calling' || 
                              item.projectCallState === 'finish' 
                              ? 'white' : 'black',
                            bgcolor: (theme) => 
                              item.projectCallState === 'calling' ? theme.palette.warning.main :
                              item.projectCallState === 'waiting' ? theme.palette.warning.color300 :
                              item.projectCallState === 'recorded' ? theme.palette.success.color300 :
                              item.projectCallState === 'hangup' ? theme.palette.warning.main :
                              item.projectCallState === 'finish' ? theme.palette.success.color700 :
                              'default'
                          }}
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
                  <TableRow>
                    <TableCell colSpan={8} sx={{ paddingBottom: 0, paddingTop: 0 }}>
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
      </Box>
    </>
  );
};