FROM node:20-alpine
WORKDIR /usr/src/app
RUN npm install -g create-vite
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]