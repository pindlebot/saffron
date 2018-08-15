import React from 'react'
import { render } from 'react-dom'
import PdfEmbed from './components/PdfEmbed'
import {
  Editor,
  EditorState,
  convertFromRaw,
  convertToRaw,
  Modifier
} from 'draft-js'
import { expand, compress } from 'draft-js-compact'
import connect from './lib/connect'
import './styles.scss'
import PlayButton from './components/PlayButton'
import { base64ToUint8Array } from './lib/util'
import PlaygroundEditor from './components/PlaygroundEditor'
import DownloadIcon from './components/DownloadIcon'
import './prism.scss'
import prism from 'prismjs'
import 'prismjs/components/prism-latex'
import PrismDecorator from 'draft-js-prism'
import classnames from 'classnames'
import debounce from 'debounce'

const decorator = new PrismDecorator({
  prism: prism,
  getSyntax (block) {
    return 'latex'
  }
})

const DEFAULT_BLOCKS = JSON.stringify([
  { text: '\\documentclass{article}', type: 'code-block' },
  { text: '\\begin{document}', type: 'code-block' },
  { text: 'Hello world!', type: 'code-block' },
  { text: '\\end{document}', type: 'code-block' }
])

const getContent = () => {
  let blocks = JSON.parse(window.localStorage.getItem('data') || DEFAULT_BLOCKS)

  return convertFromRaw(
    expand({ blocks })
  )
}

class App extends React.Component {
  state = {
    editorState: EditorState.createWithContent(
      getContent(),
      decorator
    ),
    buffer: '',
    style: {},
    loading: false,
    progress: 100,
    focused: false
  }

  onChange = editorState => {
    console.log(editorState.getDecorator())
    this.setState({ editorState }, this.save)
  }

  save = debounce(() => {
    window.localStorage.setItem(
      'data',
      JSON.stringify(
        compress(
          convertToRaw(this.state.editorState.getCurrentContent())
        ).blocks
      )
    )
  }, 2000)

  download = () => {
    let blob = new Blob([this.state.buffer], { type: 'application/pdf' })
    let url = window.URL.createObjectURL(blob)
    window.open(url)
    setTimeout(() => window.URL.revokeObjectURL(url), 100)
  }
  
  handlePlay = async () => {
    const tex = this.state.editorState.getCurrentContent()
      .getPlainText('\n')
   
    this.setState({ loading: true, buffer: undefined })
    let channel = await connect(Buffer.from(tex), {
      update: buffer => {
        let uint8Array = base64ToUint8Array(buffer.toString())
        this.setState({
          buffer: uint8Array,
          loading: false
        })
      },
      progress: buffer => {
        this.setState({ progress: parseInt(buffer.toString()) })
      }
    })
  }
  
  async componentDidMount () {
    // let rect = this.ref.getBoundingClientRect()
    // let height = rect.width * Math.sqrt(2)
    // this.setState({
    //  style: {
    //    height: `${height}px`
    //  }
    // })
    const tex = this.state.editorState.getCurrentContent()
      .getPlainText('\n')
   
    let channel = await connect(Buffer.from(tex), {
      update: buffer => {
        let uint8Array = base64ToUint8Array(buffer.toString())
        this.setState({
          buffer: uint8Array
        })
      }
    })
  }

  onPaste = (text, html, editorState) => {
    let currentContent = editorState.getCurrentContent()
    let blocks = text.split(/\r?\n/g)
      .filter(text => text !== '')
      .map(text => ({ text, type: 'code-block' }))
    let raw = expand({ blocks: blocks })
    let contentState = convertFromRaw(raw)
    let newContentState = Modifier.replaceWithFragment(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      contentState.getBlockMap()
    )

    let newEditorState = EditorState.push(
      editorState,
      newContentState,
      'insert-fragment'
    )
    this.setState({ editorState: newEditorState })
    return 'handled'
  }

  onFocus = evt => {
    console.log(evt)
    this.setState({ focused: true })
  }

  onBlur = evt => {
    console.log(evt)
    this.setState({ focused: false })
  }

  render() {
    console.log(this.state)
    const { focused } = this.state
    const sectionClassName = focused ? 'full' : 'half'
    return (
       <main>
        <div className='background' />
        <header>
          <div className={'upper'}>
            <div className={'result active'}>PdfLatex</div>
          </div>
          <div className={'lower'}>
            <PlayButton
              onClick={this.handlePlay}
              progress={this.state.progress}
              loading={this.state.loading}
            />
            <div className='shadow' />
          </div>
        </header>
        <div className='container'>
          <section className={sectionClassName}>
            <div className='playground-editor'>
              <PlaygroundEditor
                editorState={this.state.editorState}
                onChange={this.onChange}
                handlePastedText={this.onPaste}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
              />
            </div>
          </section>
          <section className={focused ? 'hidden' : 'half'}>
            <div
              ref={ref => {
                this.ref = ref
              }}
              style={this.state.style}
              className={'pdf-preview'}
            >
              <div className={'toolbar'}>
                <button onClick={this.download} className={'download'}>
                  <DownloadIcon />
                </button>
              </div>
              {this.state.buffer &&
                <PdfEmbed data={this.state.buffer} />
              }
            </div>
          </section>
        </div>
      </main>
    )
  }
}


render(
  <App />,
  document.getElementById('root')
)