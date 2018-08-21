import mqtt from 'mqtt'
import 'whatwg-fetch'

const ENDPOINT_URL = ' https://5kh06s5uoa.execute-api.us-east-1.amazonaws.com/dev/'
const topics = {
  SESSION: 'saffron/session'
}
let channel

export default (texBuffer, { update, progress }) => {
  const publish = () => new Promise((resolve, reject) =>
    channel.publish(topics.REQUEST, texBuffer, { qos: 1 }, resolve))

  const connect = async () => {
    const { channelId, endpointUrl } = await fetch(ENDPOINT_URL)
      .then(resp => resp.json())
    topics.RESPONSE = `saffron/${channelId}/response`
    topics.REQUEST = `saffron/${channelId}/request`
    topics.CONNECTED = `saffron/${channelId}/connected`
    topics.PROGRESS = `saffron/${channelId}/progress`
    topics.END = `saffron/${channelId}/end`
    topics.LOG = `saffron/${channelId}/log`
  
    channel = mqtt.connect(endpointUrl)
    await new Promise((resolve, reject) => channel.on('connect', resolve))
    await new Promise((resolve, reject) => channel.subscribe(Object.values(topics), resolve))
    await new Promise((resolve, reject) => {
      channel.publish(topics.SESSION, JSON.stringify({ channelId, endpointUrl }), { qos: 1 }, resolve)
    })
    channel.on('error', error => console.log('WebSocket error', error))
    channel.on('offline', () => console.log('WebSocket offline'))
    channel.on('close', () => {
      console.log('CLOSED', channelId)
    })
    channel.on('end', () => {
      console.log('END', channelId)
    })
    channel.on('offline', () => {
      console.log('OFFLINE', channelId)
    })
    channel.on('reconnect', () => {
      console.log('RECONNECT', channelId)
    })
    channel.on('message', (topic, buffer) => {
      if (topic === topics.END) {
        channel.end()
      }
      if (topic === topics.CONNECTED) {
        // console.log(buffer.toString())
        publish()
      }

      if (topic === topics.PROGRESS) {
        if (progress) progress(buffer)
      }

      if (topic === topics.RESPONSE) {
        update(buffer)
      } else {
        // console.log(buffer.toString())
      }
    })
  }
  if (channel && channel.connected) {
    return publish()
  }
  return connect()
}
