# Frontend development Dockerfile
FROM node:18

WORKDIR /app

# Copy only package.json to avoid cross-platform lockfile issues
COPY package.json ./
RUN npm install && npm cache clean --force

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]