const fs = require('fs')
const path = require('path')
const got = require('got')
const DIR = 'tmp'

const data = {
  ins: 'http://mirrors.ctan.org/macros/latex/contrib/lipsum/lipsum.ins',
  dtx: 'http://mirrors.ctan.org/macros/latex/contrib/lipsum/lipsum.dtx'
}

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

fetchFile(data.ins, { pathname: 'lipsum.ins' }).then(() => console.log('done'))
