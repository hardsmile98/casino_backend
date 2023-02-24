require('dotenv').config();
const WebSocket = require('ws');
const request = require('request')
const express = require('express');
const { createServer } = require('http');
const cors = require('cors')
const app = express();
const port = 3000;
const server = createServer(app);

// * Global values * //
let resultGames = [];
let isConnection = true;
let sessionId = '';

const wsServer = new WebSocket.Server({ server });

wsServer.on("connection", ws => {
  if(!isConnection) {
    ws.send(JSON.stringify({ event: 'noConnection' }))
    return;
  }

  ws.send(JSON.stringify({ 
    event: 'games', 
    data: resultGames,
  }));
})

// *  Казино  *//
const tableId = process.env.TABLE_ID;
const casinoUrl = process.env.CASINO_URL;
const number = 100;

// Получение данных с рулетки
function connect() {
  const wsUrl = `wss://${casinoUrl}/game?JSESSIONID=${sessionId}&tableId=${tableId}`;
  const getHistoryUrl = `https://${casinoUrl}/api/ui/statisticHistory?tableId=${tableId}&numberOfGames=${number}&JSESSIONID=${sessionId}`

  const ws = new WebSocket(wsUrl, {});

  ws.onclose = () => {
    isConnection = false;

    wsServer.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'noConnection',
        }));
      }
    });
  }

  ws.onopen = () => {
    isConnection = true;
  
    wsServer.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'connection',
        }));
      }
    });
  }

  ws.onerror = () => {
    isConnection = false;
  }

  ws.on('message', (data) => {
    const chank = data.toString().replace(/^\d+/, '');
    if (chank !== '') {
      // выпадение числа
      const isEndGame =  chank.includes('zoomOut');

      if(isEndGame) {
        console.log('end game');
        request(
          getHistoryUrl,
          (err, response, body) => {
            const json = JSON.parse(body);
            const results = json?.history?.map(game => game?.gameResult);

            resultGames = results;

            // Отсылаем результаты игр на клиент через сокет
            wsServer.clients.forEach(function each(client) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  event: 'games',
                  data: results,
                }));
              }
            });
          }
        )
      }
    }
  });
}

connect();

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
}));
app.use(express.json());

app.post('/api/newSessionId', function (req, res) {
  const { body } = req;
  const { sessionId: newId } = body;

  sessionId = newId;
  connect();

  res.status(200).send({ success: true });
});

app.listen(port, () => {
  console.log(`server app on port ${port}`)
})