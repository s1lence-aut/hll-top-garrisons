import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.RCON_API_BASE_URL;
const API_TOKEN = process.env.RCON_API_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

let playerScores = {};
let messageId = null;
let lastPointsTimestamp = {};
let trackingChannel = null;
let trackingInterval = null;
let updateInterval = null;

const POINTS_THRESHOLD = 50;
const MIN_TIME_DIFF = 1 * 60 * 1000; // 3 minutes

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function getPlayerData() {
    const url = `${API_BASE_URL}/api/get_detailed_players`;
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        const data = await response.json();

        if (data.result && data.result.players && typeof data.result.players === 'object') {
            return Object.values(data.result.players)
                .map(player => ({
                    name: player.name,
                    steam_id_64: player.steam_id_64,
                    support: player.support,
                    role: player.role
                }));
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        console.error('Error fetching player data:', error);
        throw error;
    }
}

function updateScoreData(players) {
    const currentTime = Date.now();
    players.forEach(player => {
        const { name, support, role } = player;
        const previousData = playerScores[name] || { support: 0, points: 0, lastRole: null };

        const isRoleChanged = previousData.lastRole !== role;
        const supportDifference = support - previousData.support;

        if (isRoleChanged) {
            console.log(`Player ${name} changed role to ${role}. Current support: ${support}`);
            previousData.support = support;
        } else if (role === 'officer') {
            const timeSinceLastPoint = currentTime - (lastPointsTimestamp[name] || 0);

            if ((supportDifference === 50 || supportDifference === 100) && timeSinceLastPoint >= MIN_TIME_DIFF) {
                previousData.points += 1;
                lastPointsTimestamp[name] = currentTime;
                previousData.support = support;
                console.log(`Player ${name} earned 1 point (Garrison built). Total points: ${previousData.points}`);
            } else if (supportDifference > 0) {
                console.log(`Player ${name} gained ${supportDifference} support, current total: ${support}`);
            } else if (supportDifference < 0) {
                console.log(`Player ${name} lost ${-supportDifference} support, current total: ${support}`);
            }
        } else {
            if (supportDifference !== 0) {
                console.log(`Player ${name} (${role}) support changed by ${supportDifference}, current total: ${support}`);
            }
        }

        previousData.lastRole = role;
        playerScores[name] = previousData;
    });
}

function getTop20Players() {
    return Object.entries(playerScores)
        .filter(([, { points }]) => points > 0)
        .sort(([, { points: pointsA }], [, { points: pointsB }]) => pointsB - pointsA)
        .slice(0, 20)
        .map(([name, { points }], index) => ({ rank: index + 1, name, points }));
}

client.once(Events.ClientReady, async () => {
    console.log('Discord client is ready.');
    trackingChannel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    if (!trackingChannel) {
        console.error('Could not find the specified channel.');
        process.exit(1);
    }
    console.log('Starting tracking...');
    main();
    trackingInterval = setInterval(main, 5000); // Run every 5 seconds
    updateInterval = setInterval(updateDiscordMessage, 15000); // Update Discord message every 15 seconds
});

async function main() {
    try {
        const players = await getPlayerData();
        if (players) {
            updateScoreData(players);
        }
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

async function updateDiscordMessage() {
    try {
        const topPlayers = getTop20Players();
        await sendToDiscord(topPlayers);
    } catch (error) {
        console.error('Error updating Discord message:', error);
    }
}

async function sendToDiscord(topPlayers) {
    const embed = new EmbedBuilder()
        .setColor('#FFD700') // Gold color
        .setTitle('🏆 Top 20 Officers in Garrison Building 🏆')
        .setDescription('Best Garrison Builders of the Day!')
        .setThumbnail('https://i.imgur.com/HzTLxpF.png?size=80')
        .addFields(
            { name: '\u200B', value: '\u200B' }, // Blank field for spacing
            ...topPlayers.map(player => ({
                name: `${getRankEmoji(player.rank)} Rang ${player.rank}`,
                value: `**${player.name}** - ${player.points} ${player.points === 1 ? 'Garrison' : 'Garrisons'}`,
                inline: true
            }))
        )
        .setFooter({ text: 'Last Refresh', iconURL: 'https://i.imgur.com/9Iaiwje.png' })
        .setTimestamp();

    try {
        if (messageId) {
            const message = await trackingChannel.messages.fetch(messageId);
            await message.edit({ embeds: [embed] });
            console.log('Edited existing message on Discord.');
        } else {
            const message = await trackingChannel.send({ embeds: [embed] });
            messageId = message.id;
            console.log('Sent new message to Discord.');
        }
    } catch (error) {
        console.error('Error sending/editing Discord message:', error);
    }
}

function getRankEmoji(rank) {
    switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '🎖️';
    }
}

client.login(DISCORD_TOKEN);