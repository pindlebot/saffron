import React from 'react'
import classnames from 'classnames'

class PlayButton extends React.Component {
  //componentDidUpdate (prevProps) {
  //  let { progress } = this.state
  //  let { loading } = this.props
  //
  //  if (progress < 1 && !loading) {
  //    return this.setState({ progress: 1 })
  //  }
  //
  //  if (loading && prevProps.loading !== loading) {
  //    return this.setState({ progress: 0.01 })
  //  } 
  //  
  //  if (progress < 1 && loading) {
  //    setTimeout(() => {
  //      this.setState(prevState => ({
  //        progress: prevState.progress + 0.001
  //      }))
  //    }, 10)
  //  }
  //}

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
      <div className={className} onClick={this.props.onClick}>
        <div className='execute-button' title='Execute'>
          <div className={'execute-button-inner'}>
            <div className={'execute-button-loading'} style={style}>
            </div>
            <svg width='35' height='35' viewBox='3.5,4.5,24,24'>
              <path d='M 11 9 L 24 16 L 11 23 z'>
              </path>
            </svg>
          </div>
        </div>
      </div>
    )
  }
}

PlayButton.defaultProps = {
  loading: false,
  progress: 100
}

export default PlayButton
