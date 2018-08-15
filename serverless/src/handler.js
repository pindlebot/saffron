const fs = require('fs')
const path = require('path')
const { spawn, exec } = require('child_process')
const { promisify } = require('util')
const write = promisify(fs.writeFile)
const read = promisify(fs.readFile)
const list = promisify(fs.readdir)
const createPresignedURL = require('aws-sign-mqtt')
const { randomBytes } = require('crypto')
const mqtt = require('mqtt')
const unzipper = require('unzipper')
// const http = require('follow-redirects')
// const fetch = require('node-fetch')
const got = require('got')

const CTAN_ENDPOINT = 'http://mirror.utexas.edu/ctan/macros/latex/contrib'
const DIR = '/tmp/texlive/texmf-local/tex/latex/'
// http://mirrors.ctan.org/macros/latex/contrib/lipsum/lipsum.dtx

const run = (command) =>
  new Promise((resolve, reject) => exec(command, (...out) => {
    console.log(out)
    resolve(out)
  }))

const fetchFile = (url, { pathname }) => {
  let resolve
  let promise = new Promise(res => {
    resolve = res
  })
  let writable = fs.createWriteStream(path.join(DIR, pathname))
  writable.on('finish', resolve)
  let stream = got.stream(url)
  stream.on('error', console.error.bind(console))
  stream.pipe(writable)
  return promise
}

const fetchPackage = (name) => {
  console.log('installing ' + name)
  return new Promise(async (resolve, reject) => {
    const { body } = await got(`https://ctan.org/json/2.0/pkg/${name}`, { json: true })
    if (body.install) {
      let url = `http://mirrors.ctan.org/install${body.install}`
      console.log(url)

      let res = got.stream(url)
      let writable = unzipper.Extract({ path: '/tmp/texlive/texmf-local/tex/latex' })
      res.pipe(writable)
      writable.on('close', resolve)
    } else if (body.ctan) {
      let url = `https://s3.amazonaws.com/aws-lambda-binaries/${name}.zip`
      let res = got.stream(url)
      let writable = unzipper.Extract({ path: '/tmp/texlive/texmf-local/tex/latex' })
      res.pipe(writable)
      writable.on('close', resolve)
      // let ins = `http://mirrors.ctan.org${body.ctan.path}/${name}.ins`
      // let dtx = `http://mirrors.ctan.org${body.ctan.path}/${name}.dtx`
      // await run(`mkdir -p /tmp/texlive/texmf-local/tex/latex/${name}`)
  
      // console.log({ ins, dtx })
      // await fetchFile(ins, { pathname: `${name}/${name}.ins` })
      // await fetchFile(ins, { pathname: `${name}/${name}.dtx` })
      // console.log({ ins, dtx })
      // let files = await list('/tmp/texlive/texmf-local/tex/latex/lipsum')
      // console.log(files)
      // await run(`pdflatex /tmp/texlive/texmf-local/tex/latex/${name}/${name}.ins`)
    } else {
      reject(new Error('Not found'))
      // resolve()
    }
  })
}

const RE = /(?<!%)\\usepackage\{(.*)\}/

async function convertTexToPdf (buffer, publish) {
  const id = randomBytes(10).toString('hex')
  const texPathname = `/tmp/${id}.tex`
  await write(texPathname, buffer)
  let installedPackages = await list('/tmp/texlive/texmf-local/tex/latex')
    .catch(() => ([]))
  let preinstalledPackages = await list('/tmp/texlive/2018/texmf-dist/tex/latex')
    .catch(() => ([]))
  installedPackages = installedPackages.concat(preinstalledPackages)
  let lines = buffer.toString().split(/\r?\n/g)
  let dependencies = lines.filter(line => RE.test(line))
    .map(line => line.match(RE)[1])
    .filter(pkg => !installedPackages.includes(pkg))
  if (dependencies.length) {
    await Promise.all(dependencies.map(fetchPackage))
    await new Promise((resolve, reject) => {
      exec('texhash', (error, stdout, stderr) => {
        if (error) reject(error)
        resolve(stdout || stderr)
      })
    })
  }
  console.log({ installedPackages })
  await new Promise((resolve, reject) => {
    let log = ''
    const child = spawn('pdflatex', ['-output-directory=/tmp', '-interaction=nonstopmode', texPathname], {
      env: {
        PATH: `${process.env.PATH}:/tmp/texlive/2018/bin/x86_64-linux`
      }
    })
    child.stdout.on('data', (data) => {
      publish(data.toString())
      log += data.toString()
    })
    child.stderr.on('data', (data) => {
      publish(data.toString())
      log += data.toString()
    })
    child.on('error', (err) => {
      console.log('error', err)
    })
    child.on('close', () => resolve(log))
  })
  return read(`/tmp/${id}.pdf`, { encoding: 'base64' })
}

module.exports.mqtt = async ({ channelId }, context, callback) => {
  const TOPIC_REQUEST = `saffron/${channelId}/request`
  const TOPIC_RESPONSE = `saffron/${channelId}/response`
  const TOPIC_CONNECTED = `saffron/${channelId}/connected`
  const TOPIC_PROGRESS = `saffron/${channelId}/progress`
  const TOPIC_END = `saffron/${channelId}/end`
  const TOPIC_LOG = `saffron/${channelId}/log`

  const channel = mqtt.connect(createPresignedURL())
  let resolveExecution
  let executionCheckInterval
  let timeout
  let promise = new Promise((resolve, reject) => {
    resolveExecution = resolve
  })

  const end = (reason = {}) => {
    clearTimeout(timeout)
    clearInterval(executionCheckInterval)
    channel.publish(
      TOPIC_END,
      JSON.stringify({ channelId, ...reason }),
      { qos: 0 },
      () => {
        channel.end(resolveExecution)
      }
    )
  }

  executionCheckInterval = setInterval(() => {
    let remaining = context.getRemainingTimeInMillis()
    if (remaining < 5000) {
      console.log('Ran out of execution time.')
      end({
        outOfTime: true
      })
    }
  }, 1000)

  const sessionTimeout = () => setTimeout(() => {
    console.log('Timed out')
    end({ timeout: true })
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
  timeout = sessionTimeout()
  channel.on('message', async (topic, buffer) => {
    clearTimeout(timeout)
    let message = buffer.toString()
    console.log({ topic, message })

    if (topic === TOPIC_REQUEST) {
      await binaryPromise
      channel.publish(TOPIC_PROGRESS, '70', { qos: 1 })

      let pdf = await convertTexToPdf(buffer, (data) => {
        channel.publish(TOPIC_LOG, data)
      })
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
