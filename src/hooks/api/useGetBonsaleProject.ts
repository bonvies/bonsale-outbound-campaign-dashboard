import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

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