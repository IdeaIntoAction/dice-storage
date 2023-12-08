import http from 'http';
import app from '../app/app';
import { config } from '../config';
import { RabbitService } from '../service/rabbit/rabbit';
import { logger } from '../util/logger';
import { IDiceRequest } from '../service/rabbit/interface';

const { port } = config.server;
app.set('port', port);

const server = http.createServer(app);

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      logger.error('requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error('port is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

async function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  logger.info('listening on', bind);

  const rabbit = await RabbitService.getInstance(
    'postgres_exchange',
  );

  rabbit.setCustomMessageHandler(async (message: IDiceRequest) => {
    logger.info(message, 'Received message');
    return true;
  });

  rabbit.init();
}

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

process.on('SIGINT', () => {
  server.close(async () => {
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason: Error) => {
  throw reason;
});

process.on('uncaughtException', () => {
  process.exit(1);
});
