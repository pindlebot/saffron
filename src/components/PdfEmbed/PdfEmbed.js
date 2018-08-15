import React from 'react'
import pdfLib from 'pdfjs-dist/build/pdf'

pdfLib.GlobalWorkerOptions.workerSrc = process.env.NODE_ENV !== 'production'
  ? '/pdf.worker.js'
  : '/staging/pdf.worker.js'

class PdfEmbed extends React.Component {
  static defaultProps = {
    scale: 1,
    page: 1,
    className: 'pdf-embed'
  }

  state = {
    pdf: null
  }

  componentDidMount () {
    if (!this.props.data) return
    this.getDocument({ data: this.props.data })
  }

  getDocument = async val => {
    if (this.documentPromise) {
      this.documentPromise.cancel()
    }
    this.documentPromise = pdfLib.getDocument(val).promise

    this.documentPromise
      .then(this.onDocumentComplete)
      .catch(this.onDocumentError)

    return this.documentPromise
  }

  drawPDF = async num => {
    const resolution =  2;
    const { pdf } = this.state
    const page = await pdf.getPage(num)
    const viewport = page.getViewport(this.props.scale)
    const canvas = this.canvas
    const canvasContext = canvas.getContext('2d')
    console.log(viewport)
    // canvas.height = viewport.height
    // canvas.width = viewport.width
    let height = resolution * viewport.height
    let width = resolution * viewport.width
    canvas.height = height
    canvas.width = width
    // canvas.style.height = viewport.height
    // canvas.style.width = viewport.width

    page.render({
      canvasContext,
      viewport,
      transform: [resolution, 0, 0, resolution, 0, 0] 
    })
    //let data = canvasContext.getImageData(
    //  100 * 2,
    //  100 * 2,
    //  (612 - 200) * 2,
    //  (792 - 200) * 2
    //)
    //canvasContext.putImageData(data,0,0);

    //console.log(data)
  }

  onDocumentComplete = async pdf => {
    this.setState({ pdf }, () => {
      this.drawPDF(this.props.page)
    })
  }
 
  //componentWillReceiveProps (nextProps) {
  //  if (nextProps.page !== this.props.page) {
  //    this.drawPDF(nextProps.page)
  //  }
  //}

  onDocumentError = err => {
    if (err.isCanceled && err.pdf) {
      err.pdf.destroy()
    }
  }

  render () {
    if (!this.state.pdf) {
      return false
    }
    return (
      <canvas
        ref={ref => {
          this.canvas = ref
        }}
        className={this.props.className}
      />
    )
  }
}

export default PdfEmbed