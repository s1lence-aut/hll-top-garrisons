# Discord Garrison Builder Tracker

This Discord bot tracks and ranks the top officers in garrison building based on their support points in HLL.
It fetches data from HLL CRCON API and updates a Discord channel with the top 20 players' rankings.

## Features

- Fetch player data from HLL CRCON API
- Track changes in player support and roles
- Rank and display the top 20 officers based on support points
- Regularly update a Discord channel with the latest rankings

## Setup

### Prerequisites

- Node.js (v16 or newer)
- npm (Node Package Manager)
- A Discord bot token
- HLL CRCON API credentials for fetching player data

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/s1lence-aut/hll-top-garrisons.git
   cd discord-bot

2. Generate a .env File
EXAMPLE:

   ```bash
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CHANNEL_ID=your_discord_channel_id
   RCON_API_BASE_URL=your_api_base_url
   RCON_API_TOKEN=your_api_token