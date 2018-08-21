import React from 'react'
import { lighten } from '../../lib/colorManipulator'

const Progress = ({ progress }) => (
  <div
    className={'progress'}
    style={{
      backgroundColor: progress < 100 ? '#ff79b0' : 'transparent'
    }}>
    {/*<div
      className={'progress-radial'}
      style={{
        backgroundImage: `radial-gradient(${lighten('#455A64', 0.6)} 0%, ${lighten('#455A64', 0.6)} 16%, transparent 42%)`
      }}
    />*/}
    {progress < 100 && (<div
      style={{
        transform: `scaleX(${progress / 100})`,
        backgroundColor: '#c60055'
      }}
      className={'progress-inner'}
    />)}
  </div>
)

export default Progress
