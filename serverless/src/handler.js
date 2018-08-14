const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const AWS = require('aws-sdk')
const { promisify } = require('util')
const write = promisify(fs.writeFile)
const read = promisify(fs.readFile)
const createPresignedURL = require('aws-sign-mqtt')
const { randomBytes } = require('crypto')
const mqtt = require('mqtt')

async function convertTexToPdf (buffer) {
  const id = randomBytes(10).toString('hex')
  const texPathname = `/tmp/${id}.tex`
  await write(texPathname, buffer)
  await new Promise((resolve, reject) => {
    const child = spawn('pdflatex', ['-output-directory=/tmp', '-interaction=nonstopmode', texPathname], {
      env: {
        PATH: `${process.env.PATH}:/tmp/texlive/2018/bin/x86_64-linux`
      }
    })
    child.stdout.on('data', (data) => {
      console.log(data.toString())
    })
    child.stderr.on('data', (data) => {
      console.log(data.toString())
    })
    child.on('error', (err) => {
      console.log(err)
    })
    child.on('close', resolve)
  })
  return read(`/tmp/${id}.pdf`, { encoding: 'base64' })
}

module.exports.mqtt = async ({ channelId }, context, callback) => {
  const TOPIC_REQUEST = `saffron/${channelId}/request`
  const TOPIC_RESPONSE = `saffron/${channelId}/response`
  const TOPIC_CONNECTED = `saffron/${channelId}/connected`
  const TOPIC_PROGRESS = `saffron/${channelId}/progress`

  const channel = mqtt.connect(createPresignedURL())
  let resolveExecution
  let promise = new Promise((resolve, reject) => {
    resolveExecution = resolve
  })

  const sessionTimeout = () => setTimeout(() => {
    console.log('Timed out')
    channel.end(resolveExecution)
  }, 30000)

  await new Promise((resolve, reject) => {
    channel.on('connect', resolve)
  })
  await new Promise((resolve, reject) => {
    console.log('Subscribed to ' + TOPIC_REQUEST)
    channel.subscribe(TOPIC_REQUEST, resolve)
  })
  await new Promise((resolve, reject) => {
    console.log('Subscribed to ' + TOPIC_CONNECTED)
    channel.subscribe(TOPIC_CONNECTED, resolve)
  })
  channel.publish(TOPIC_PROGRESS, '0')
  channel.publish(TOPIC_CONNECTED, JSON.stringify({ channelId }), { qos: 1 })
  let binaryPromise = require('pdflatex-lambda')(progress => {
    console.log({ progress })
    let normalized = (progress * 0.7) + ''
    channel.publish(TOPIC_PROGRESS, normalized, { qos: 1 })
  })
  let timeout = sessionTimeout()
  channel.on('message', async (topic, buffer) => {
    clearTimeout(timeout)
    let message = buffer.toString()
    console.log({ topic, message })

    if (topic === TOPIC_REQUEST) {
      await binaryPromise
      channel.publish(TOPIC_PROGRESS, '70', { qos: 1 })

      let pdf = await convertTexToPdf(buffer)
      await new Promise((resolve, reject) => {
        channel.publish(TOPIC_RESPONSE, pdf, resolve)
      })
      await new Promise((resolve, reject) => {
        channel.publish(TOPIC_PROGRESS, '100', resolve)
      })
      timeout = sessionTimeout()
    }
  })
  await promise.then(() => callback(null, {}))
}

module.exports.session = (event, context, callback) => {
  const endpointUrl = createPresignedURL()
  const channelId = randomBytes(5).toString('hex')

  callback(null, {
    statusCode: 200,
    body: JSON.stringify({ endpointUrl, channelId }),
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  })
}
