FROM node:22-alpine

WORKDIR /app

# Install Ansible and curl for automated recovery playbook execution
RUN apk add --no-cache ansible curl bash python3

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
