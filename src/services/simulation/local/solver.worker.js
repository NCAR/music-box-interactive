// Runs the MUSICA solver in a module Web Worker, so a long simulation does not freeze the UI.
// The payload and the result are plain JSON-like objects, so postMessage can copy them.
//   in:  { id, payload }  -- a MusicBox.toJson() payload
//   out: { id, result }   -- the solve() result: { columns, height, data }
//        { id, error }    -- { message } when the solver throws
import { MusicBox } from '@ncar/music-box'

self.onmessage = async ({ data: { id, payload } }) => {
  try {
    const result = await MusicBox.fromJson(payload).solve()
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: { message: error?.message ?? String(error) } })
  }
}
