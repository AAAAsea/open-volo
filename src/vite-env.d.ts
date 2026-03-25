declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (...args: never[]) => AudioWorkletProcessor,
): void;
