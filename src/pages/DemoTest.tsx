import { Button, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;
const WS_HOST = import.meta.env.VITE_WS_HOST;

function DemoTest() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [grantType, setGrantType] = useState('client_credentials');
  const [phoneNumbers, setPhoneNumbers] = useState('');

  const [token_3cx, setToken_3cx] = useState('');

  type PhoneCallData = {
    sequence: number;
    event: {
      event_type: number;
      entity: string;
      attached_data: unknown | null;
    };
    client_id: string;
    caller: {
      dn: string;
      type: string;
      devices: {
        dn: string;
        device_id: string;
        user_agent: string;
      }[];
    };
    participants: {    
      id: number;
      status: string;
      dn: string;
      party_caller_name: string;
      party_dn: string;
      party_caller_id: string;
      party_did: string;
      device_id: string;
      party_dn_type: string;
      direct_control: boolean;
      originated_by_dn: string;
      originated_by_type: string;
      referred_by_dn: string;
      referred_by_type: string;
      on_behalf_of_dn: string;
      on_behalf_of_type: string;
      callid: number;
      legid: number;
    }[];
  };

  const [phoneCallData, setPhoneCallData] = useState<PhoneCallData | null>(null);

  const isParticipants = useMemo(()=>(phoneCallData?.participants?.length ?? 0 > 0),[phoneCallData]);
  const currentDnnumber = useMemo(()=>(phoneCallData?.participants[0]?.dn ?? null),[phoneCallData]);
  const currentParticipantId = useMemo(()=>(phoneCallData?.participants[0]?.id ?? null),[phoneCallData]);

  const call = async () => {
    if (!clientId || !clientSecret || !grantType || !phoneNumbers) {
      console.error('請填寫所有欄位');
      return;
    };

    try {
      const result = await axios.post(`${HTTP_HOST}/api/outboundCampaigm`, {
        grant_type: grantType,
        client_id: clientId,
        client_secret: clientSecret,
        phones: phoneNumbers,
      });
      console.log(result.data);

      // 儲存 token_3cx
      setToken_3cx(result.data.token_3cx);
    } catch (err) {
      console.log('撥號失敗');
      console.error(err);
    }
  };

  const hangUp = async () => {
    if (!currentDnnumber || !currentParticipantId) {
      console.error('無法獲取參與者 分機 與 ID');
      return;
    };

    try {
      const result = await axios.post(`${HTTP_HOST}/api/callControl/hangup`, {
        dn: currentDnnumber,
        id: currentParticipantId,
        token_3cx: token_3cx, // 這裡需要傳入 token_3cx
      });
      console.log(result.data);
    } catch (err) {
      console.log('掛斷失敗');
      console.error(err);
    }
  };

  const connectWs = (clientId: string) => {
  
    // 建立 WebSocket 連線
    const ws = new WebSocket(`${WS_HOST}/ws/outboundCampaigm`);
  
    // 當 WebSocket 連線成功時觸發
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };
  
    // 當接收到來自後端的訊息時觸發
    ws.onmessage = (event) => {
      // console.log('接收到 ws 訊息')
      try {
        // 將接收到的資料解析為 JSON
        const data = JSON.parse(event.data);

        // 只接收屬於這個 clientId 的訊息
        if (data.client_id == clientId) {
          console.log('Received data from server:', data);
          setPhoneCallData(data);
          // 在這裡可以根據接收到的資料進行相應的處理
          // 例如，更新狀態或顯示通知等
        }
        
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  
    // 當 WebSocket 連線關閉時觸發
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  
    // 當 WebSocket 發生錯誤時觸發
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  useEffect(() => {
    // 連接 WebSocket
   

    // 清除 WebSocket 連線
    return () => {
      // 如果需要的話，可以在這裡關閉 WebSocket 連線
      // ws.close();
    };
  }, []);

  return (
    <>
      <Typography variant="h4">測試自架設的 3CX 自動外撥 操作</Typography>
      <Stack spacing={2} sx={{ width: '600px' }}>
        <TextField
          label="CLIENT_ID"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
        <TextField
          label="CLIENT_SECRET"
          required
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
        <TextField
          label="GRANT_TYPE"
          required
          value={grantType}
          onChange={(e) => setGrantType(e.target.value)}
        />
        <TextField
          helperText="若有多組電話 請用 , 分隔 例如 0912345678,0987654321"
          label="請輸入要撥打的電話號碼"
          required
          value={phoneNumbers}
          onChange={(e) => setPhoneNumbers(e.target.value)}
        />
        {/* 連接 WebSocket 並撥打電話 */}
        <Button variant="contained" onClick={()=>{connectWs(clientId); call()}}> 
          發送請求
        </Button>
      </Stack>
      {isParticipants ? 
        <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
          <Chip 
            label={phoneCallData?.participants[0].status} 
            color={phoneCallData?.participants[0].status === 'Connected' ? 'success' : 'warning'} 
          />
          <Typography variant="h6">
            {phoneCallData?.participants[0].party_caller_id}
          </Typography>
          <IconButton aria-label="delete" size="small" color="error" onClick={hangUp}>
            <LocalPhoneIcon fontSize="inherit" />
          </IconButton>
        </Stack> 
      : null}
    </>
  );
}

export default DemoTest;