import axios from 'axios';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { useNavigate } from 'react-router-dom'


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
}

function Home() {
  const navigate = useNavigate();

  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  const getProjectOutboundData = async () => {
    const queryString = new URLSearchParams({
      isEnable: '1',
      limit: '-1',
    });

    try {
      const response = await axios.get(`${HTTP_HOST}/bonsale/auto-dial?${queryString}`);
      const dataList = response.data.list;
      console.log('Project Auto Dial Data:', dataList);
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
          }
        ))
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
  };

  const getCallStatusInfo = (callStatus: number): { state: string; color: 'default' | 'warning' | 'success' | 'error' } => {
    switch (callStatus) {
      case 0:
        return { state: '未執行', color: 'default' };
      case 1:
        return { state: '執行中', color: 'warning' };
      case 2:
        return { state: '執行成功', color: 'success' };
      case 3:
        return { state: '執行失敗', color: 'error' };
      default:
        return { state: '未知狀態', color: 'default' };
    }
  };
  
  const starOutbound = async (projectId: string, appId:string, appSecret:string ) => {
    try {
      // 先取得要撥打的電話號碼清單
      const customers = await axios.get(`${HTTP_HOST}/bonsale/project?projectIds=${projectId}`);
      const phoneNumbers = customers.data.list.map((customer) => customer.customer.phone);
      console.log('PhoneNumbers:', phoneNumbers);

      // 建立 WebSocket 連線
      const ws = new WebSocket(WS_HOST);
        ws.onopen = () => {
          console.log('WebSocket connection established');
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
        };

      // 撥打電話
      await axios.post(`${HTTP_HOST}/outboundCampaigm/v2`, {
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
        phone: phoneNumbers[1]
      });

    } catch (error) {
      console.error('Error starting outbound:', error);
    }
  };

  useEffect(() => {
    getProjectOutboundData();
  }, []);
  
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
        </TableRow>
      </TableHead>
      <TableBody>
        {projectOutboundData.map((item, index) => {
          const { state, color } = getCallStatusInfo(item.callStatus);
          return (
            <TableRow key={index}>
              <TableCell align='center' sx={{ width: '20px' }}>
                {item.projectName}
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                <Chip label={state} color={color} />
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                {item.extension}
              </TableCell>
              <TableCell align='center' sx={{ width: '20px' }}>
                {item.callStatus === 0 ? 
                  <IconButton onClick={() => starOutbound(item.projectId, item.appId, item.appSecret) }>
                    <PlayArrowIcon />
                  </IconButton> : 
                  <IconButton>
                    <PauseIcon /> 
                  </IconButton> 
                }
                <IconButton onClick={() => navigate(`/project/${item.projectId}`)}>
                  <InfoOutlineIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default Home;