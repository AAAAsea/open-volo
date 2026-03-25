class VoloRecorderProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (input && input[0]) {
      const channel = input[0];
      const copy = new Float32Array(channel.length);
      copy.set(channel);
      this.port.postMessage(copy, [copy.buffer]);
    }
    return true;
  }
}

registerProcessor("volo-recorder", VoloRecorderProcessor);
