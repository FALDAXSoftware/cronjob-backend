FROM openxcellinc/devops:pm291
WORKDIR /usr/share/nginx/html/faldax-simplexbackend
COPY package*.json ./
RUN npm install
RUN npm rebuild
EXPOSE 3000
COPY . .
CMD [ "pm2-runtime", "start", "app.js" ]