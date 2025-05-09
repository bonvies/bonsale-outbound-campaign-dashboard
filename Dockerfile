FROM node:18.12.0-alpine as build

WORKDIR /app

COPY package.json /app

RUN npm install

COPY . /app

RUN npm run build

FROM nginx:alpine
# 複製自定義的 nginx.conf 文件到 Nginx 配置目錄
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3030

CMD ["nginx","-g","daemon off;"]