export default function Log(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
}