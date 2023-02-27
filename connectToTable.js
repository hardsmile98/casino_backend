const request = require('request')
const WebSocket = require('ws')

const gamesCount = 20

let reconectCount = 0

// Получение данных с из стола
function connectToTable ({
  table,
  sessionId,
  resultGames,
  wssServer
}) {
  const { casinoUrl, tableId } = table || {}

  const wsUrl = `wss://${casinoUrl}/game?JSESSIONID=${sessionId}&tableId=${tableId}`
  const getHistoryUrl = `https://${casinoUrl}/api/ui/statisticHistory?tableId=${tableId}&numberOfGames=${gamesCount}&JSESSIONID=${sessionId}`

  const ws = new WebSocket(wsUrl, {})

  const sendGames = () => {
    console.log('send games')

    try {
      request(
        getHistoryUrl,
        (_err, _response, body) => {
          const json = JSON.parse(body)
          const results = json?.history?.map(game => game?.gameResult)

          resultGames[tableId] = results

          // Отсылаем результаты игр на клиент через сокет
          wssServer.clients.forEach(function each (client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                event: 'games',
                tableId,
                data: results
              }))
            }
          })
        }
      )
    } catch (error) {
      console.log(error)
    }
  }

  ws.onclose = () => {
    if (reconectCount === 0) {
      reconectCount++

      connectToTable({
        table,
        sessionId,
        resultGames,
        wssServer
      })

      return
    }

    wssServer.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'noConnection'
        }))
      }
    })
  }

  ws.onopen = () => {
    sendGames()
  }

  ws.onerror = () => {}

  ws.on('message', (data) => {
    const chank = data.toString().replace(/^\d+/, '')
    if (chank !== '') {
      // выпадение числа
      const isEndGame = chank.includes('zoomOut')

      if (isEndGame) {
        if (reconectCount !== 0) {
          reconectCount = 0
        }

        sendGames()
      }
    }
  })

  return ws
}

module.exports = { connectToTable }
