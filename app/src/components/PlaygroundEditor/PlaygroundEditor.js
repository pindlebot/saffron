import React from 'react'
import { Editor } from 'draft-js'

class PlaygroundEditor extends React.Component {
  componentDidMount () {
    if (this.props.readOnly) return
    this.editor.focus()
  }

  render () {
    return (
      <Editor
        ref={ref => {
          this.editor = ref
        }}
        {...this.props}
      />
    )
  }
}

export default PlaygroundEditor
