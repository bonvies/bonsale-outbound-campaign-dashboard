import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST || 'http://localhost:3020';

export default function useActiveOutbound() {
  const activeOutbound = async (
    projectId: string,
    customerId: string,
    phone: string,
    appId: string,
    appSecret: string
  ): Promise<ToCallResponse> => {
    try {
      // 發送撥打電話的請求
      const result = await axios.post(`${HTTP_HOST}/projectOutbound`, {
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
        phone,
        projectId,
        customerId,
      });
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error starting outbound:', error);
      throw error;
    }
  };

  return { activeOutbound };
}