FROM node:10-alpine
ADD . . 
CMD ["node", "build/ts/runner.js"]