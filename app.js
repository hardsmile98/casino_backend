require('dotenv').config();
const WebSocket = require('ws');
const express = require('express');
const { createServer } = require('http');
const cors = require('cors')
const app = express();
const port = 3030;
const wssPort = 8030;
const server = createServer(app).listen(wssPort);
const { connectToTable } = require('./connectToTable');

// * Переменные казино  *//
const tables = [
  {
    casinoUrl: 'gs6.pragmaticplaylive.net',
    tableId: 'g03y1t9vvuhrfytl'
  },
];

function appStart() {
  // * Global values * //
  let resultGames = {};
  let isConnection = true;
  let sessionId = '';

  const wssServer = new WebSocket.Server({ server });

  wssServer.on("connection", ws => {
    if(!isConnection) {
      ws.send(JSON.stringify({ event: 'noConnection' }))
      return;
    }

    ws.send(JSON.stringify({ 
      event: 'games', 
      data: resultGames,
    }));
  })

  const connectToAllTables = () => {
    tables.forEach((table) => {
      connectToTable({
        table,
        sessionId,
        resultGames,
        isConnection,
        wssServer,
      })
    })
  }

  connectToAllTables();

  app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  }));
  app.use(express.json());

  app.post('/api/newSessionId', function (req, res) {
    const { body } = req;
    const { sessionId: newId } = body;

    console.log('newSessionId', newId)

    sessionId = newId;

    connectToAllTables();

    res.status(200).send({ success: true });
  });

  app.listen(port, () => {
    console.log(`server app on port ${port}`)
  })
};

appStart();