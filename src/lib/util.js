export const base64ToUint8Array = (base64) => {
  let raw = window.atob(base64)
  let uint8Array = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    uint8Array[i] = raw.charCodeAt(i)
  }
  return uint8Array
}
