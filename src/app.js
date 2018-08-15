import React from 'react'
import { render } from 'react-dom'
import PdfEmbed from './components/PdfEmbed'
import {
  Editor,
  EditorState,
  convertFromRaw,
} from 'draft-js'
import { expand } from 'draft-js-compact'
import connect from './lib/connect'
import './styles.scss'
import PlayButton from './components/PlayButton'
import { base64ToUint8Array } from './lib/util'
import PlaygroundEditor from './components/PlaygroundEditor'
import DownloadIcon from './components/DownloadIcon'

class App extends React.Component {
  state = {
    editorState: EditorState.createWithContent(
      convertFromRaw(
        expand({
          blocks: [
            '\\documentclass{article}',
            '\\begin{document}',
            'Hello world!',
            '\\end{document}'
          ]
        })
      )
    ),
    buffer: '',
    style: {},
    loading: false,
    progress: 100,
  }

  onChange = editorState => {
    this.setState({ editorState })
  }

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
  
  componentDidMount () {
    let rect = this.ref.getBoundingClientRect()
    let height = rect.width * Math.sqrt(2)
    // this.setState({
    //  style: {
    //    height: `${height}px`
    //  }
    // })
  }

  render() {
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
          <section>
            <div className='playground-editor'>
              <PlaygroundEditor
                editorState={this.state.editorState}
                onChange={this.onChange}
              />
            </div>
          </section>
          <section>
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