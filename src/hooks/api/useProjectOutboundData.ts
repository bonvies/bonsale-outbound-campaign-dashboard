import { useState, useEffect } from 'react';
import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

const useProjectOutboundData = () => {
  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
    try {
      const queryString = new URLSearchParams({
        limit: '-1',
        sort: 'created_at+desc'
      });
      const response = await axios.get(`${HTTP_HOST}/bonsale/auto-dial?${queryString}`);
      const dataList = response.data.list;
      // console.log('Project Auto Dial Data:', dataList);

      // 將資料轉換為符合專案撥打狀態的格式
      const updatedData = await Promise.all(
        dataList.map(async (item: Project) => {
          // 將專案中的客戶電話號碼提取出來
          const queryString = new URLSearchParams({
            limit: '-1',
            projectIds: item.projectId
          });
          const customers = await axios.get(`${HTTP_HOST}/bonsale/project?${queryString}`);
          const projectCustomersDesc = customers.data.list.map((customer: Project) => customer);
          return {
            appId: item.appId,
            appSecret: item.appSecret,
            callFlowId: item.callFlowId,
            projectId: item.projectId,
            projectName: item.projectInfo.projectName,
            startDate: item.projectInfo.startDate,
            endDate: item.projectInfo.endDate,
            callStatus: 0,
            extension: item.callFlow.phone,
            projectCustomersDesc,
            currentCallIndex: 0, 
            projectCallState: 'init', // 撥打狀態
            projectCallData: null, // 撥打資料,
            isEnable: item.projectInfo.isEnable,
          };
        })
      );
      setProjectOutboundData(updatedData);
      return response.data;
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
    };

    fetchData();
  }, []);

  return { projectOutboundData, setProjectOutboundData };
};

export default useProjectOutboundData;