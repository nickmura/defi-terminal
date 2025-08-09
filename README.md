# 1inch-defi-terminal

**defi-terminal** (codename) is an open-source developer tool built on 1inch offering a command-based interface for interacting with Ethereum protocols and querying on-chain data. It acts like a programmable shell for DeFi — built for developers, researchers, and power users who need a fast, composable alternative to fragmented dashboards. We built this as a proof of concept for 1inch Unite Defi

### Features
- Command line in the browser for ease of access DeFi on different protocols (with wallet)
- Call commands like **swap**, **price**, **chart**, **trace**, **rpc** & more
- Fetch token data from 1000+ of tokens across EVM chains (via 1inch)
- Supports many EVM chains (Ethereum, Optimism, Arbitrum, Base, Polygon, & more)


### Use Cases
- Instant, easy swaps/limit orders, (e.g **swap classic 1 eth usdc**, **swap limit 1 eth usdc --rate 4000 --expiration 7d**)
- Trace transactions and easy to use RPC calls
- Script DeFi interactions across protocols in different tabs/terminals
- Use the latest & greatest in DeFi as implemented
- Contribute plugins & hooks for your favorite dapps

### Tech Stack
- TypeScript / Node.js / Next.js
- viem / wagmi for Ethereum client interactions
- Modular plugin architecture for protocol integrations
- 1inch API (over 15+ endpoints)
---

We welcome feedback, contributions, and collaboration from the community.

