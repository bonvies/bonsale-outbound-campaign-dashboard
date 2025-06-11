import { useState, useEffect, useCallback } from 'react';

import useGetBonsaleAutoDial from './api/useGetBonsaleAutoDial';

const useProjectOutboundData = () => {
  const { getBonsaleAutoDial } = useGetBonsaleAutoDial();

  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // 先取得第一頁，拿到總頁數
      const firstPage = await getBonsaleAutoDial(1);
      const totalPage = firstPage.totalPage || 1;
      // 建立所有頁面的 Promise
      const allPagesPromise = [];
      for (let page = 1; page <= totalPage; page++) {
        allPagesPromise.push(getBonsaleAutoDial(page));
      }
      // 等待所有頁面資料都拿到
      const allPages = await Promise.all(allPagesPromise);
      // 合併所有頁面的 list
      const dataList = allPages.flatMap(page => page.list);

      const updatedData = await Promise.all(
        dataList.map(async (item: Project) => {
          return {
            appId: item.appId,
            appSecret: item.appSecret,
            callFlowId: item.callFlowId,
            projectId: item.projectId,
            projectName: item.projectInfo.projectName,
            startDate: new Date(item.projectInfo.startDate),
            endDate: new Date(item.projectInfo.endDate),
            callStatus: 0,
            extension: item.callFlow.phone,
            projectCallState: 'init',
            projectCallData: null,
            isEnable: item.projectInfo.isEnable,
            errorTimes: 0,
          };
        })
      );
      setProjectOutboundData(updatedData);
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
  }, [getBonsaleAutoDial]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { projectOutboundData, setProjectOutboundData };
};

export default useProjectOutboundData;