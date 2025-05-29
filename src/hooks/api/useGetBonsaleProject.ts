import axios from 'axios';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useGatBonsaleProject() {
  const getBonsaleProject = async (projectId: string) => {
    try {
      // 將專案中的客戶電話號碼提取出來
      const queryString = new URLSearchParams({
        limit: '-1',
        projectIds: projectId
      });
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/project?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  return { getBonsaleProject };
}