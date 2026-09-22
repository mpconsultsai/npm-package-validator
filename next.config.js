/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@langchain/core",
    "@langchain/groq",
    "@langchain/langgraph",
  ],
};

module.exports = nextConfig;