import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'simple3dcad.js',
  output: [
    {
      format: 'esm',
      file: 'simple3dcad_bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};