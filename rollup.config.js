import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";

const external = Object.keys(pkg.dependencies);

export default [
  {
    input: "./src/index.ts",
    output: {
      file: "./dist/studio/index.js",
      format: "es",
    },
    external,
    plugins: [
      typescript({ target: "es6", module: "es2020" }),
      resolve(),
      commonjs(),
    ],
  },
  {
    input: "./out/index.d.ts",
    output: { file: "dist/studio/index.d.ts", format: "es" },
    plugins: [dts()],
  },
];
