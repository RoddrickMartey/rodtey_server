import 'dotenv/config';
import http from 'http';
import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const start = async () => {
  await prisma.$connect();
  console.info('✦ Database connected');

  server.listen(PORT, () => {
    console.info(`✦ Rodtey server running on port ${PORT}`);
  });
};

void start();
