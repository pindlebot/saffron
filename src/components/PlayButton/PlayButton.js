import React from 'react'
import classnames from 'classnames'

class PlayButton extends React.Component {

  render () {
    let { loading } = this.props
    let progress = this.props.progress / 100
    const style = {
      backgroundColor: progress < 1 ? '#CCFCCB' : 'transparent',
      height: '100%',
      maxHeight: `${progress * 80}px`,
      width: `${80 - (15 * progress)}px`
    }
    const className = classnames(
      'execute-button-wrap',
      loading ? 'loading' : ''
    )
    return (
      <button className={className} onClick={this.props.onClick} disabled={loading}>
        <div className='execute-button' title='Execute'>
          <div className={'execute-button-inner'}>
            {/*<div className={'execute-button-loading'} style={style} />*/}
            <svg width='35' height='35' viewBox='3.5,4.5,24,24'>
              <path d='M 11 9 L 24 16 L 11 23 z' />
            </svg>
          </div>
        </div>
      </button>
    )
  }
}

PlayButton.defaultProps = {
  loading: false,
  progress: 100
}

export default PlayButton
