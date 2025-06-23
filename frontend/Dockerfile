FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# Install all dependencies (including devDependencies) for build
RUN npm ci
COPY . .
RUN npm run build
# Remove devDependencies after build for production
RUN npm prune --production
CMD ["npm", "run", "start"]
