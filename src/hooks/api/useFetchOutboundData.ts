import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

export default function useFetchOutboundData() {
  const fetchOutboundData = async (params: Record<string, string>) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/outbound?${queryString}`);
      return response.data.list ?? [];
    } catch (error) {
      console.error('Error fetching outbound data:', error);
      throw error;
    }
  };

  return { fetchOutboundData };
}