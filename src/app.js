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
import './styles/styles.scss'
import 'draft-js/dist/Draft.css'
import PlayButton from './components/PlayButton'
import { base64ToUint8Array } from './lib/util'
import PlaygroundEditor from './components/PlaygroundEditor'
import DownloadIcon from './components/DownloadIcon'
import prism from 'prismjs'
import 'prismjs/components/prism-latex'
import PrismDecorator from 'draft-js-prism'
import classnames from 'classnames'
import debounce from 'debounce'
import { Map } from 'immutable'
import CodeBlock from './components/CodeBlock'
import Progress from './components/Progress'
import { unstable_deferredUpdates as deferredUpdates } from 'react-dom'

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

const blockRenderMap = Map({
  'code-block': {
    element: 'code',
    wrapper: <CodeBlock />
  }
})

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
    loading: true,
    progress: 0,
    focused: false
  }

  onChange = editorState => {
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
    setTimeout(() => {

    })
  }
  
  handlePlay = async (evt, initialLoad) => {
    const tex = this.state.editorState.getCurrentContent()
      .getPlainText('\n')
   
    if (!initialLoad) {
      await new Promise((resolve, reject) => 
        this.setState({ loading: true, buffer: undefined, progress: 0 }, resolve)
      )
    }
    
    let channel = await connect(Buffer.from(tex), {
      update: buffer => {
        let uint8Array = base64ToUint8Array(buffer.toString())
        deferredUpdates(
          () => this.setState({
            buffer: uint8Array,
            loading: false
          })
        )
      },
      progress: buffer => {
        deferredUpdates(() =>this.setState({ progress: parseInt(buffer.toString()) }))
      }
    })
  }
  
  async componentDidMount () {
    this.handlePlay(null, true)
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
    this.setState({ focused: true })
  }

  onBlur = evt => {
    this.setState({ focused: false })
  }

  render() {
    console.log(this.state)
    const { focused } = this.state
    const sectionClassName = focused ? 'full' : 'half'
    return (
       <main>
        <div className='background' />
        <Progress progress={this.state.progress} />
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
          <section className={'half'}>
            <div className='playground-editor'>
              <PlaygroundEditor
                editorState={this.state.editorState}
                onChange={this.onChange}
                handlePastedText={this.onPaste}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                blockRenderMap={blockRenderMap}
              />
            </div>
          </section>
          <section className={'half'}>
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
              {window.innerWidth > 960 && <div className={'overlay'}></div>}
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