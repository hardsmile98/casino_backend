require('dotenv').config()
const WebSocket = require('ws')
const express = require('express')
const { createServer } = require('http')
const cors = require('cors')
const app = express()
const port = 3030
const wssPort = 8030
const server = createServer(app).listen(wssPort)
const { connectToTable } = require('./connectToTable')
const { tables } = require('./constants/tables')

function appStart () {
  // * Global values * //
  const resultGames = {}
  let wsTables = []
  let sessionId = ''

  const wssServer = new WebSocket.Server({ server })

  wssServer.on('connection', ws => {
    const isOpenWebsokets = wsTables
      .filter((wsTable) => wsTable.readyState === WebSocket.OPEN).length > 0

    if (!isOpenWebsokets) {
      ws.send(JSON.stringify({ event: 'noConnection' }))
      return
    }

    ws.send(JSON.stringify({
      event: 'init',
      data: resultGames
    }))
  })

  const connectToAllTables = () => {
    tables.forEach((table) => {
      const wsTable = connectToTable({
        table,
        sessionId,
        resultGames,
        wssServer
      })

      wsTables.push(wsTable)
    })

    wssServer.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'connection'
        }))
      }
    })
  }

  const closeAllTables = () => {
    wsTables.forEach((wsTable) => {
      if (wsTable.readyState === WebSocket.OPEN) {
        wsTable.close()
      }
    })

    wsTables = []
  }

  connectToAllTables()

  app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
  }))
  app.use(express.json())

  app.post('/api/newSessionId', function (req, res) {
    const { body } = req
    const { sessionId: newId } = body

    console.log('newSessionId', newId)

    closeAllTables()

    sessionId = newId

    connectToAllTables()

    res.status(200).send({ success: true })
  })

  app.get('/api/info', function (req, res) {
    const countOpenTables = wsTables
      .filter((wsTable) => wsTable.readyState === WebSocket.OPEN).length

    const response = {
      tables: {
        all: tables.length,
        open: countOpenTables
      }
    }

    res.status(200).json({ success: true, data: response })
  })

  app.listen(port, () => {
    console.log(`server app on port ${port}`)
  })
};

appStart()
