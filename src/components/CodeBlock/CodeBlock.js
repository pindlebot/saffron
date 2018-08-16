import React from 'react'
import { Map } from 'immutable'

class CodeBlock extends React.Component {
  renderLineNumbers = () => {
    const { children } = this.props
    return children.map((child, i) => <div key={child.key}>{i + 1}</div>)
  }

  render () {
    return (
      <div className={'code-block-container'}>
        <div className={'code-block-content'}>
          <pre contentEditable={false} readOnly>
            {this.renderLineNumbers()}
          </pre>
          <pre>
            {this.props.children}
          </pre>
        </div>
      </div>
    )
  }
}

CodeBlock.defaultProps = {
  language: ''
}

export default CodeBlock
